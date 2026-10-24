import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

import {
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { useTranslation } from "react-i18next";

import dhyanImage from "../assets/Dhyan.png";
import logo2 from "../assets/logo2.png";
/* same artwork as the landing page */
import bgSunrise from "../assets/landing-bg.webp";
import lotusCorner from "../assets/landing-lotus-corner.png";
import { logLogin } from "../utils/logActivity";
import { getMfaStatus, markMfaVerified, clearMfaSession } from "../utils/mfa";
import GoogleSignInButton from "../components/GoogleSignInButton";
import {
  verifyPasskeyLogin,
  prefetchPasskeyLogin,
  passkeysSupported,
  cancelPasskeyPrompt,
  passkeyErrorKey,
} from "../utils/passkey";

/* ------------------------------------------------------------------ */
/* Inline icons                                                       */
/* ------------------------------------------------------------------ */
const I = {
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  lotus: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4c1.3 1.5 2 3.1 2 4.7 0 .8-.2 1.6-.6 2.4.7-.4 1.3-1 1.9-1.9.3 1.4.1 2.7-.6 3.9 1-.3 1.9-.8 2.8-1.6-.1 2.2-1.5 4-3.6 5.1-.6.4-1.2.6-1.9.8-.7-.2-1.3-.4-1.9-.8C8 15.4 6.6 13.6 6.5 11.4c.9.8 1.8 1.3 2.8 1.6-.7-1.2-.9-2.5-.6-3.9.6.9 1.2 1.5 1.9 1.9-.4-.8-.6-1.6-.6-2.4C10 7.1 10.7 5.5 12 4z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  peace: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" /><path d="M12 7c-1.6 0-3 1.2-3 3v3M12 7c1.6 0 3 1.2 3 3v3" />
      <path d="M6 16c-1.4.4-2.6 1.2-3.4 2.4 2.6 1.1 5.6 1.6 9.4 1.6s6.8-.5 9.4-1.6c-.8-1.2-2-2-3.4-2.4" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h6a3 3 0 0 1 4 1 3 3 0 0 1 4-1h6v15h-6a3 3 0 0 0-4 1 3 3 0 0 0-4-1H2z" /><path d="M12 5v15" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M9 16l2 2 4-4" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  fingerprint: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 10.5v3.2a7 7 0 0 0 1.2 3.9" />
      <path d="M9 9.6a3.6 3.6 0 0 1 6.1 2.6c0 2 .3 3.4 1 4.6" />
      <path d="M6.4 12.2a5.9 5.9 0 0 1 2-4.9" />
      <path d="M9.2 19.4A8.8 8.8 0 0 1 8 15.2v-3a4 4 0 0 1 .3-1.6" />
      <path d="M4.6 8.4a8.6 8.6 0 0 1 13.6-1.6" />
      <path d="M19.6 9.6c.3 1 .4 1.9.4 2.8 0 1.9.1 3.4.6 4.6" />
    </svg>
  ),
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
};

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  /* Passkey panel: null = normal login view;
   "working" | "error" | "unsupported" | "success" = passkey view */
  const [passkeyState, setPasskeyState] = useState(null);
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [passkeyCode, setPasskeyCode] = useState("");

  useEffect(() => {
    const disableRightClick = (e) => e.preventDefault();
    const disableInspectKeys = (e) => {
      if (e.key === "F12") e.preventDefault();
      if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase()))
        e.preventDefault();
      if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
    };
    document.addEventListener("contextmenu", disableRightClick);
    document.addEventListener("keydown", disableInspectKeys);
    prefetchPasskeyLogin(); // ready before the click (see src/utils/passkey.js)
    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableInspectKeys);
    };
  }, []);

  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(""), 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!id || !password) {
      showError(t("fillAllFields"));
      return;
    }
    if (!/^[A-Z0-9]{1,10}$/.test(id)) {
      showError(t("invalidIdFormat"));
      return;
    }

    setLoading(true);

    const safeId = id.toUpperCase();
    const userRef = doc(db, "loginAttempts", safeId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.lockUntil && Date.now() < data.lockUntil) {
        const minutes = Math.ceil((data.lockUntil - Date.now()) / 60000);
        showError(t("accountLocked", { minutes }));
        setLoading(false);
        return;
      }
    }

    try {
      // Remember Me → keep session across browser restarts, else session-only
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      /* Resolve the ID to a real email via idEmailMap (written by AddUser
         and AddAdmin at account-creation time). Falls back to the old
         id@gmail.com pattern for accounts created before this lookup
         collection existed, so nobody already using the app is locked out. */
      let email = `${safeId}@gmail.com`;
      try {
        const mapSnap = await getDoc(doc(db, "idEmailMap", safeId));
        if (mapSnap.exists() && mapSnap.data().email) {
          email = mapSnap.data().email;
        }
      } catch (mapErr) {
        console.warn("idEmailMap lookup failed, falling back to id@gmail.com:", mapErr);
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      await setDoc(userRef, {
        attempts: 0,
        lockUntil: null,
      });

      const userDoc = await getDoc(
        doc(db, "users", id.toUpperCase())
      );

      if (userDoc.exists() && userDoc.data().disabled === true) {
        await signOut(auth);

        showError(t("accountDisabled"));

        setLoading(false);
        return;
      }

      // -------------------------------------------------------
      // CHECK MFA STATUS BEFORE ALLOWING DASHBOARD ACCESS
      // -------------------------------------------------------

      const mfaStatus = await getMfaStatus();

      if (!mfaStatus.success) {
        await signOut(auth);

        showError("Unable to verify MFA status.");

        setLoading(false);
        return;
      }

      if (mfaStatus.enabled !== true) {
        // MFA is mandatory.
        // Do NOT allow dashboard access.
        navigate("/mfa-setup");

        setLoading(false);
        return;
      }


      // -------------------------------------------------------
      // MFA IS ENABLED
      // Go to dedicated MFA verification page.
      // Dashboard is NOT accessible yet.
      // -------------------------------------------------------

      setLoading(false);

      navigate("/mfa-verify", {
        replace: true,
      });

      return;
    } catch (error) {
      console.log(error);
      setId("");
      setPassword("");

      let attempts = 1;
      if (userSnap.exists()) attempts = userSnap.data().attempts + 1;

      let lockUntil = null;
      if (attempts >= 3) lockUntil = Date.now() + 48 * 60 * 60 * 1000;

      await setDoc(userRef, { attempts, lockUntil });

      if (attempts >= 3) showError(t("tooManyAttempts"));
      else if (error.code === "auth/user-not-found") showError(t("userNotFound"));
      else if (error.code === "auth/wrong-password") showError(t("incorrectPassword"));
      else if (error.code === "auth/invalid-email") showError(t("invalidIdFormat"));
      else if (error.code === "auth/invalid-credential") showError(t("invalidCredential"));
      else showError(t("loginFailed"));
    }

    setLoading(false);
  };

  /* "Sign in with Google": the server checks the Google account against the
   portal users and returns a Firebase custom token for the existing uid.
   After that it is the same MFA flow as the ID + password login. */
  const handleGoogleLogin = async (credential) => {
    if (loading) return;
    setErrorMessage("");
    setLoading(true);

    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      const response = await fetch("/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || !data.customToken) {
        showError(data.message || t("googleLoginFailed", "Google sign-in failed. Please try again."));
        setLoading(false);
        return;
      }

      await signInWithCustomToken(auth, data.customToken);

      const mfaStatus = await getMfaStatus();

      if (!mfaStatus.success) {
        await signOut(auth);
        showError("Unable to verify MFA status.");
        setLoading(false);
        return;
      }

      setLoading(false);

      if (mfaStatus.enabled !== true) {
        navigate("/mfa-setup");
        return;
      }

      navigate("/mfa-verify", { replace: true });
    } catch (error) {
      console.log(error);
      showError(t("googleLoginFailed", "Google sign-in failed. Please try again."));
      setLoading(false);
    }
  };
  /* "Login with Passkey": the browser shows its own passkey prompt (PIN,
   fingerprint, face…). The server verifies the signed response, works out
   the account from the stored credential, checks it is active, and returns
   a Firebase custom token for that account's existing uid. A passkey with
   user verification already proves two factors, so the authenticator-code
   step is not repeated. */
  const handlePasskeyLogin = async () => {
    if (loading) return;
    setErrorMessage("");
    setPasskeyMessage("");

    if (!passkeysSupported()) {
      setPasskeyState("unsupported");
      return;
    }

    setPasskeyState("working");
    setLoading(true);

    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      const result = await verifyPasskeyLogin();
      await signInWithCustomToken(auth, result.customToken);

      // MFA is mandatory in this portal. An account that has not set it up yet
      // goes through the normal setup page first.
      if (result.mfaEnabled !== true) {
        setLoading(false);
        navigate("/mfa-setup");
        return;
      }

      await logLogin(result.userId, result.name);

      // Only now, with everything done, mark the session as verified.
      markMfaVerified();
      sessionStorage.removeItem("mfaPending");
      sessionStorage.removeItem("mfaLoginUserId");
      localStorage.setItem("userId", result.userId);
      if (result.name) localStorage.setItem("userName", result.name);

      setPasskeyState("success");

      if (result.role === "admin") {
        localStorage.setItem("adminAuth", "true");
        localStorage.removeItem("userAuth");
        navigate("/admin-dashboard", { replace: true });
      } else {
        localStorage.setItem("userAuth", "true");
        localStorage.removeItem("adminAuth");
        navigate("/user-dashboard", { replace: true });
      }
    } catch (error) {
      // If sign-in half-completed, make sure no session or flag is left behind.
      clearMfaSession();
      ["userId", "userName", "userAuth", "adminAuth"].forEach((k) => localStorage.removeItem(k));
      if (auth.currentUser) {
        try { await signOut(auth); } catch { /* ignore */ }
      }
      prefetchPasskeyLogin(); // a fresh challenge for "Try again"
      setPasskeyCode(error?.code || "");
      setPasskeyMessage(t(passkeyErrorKey(error)));
      setPasskeyState(error?.code === "UNSUPPORTED" ? "unsupported" : "error");
      setLoading(false);
    }
  };

  const closePasskeyPanel = () => {
    cancelPasskeyPrompt();
    setPasskeyState(null);
    setPasskeyMessage("");
    setLoading(false);
  };
  const features = [
    { icon: I.peace, cls: "lnf--violet", title: t("featInnerPeace") || "Inner Peace", desc: t("featInnerPeaceDesc") || "Discover tranquility within yourself" },
    { icon: I.book, cls: "lnf--gold", title: t("featDivineWisdom") || "Divine Wisdom", desc: t("featDivineWisdomDesc") || "Learn timeless teachings for a meaningful life" },
    { icon: I.heart, cls: "lnf--rose", title: t("featCommunity") || "Community", desc: t("featCommunityDesc") || "Connect with like-minded souls on the path" },
    { icon: I.calendar, cls: "lnf--green", title: t("featDailySadhana") || "Daily Sadhana", desc: t("featDailySadhanaDesc") || "Build a consistent practice for spiritual growth" },
  ];

  // Portal title: last word gets its own line + purple colour, the rest stays gold
  const titleWords = (t("appTitle") || "Dhyan Attendance Portal").split(" ");
  const titleLast = titleWords.pop();

  return (
    <div className="login-page">

      {/* sunrise background + swaying lotus corners (same as landing page) */}
      <div
        className="login-sunrise-bg"
        style={{ backgroundImage: `url(${bgSunrise})` }}
      />
      <img src={lotusCorner} alt="" className="login-corner login-corner--l" />
      <img src={lotusCorner} alt="" className="login-corner login-corner--r" />

      <div className="login-shell">
        <div className="login-container">

          {/* ----------------------- LEFT ----------------------- */}
          <div className="login-left">

            <img src={logo2} alt="Logo" className="login-logo" loading="lazy" />

            <p className="guru-text">🙏🙏 {t("guruText") || "Jai Gurubande"} 🙏🙏</p>

            <h2 className="card-title">
              <span className="card-title-welcome">{t("welcomeTo") || "Welcome to"}</span>
              <span className="card-title-name">
                {titleWords.join(" ")}
                <span className="card-title-last">{titleLast}</span>
              </span>
            </h2>

            <div className="login-divider">
              <span className="login-divider-lotus">{I.lotus}</span>
            </div>

            <p className="guru-subtext">
              {t("loginSubtitle") || "Your sacred space for inner peace, self-awareness and divine connection."}
            </p>
            {passkeyState ? (
              <div className="login-passkey-panel" role="region" aria-labelledby="passkey-panel-title" aria-live="polite">
                <span className={`login-passkey-panel-icon${passkeyState === "working" ? " is-pulsing" : ""}`}>
                  {I.fingerprint}
                </span>
                <h3 id="passkey-panel-title" className="login-passkey-panel-title">
                  {t("passkey.login.panelTitle")}
                </h3>

                {passkeyState === "working" && (
                  <p className="login-passkey-panel-text">
                    <span className="login-passkey-spinner" aria-hidden="true" />
                    {t("passkey.login.waiting")}
                  </p>
                )}

                {passkeyState === "success" && (
                  <p className="login-passkey-panel-text">{t("passkey.login.success")}</p>
                )}

                {passkeyState === "unsupported" && (
                  <p className="login-error" role="alert">{t("passkey.errors.UNSUPPORTED")}</p>
                )}

                {passkeyState === "error" && (
                  <>
                    <p className="login-error" role="alert">{passkeyMessage}</p>
                    {["CANCELLED", "CREDENTIAL_NOT_FOUND"].includes(passkeyCode) && (
                      <p className="login-passkey-panel-hint">{t("passkey.login.noPasskeyHint")}</p>
                    )}
                    <button type="button" className="login-button" onClick={handlePasskeyLogin}>
                      <span>{t("passkey.login.tryAgain")}</span>
                    </button>
                  </>
                )}

                <button type="button" className="login-passkey-back" onClick={closePasskeyPanel}>
                  {I.back}
                  <span>{t("passkey.login.backToOther")}</span>
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={handleLogin}>

                  {/* USER ID */}
                  <div className="input-wrap">
                    <span className="input-icon">{I.user}</span>

                    <input
                      type="text"
                      placeholder={t("enterIdNo")}
                      className="login-input"
                      maxLength={6}
                      autoComplete="username"
                      value={id}
                      onChange={(e) => {
                        const filtered = e.target.value
                          .replace(/[^a-zA-Z0-9]/g, "")
                          .toUpperCase();

                        setId(filtered);
                      }}
                    />
                  </div>

                  {/* PASSWORD */}
                  <div className="input-wrap">
                    <span className="input-icon">{I.lock}</span>

                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("enterPassword")}
                      className="login-input"
                      maxLength={8}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        const filtered = e.target.value.replace(/[^0-9]/g, "");
                        setPassword(filtered);
                      }}
                    />

                    <span
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? I.eyeOff : I.eye}
                    </span>
                  </div>

                  {/* REMEMBER ME + FORGOT PASSWORD */}
                  <div className="login-options">

                    <label className="remember-me">

                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />

                      <span className="remember-box">
                        {rememberMe && I.check}
                      </span>

                      <span>
                        {t("rememberMe") || "Remember Me"}
                      </span>

                    </label>

                    <span
                      className="account-recovery"
                      onClick={() => navigate("/account-recovery")}
                    >
                      {t("accountRecovery")}
                    </span>

                  </div>

                  {/* ERROR */}
                  {errorMessage && (
                    <p className="login-error">
                      {errorMessage}
                    </p>
                  )}

                  {/* LOGIN BUTTON */}
                  <button
                    type="submit"
                    className="login-button"
                    disabled={loading}
                  >
                    <span>
                      {loading ? t("pleaseWait") : t("login")}
                    </span>

                    {!loading && (
                      <span className="login-button-arrow">
                        {I.arrow}
                      </span>
                    )}
                  </button>

                </form>

                <div className="login-or"><span>{t("orContinueWith") || "Or continue with"}</span></div>
                <GoogleSignInButton onCredential={handleGoogleLogin} disabled={loading} />

                <button
                  type="button"
                  className="login-passkey-btn"
                  onClick={handlePasskeyLogin}
                  disabled={loading}
                >
                  <span className="login-passkey-btn-icon">{I.fingerprint}</span>
                  <span>{t("passkey.login.button")}</span>
                </button>
              </>
            )}

            <div className="login-badges">
              <div className="login-badge">
                <span className="login-badge-icon lnb--violet">{I.shield}</span>
                <div className="login-badge-text">
                  <span className="login-badge-title">{t("badgeSecure") || "Secure"}</span>
                  <span className="login-badge-sub">{t("badgeSecureDesc") || "Your data is always protected"}</span>
                </div>
              </div>
              <div className="login-badge">
                <span className="login-badge-icon lnb--gold">{I.lotus}</span>
                <div className="login-badge-text">
                  <span className="login-badge-title">{t("badgeSpiritual") || "Spiritual"}</span>
                  <span className="login-badge-sub">{t("badgeSpiritualDesc") || "Pure • Peaceful • Positive"}</span>
                </div>
              </div>
              <div className="login-badge">
                <span className="login-badge-icon lnb--rose">{I.users}</span>
                <div className="login-badge-text">
                  <span className="login-badge-title">{t("badgeTrusted") || "Trusted"}</span>
                  <span className="login-badge-sub">{t("badgeTrustedDesc") || "Built for our community"}</span>
                </div>
              </div>
            </div>

          </div>

          {/* ----------------------- RIGHT ----------------------- */}
          <div className="login-right">
            <div className="login-right-glow" />
            <img src={dhyanImage} alt="Dhyan" className="login-right-img" loading="lazy" />
          </div>

        </div>

        {/* --------------------- FEATURE ROW --------------------- */}
        <div className="login-features">
          {features.map((f, i) => (
            <div className="login-feature" key={i}>
              <span className={`login-feature-icon ${f.cls}`}>{f.icon}</span>
              <div className="login-feature-text">
                <span className="login-feature-title">{f.title}</span>
                <span className="login-feature-desc">{f.desc}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Login;