import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useTranslation } from "react-i18next";
import { auth } from "../firebase/firebase";
import { logLogin } from "../utils/logActivity";
import "./MFAVerify.css";

import {
  verifyMfaLogin,
  markMfaVerified,
  clearMfaSession,
} from "../utils/mfa";

const CODE_LENGTH = 6;
/* TOTP codes rotate every 30 s — the ring around the shield sweeps on
   the same clock so the user can see how long the code in their app
   is still good for. */
const TOTP_PERIOD = 30;

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

/* Large soft-glass shield used as background artwork */
const BigShield = ({ solid }) => (
  <svg viewBox="0 0 200 240" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <linearGradient id={solid ? "mfavShieldA" : "mfavShieldB"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#dbe9ff" />
        <stop offset="1" stopColor="#a9ccff" />
      </linearGradient>
      <linearGradient id="mfavLock" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3b82f6" />
        <stop offset="1" stopColor="#1447d4" />
      </linearGradient>
    </defs>
    <path
      d="M100 8 20 40v70c0 52 35 96 80 118 45-22 80-66 80-118V40L100 8z"
      fill={`url(#${solid ? "mfavShieldA" : "mfavShieldB"})`}
      stroke="rgba(255,255,255,0.8)"
      strokeWidth="4"
    />
    <path d="M100 26 36 52v58c0 44 28 82 64 102" stroke="rgba(255,255,255,0.7)" strokeWidth="3" />
    <path d="M78 104V88a22 22 0 0 1 44 0v16" stroke="url(#mfavLock)" strokeWidth="10" />
    <rect x="66" y="102" width="68" height="52" rx="10" fill="url(#mfavLock)" />
    <circle cx="100" cy="124" r="6" fill="#fff" />
    <rect x="97" y="126" width="6" height="16" rx="3" fill="#fff" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
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
  <div className="mfav__art" aria-hidden="true">
    <span className="mfav__blob mfav__blob--tl" />
    <span className="mfav__blob mfav__blob--tr" />
    <span className="mfav__blob mfav__blob--bl" />
    <span className="mfav__blob mfav__blob--br" />
    <span className="mfav__blob mfav__blob--br2" />

    <span className="mfav__dots mfav__dots--l" />
    <span className="mfav__dots mfav__dots--r" />

    <div className="mfav__deco mfav__deco--left">
      <BigShield solid />
      <span className="mfav__orb mfav__orb--gold1" />
      <span className="mfav__orb mfav__orb--gold2" />
      <span className="mfav__orb mfav__orb--blue" />
      <span className="mfav__arc" />
    </div>

    <div className="mfav__deco mfav__deco--right">
      <BigShield />
    </div>
  </div>
);

const MFAVerify = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState(false);

  /* Seconds left in the current 30 s TOTP window (drives the ring). */
  const [secondsLeft, setSecondsLeft] = useState(
    () => TOTP_PERIOD - (Math.floor(Date.now() / 1000) % TOTP_PERIOD)
  );

  const inputRef = useRef(null);

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
  // TOTP window countdown
  // --------------------------------------------------
  useEffect(() => {
    const tick = () =>
      setSecondsLeft(TOTP_PERIOD - (Math.floor(Date.now() / 1000) % TOTP_PERIOD));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // --------------------------------------------------
  // Error shake
  // --------------------------------------------------
  const flashError = (message) => {
    setError(message);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

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
      flashError(t("mfaInvalidLength"));
      return;
    }

    // --------------------------------------------------
    // Make sure Firebase login still exists
    // --------------------------------------------------
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError(t("mfaSessionExpired"));

      clearMfaSession();

      navigate("/login", {
        replace: true,
      });

      return;
    }

    try {
      setLoading(true);

      // Get a fresh Firebase ID token (prevents a stale token being used)
      await currentUser.getIdToken(true);

      // Backend verifies: Firebase ID token + user account + MFA secret + TOTP code
      const result = await verifyMfaLogin(cleanCode);

      // Backend MUST explicitly confirm MFA
      if (
        !result ||
        result.success !== true ||
        result.mfaVerified !== true ||
        result.mfaEnabled !== true
      ) {
        throw new Error(
          result?.message ||
          t("mfaFailed")
        );
      }

      // MFA verification successful
      markMfaVerified();
      setSuccess(true);

      // Remove temporary MFA login state
      sessionStorage.removeItem("mfaPending");
      sessionStorage.removeItem("mfaLoginUserId");

      // Store application User ID
      if (result.userId) {
        localStorage.setItem(
          "userId",
          result.userId
        );
      }

      // Store user name if available
      if (result.name) {
        localStorage.setItem(
          "userName",
          result.name
        );
      }

      // Record the login in activityLogs.
      // This is the ONLY place a login should be logged: Login.jsx succeeds
      // on password alone, so logging there would record users who never
      // passed MFA. result.userId is the real users/{id} doc ID, which
      // logLogout() later matches on to close this session. logLogin()
      // swallows its own errors, so a failed write never blocks the redirect.
      if (result.userId) {
        await logLogin(result.userId, result.name);
      }

      /* Short pause so the success state is visible before the route
         changes — long enough to register, short enough not to drag. */
      const go = (path) =>
        setTimeout(() => navigate(path, { replace: true }), 550);

      // Admin
      if (result.role === "admin") {
        localStorage.setItem(
          "adminAuth",
          "true"
        );

        localStorage.removeItem("userAuth");

        go("/admin-dashboard");
        return;
      }

      // Normal User
      localStorage.setItem(
        "userAuth",
        "true"
      );

      localStorage.removeItem("adminAuth");

      // If the user originally requested another protected page,
      // return them there. Otherwise go to dashboard.
      const requestedPath =
        location.state?.from;

      if (
        requestedPath &&
        requestedPath !== "/login" &&
        requestedPath !== "/mfa-setup" &&
        requestedPath !== "/mfa-verify"
      ) {
        go(requestedPath);
      } else {
        go("/user-dashboard");
      }

    } catch (error) {
      console.error(
        "MFA verification error:",
        error
      );

      // IMPORTANT: never mark MFA as verified when verification fails.
      clearMfaSession();

      let message = t("mfaInvalidCode");

      if (error?.message) {
        message = error.message;
      }

      flashError(message);
      setCode("");
      inputRef.current?.focus();

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

      // Clear MFA-related session state
      clearMfaSession();

      sessionStorage.removeItem("mfaPending");
      sessionStorage.removeItem("mfaLoginUserId");

      // Clear application authentication state
      localStorage.removeItem("userAuth");
      localStorage.removeItem("adminAuth");
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");

      // Sign out Firebase
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

      // Even if Firebase sign-out fails, send the user back to login.
      navigate("/login", {
        replace: true,
      });

    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Ring geometry (r=34 → circumference ≈ 213.6)
  // --------------------------------------------------
  const RING_R = 34;
  const RING_C = 2 * Math.PI * RING_R;
  const ringOffset = RING_C * (1 - secondsLeft / TOTP_PERIOD);
  const ringUrgent = secondsLeft <= 5;

  // --------------------------------------------------
  // Authentication loading
  // --------------------------------------------------
  if (authChecking) {
    return (
      <div className="mfav">
        <Backdrop />
        <div className="mfav__card mfav__card--checking">
          <div className="mfav__badge mfav__badge--spin">
            <BadgeShield />
          </div>
          <h1 className="mfav__title">{t("mfaCheckingAuth")}</h1>
          <p className="mfav__desc">{t("mfaPleaseWait")}</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // MFA Verification Page
  // --------------------------------------------------
  const cells = Array.from({ length: CODE_LENGTH }, (_, i) => code[i] || "");
  const activeIndex = Math.min(code.length, CODE_LENGTH - 1);

  return (
    <div className="mfav">
      <Backdrop />

      <div className={`mfav__card ${shake ? "is-shaking" : ""} ${success ? "is-success" : ""}`}>

        {/* ---------- shield + 30 s ring ---------- */}
        <div className="mfav__hero">
          <span className="mfav__spark mfav__spark--1" />
          <span className="mfav__spark mfav__spark--2" />
          <span className="mfav__spark mfav__spark--3" />
          <span className="mfav__spark mfav__spark--4" />
          <span className="mfav__spark mfav__spark--5" />

          <svg className="mfav__ring" viewBox="0 0 80 80" aria-hidden="true">
            <circle className="mfav__ring-track" cx="40" cy="40" r={RING_R} />
            <circle
              className={`mfav__ring-fill ${ringUrgent ? "is-urgent" : ""}`}
              cx="40" cy="40" r={RING_R}
              strokeDasharray={RING_C}
              strokeDashoffset={ringOffset}
            />
          </svg>
          <div className={`mfav__badge ${success ? "is-success" : ""}`}>
            {success ? <CheckIcon /> : <BadgeShield />}
          </div>
          <span className={`mfav__timer ${ringUrgent ? "is-urgent" : ""}`} aria-live="polite">
            {secondsLeft}{t("mfaSecondsShort", "s")}
          </span>
        </div>

        <span className="mfav__eyebrow">{t("mfaEyebrow", "Two-step verification")}</span>

        {/* Title is split into two translatable parts so the accent
            words can be coloured in every language. */}
        <h1 className="mfav__title">
          {t("mfaTitleLead", "Confirm")}{" "}
          <span className="mfav__title-accent">{t("mfaTitleAccent", "it's you")}</span>
        </h1>

        <p className="mfav__desc">
          {t("mfaDescription", "Open your authenticator app and enter the 6-digit code shown for this account.")}
        </p>

        <form onSubmit={handleVerify} className="mfav__form">
          <label className="mfav__label" htmlFor="mfav-code">
            {t("mfaCodeLabel", "Authenticator code")}
          </label>

          {/* One real input (keeps SMS/authenticator autofill working);
              the six cells beneath are a pure visual of its value. */}
          <div
            className={`mfav__cells ${focused ? "is-focused" : ""} ${error ? "is-error" : ""}`}
            onClick={() => inputRef.current?.focus()}
          >
            {cells.map((ch, i) => (
              <span
                key={i}
                className={`mfav__cell ${ch ? "is-filled" : ""} ${focused && i === activeIndex && !success ? "is-active" : ""}`}
                style={{ animationDelay: `${0.32 + i * 0.05}s` }}
              >
                {ch}
              </span>
            ))}
            <input
              id="mfav-code"
              ref={inputRef}
              className="mfav__input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              value={code}
              disabled={loading || success}
              autoFocus
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

          <p className="mfav__hint">{t("mfaCodeHint", "The code changes every 30 seconds.")}</p>

          {error && (
            <div className="mfav__error" role="alert">
              <AlertIcon />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="mfav__submit"
            disabled={loading || success || code.length !== CODE_LENGTH}
          >
            {success
              ? <><CheckIcon /> {t("mfaVerified")}</>
              : loading
                ? <><span className="mfav__spinner" /> {t("mfaVerifying")}</>
                : <>{t("mfaVerifyBtn", "Verify and continue")} <ArrowRightIcon /></>}
          </button>
        </form>

        <div className="mfav__back-row">
          <button
            type="button"
            className="mfav__back"
            onClick={handleBackToLogin}
            disabled={loading || success}
          >
            <ArrowLeftIcon />
            {t("mfaBackToLogin", "Back to login")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MFAVerify;