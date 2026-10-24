// server/mfaSecrets.js
//
// The TOTP (authenticator app) secret used to live on users/{id}.mfaSecret.
// Every signed-in browser can read the users collection (the Directory and
// admin pages need it), so the secret moves to mfaSecrets/{id}, which
// Firestore rules close to browsers entirely. Only the server (Admin SDK)
// reads or writes it.
//
// Older accounts still have users/{id}.mfaSecret. getMfaSecret() falls back to
// it and moves it the first time it is used; scripts/migrate-mfa-secrets.mjs
// moves everyone at once.

import { FieldValue } from "firebase-admin/firestore";

export const MFA_SECRETS = "mfaSecrets";

/** Saves the secret server-side and removes any copy from users/{id}. */
export async function saveMfaSecret(adminDb, userId, secret) {
  await adminDb.collection(MFA_SECRETS).doc(userId).set({ secret, updatedAt: Date.now() });
  await adminDb.collection("users").doc(userId).update({ mfaSecret: FieldValue.delete() });
}

/** Returns the user's TOTP secret, or null. Moves a legacy users/{id}.mfaSecret. */
export async function getMfaSecret(adminDb, userId, userData = {}) {
  const snap = await adminDb.collection(MFA_SECRETS).doc(userId).get();
  const stored = snap.exists ? snap.data()?.secret : null;

  if (userData.mfaSecret) {
    // Legacy copy still readable by browsers: keep the server copy (or adopt the
    // legacy one if there is none) and delete the readable one.
    const secret = stored || userData.mfaSecret;
    await saveMfaSecret(adminDb, userId, secret);
    return secret;
  }
  return stored || null;
}