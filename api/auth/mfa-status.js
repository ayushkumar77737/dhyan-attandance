// api/auth/mfa-status.js

import { adminAuth, adminDb } from "./firebaseAdmin.js";

export default async function handler(req, res) {
  // Only GET is allowed
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // -------------------------------------------------------
    // 1. Get Firebase ID token
    // -------------------------------------------------------
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    const idToken = authHeader.substring(7);

    // -------------------------------------------------------
    // 2. Verify Firebase ID token
    // -------------------------------------------------------
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // -------------------------------------------------------
    // 3. Get the user's Firestore doc
    //
    // Accounts no longer use a fabricated USER_ID@gmail.com
    // address — AddUser.jsx / AddAdmin.jsx now store the real
    // personal email on users/{id}.email, so the ID can't be
    // derived from the email string anymore. Look it up by the
    // stored email field instead.
    // -------------------------------------------------------
    const email = decodedToken.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "User email not found",
      });
    }

    const usersQuery = await adminDb
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (usersQuery.empty) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    const userSnap = usersQuery.docs[0];
    const userId = userSnap.id;
    const userData = userSnap.data();

    // -------------------------------------------------------
    // 4. Check MFA
    // -------------------------------------------------------
    const mfaEnabled = userData.mfaEnabled === true;

    // -------------------------------------------------------
    // 5. Return MFA status
    // -------------------------------------------------------
    return res.status(200).json({
      success: true,
      enabled: mfaEnabled,
      mfaEnabled: mfaEnabled,
      userId: userId,
    });

  } catch (error) {
    console.error("MFA status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check MFA status",
    });
  }
}