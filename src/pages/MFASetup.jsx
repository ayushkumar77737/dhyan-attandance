import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  setupMfa,
  verifyMfaSetup,
  getMfaStatus,
} from "../utils/mfa";
import "./MFASetup.css";

const CODE_LENGTH = 6;

/* ------------------------------------------------------------------ */
/* Icons                                                              */
/* ------------------------------------------------------------------ */

/* Shield inside the blue badge (gold outline, white fill, blue lock) */
const BadgeShield = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path
      d="M12 2.5 4.5 5.4v5.8c0 4.6 3.1 8.6 7.5 9.8 4.4-1.2 7.5-5.2 7.5-9.8V5.4L12 2.5z"
      fill="#ffffff"
      stroke="#f5b91a"
      strokeWidth="1.6"
    />
    <rect x="9" y="11" width="6" height="5" rx="1.2" fill="#1d5fe6" />
    <path d="M10.2 11V9.6a1.8 1.8 0 0 1 3.6 0V11" stroke="#1d5fe6" strokeWidth="1.5" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.6" />
    <path d="M10.5 18.5h3" />
  </svg>
);

const QrIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.2" /><rect x="14" y="3" width="7" height="7" rx="1.2" /><rect x="3" y="14" width="7" height="7" rx="1.2" />
    <path d="M14 14h3v3h-3zM20 14v1M17 20h4M20 17v.01" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="10.5" width="16" height="10.5" rx="2.4" />
    <path d="M7.5 10.5V7.8a4.5 4.5 0 0 1 9 0v2.7" />
    <path d="M12 15v2" />
  </svg>
);

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="15" r="4" />
    <path d="M10.85 12.15 19 4M18 5l2 2M15 8l2 2" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="12" height="12" rx="2.2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5M12 16.2v.1" />
  </svg>
);

/* Purely decorative background artwork (no text) */
const Backdrop = () => (
  <div className="mfas__art" aria-hidden="true">
    <span className="mfas__blob mfas__blob--tl" />
    <span className="mfas__blob mfas__blob--tr" />
    <span className="mfas__blob mfas__blob--bl" />
    <span className="mfas__blob mfas__blob--br" />
    <span className="mfas__blob mfas__blob--br2" />
    <span className="mfas__dots mfas__dots--l" />
    <span className="mfas__dots mfas__dots--r" />
  </div>
);

const MFASetup = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [shake, setShake] = useState(false);
  const [focused, setFocused] = useState(false);

  const inputRef = useRef(null);

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
        /* Already enabled but somehow landed here — send them through
           the normal verify step rather than straight to a dashboard.
           Login.jsx / MFAVerify.jsx are what actually set localStorage's
           userId/userName/adminAuth/userAuth from the backend's role, so
           skipping straight to a dashboard (especially for an admin)
           leaves that unset and the admin dashboard's guard bounces
           them out. */
        navigate("/mfa-verify", { replace: true });
        return;
      }

      // Start MFA setup
      const result = await setupMfa();

      if (!result.success) {
        throw new Error(result.message || t("mfaSetupStartFailed"));
      }

      setQrCode(result.qrCode || "");
      setSecret(result.secret || "");
    } catch (err) {
      console.error("MFA setup error:", err);
      setError(err.message || t("mfaSetupInitFailed"));
    } finally {
      setLoading(false);
    }
  };

  const flashError = (message) => {
    setError(message);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanCode = code.replace(/\D/g, "");

    if (cleanCode.length !== CODE_LENGTH) {
      flashError(t("mfaInvalidLength"));
      return;
    }

    try {
      setVerifying(true);

      const result = await verifyMfaSetup(cleanCode);

      if (!result.success) {
        throw new Error(
          result.message || t("mfaInvalidCode")
        );
      }

      setSuccess(t("mfaSetupSuccess"));

      /* Setup being enabled isn't the same as being verified for THIS
         session. Send both admins and regular users through the normal
         verify step next — that's the only place that writes the
         localStorage state (userId/userName/adminAuth/userAuth) either
         dashboard's guard actually relies on. Going straight to a
         dashboard from here skipped that, which is exactly why an admin
         ended up bounced to the landing page instead of their dashboard. */
      setTimeout(() => {
        navigate("/mfa-verify", { replace: true });
      }, 1000);
    } catch (err) {
      console.error("MFA verification error:", err);
      flashError(err.message || t("mfaInvalidCode"));
      setCode("");
      inputRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.warn("Clipboard unavailable:", err);
    }
  };

  /* Secret keys are usually 32 chars; grouping in fours makes them far
     easier to type into an app. Display only — the raw value is copied. */
  const groupedSecret = (secret || "").replace(/(.{4})/g, "$1 ").trim();

  /* ---------------- loading ---------------- */
  if (loading) {
    return (
      <div className="mfas">
        <Backdrop />
        <div className="mfas__card mfas__card--center">
          <div className="mfas__badge mfas__badge--spin">
            <BadgeShield />
          </div>
          <h1 className="mfas__title">{t("mfaSetupLoadingTitle")}</h1>
          <p className="mfas__desc">{t("mfaPleaseWait")}</p>
        </div>
      </div>
    );
  }

  const cells = Array.from({ length: CODE_LENGTH }, (_, i) => code[i] || "");
  const activeIndex = Math.min(code.length, CODE_LENGTH - 1);
  const done = Boolean(success);

  return (
    <div className="mfas">
      <Backdrop />

      <div className={`mfas__card ${shake ? "is-shaking" : ""} ${done ? "is-success" : ""}`}>

        {/* ---------- header ---------- */}
        <header className="mfas__head">
          <div className="mfas__hero">
            <span className="mfas__spark mfas__spark--1" />
            <span className="mfas__spark mfas__spark--2" />
            <span className="mfas__spark mfas__spark--3" />
            <span className="mfas__spark mfas__spark--4" />
            <span className="mfas__spark mfas__spark--5" />

            <svg className="mfas__ring" viewBox="0 0 80 80" aria-hidden="true">
              <circle className="mfas__ring-track" cx="40" cy="40" r="34" />
              <circle className="mfas__ring-fill" cx="40" cy="40" r="34" />
            </svg>
            <div className={`mfas__badge ${done ? "is-success" : ""}`}>
              {done ? <CheckIcon /> : <BadgeShield />}
            </div>
          </div>

          <span className="mfas__eyebrow">{t("mfaSetupEyebrow", "Two-step verification")}</span>

          {/* Title is split into two translatable parts so the accent
              word can be coloured in every language. */}
          <h1 className="mfas__title">
            {t("mfaSetupTitleLead", "Protect your")}{" "}
            <span className="mfas__title-accent">{t("mfaSetupTitleAccent", "account")}</span>
          </h1>

          <p className="mfas__desc">
            {t("mfaSetupDescription", "Add an authenticator app so signing in needs both your password and a code from your phone.")}
          </p>
        </header>

        {error && (
          <div className="mfas__msg mfas__msg--error" role="alert">
            <AlertIcon /><span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mfas__msg mfas__msg--success" role="status">
            <CheckIcon /><span>{success}</span>
          </div>
        )}

        {!qrCode ? (
          <div className="mfas__empty">
            <AlertIcon />
            <p>{t("mfaSetupNoQr")}</p>
          </div>
        ) : (
          <ol className="mfas__steps">

            {/* ---------- step 1 ---------- */}
            <li className="mfas__step">
              <div className="mfas__step-rail">
                <span className="mfas__step-num">1</span>
                <span className="mfas__step-line" />
              </div>
              <div className="mfas__step-body mfas__step-body--blue">
                <span className="mfas__step-ico"><PhoneIcon /></span>
                <div className="mfas__step-main">
                  <h3 className="mfas__step-title">{t("mfaStep1Title", "Install an authenticator app")}</h3>
                  <p className="mfas__step-text">{t("mfaStep1Text", "Use Microsoft Authenticator or Google Authenticator on your phone.")}</p>
                </div>
              </div>
            </li>

            {/* ---------- step 2 ---------- */}
            <li className="mfas__step">
              <div className="mfas__step-rail">
                <span className="mfas__step-num">2</span>
                <span className="mfas__step-line" />
              </div>
              <div className="mfas__step-body mfas__step-body--gold">
                <span className="mfas__step-ico mfas__step-ico--gold"><QrIcon /></span>
                <div className="mfas__step-main">
                  <h3 className="mfas__step-title">{t("mfaStep2Title", "Scan the QR code")}</h3>
                  <p className="mfas__step-text">{t("mfaStep2Text", "In the app, choose “Add account” and point your camera at this code.")}</p>
                </div>

                <div className="mfas__step-extra">
                  <div className="mfas__qr">
                    <span className="mfas__qr-corner mfas__qr-corner--tl" />
                    <span className="mfas__qr-corner mfas__qr-corner--tr" />
                    <span className="mfas__qr-corner mfas__qr-corner--bl" />
                    <span className="mfas__qr-corner mfas__qr-corner--br" />
                    <img src={qrCode} alt={t("mfaQrAlt")} className="mfas__qr-img" />
                    <span className="mfas__qr-scan" aria-hidden="true" />
                  </div>

                  {secret && (
                    <div className="mfas__secret">
                      <span className="mfas__secret-label">
                        <KeyIcon />{t("mfaCantScan", "Can't scan? Enter this key manually")}
                      </span>
                      <code className="mfas__secret-key">{groupedSecret}</code>
                      <button
                        type="button"
                        className={`mfas__copy ${copied ? "is-copied" : ""}`}
                        onClick={copySecret}
                      >
                        {copied
                          ? <><CheckIcon />{t("mfaCopied", "Copied")}</>
                          : <><CopyIcon />{t("mfaCopyKey", "Copy key")}</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>

            {/* ---------- step 3 ---------- */}
            <li className="mfas__step">
              <div className="mfas__step-rail">
                <span className="mfas__step-num">3</span>
              </div>
              <div className="mfas__step-body mfas__step-body--plain">
                <span className="mfas__step-ico"><LockIcon /></span>
                <div className="mfas__step-main">
                  <h3 className="mfas__step-title">{t("mfaStep3Title", "Enter the 6-digit code")}</h3>
                  <p className="mfas__step-text">{t("mfaStep3Text", "Type the code the app shows for this account to finish.")}</p>
                </div>

                <form onSubmit={handleVerify} className="mfas__form">
                  <div
                    className={`mfas__cells ${focused ? "is-focused" : ""} ${error ? "is-error" : ""}`}
                    onClick={() => inputRef.current?.focus()}
                  >
                    {cells.map((ch, i) => (
                      <span
                        key={i}
                        className={`mfas__cell ${ch ? "is-filled" : ""} ${focused && i === activeIndex && !done ? "is-active" : ""}`}
                      >
                        {ch}
                      </span>
                    ))}
                    <input
                      ref={inputRef}
                      className="mfas__input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={CODE_LENGTH}
                      value={code}
                      disabled={verifying || done}
                      aria-label={t("mfaCodeLabel", "Authenticator code")}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
                        setCode(value);
                        if (error) setError("");
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
                        setCode(pasted);
                        if (error) setError("");
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="mfas__submit"
                    disabled={verifying || done || code.length !== CODE_LENGTH}
                  >
                    {done
                      ? <><CheckIcon /> {t("mfaSetupEnabled")}</>
                      : verifying
                        ? <><span className="mfas__spinner" /> {t("mfaVerifying")}</>
                        : <>{t("mfaSetupVerifyBtn", "Verify and enable")} <ArrowRightIcon /></>}
                  </button>
                </form>
              </div>
            </li>
          </ol>
        )}
      </div>
    </div>
  );
};

export default MFASetup;