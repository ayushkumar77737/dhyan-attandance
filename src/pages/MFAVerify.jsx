import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import "./MFAVerify.css";

import {
  verifyMfaLogin,
  markMfaVerified,
  clearMfaSession,
} from "../utils/mfa";

const MFAVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Check Firebase authentication
  // --------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthChecking(false);

      if (!user) {
        clearMfaSession();

        navigate("/login", {
          replace: true,
        });
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // --------------------------------------------------
  // Verify MFA
  // --------------------------------------------------
  const handleVerify = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    const cleanCode = code.replace(/\D/g, "");

    // --------------------------------------------------
    // Validate code
    // --------------------------------------------------
    if (!/^\d{6}$/.test(cleanCode)) {
      setError("Please enter the 6-digit authenticator code.");
      return;
    }

    // --------------------------------------------------
    // Make sure Firebase login still exists
    // --------------------------------------------------
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError(
        "Your login session has expired. Please login again."
      );

      clearMfaSession();

      navigate("/login", {
        replace: true,
      });

      return;
    }

    try {
      setLoading(true);

      // --------------------------------------------------
      // Get a fresh Firebase ID token
      //
      // This prevents an old/stale token from being used.
      // --------------------------------------------------
      await currentUser.getIdToken(true);

      // --------------------------------------------------
      // Send code to backend
      // Backend verifies:
      //
      // Firebase ID token
      // +
      // User account
      // +
      // MFA secret
      // +
      // TOTP code
      // --------------------------------------------------
      const result = await verifyMfaLogin(cleanCode);

      // --------------------------------------------------
      // Backend MUST explicitly confirm MFA
      // --------------------------------------------------
      if (
        !result ||
        result.success !== true ||
        result.mfaVerified !== true ||
        result.mfaEnabled !== true
      ) {
        throw new Error(
          result?.message ||
            "MFA verification failed."
        );
      }

      // --------------------------------------------------
      // MFA verification successful
      // --------------------------------------------------
      markMfaVerified();

      // --------------------------------------------------
      // Remove temporary MFA login state
      // --------------------------------------------------
      sessionStorage.removeItem("mfaPending");
      sessionStorage.removeItem("mfaLoginUserId");

      // --------------------------------------------------
      // Store application User ID
      // --------------------------------------------------
      if (result.userId) {
        localStorage.setItem(
          "userId",
          result.userId
        );
      }

      // --------------------------------------------------
      // Store user name if available
      // --------------------------------------------------
      if (result.name) {
        localStorage.setItem(
          "userName",
          result.name
        );
      }

      // --------------------------------------------------
      // Admin
      // --------------------------------------------------
      if (result.role === "admin") {
        localStorage.setItem(
          "adminAuth",
          "true"
        );

        localStorage.removeItem("userAuth");

        navigate("/admin-dashboard", {
          replace: true,
        });

        return;
      }

      // --------------------------------------------------
      // Normal User
      // --------------------------------------------------
      localStorage.setItem(
        "userAuth",
        "true"
      );

      localStorage.removeItem("adminAuth");

      // --------------------------------------------------
      // If the user originally requested another protected
      // page, return them there.
      //
      // Otherwise go to dashboard.
      // --------------------------------------------------
      const requestedPath =
        location.state?.from;

      if (
        requestedPath &&
        requestedPath !== "/login" &&
        requestedPath !== "/mfa-setup" &&
        requestedPath !== "/mfa-verify"
      ) {
        navigate(requestedPath, {
          replace: true,
        });
      } else {
        navigate("/user-dashboard", {
          replace: true,
        });
      }

    } catch (error) {
      console.error(
        "MFA verification error:",
        error
      );

      // --------------------------------------------------
      // IMPORTANT:
      // Never mark MFA as verified when verification fails.
      // --------------------------------------------------
      clearMfaSession();

      let message =
        "Invalid authenticator code.";

      if (error?.message) {
        message = error.message;
      }

      setError(message);
      setCode("");

    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Back to Login
  // --------------------------------------------------
  const handleBackToLogin = async () => {
    if (loading) return;

    try {
      setLoading(true);

      // --------------------------------------------------
      // Clear MFA-related session state
      // --------------------------------------------------
      clearMfaSession();

      sessionStorage.removeItem("mfaPending");
      sessionStorage.removeItem("mfaLoginUserId");

      // --------------------------------------------------
      // Clear application authentication state
      // --------------------------------------------------
      localStorage.removeItem("userAuth");
      localStorage.removeItem("adminAuth");
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");

      // --------------------------------------------------
      // Sign out Firebase
      // --------------------------------------------------
      if (auth.currentUser) {
        await signOut(auth);
      }

      navigate("/login", {
        replace: true,
      });

    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      // Even if Firebase sign-out fails,
      // send the user back to login.
      navigate("/login", {
        replace: true,
      });

    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Authentication loading
  // --------------------------------------------------
  if (authChecking) {
    return (
      <div className="mfa-verify-page">
        <div className="mfa-verify-card">

          <div className="mfa-icon">
            🔐
          </div>

          <h1>
            Checking Authentication
          </h1>

          <p className="mfa-description">
            Please wait...
          </p>

        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // MFA Verification Page
  // --------------------------------------------------
  return (
    <div className="mfa-verify-page">

      <div className="mfa-verify-card">

        <div className="mfa-icon">
          🔐
        </div>

        <h1>
          Authenticator Verification
        </h1>

        <p className="mfa-description">
          Open your authenticator app and enter
          the 6-digit verification code to
          continue.
        </p>

        <form onSubmit={handleVerify}>

          <label className="mfa-label">
            Authenticator Code
          </label>

          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            disabled={loading}
            autoFocus
            placeholder="000000"
            className="mfa-code-input"
            onChange={(e) => {
              const value =
                e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6);

              setCode(value);

              if (error) {
                setError("");
              }
            }}
          />

          {error && (
            <div
              className="mfa-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="mfa-verify-button"
            disabled={
              loading ||
              code.length !== 6
            }
          >
            {loading
              ? "Verifying..."
              : "Verify & Continue"}
          </button>

        </form>

        <button
          type="button"
          className="mfa-back-button"
          onClick={handleBackToLogin}
          disabled={loading}
        >
          ← Back to Login
        </button>

      </div>

    </div>
  );
};

export default MFAVerify;