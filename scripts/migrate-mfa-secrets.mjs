// One-time migration: move every users/{id}.mfaSecret into the server-only
// mfaSecrets/{id} collection and delete it from users/{id}.
//
// Dry run (shows what would change, writes nothing):
//   node --env-file=.env.local scripts/migrate-mfa-secrets.mjs
// Apply:
//   node --env-file=.env.local scripts/migrate-mfa-secrets.mjs --apply
//
// Safe to run more than once. Uses the same FIREBASE_* variables as the API.

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error("Missing FIREBASE_* variables. Run with: node --env-file=.env.local scripts/migrate-mfa-secrets.mjs");
  process.exit(1);
}

const apply = process.argv.includes("--apply");

initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

const users = await db.collection("users").get();
let toMove = 0;
let moved = 0;

for (const doc of users.docs) {
  const legacy = doc.data().mfaSecret;
  if (!legacy) continue;
  toMove++;

  const target = db.collection("mfaSecrets").doc(doc.id);
  const existing = await target.get();
  // If a server-side secret already exists it is the newer one; keep it.
  const secret = (existing.exists && existing.data()?.secret) || legacy;

  console.log(`${apply ? "moving" : "would move"}: ${doc.id}${existing.exists ? " (server copy already present)" : ""}`);
  if (!apply) continue;

  await target.set({ secret, updatedAt: Date.now() });
  await doc.ref.update({ mfaSecret: FieldValue.delete() });
  moved++;
}

console.log(
  apply
    ? `\nDone. Moved ${moved} of ${toMove} secret(s). users/{id}.mfaSecret no longer exists anywhere.`
    : `\nDry run: ${toMove} secret(s) would be moved. Re-run with --apply to do it.`
);