// api/auth/mfa-verify-login.js

import { adminAuth, adminDb } from "./firebaseAdmin.js";
import { verify } from "otplib";

export default async function handler(req, res) {
  // -------------------------------------------------------
  // Only POST is allowed
  // -------------------------------------------------------
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // -------------------------------------------------------
    // 1. Get Firebase ID token from Authorization header
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
    // 2. Verify Firebase authentication
    // -------------------------------------------------------
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const email = decodedToken.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "User email not found",
      });
    }

    // -------------------------------------------------------
    // 3. Convert Firebase email to your application User ID
    //
    // Example:
    // ABC123@gmail.com
    //       ↓
    // ABC123
    // -------------------------------------------------------
    const userId = email.split("@")[0].toUpperCase();

    // -------------------------------------------------------
    // 4. Get application user from Firestore
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
    // 5. MFA MUST be enabled
    //
    // If MFA is not enabled, login must NOT continue.
    // -------------------------------------------------------
    if (userData.mfaEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: "MFA is not enabled for this account",
        mfaEnabled: false,
      });
    }

    // -------------------------------------------------------
    // 6. MFA secret must exist
    // -------------------------------------------------------
    if (!userData.mfaSecret) {
      return res.status(403).json({
        success: false,
        message: "MFA is not configured correctly",
      });
    }

    // -------------------------------------------------------
    // 7. Get authenticator code
    // -------------------------------------------------------
    const { code } = req.body || {};

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authenticator code is required",
      });
    }

    // Remove spaces
    const cleanCode = String(code).replace(/\s/g, "");

    // Must be exactly 6 digits
    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({
        success: false,
        message: "Authenticator code must contain 6 digits",
      });
    }

    // -------------------------------------------------------
    // 8. Verify TOTP code
    // -------------------------------------------------------
    const result = await verify({
      secret: userData.mfaSecret,
      token: cleanCode,
    });

    if (result.valid !== true) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticator code",
      });
    }

    // -------------------------------------------------------
    // 9. MFA verification successful
    // -------------------------------------------------------
    return res.status(200).json({
      success: true,
      message: "MFA verification successful",

      mfaVerified: true,
      mfaEnabled: true,

      uid: decodedToken.uid,

      userId: userId,

      name: userData.name || userId,

      role: userData.role || "user",
    });

  } catch (error) {
    console.error("MFA login verification error:", error);

    return res.status(500).json({
      success: false,
      message: "MFA verification failed",
    });
  }
}