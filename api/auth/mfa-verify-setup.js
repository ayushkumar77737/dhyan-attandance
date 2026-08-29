// api/auth/mfa-verify-setup.js

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
    // 2. Verify Firebase user
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
    // 3. Get application User ID
    // -------------------------------------------------------
    const userId = email.split("@")[0].toUpperCase();

    // -------------------------------------------------------
    // 4. Get user document
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
    // 5. Check MFA setup
    // -------------------------------------------------------
    if (!userData.mfaSecret || userData.mfaSetupPending !== true) {
      return res.status(400).json({
        success: false,
        message: "MFA setup has not been started",
      });
    }

    // -------------------------------------------------------
    // 6. Get authenticator code
    // -------------------------------------------------------
    const { code } = req.body || {};

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authenticator code is required",
      });
    }

    // Only allow exactly 6 digits
    const cleanCode = String(code).replace(/\s/g, "");

    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({
        success: false,
        message: "Authenticator code must contain 6 digits",
      });
    }

    // -------------------------------------------------------
    // 7. Verify TOTP code
    // -------------------------------------------------------
    const result = await verify({
      secret: userData.mfaSecret,
      token: cleanCode,
    });

    const isValid = result.valid === true;

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticator code",
      });
    }

    // -------------------------------------------------------
    // 8. MFA successfully verified
    //
    // ONLY NOW do we enable MFA.
    // -------------------------------------------------------
    await userRef.set(
      {
        mfaEnabled: true,
        mfaSetupPending: false,
      },
      {
        merge: true,
      }
    );

    // -------------------------------------------------------
    // 9. Return success
    // -------------------------------------------------------
    return res.status(200).json({
      success: true,
      message: "MFA enabled successfully",
      mfaEnabled: true,
      userId,
    });

  } catch (error) {
    console.error("MFA setup verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify MFA setup",
    });
  }
}