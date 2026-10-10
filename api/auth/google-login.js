// api/auth/google-login.js
//
// "Sign in with Google" — server-side check.
//
// The browser sends the Google ID token (a "credential"). We:
//   1. verify it really came from Google, for OUR OAuth client
//   2. require a verified Google email
//   3. find the portal user whose users/{id}.email matches
//   4. refuse disabled / deleted / locked / unknown accounts
//   5. return a Firebase custom token for that user's EXISTING uid
//
// Nothing is created in Firebase Auth and no password is touched, so only
// people already registered in the portal can ever get in. MFA still runs
// afterwards, exactly like the ID + password login.

import { OAuth2Client } from "google-auth-library";
import { adminAuth, adminDb } from "./firebaseAdmin.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const NOT_REGISTERED =
  "This Google account is not registered in the portal. Please log in with your ID and password.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  if (!GOOGLE_CLIENT_ID) {
    console.error("google-login: GOOGLE_CLIENT_ID is not set");
    return res.status(500).json({
      success: false,
      message: "Google sign-in is not configured.",
    });
  }

  try {
    // ---------------------------------------------------------
    // 1. Verify the Google ID token
    // ---------------------------------------------------------
    const credential = req.body?.credential;

    if (!credential || typeof credential !== "string") {
      return res.status(400).json({ success: false, message: "Missing Google credential." });
    }

    let payload;
    try {
      const ticket = await oauthClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      console.warn("google-login: token verification failed:", err.message);
      return res.status(401).json({ success: false, message: "Google sign-in failed." });
    }

    // ---------------------------------------------------------
    // 2. The email must be present AND verified by Google
    // ---------------------------------------------------------
    if (!payload?.email || payload.email_verified !== true) {
      return res.status(401).json({
        success: false,
        message: "Your Google email is not verified.",
      });
    }

    const googleEmail = payload.email.trim();
    const emailLower = googleEmail.toLowerCase();

    // ---------------------------------------------------------
    // 3. Find the portal user with this email
    // ---------------------------------------------------------
    let snap = await adminDb
      .collection("users")
      .where("email", "==", emailLower)
      .limit(3)
      .get();

    if (snap.empty && googleEmail !== emailLower) {
      snap = await adminDb
        .collection("users")
        .where("email", "==", googleEmail)
        .limit(3)
        .get();
    }

    // Unknown email, or ambiguous (two accounts share it) -> refuse.
    if (snap.empty || snap.size > 1) {
      return res.status(403).json({ success: false, message: NOT_REGISTERED });
    }

    const userSnap = snap.docs[0];
    const userId = userSnap.id;
    const userData = userSnap.data();

    // Old accounts used a made-up ID@gmail.com address. A real stranger could
    // own that address, so those accounts can never use Google sign-in.
    if (emailLower === `${String(userId).toLowerCase()}@gmail.com`) {
      return res.status(403).json({ success: false, message: NOT_REGISTERED });
    }

    // ---------------------------------------------------------
    // 4. Same account rules as the password login
    // ---------------------------------------------------------
    if (userData.deleted === true) {
      return res.status(403).json({ success: false, message: NOT_REGISTERED });
    }

    if (userData.disabled === true) {
      return res.status(403).json({
        success: false,
        message: "Your account has been disabled. Contact admin.",
      });
    }

    // Respect the 3-wrong-passwords lock (Blocked Accounts page)
    const attemptsSnap = await adminDb.collection("loginAttempts").doc(userId).get();
    if (attemptsSnap.exists) {
      const lockUntil = attemptsSnap.data().lockUntil;
      if (lockUntil && Date.now() < lockUntil) {
        const minutes = Math.ceil((lockUntil - Date.now()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Account locked. Try again in ${minutes} minute(s).`,
        });
      }
    }

    // ---------------------------------------------------------
    // 5. Issue a custom token for the user's EXISTING Firebase uid
    // ---------------------------------------------------------
    const uid = userData.uid;

    if (!uid) {
      return res.status(403).json({ success: false, message: NOT_REGISTERED });
    }

    try {
      await adminAuth.getUser(uid); // make sure the Auth account still exists
    } catch {
      return res.status(403).json({ success: false, message: NOT_REGISTERED });
    }

    const customToken = await adminAuth.createCustomToken(uid);

    return res.status(200).json({
      success: true,
      customToken,
      userId,
    });
  } catch (error) {
    console.error("google-login error:", error);
    return res.status(500).json({
      success: false,
      message: "Google sign-in failed. Please try again.",
    });
  }
}