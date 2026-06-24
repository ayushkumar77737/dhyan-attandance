import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

import {
  signInWithEmailAndPassword,
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
import bg1 from "../assets/bg1.webp";
import bg2 from "../assets/bg2.webp";
import bg3 from "../assets/bg3.webp";
import bg4 from "../assets/pic.webp";
import { logLogin } from "../utils/logActivity";

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
};

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const bgImages = [bg1, bg2, bg3, bg4];
  const [bgIndex, setBgIndex] = useState(0);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % bgImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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

      const email = safeId + "@gmail.com";
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      await setDoc(userRef, { attempts: 0, lockUntil: null });

      const userDoc = await getDoc(doc(db, "users", id.toUpperCase()));
      if (userDoc.exists() && userDoc.data().disabled === true) {
        await signOut(auth);
        showError(t("accountDisabled"));
        setLoading(false);
        return;
      }

      const userName = userDoc.exists() ? userDoc.data().name || id.toUpperCase() : id.toUpperCase();
      await logLogin(id.toUpperCase(), userName);

      const role = userDoc.exists() ? userDoc.data().role : "user";

      if (role === "admin") {
        localStorage.setItem("adminAuth", "true");
        localStorage.removeItem("userAuth");
        localStorage.setItem("userId", id.toUpperCase());
        navigate("/admin-dashboard");
      } else {
        localStorage.setItem("userAuth", "true");
        localStorage.removeItem("adminAuth");
        localStorage.setItem("userId", id.toUpperCase());
        navigate("/user-dashboard");
      }
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

  const features = [
    { icon: I.peace, cls: "lnf--violet", title: t("featInnerPeace") || "Inner Peace", desc: t("featInnerPeaceDesc") || "Discover tranquility within yourself" },
    { icon: I.book, cls: "lnf--gold", title: t("featDivineWisdom") || "Divine Wisdom", desc: t("featDivineWisdomDesc") || "Learn timeless teachings for a meaningful life" },
    { icon: I.heart, cls: "lnf--rose", title: t("featCommunity") || "Community", desc: t("featCommunityDesc") || "Connect with like-minded souls on the path" },
    { icon: I.calendar, cls: "lnf--green", title: t("featDailySadhana") || "Daily Sadhana", desc: t("featDailySadhanaDesc") || "Build a consistent practice for spiritual growth" },
  ];

  return (
    <div className="login-page">

      <div className="login-bg-wrapper">
        {bgImages.map((img, index) => (
          <div
            key={index}
            className={`login-bg ${index === bgIndex ? "active" : ""}`}
            style={{ backgroundImage: `url(${img})` }}
          ></div>
        ))}
      </div>

      <div className="carousel-dots">
        {bgImages.map((_, index) => (
          <span
            key={index}
            className={`carousel-dot ${index === bgIndex ? "active" : ""}`}
            onClick={() => setBgIndex(index)}
          />
        ))}
      </div>

      <div className="login-shell">
        <div className="login-container">

          {/* ----------------------- LEFT ----------------------- */}
          <div className="login-left">

            <img src={logo2} alt="Logo" className="login-logo" loading="lazy" />

            <p className="guru-text">🙏 {t("guruText") || "Jai Gurubande"} 🙏</p>

            <h2 className="card-title">
              <span className="card-title-welcome">{t("welcomeTo") || "Welcome to"}</span>
              <span className="card-title-name">{t("appTitle") || "Meditation Dhyan Portal"}</span>
            </h2>

            <div className="login-divider">
              <span className="login-divider-lotus">{I.lotus}</span>
            </div>

            <p className="guru-subtext">
              {t("loginSubtitle") || "Your sacred space for inner peace, self-awareness and divine connection."}
            </p>

            <form onSubmit={handleLogin}>

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
                    const filtered = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                    setId(filtered);
                  }}
                />
              </div>

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
                <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? I.eyeOff : I.eye}
                </span>
              </div>

              <div className="login-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="remember-box">{rememberMe && I.check}</span>
                  <span>{t("rememberMe") || "Remember Me"}</span>
                </label>
                <span className="forgot-password" onClick={() => navigate("/forgot-password")}>
                  {t("forgotPassword")}
                </span>
              </div>

              {errorMessage && <p className="login-error">{errorMessage}</p>}

              <button type="submit" className="login-button" disabled={loading}>
                <span>{loading ? t("pleaseWait") : t("login")}</span>
                {!loading && <span className="login-button-arrow">{I.arrow}</span>}
              </button>

            </form>

            <div className="login-or"><span>{t("orContinueWith") || "Or continue with"}</span></div>

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

            <p className="new-user-link" onClick={() => navigate("/get-id")}>
              {t("getId")} →
            </p>

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