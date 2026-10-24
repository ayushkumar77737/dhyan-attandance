// src/utils/passkey.js
//
// Browser side of passkey sign-in. The browser only runs the native WebAuthn
// prompt (via @simplewebauthn/browser) and ferries the result to the server;
// every decision about WHO is signing in is made in api/auth/passkey.js.

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  WebAuthnAbortService,
  sendSignal,
} from "@simplewebauthn/browser";
import { auth } from "../firebase/firebase";

const ENDPOINT = "/api/auth/passkey";

/** code is one of the server codes (e.g. "CHALLENGE_EXPIRED") or a client code:
 *  CANCELLED, ALREADY_ON_DEVICE, DOMAIN_MISMATCH, AUTHENTICATOR_UNSUPPORTED,
 *  CEREMONY_FAILED, NETWORK, UNSUPPORTED, AUTH_REQUIRED */
export class PasskeyClientError extends Error {
  constructor(code, message = "", status = 0) {
    super(message || code);
    this.code = code;
    this.status = status;
  }
}

export const passkeysSupported = () => {
  try {
    return browserSupportsWebAuthn();
  } catch {
    return false;
  }
};

export const cancelPasskeyPrompt = () => {
  try {
    WebAuthnAbortService.cancelCeremony();
  } catch {
    /* nothing in progress */
  }
};

async function request(action, body = {}, { signedIn = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (signedIn) {
    const user = auth.currentUser;
    if (!user) throw new PasskeyClientError("AUTH_REQUIRED");
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  let response;
  try {
    response = await fetch(`${ENDPOINT}?action=${encodeURIComponent(action)}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new PasskeyClientError("NETWORK");
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok || data.success !== true) {
    throw new PasskeyClientError(data.code || (response.status >= 500 ? "SERVER_ERROR" : "REQUEST_FAILED"), data.message, response.status);
  }
  return data;
}

/* Turn WebAuthn / SimpleWebAuthn errors into stable codes for the UI. */
function ceremonyError(err) {
  const code = err?.code;
  const name = err?.name || err?.cause?.name;
  if (code === "ERROR_CEREMONY_ABORTED" || name === "AbortError" || name === "NotAllowedError") {
    return new PasskeyClientError("CANCELLED");
  }
  if (code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" || name === "InvalidStateError") {
    return new PasskeyClientError("ALREADY_ON_DEVICE");
  }
  if (code === "ERROR_INVALID_DOMAIN" || code === "ERROR_INVALID_RP_ID" || name === "SecurityError") {
    return new PasskeyClientError("DOMAIN_MISMATCH");
  }
  if (
    code === "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT" ||
    code === "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT" ||
    code === "ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG" ||
    name === "NotSupportedError"
  ) {
    return new PasskeyClientError("AUTHENTICATOR_UNSUPPORTED");
  }
  return new PasskeyClientError("CEREMONY_FAILED", err?.message);
}

async function runAuthentication(options) {
  if (!passkeysSupported()) throw new PasskeyClientError("UNSUPPORTED");
  try {
    return await startAuthentication({ optionsJSON: options });
  } catch (err) {
    throw ceremonyError(err);
  }
}

async function runRegistration(options) {
  if (!passkeysSupported()) throw new PasskeyClientError("UNSUPPORTED");
  try {
    return await startRegistration({ optionsJSON: options });
  } catch (err) {
    throw ceremonyError(err);
  }
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

/* Some browsers (notably Safari) only show the passkey prompt if it is opened
   straight from the click, without waiting on the network first. So challenges
   are fetched ahead of time and used within their 5-minute lifetime. */
const FRESH_MS = 4 * 60 * 1000;
let loginPrefetch = null; // { at, promise }

export function prefetchPasskeyLogin() {
  if (!passkeysSupported()) return;
  loginPrefetch = { at: Date.now(), promise: request("login-options").catch(() => null) };
}

async function takeLoginOptions() {
  const p = loginPrefetch;
  loginPrefetch = null; // a challenge is single-use
  if (p && Date.now() - p.at < FRESH_MS) {
    const ready = await p.promise;
    if (ready) return ready;
  }
  return request("login-options");
}

/** Runs the passkey prompt and returns { customToken, userId, name, role, mfaEnabled }.
 *  The caller signs in with the custom token. */
export async function verifyPasskeyLogin() {
  if (!passkeysSupported()) throw new PasskeyClientError("UNSUPPORTED");
  const { options, token } = await takeLoginOptions();
  const response = await runAuthentication(options);
  try {
    return await request("login-verify", { token, response });
  } catch (err) {
    // The device offered a passkey the server no longer knows (removed or revoked).
    // Ask the browser to hide it next time — best effort only.
    if (err.code === "CREDENTIAL_NOT_FOUND" && options?.rpId) {
      sendSignal({ signalName: "unknownCredential", rpID: options.rpId, credentialID: response.id }).catch(() => {});
    }
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Management (signed-in user)                                         */
/* ------------------------------------------------------------------ */

export const listPasskeys = () => request("list", {}, { signedIn: true });

export const totpStepUp = (code) => ({ method: "totp", code: String(code || "").replace(/\s/g, "") });

/** Fetch re-authentication options ahead of the click (see prefetch note above). */
export const preparePasskeyStepUp = async () => ({
  at: Date.now(),
  ...(await request("reauth-options", {}, { signedIn: true })),
});

/** Prompts for one of the user's own passkeys and returns a step-up proof.
 *  Pass the result of preparePasskeyStepUp() when available. */
export async function passkeyStepUp(prepared) {
  const fresh = prepared && Date.now() - prepared.at < FRESH_MS ? prepared : null;
  const { options, token } = fresh || (await request("reauth-options", {}, { signedIn: true }));
  const response = await runAuthentication(options);
  return { method: "passkey", token, response };
}

/** Step 1 of adding a passkey: server checks the step-up and returns creation options. */
export const beginPasskeyRegistration = (stepUp) =>
  request("register-options", { stepUp }, { signedIn: true });

/** Step 2: run the browser prompt (call this directly from a click handler). */
export async function finishPasskeyRegistration({ options, token }, label) {
  const response = await runRegistration(options);
  return request("register-verify", { token, response, label }, { signedIn: true });
}

export const renamePasskey = (credentialId, label) =>
  request("rename", { credentialId, label }, { signedIn: true });

export const removePasskey = (credentialId, stepUp) =>
  request("remove", { credentialId, stepUp }, { signedIn: true });

export const adminRevokePasskeys = (targetUserId, stepUp) =>
  request("admin-revoke", { targetUserId, stepUp }, { signedIn: true });

/** A friendly default name such as "Chrome on Android". */
export function defaultPasskeyLabel() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /SamsungBrowser/.test(ua) ? "Samsung Internet" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Safari\//.test(ua) ? "Safari" : "Browser";
  const os =
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iPod/.test(ua) ? "iOS" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Windows/.test(ua) ? "Windows" :
    /CrOS/.test(ua) ? "ChromeOS" :
    /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

/** Translation key for an error code (all live under passkey.errors.*). */
export const passkeyErrorKey = (err) => {
  const known = [
    "CANCELLED", "ALREADY_ON_DEVICE", "DOMAIN_MISMATCH", "AUTHENTICATOR_UNSUPPORTED", "CEREMONY_FAILED",
    "NETWORK", "UNSUPPORTED", "AUTH_REQUIRED", "NOT_CONFIGURED", "RATE_LIMITED", "CHALLENGE_INVALID",
    "CHALLENGE_EXPIRED", "CHALLENGE_USED", "VERIFICATION_FAILED", "CREDENTIAL_NOT_FOUND", "ACCOUNT_DISABLED",
    "ACCOUNT_LOCKED", "ACCOUNT_UNAVAILABLE", "STEP_UP_REQUIRED", "STEP_UP_FAILED", "MFA_NOT_ENABLED",
    "LIMIT_REACHED", "ALREADY_REGISTERED", "NOT_FOUND", "FORBIDDEN", "NO_PASSKEYS",
  ];
  const code = err?.code;
  return `passkey.errors.${known.includes(code) ? code : "SERVER_ERROR"}`;
};