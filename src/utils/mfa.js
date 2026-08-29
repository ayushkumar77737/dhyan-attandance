// src/utils/mfa.js

import { auth } from "../firebase/firebase";

/**
 * Get the current Firebase user's ID token.
 * This token is sent to the backend so the backend
 * can securely identify the logged-in Firebase user.
 */
const getAuthToken = async () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not authenticated");
  }

  return await user.getIdToken();
};

/**
 * Common API request helper
 */
const mfaRequest = async (endpoint, options = {}) => {
  const token = await getAuthToken();

  const response = await fetch(endpoint, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message || data.error || "MFA request failed"
    );
  }

  return data;
};


/* ============================================================
   MFA STATUS
   ============================================================ */

/**
 * Check whether MFA is enabled for the current user.
 *
 * Returns something like:
 * {
 *   success: true,
 *   enabled: true
 * }
 */
export const getMfaStatus = async () => {
  return await mfaRequest("/api/auth/mfa-status");
};


/* ============================================================
   MFA SETUP
   ============================================================ */

/**
 * Start MFA setup for the current user.
 *
 * The backend should return:
 * - secret
 * - otpauthUrl
 * - qrCode
 *
 * Example:
 * {
 *   success: true,
 *   secret: "...",
 *   otpauthUrl: "...",
 *   qrCode: "data:image/png;base64,..."
 * }
 */
export const setupMfa = async () => {
  return await mfaRequest("/api/auth/mfa-setup", {
    method: "POST",
  });
};


/* ============================================================
   VERIFY MFA SETUP
   ============================================================ */

/**
 * Verify the authenticator code entered during MFA setup.
 */
export const verifyMfaSetup = async (code) => {
  if (!code) {
    throw new Error("Authenticator code is required");
  }

  return await mfaRequest("/api/auth/mfa-verify-setup", {
    method: "POST",
    body: {
      code: String(code).trim(),
    },
  });
};


/* ============================================================
   VERIFY MFA DURING LOGIN
   ============================================================ */

/**
 * Verify the 6-digit authenticator code during login.
 *
 * IMPORTANT:
 * Password authentication happens first.
 * The user must NOT be sent to the dashboard until
 * this function successfully verifies the MFA code.
 */
export const verifyMfaLogin = async (code) => {
  if (!code) {
    throw new Error("Authenticator code is required");
  }

  return await mfaRequest("/api/auth/mfa-verify-login", {
    method: "POST",
    body: {
      code: String(code).trim(),
    },
  });
};


/* ============================================================
   COMPLETE MFA LOGIN
   ============================================================ */

/**
 * Store the MFA verification state locally.
 *
 * This is only a UI/session flag.
 * The actual MFA verification must happen on the backend.
 */
export const markMfaVerified = () => {
  sessionStorage.setItem("mfaVerified", "true");
};


/**
 * Check whether MFA has been verified in the current session.
 */
export const isMfaVerified = () => {
  return sessionStorage.getItem("mfaVerified") === "true";
};


/**
 * Remove MFA verification state.
 *
 * Call this during logout.
 */
export const clearMfaVerification = () => {
  sessionStorage.removeItem("mfaVerified");
};


/* ============================================================
   LOGOUT
   ============================================================ */

export const clearMfaSession = () => {
  sessionStorage.removeItem("mfaVerified");
  sessionStorage.removeItem("mfaPending");
};