// Makes sure every active admin has an adminsByUid/{uid} document.
// The Firestore rules' isAdmin() check depends on it: an admin without one
// can no longer add or edit users once the tightened users rules are published.
//
// Dry run:  node --env-file=.env.local scripts/backfill-admins-by-uid.mjs
// Apply:    node --env-file=.env.local scripts/backfill-admins-by-uid.mjs --apply

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error("Missing FIREBASE_* variables. Run with: node --env-file=.env.local scripts/backfill-admins-by-uid.mjs");
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

const admins = await db.collection("users").where("role", "==", "admin").get();
let ok = 0, missing = 0, skipped = 0;

for (const doc of admins.docs) {
  const d = doc.data();
  if (d.deleted === true) { skipped++; continue; }
  if (!d.uid) { console.log(`! ${doc.id}: admin has no uid field — fix this account manually`); continue; }
  const ref = db.collection("adminsByUid").doc(d.uid);
  const snap = await ref.get();
  if (snap.exists && snap.data()?.role === "admin") { ok++; continue; }
  missing++;
  console.log(`${apply ? "adding" : "missing"}: ${doc.id} (${d.name || ""})`);
  if (apply) await ref.set({ role: "admin" });
}

console.log(`\nActive admins already registered: ${ok}. ${apply ? "Added" : "Missing"}: ${missing}. Deleted admins skipped: ${skipped}.`);
if (!apply && missing) console.log("Re-run with --apply to add them.");