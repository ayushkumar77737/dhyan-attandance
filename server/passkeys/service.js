// server/passkeys/service.js
//
// Passkey (WebAuthn) registration, login and management for the Dhyan portal.
//
// Everything security-relevant happens here, on the server:
//   * challenges are random, short-lived, bound to an operation (and a user where
//     applicable), signed, and single-use;
//   * WebAuthn responses are verified by @simplewebauthn/server (origin, RP ID,
//     challenge, signature, user verification, counter);
//   * the account is identified ONLY from the stored, signed credential record —
//     never from an ID, role or status sent by the browser;
//   * account status (deleted / disabled / locked / Auth-disabled) and role are read
//     from Firestore at the moment of login;
//   * a successful login returns a Firebase custom token for the account's EXISTING
//     uid — the same mechanism the Google sign-in already uses.
//
// The factory takes its dependencies so the logic can be tested without Firebase.

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

import {
  randomId,
  keyedId,
  signChallengeToken,
  readChallengeToken,
  signCredentialRecord,
  credentialRecordIsAuthentic,
  signUserHandleRecord,
  userHandleRecordIsAuthentic,
} from "./signing.js";

export const SUPER_ADMIN_ID = "ADMIN1"; // mirrors src/utils/accessControl.js

const CREDENTIALS = "passkeyCredentials";
const USER_HANDLES = "passkeyUsers";
const CHALLENGE_USES = "passkeyChallengeUses";
const RATE_LIMITS = "passkeyRateLimits";

/* Per-bucket limits: [max requests, window in ms]. Sign-in buckets are per IP and
   allow for a shared venue/office connection. */
const LIMITS = {
  "login-options": [60, 5 * 60 * 1000],
  "login-verify": [30, 5 * 60 * 1000],
  account: [40, 10 * 60 * 1000],
  "step-up": [8, 10 * 60 * 1000],
};

export class PasskeyError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const fail = (status, code, message) => {
  throw new PasskeyError(status, code, message);
};

const MSG = {
  notConfigured: "Passkey sign-in is not configured on the server.",
  authRequired: "Please sign in again.",
  accountUnavailable: "This account cannot sign in. Use your ID and password or contact the admin.",
  disabled: "Your account has been disabled. Contact admin.",
  challenge: "This passkey request has expired. Please try again.",
  verification: "Passkey verification failed. Please try again.",
  unknownCredential: "This passkey is not registered with the portal. Use your ID and password, then set up a passkey in Security.",
  rateLimited: "Too many attempts. Please wait a few minutes and try again.",
  stepUpRequired: "Confirm it's you with your authenticator code or an existing passkey.",
  stepUpFailed: "That confirmation didn't work. Check the code and try again.",
  mfaNotEnabled: "Turn on authenticator (MFA) sign-in before adding a passkey.",
  invalidInput: "The request was not valid.",
  forbidden: "You are not allowed to do this.",
  notFound: "Passkey not found.",
  limit: "You have reached the maximum number of passkeys. Remove one first.",
  server: "Something went wrong. Please try again.",
};

/* ------------------------------------------------------------------ */
/* small helpers                                                       */
/* ------------------------------------------------------------------ */

export function sanitizeLabel(value, fallback = "Passkey") {
  const clean = String(value ?? "")
    // strip control characters and angle brackets
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return clean || fallback;
}

const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

const headerValue = (req, name) => {
  const v = req.headers?.[name];
  return Array.isArray(v) ? v[0] : v;
};

/* Vercel sets x-vercel-forwarded-for and x-real-ip itself; prefer them over the
   left-most x-forwarded-for entry, which a client can prepend to. */
const clientIp = (req) => {
  const v =
    headerValue(req, "x-vercel-forwarded-for") ||
    headerValue(req, "x-real-ip") ||
    headerValue(req, "x-forwarded-for");
  return (v && String(v).split(",")[0].trim()) || req.socket?.remoteAddress || "unknown";
};

/* Revocation epoch, kept in Firebase Auth custom claims (only the Admin SDK can write them). */
const epochOf = (authUser) => Number(authUser?.customClaims?.pke) || 0;

const toMs = (v) => {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v?.toDate === "function") return v.toDate().getTime();
  const n = new Date(v).getTime();
  return Number.isNaN(n) ? 0 : n;
};

const publicView = (r) => ({
  credentialId: r.credentialId,
  label: r.label,
  createdAt: r.createdAt || null,
  lastUsedAt: r.lastUsedAt || null,
  deviceType: r.deviceType || null,
  backedUp: !!r.backedUp,
  transports: Array.isArray(r.transports) ? r.transports : [],
});

/* ------------------------------------------------------------------ */
/* factory                                                             */
/* ------------------------------------------------------------------ */

export function createPasskeyService({
  adminAuth,
  adminDb,
  verifyTotp,
  config,
  now = () => Date.now(),
  logger = console,
}) {
  const col = (name) => adminDb.collection(name);

  /* ---------------- rate limiting (fixed window, per bucket) ---------------- */

  async function rateLimit(bucket, key) {
    const [max, windowMs] = LIMITS[bucket];
    const ref = col(RATE_LIMITS).doc(keyedId(config.secret, `${bucket}:${key}`));
    const t = now();
    const allowed = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : null;
      if (!data || t - (data.windowStart || 0) >= windowMs) {
        tx.set(ref, { count: 1, windowStart: t, expiresAt: new Date(t + windowMs) });
        return true;
      }
      if ((data.count || 0) >= max) return false;
      tx.set(ref, { ...data, count: (data.count || 0) + 1 });
      return true;
    });
    if (!allowed) fail(429, "RATE_LIMITED", MSG.rateLimited);
  }

  /* ---------------- challenges ---------------- */

  function issueChallenge(type, challenge, uid = null, extra = {}) {
    return signChallengeToken(config.secret, {
      ...extra,
      typ: type,
      ch: challenge,
      uid,
      exp: now() + config.challengeTtlMs,
      jti: randomId(18),
    });
  }

  /** Validates signature, type, binding and expiry, then burns the jti.
   *  Returns the token payload ({ ch, uid, ... }). */
  async function consumeChallenge(token, type, uid = null) {
    const payload = readChallengeToken(config.secret, token);
    if (!payload || payload.typ !== type) fail(400, "CHALLENGE_INVALID", MSG.challenge);
    if ((payload.uid || null) !== (uid || null)) fail(400, "CHALLENGE_INVALID", MSG.challenge);
    if (typeof payload.exp !== "number" || now() > payload.exp) fail(400, "CHALLENGE_EXPIRED", MSG.challenge);

    try {
      await col(CHALLENGE_USES).doc(payload.jti).create({
        type,
        usedAt: now(),
        expiresAt: new Date(payload.exp + 60 * 1000), // for an optional Firestore TTL policy
      });
    } catch (err) {
      // ALREADY_EXISTS -> the challenge was used before
      if (err?.code === 6 || err?.code === "already-exists" || /already exists/i.test(err?.message || "")) {
        fail(400, "CHALLENGE_USED", MSG.challenge);
      }
      throw err;
    }
    return payload;
  }

  /* ---------------- accounts ---------------- */

  async function verifyCaller(req) {
    const header = req.headers?.authorization || "";
    if (!header.startsWith("Bearer ")) fail(401, "AUTH_REQUIRED", MSG.authRequired);
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(header.slice(7), true);
    } catch {
      fail(401, "AUTH_REQUIRED", MSG.authRequired);
    }
    const account = await loadAccountByUid(decoded.uid);
    if (!account) fail(403, "ACCOUNT_UNAVAILABLE", MSG.accountUnavailable);
    await assertAccountCanSignIn(account);
    return account;
  }

  async function loadAccountByUid(uid) {
    if (!uid) return null;
    const snap = await col("users").where("uid", "==", uid).limit(2).get();
    if (snap.empty || snap.size > 1) return null; // unknown or ambiguous
    const doc = snap.docs[0];
    return { uid, userId: doc.id, ref: doc.ref, data: doc.data() || {} };
  }

  async function assertAccountCanSignIn(account) {
    const d = account.data;
    if (d.deleted === true) fail(403, "ACCOUNT_UNAVAILABLE", MSG.accountUnavailable);
    if (d.disabled === true) fail(403, "ACCOUNT_DISABLED", MSG.disabled);

    // Respect the 3-wrong-passwords lock, exactly like the Google sign-in does.
    const attempts = await col("loginAttempts").doc(account.userId).get();
    if (attempts.exists) {
      const lockUntil = attempts.data()?.lockUntil;
      if (lockUntil && now() < lockUntil) {
        const minutes = Math.ceil((lockUntil - now()) / 60000);
        fail(423, "ACCOUNT_LOCKED", `Account locked. Try again in ${minutes} minute(s).`);
      }
    }

    let authUser;
    try {
      authUser = await adminAuth.getUser(account.uid);
    } catch {
      fail(403, "ACCOUNT_UNAVAILABLE", MSG.accountUnavailable);
    }
    if (authUser?.disabled) fail(403, "ACCOUNT_DISABLED", MSG.disabled);
    account.epoch = epochOf(authUser);
  }

  const isAdmin = (account) => account.data.role === "admin";
  // Document ID only: the users/{id} doc's own "id" field could be edited by a browser.
  const isSuperAdmin = (account) =>
    isAdmin(account) && String(account.userId).toUpperCase() === SUPER_ADMIN_ID;

  /* ---------------- credential records ---------------- */

  async function getAuthenticCredential(credentialId) {
    if (typeof credentialId !== "string" || !credentialId || credentialId.length > 1400) return null;
    const snap = await col(CREDENTIALS).doc(credentialId).get();
    if (!snap.exists) return null;
    const record = snap.data() || {};
    if (record.credentialId !== credentialId || !credentialRecordIsAuthentic(config.secret, record)) {
      logger.warn?.("passkey: ignoring credential record with a bad signature", credentialId.slice(0, 12));
      return null;
    }
    return { ref: snap.ref, record };
  }

  async function listAuthenticCredentials(uid, epoch) {
    const snap = await col(CREDENTIALS).where("uid", "==", uid).get();
    const out = [];
    snap.forEach((doc) => {
      const record = doc.data();
      if (doc.id !== record.credentialId) return;
      if (!credentialRecordIsAuthentic(config.secret, record)) return;
      if (record.status !== "active") return;
      if ((Number(record.epoch) || 0) !== epoch) return; // signed before a later removal
      out.push({ ref: doc.ref, record });
    });
    out.sort((a, b) => toMs(a.record.createdAt) - toMs(b.record.createdAt));
    return out;
  }

  async function getOrCreateUserHandle(account) {
    const ref = col(USER_HANDLES).doc(account.uid);
    const snap = await ref.get();
    if (snap.exists) {
      const rec = snap.data();
      if (rec?.uid === account.uid && userHandleRecordIsAuthentic(config.secret, rec)) return rec.userHandle;
    }
    const rec = { uid: account.uid, userId: account.userId, userHandle: randomId(32), createdAt: now() };
    rec.sig = signUserHandleRecord(config.secret, rec);
    if (snap.exists) {
      await ref.set(rec); // existing doc failed its signature check: replace it
    } else {
      try {
        await ref.create(rec);
      } catch {
        // created concurrently — use whichever handle won
        const again = (await ref.get()).data();
        if (again?.uid === account.uid && userHandleRecordIsAuthentic(config.secret, again)) return again.userHandle;
        throw new Error("passkey user handle could not be created");
      }
    }
    return rec.userHandle;
  }

  /** Revokes some (or "all") of an account's passkeys and bumps its revocation epoch,
   *  re-signing the passkeys that stay. Any older copy of any record — including the
   *  ones just revoked — no longer matches the epoch and is ignored from now on. */
  async function revokeAndRotate(uid, revokeIds, by) {
    const authUser = await adminAuth.getUser(uid);
    const claims = authUser.customClaims || {};
    const oldEpoch = epochOf(authUser);
    const newEpoch = oldEpoch + 1;
    const active = await listAuthenticCredentials(uid, oldEpoch);

    await adminAuth.setCustomUserClaims(uid, { ...claims, pke: newEpoch });

    let revoked = 0;
    for (const { ref, record } of active) {
      const revoke = revokeIds === "all" || revokeIds.includes(record.credentialId);
      const updated = {
        ...record,
        epoch: newEpoch,
        ...(revoke ? { status: "revoked", revokedAt: now(), revokedBy: by } : {}),
      };
      updated.sig = signCredentialRecord(config.secret, updated);
      await ref.set(updated);
      if (revoke) revoked++;
    }
    return { revoked, remaining: active.length - revoked };
  }

  /* ---------------- core assertion check (login + step-up) ---------------- */

  async function verifyAssertion({ response, expectedChallenge, expectedUid = null }) {
    if (!isObject(response) || typeof response.id !== "string" || response.type !== "public-key") {
      fail(400, "INVALID_INPUT", MSG.invalidInput);
    }

    const found = await getAuthenticCredential(response.id);
    if (!found || found.record.status !== "active") fail(401, "CREDENTIAL_NOT_FOUND", MSG.unknownCredential);
    const { ref, record } = found;

    if (expectedUid && record.uid !== expectedUid) fail(403, "FORBIDDEN", MSG.forbidden);

    // Must be signed under the account's current revocation epoch (blocks rollback of
    // a removed passkey's old record).
    let owner;
    try {
      owner = await adminAuth.getUser(record.uid);
    } catch {
      fail(401, "CREDENTIAL_NOT_FOUND", MSG.unknownCredential);
    }
    const epoch = epochOf(owner);
    if ((Number(record.epoch) || 0) !== epoch) fail(401, "CREDENTIAL_NOT_FOUND", MSG.unknownCredential);

    // Discoverable-credential logins return the user handle; it must belong to the
    // same account the credential record says.
    const handle = response.response?.userHandle;
    if (handle && handle !== record.userHandle) fail(401, "VERIFICATION_FAILED", MSG.verification);

    let result;
    try {
      result = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: config.origins,
        expectedRPID: config.rpID,
        requireUserVerification: true,
        credential: {
          id: record.credentialId,
          publicKey: Buffer.from(record.publicKey, "base64url"),
          counter: Number(record.counter) || 0,
          transports: record.transports || [],
        },
      });
    } catch (err) {
      logger.warn?.("passkey: assertion rejected:", err?.message);
      fail(401, "VERIFICATION_FAILED", MSG.verification);
    }
    if (!result?.verified || !result.authenticationInfo?.userVerified) {
      fail(401, "VERIFICATION_FAILED", MSG.verification);
    }

    // Counter + last-used, in a transaction, re-signed (the counter is signed so it
    // cannot be pushed up to brick a security key, or reset to hide a clone).
    const info = result.authenticationInfo;
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const cur = snap.exists ? snap.data() : null;
      if (!cur || !credentialRecordIsAuthentic(config.secret, cur)) return;
      if (cur.status !== "active" || (Number(cur.epoch) || 0) !== epoch) return;
      const updated = {
        ...cur,
        counter: Math.max(Number(cur.counter) || 0, Number(info.newCounter) || 0),
        lastUsedAt: now(),
        backedUp: !!info.credentialBackedUp,
        deviceType: info.credentialDeviceType || cur.deviceType || null,
      };
      updated.sig = signCredentialRecord(config.secret, updated);
      tx.set(ref, updated);
    });

    return record;
  }

  /* ---------------- step-up (re-authentication) ---------------- */

  async function requireStepUp(account, stepUp) {
    if (!isObject(stepUp)) fail(401, "STEP_UP_REQUIRED", MSG.stepUpRequired);
    await rateLimit("step-up", account.uid);

    if (stepUp.method === "totp") {
      const code = String(stepUp.code || "").replace(/\s/g, "");
      if (!/^\d{6}$/.test(code)) fail(401, "STEP_UP_FAILED", MSG.stepUpFailed);
      if (account.data.mfaEnabled !== true) fail(403, "MFA_NOT_ENABLED", MSG.mfaNotEnabled);
      // Server-only copy first (mfaSecrets/{id}); legacy users/{id}.mfaSecret as a fallback.
      const secretSnap = await col("mfaSecrets").doc(account.userId).get();
      const secret = (secretSnap.exists && secretSnap.data()?.secret) || account.data.mfaSecret;
      if (!secret) fail(403, "MFA_NOT_ENABLED", MSG.mfaNotEnabled);
      let ok = false;
      try {
        ok = await verifyTotp(secret, code);
      } catch {
        ok = false;
      }
      if (!ok) fail(401, "STEP_UP_FAILED", MSG.stepUpFailed);
      return "totp";
    }

    if (stepUp.method === "passkey") {
      const { ch } = await consumeChallenge(stepUp.token, "reauth", account.uid);
      try {
        await verifyAssertion({ response: stepUp.response, expectedChallenge: ch, expectedUid: account.uid });
      } catch (err) {
        if (err instanceof PasskeyError && err.code !== "RATE_LIMITED") {
          fail(401, "STEP_UP_FAILED", MSG.stepUpFailed);
        }
        throw err;
      }
      return "passkey";
    }

    fail(401, "STEP_UP_REQUIRED", MSG.stepUpRequired);
  }

  /* ================================================================== */
  /* actions                                                            */
  /* ================================================================== */

  const actions = {
    /* ---------- login (no session) ---------- */

    async "login-options"(req) {
      await rateLimit("login-options", clientIp(req));
      const options = await generateAuthenticationOptions({
        rpID: config.rpID,
        userVerification: "required",
        allowCredentials: [], // discoverable credentials: the browser lists this site's passkeys
        timeout: 60000,
      });
      return { options, token: issueChallenge("login", options.challenge) };
    },

    async "login-verify"(req) {
      await rateLimit("login-verify", clientIp(req));
      const { token, response } = req.body || {};
      const { ch } = await consumeChallenge(token, "login");
      const record = await verifyAssertion({ response, expectedChallenge: ch });

      // Identity comes from the signed credential record — nothing from the browser.
      const account = await loadAccountByUid(record.uid);
      if (!account || account.userId !== record.userId) {
        fail(403, "ACCOUNT_UNAVAILABLE", MSG.accountUnavailable);
      }
      await assertAccountCanSignIn(account);

      const customToken = await adminAuth.createCustomToken(account.uid);
      return {
        customToken,
        userId: account.userId,
        name: account.data.name || account.userId,
        role: isAdmin(account) ? "admin" : "user",
        mfaEnabled: account.data.mfaEnabled === true,
      };
    },

    /* ---------- management (signed-in session) ---------- */

    async list(req) {
      const account = await verifyCaller(req);
      await rateLimit("account", account.uid);
      const creds = await listAuthenticCredentials(account.uid, account.epoch);
      return {
        passkeys: creds.map(({ record }) => publicView(record)),
        mfaEnabled: account.data.mfaEnabled === true,
        maxPasskeys: config.maxPasskeysPerUser,
      };
    },

    async "reauth-options"(req) {
      const account = await verifyCaller(req);
      await rateLimit("account", account.uid);
      const creds = await listAuthenticCredentials(account.uid, account.epoch);
      if (!creds.length) fail(400, "NO_PASSKEYS", MSG.unknownCredential);
      const options = await generateAuthenticationOptions({
        rpID: config.rpID,
        userVerification: "required",
        allowCredentials: creds.map(({ record }) => ({ id: record.credentialId, transports: record.transports || [] })),
        timeout: 60000,
      });
      return { options, token: issueChallenge("reauth", options.challenge, account.uid) };
    },

    async "register-options"(req) {
      const account = await verifyCaller(req);
      await rateLimit("account", account.uid);
      if (account.data.mfaEnabled !== true) fail(403, "MFA_NOT_ENABLED", MSG.mfaNotEnabled);

      const existing = await listAuthenticCredentials(account.uid, account.epoch);
      if (existing.length >= config.maxPasskeysPerUser) fail(400, "LIMIT_REACHED", MSG.limit);

      await requireStepUp(account, req.body?.stepUp);

      const userHandle = await getOrCreateUserHandle(account);
      const options = await generateRegistrationOptions({
        rpName: config.rpName,
        rpID: config.rpID,
        userID: Buffer.from(userHandle, "base64url"),
        userName: account.userId,
        userDisplayName: account.data.name || account.userId,
        attestationType: "none",
        timeout: 120000,
        excludeCredentials: existing.map(({ record }) => ({
          id: record.credentialId,
          transports: record.transports || [],
        })),
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "required",
        },
      });
      // The user handle travels inside the signed token so verify stores exactly the
      // handle the authenticator was given.
      return { options, token: issueChallenge("register", options.challenge, account.uid, { uh: userHandle }) };
    },

    async "register-verify"(req) {
      const account = await verifyCaller(req);
      await rateLimit("account", account.uid);
      const { token, response, label } = req.body || {};
      if (!isObject(response)) fail(400, "INVALID_INPUT", MSG.invalidInput);

      const { ch, uh: userHandle } = await consumeChallenge(token, "register", account.uid);
      if (typeof userHandle !== "string" || !userHandle) fail(400, "CHALLENGE_INVALID", MSG.challenge);

      // Re-check the limit: several option tokens could have been fetched in parallel.
      const existing = await listAuthenticCredentials(account.uid, account.epoch);
      if (existing.length >= config.maxPasskeysPerUser) fail(400, "LIMIT_REACHED", MSG.limit);

      let result;
      try {
        result = await verifyRegistrationResponse({
          response,
          expectedChallenge: ch,
          expectedOrigin: config.origins,
          expectedRPID: config.rpID,
          requireUserVerification: true,
        });
      } catch (err) {
        logger.warn?.("passkey: registration rejected:", err?.message);
        fail(400, "VERIFICATION_FAILED", MSG.verification);
      }
      if (!result?.verified || !result.registrationInfo?.userVerified) {
        fail(400, "VERIFICATION_FAILED", MSG.verification);
      }

      const info = result.registrationInfo;
      const credentialId = info.credential.id;

      const record = {
        credentialId,
        uid: account.uid,
        userId: account.userId,
        userHandle,
        publicKey: Buffer.from(info.credential.publicKey).toString("base64url"),
        counter: info.credential.counter || 0,
        transports: Array.isArray(response.response?.transports)
          ? response.response.transports.filter((t) => typeof t === "string").slice(0, 8)
          : info.credential.transports || [],
        deviceType: info.credentialDeviceType || null,
        backedUp: !!info.credentialBackedUp,
        aaguid: info.aaguid || null,
        label: sanitizeLabel(label),
        createdAt: now(),
        lastUsedAt: null,
        status: "active",
        epoch: account.epoch,
        roleAtRegistration: isAdmin(account) ? "admin" : "user",
      };
      record.sig = signCredentialRecord(config.secret, record);

      // create() fails if the credential ID already exists -> IDs stay unique.
      try {
        await col(CREDENTIALS).doc(credentialId).create(record);
      } catch (err) {
        if (err?.code === 6 || /already exists/i.test(err?.message || "")) {
          fail(409, "ALREADY_REGISTERED", "This passkey is already registered.");
        }
        throw err;
      }

      return { passkey: publicView(record) };
    },

    async rename(req) {
      const account = await verifyCaller(req);
      await rateLimit("account", account.uid);
      const { credentialId, label } = req.body || {};
      const found = await getAuthenticCredential(credentialId);
      if (!found || found.record.status !== "active" || found.record.uid !== account.uid) {
        fail(404, "NOT_FOUND", MSG.notFound);
      }
      const clean = sanitizeLabel(label, found.record.label);
      await found.ref.update({ label: clean });
      return { passkey: publicView({ ...found.record, label: clean }) };
    },

    async remove(req) {
      const account = await verifyCaller(req);
      await rateLimit("account", account.uid);
      const { credentialId, stepUp } = req.body || {};
      const found = await getAuthenticCredential(credentialId);
      if (!found || found.record.status !== "active" || found.record.uid !== account.uid) {
        fail(404, "NOT_FOUND", MSG.notFound);
      }
      if ((Number(found.record.epoch) || 0) !== account.epoch) fail(404, "NOT_FOUND", MSG.notFound);
      await requireStepUp(account, stepUp);
      const { remaining } = await revokeAndRotate(account.uid, [credentialId], account.userId);
      return { removed: credentialId, remaining };
    },

    /* Account recovery: an admin revokes every passkey on a user's account
       (e.g. lost phone) and ends all of that account's sessions. Only the super
       admin may do this to an admin account. */
    async "admin-revoke"(req) {
      const caller = await verifyCaller(req);
      if (!isAdmin(caller)) fail(403, "FORBIDDEN", MSG.forbidden);
      await rateLimit("account", caller.uid);

      const targetUserId = String(req.body?.targetUserId || "").trim().toUpperCase();
      if (!/^[A-Z0-9]{1,20}$/.test(targetUserId)) fail(400, "INVALID_INPUT", MSG.invalidInput);

      const targetSnap = await col("users").doc(targetUserId).get();
      if (!targetSnap.exists) fail(404, "NOT_FOUND", "Account not found.");
      const target = targetSnap.data() || {};
      if (target.role === "admin" && !isSuperAdmin(caller)) fail(403, "FORBIDDEN", MSG.forbidden);

      await requireStepUp(caller, req.body?.stepUp);

      if (!target.uid) return { revoked: 0 };
      let authTarget;
      try {
        authTarget = await adminAuth.getUser(target.uid);
      } catch {
        return { revoked: 0 };
      }
      const { revoked } = authTarget ? await revokeAndRotate(target.uid, "all", caller.userId) : { revoked: 0 };

      // A lost device may still hold a signed-in session: end every session.
      try {
        await adminAuth.revokeRefreshTokens(target.uid);
      } catch (err) {
        logger.warn?.("passkey: could not revoke refresh tokens:", err?.message);
      }
      return { revoked, signedOut: true };
    },
  };

  /* ================================================================== */
  /* HTTP entry point (Vercel / Node style req, res)                    */
  /* ================================================================== */

  return async function handle(req, res) {
    res.setHeader?.("Cache-Control", "no-store");

    if (req.method !== "POST") {
      return res.status(405).json({ success: false, code: "METHOD_NOT_ALLOWED", message: "Method not allowed" });
    }
    if (!config.ok) {
      logger.error?.("passkey: configuration problems:", config.problems);
      return res.status(503).json({ success: false, code: "NOT_CONFIGURED", message: MSG.notConfigured });
    }

    const action = String(req.query?.action || req.body?.action || "");
    const fn = Object.prototype.hasOwnProperty.call(actions, action) ? actions[action] : null;
    if (!fn) return res.status(400).json({ success: false, code: "UNKNOWN_ACTION", message: MSG.invalidInput });

    try {
      const data = await fn(req);
      return res.status(200).json({ success: true, ...data });
    } catch (err) {
      if (err instanceof PasskeyError) {
        return res.status(err.status).json({ success: false, code: err.code, message: err.message });
      }
      logger.error?.(`passkey ${action} error:`, err);
      return res.status(500).json({ success: false, code: "SERVER_ERROR", message: MSG.server });
    }
  };
}