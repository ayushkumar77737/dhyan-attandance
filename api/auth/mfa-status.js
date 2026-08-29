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
    // 3. Get User ID
    //
    // Your Login.jsx uses:
    // users/{USER_ID}
    //
    // Firebase login email is:
    // USER_ID@gmail.com
    // -------------------------------------------------------
    const email = decodedToken.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "User email not found",
      });
    }

    const userId = email.split("@")[0].toUpperCase();

    // -------------------------------------------------------
    // 4. Get user document from Firestore
    // -------------------------------------------------------
    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    const userData = userSnap.data();

    // -------------------------------------------------------
    // 5. Check MFA
    // -------------------------------------------------------
    const mfaEnabled = userData.mfaEnabled === true;

    // -------------------------------------------------------
    // 6. Return MFA status
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