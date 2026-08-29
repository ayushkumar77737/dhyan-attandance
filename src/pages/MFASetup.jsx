import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  setupMfa,
  verifyMfaSetup,
  getMfaStatus,
} from "../utils/mfa";
import "./MFASetup.css";

const MFASetup = () => {
  const navigate = useNavigate();

  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    initializeMFA();
  }, []);

  const initializeMFA = async () => {
    try {
      setLoading(true);
      setError("");

      // First check whether MFA is already enabled
      const status = await getMfaStatus();

      if (status.enabled === true) {
        navigate("/user-dashboard", { replace: true });
        return;
      }

      // Start MFA setup
      const result = await setupMfa();

      if (!result.success) {
        throw new Error(result.message || "Unable to start MFA setup");
      }

      setQrCode(result.qrCode || "");
      setSecret(result.secret || "");
    } catch (err) {
      console.error("MFA setup error:", err);
      setError(err.message || "Unable to initialize MFA setup");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanCode = code.replace(/\D/g, "");

    if (cleanCode.length !== 6) {
      setError("Please enter the 6-digit authenticator code.");
      return;
    }

    try {
      setVerifying(true);

      const result = await verifyMfaSetup(cleanCode);

      if (!result.success) {
        throw new Error(
          result.message || "Invalid authenticator code"
        );
      }

      setSuccess("MFA enabled successfully!");

      // Give the user a moment to see the success message
      setTimeout(() => {
        navigate("/user-dashboard", { replace: true });
      }, 1000);
    } catch (err) {
      console.error("MFA verification error:", err);
      setError(err.message || "Invalid authenticator code.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="mfa-setup-page">
        <div className="mfa-card">
          <div className="mfa-loading">
            Loading MFA setup...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mfa-setup-page">
      <div className="mfa-card">

        <div className="mfa-header">
          <div className="mfa-icon">🔐</div>

          <h1>Set Up Two-Factor Authentication</h1>

          <p>
            Secure your Dhyan Attendance account with
            Microsoft Authenticator or Google Authenticator.
          </p>
        </div>

        {error && (
          <div className="mfa-error">
            {error}
          </div>
        )}

        {success && (
          <div className="mfa-success">
            {success}
          </div>
        )}

        {!qrCode ? (
          <div className="mfa-loading">
            Unable to generate MFA setup.
          </div>
        ) : (
          <>
            <div className="mfa-step">
              <span className="mfa-step-number">1</span>

              <div>
                <h3>Install an Authenticator App</h3>

                <p>
                  Use Microsoft Authenticator or Google
                  Authenticator on your phone.
                </p>
              </div>
            </div>

            <div className="mfa-step">
              <span className="mfa-step-number">2</span>

              <div>
                <h3>Scan the QR Code</h3>

                <p>
                  Open your authenticator app and scan this
                  QR code.
                </p>

                <div className="mfa-qr-wrapper">
                  <img
                    src={qrCode}
                    alt="MFA QR Code"
                    className="mfa-qr"
                  />
                </div>
              </div>
            </div>

            {secret && (
              <div className="mfa-secret">
                <p>
                  Can't scan the QR code?
                </p>

                <span>{secret}</span>
              </div>
            )}

            <div className="mfa-step">
              <span className="mfa-step-number">3</span>

              <div>
                <h3>Enter the 6-Digit Code</h3>

                <p>
                  Enter the code shown in your authenticator
                  app to complete setup.
                </p>

                <form onSubmit={handleVerify}>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);

                      setCode(value);
                    }}
                    className="mfa-code-input"
                  />

                  <button
                    type="submit"
                    disabled={
                      verifying || code.length !== 6
                    }
                    className="mfa-verify-button"
                  >
                    {verifying
                      ? "Verifying..."
                      : "Verify & Enable MFA"}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MFASetup;