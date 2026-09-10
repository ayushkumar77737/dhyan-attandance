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
    // 3. Get user document
    //
    // Accounts no longer use a fabricated USER_ID@gmail.com
    // address — AddUser.jsx / AddAdmin.jsx now store the real
    // personal email on users/{id}.email, so the ID can't be
    // derived from the email string anymore. Look it up by the
    // stored email field instead.
    // -------------------------------------------------------
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
    const userRef = userSnap.ref;
    const userId = userSnap.id;
    const userData = userSnap.data();

    // -------------------------------------------------------
    // 4. Check MFA setup
    // -------------------------------------------------------
    if (!userData.mfaSecret || userData.mfaSetupPending !== true) {
      return res.status(400).json({
        success: false,
        message: "MFA setup has not been started",
      });
    }

    // -------------------------------------------------------
    // 5. Get authenticator code
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
    // 6. Verify TOTP code
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
    // 7. MFA successfully verified
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
    // 8. Return success
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