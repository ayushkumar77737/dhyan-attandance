// server/passkeys/signing.js
//
// HMAC helpers. Two things are signed with PASSKEY_SIGNING_SECRET:
//
//  1. Challenge tokens — a stateless, tamper-proof envelope around each WebAuthn
//     challenge: { type, challenge, uid, exp, jti }. The browser carries it from the
//     "options" call to the "verify" call. Single use is enforced separately by
//     recording the jti in Firestore.
//
//  2. Credential records — every passkeyCredentials doc carries a signature over the
//     fields that decide WHO a credential logs in as, WHETHER it is active, its
//     signature counter, and the account's revocation epoch. A record written or edited
//     from the browser (e.g. under permissive Firestore rules) fails verification and is
//     ignored. The epoch lives in Firebase Auth custom claims (server-writable only) and
//     is bumped on every removal, so restoring an older, validly-signed copy of a record
//     ("rollback") does not work either.

import crypto from "node:crypto";

const b64url = (buf) => Buffer.from(buf).toString("base64url");

const hmac = (secret, data) =>
  crypto.createHmac("sha256", secret).update(data).digest();

const safeEqual = (a, b) => {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

export const randomId = (bytes = 16) => b64url(crypto.randomBytes(bytes));

export const sha256Hex = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

/** Document IDs that a browser cannot compute (so it cannot target them). */
export const keyedId = (secret, value) =>
  crypto.createHmac("sha256", secret).update(`id.${value}`).digest("hex");

/* ---------------- challenge tokens ---------------- */

export function signChallengeToken(secret, payload) {
  const body = b64url(JSON.stringify({ v: 1, ...payload }));
  const sig = b64url(hmac(secret, `ch.${body}`));
  return `${body}.${sig}`;
}

/** Returns the payload, or null if the token is malformed or the signature is wrong.
 *  Expiry is checked by the caller so it can report it distinctly. */
export function readChallengeToken(secret, token) {
  if (typeof token !== "string" || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = b64url(hmac(secret, `ch.${body}`));
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload?.v !== 1) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ---------------- credential records ---------------- */

const recordMaterial = (r) =>
  JSON.stringify([
    "cred.v2",
    r.credentialId,
    r.uid,
    r.userId,
    r.publicKey,
    r.userHandle,
    r.status,
    Number(r.epoch) || 0,
    Number(r.counter) || 0,
  ]);

export const signCredentialRecord = (secret, record) =>
  b64url(hmac(secret, recordMaterial(record)));

export const credentialRecordIsAuthentic = (secret, record) =>
  !!record?.sig && safeEqual(record.sig, signCredentialRecord(secret, record));

/* ---------------- per-user WebAuthn handle ---------------- */

const userMaterial = (r) => JSON.stringify(["user.v1", r.uid, r.userHandle]);

export const signUserHandleRecord = (secret, record) =>
  b64url(hmac(secret, userMaterial(record)));

export const userHandleRecordIsAuthentic = (secret, record) =>
  !!record?.sig && safeEqual(record.sig, signUserHandleRecord(secret, record));