// api/auth/mfa-setup.js

import { adminAuth, adminDb } from "./firebaseAdmin.js";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";

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
    // 3. Find the user in Firestore
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
    // 4. Check whether MFA is already enabled
    // -------------------------------------------------------
    if (userData.mfaEnabled === true) {
      return res.status(400).json({
        success: false,
        message: "MFA is already enabled",
      });
    }

    // -------------------------------------------------------
    // 5. Generate a new TOTP secret
    // -------------------------------------------------------
    const secret = generateSecret();

    // -------------------------------------------------------
    // 6. Create Authenticator URI
    //
    // This is what Google Authenticator,
    // Microsoft Authenticator, etc. use.
    // -------------------------------------------------------
    const issuer = "Dhyan Attendance";

    const otpauthUrl = generateURI({
      issuer,
      label: `${issuer}:${userId}`,
      secret,
    });

    // -------------------------------------------------------
    // 7. Generate QR code
    // -------------------------------------------------------
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // -------------------------------------------------------
    // 8. Save secret as PENDING MFA setup
    //
    // MFA remains disabled until the user verifies
    // a valid authenticator code.
    // -------------------------------------------------------
    await userRef.set(
      {
        mfaEnabled: false,
        mfaSecret: secret,
        mfaSetupPending: true,
      },
      {
        merge: true,
      }
    );

    // -------------------------------------------------------
    // 9. Return setup information
    // -------------------------------------------------------
    return res.status(200).json({
      success: true,
      message: "MFA setup initialized",
      userId,
      qrCode,
      secret,
      otpauthUrl,
    });

  } catch (error) {
    console.error("MFA setup error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to initialize MFA setup",
    });
  }
}