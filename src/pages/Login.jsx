import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { useTranslation } from "react-i18next";          // ← ADD
import LanguageSwitcher from "../components/LanguageSwitcher"; // ← ADD

import dhyanImage from "../assets/Dhyan.png";
import bg1 from "../assets/bg1.webp";
import bg2 from "../assets/bg2.webp";
import bg3 from "../assets/bg3.webp";
import bg4 from "../assets/pic.jpeg";

const Login = () => {

  const { t } = useTranslation(); // ← ADD
  const navigate = useNavigate();

  const bgImages = [bg1, bg2, bg3, bg4];
  const [bgIndex, setBgIndex] = useState(0);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
      if (e.ctrlKey && e.key.toUpperCase() === "U")
        e.preventDefault();
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
      showError(t("fillAllFields")); // ← CHANGED
      return;
    }

    setLoading(true);

    const userRef = doc(db, "loginAttempts", id);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.lockUntil && Date.now() < data.lockUntil) {
        const minutes = Math.ceil((data.lockUntil - Date.now()) / 60000);
        showError(t("accountLocked", { minutes })); // ← CHANGED
        setLoading(false);
        return;
      }
    }

    try {
      const email = id + "@dhyan.com";
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedEmail = userCredential.user.email;

      await setDoc(userRef, { attempts: 0, lockUntil: null });

      const ADMIN_EMAIL = "admin1@dhyan.com";

      if (loggedEmail === ADMIN_EMAIL) {
        localStorage.setItem("adminAuth", "true");
        localStorage.removeItem("userAuth");
        localStorage.setItem("userId", id);
        navigate("/admin-dashboard");
      } else {
        localStorage.setItem("userAuth", "true");
        localStorage.removeItem("adminAuth");
        localStorage.setItem("userId", id);
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

      if (attempts >= 3) showError(t("tooManyAttempts"));                       // ← CHANGED
      else if (error.code === "auth/user-not-found") showError(t("userNotFound")); // ← CHANGED
      else if (error.code === "auth/wrong-password") showError(t("incorrectPassword")); // ← CHANGED
      else if (error.code === "auth/invalid-email") showError(t("invalidIdFormat")); // ← CHANGED
      else if (error.code === "auth/invalid-credential") showError(t("invalidCredential")); // ← CHANGED
      else showError(t("loginFailed")); // ← CHANGED
    }

    setLoading(false);
  };

  return (
    <div className="login-page">

      {/* Background Slider */}
      <div className="login-bg-wrapper">
        {bgImages.map((img, index) => (
          <div
            key={index}
            className={`login-bg ${index === bgIndex ? "active" : ""}`}
            style={{ backgroundImage: `url(${img})` }}
          ></div>
        ))}
      </div>

      {/* ← LANGUAGE SWITCHER TOP RIGHT */}
      <div className="lang-switcher-top">
        <LanguageSwitcher />
      </div>

      <div className="login-container">

        {/* LEFT SIDE FORM */}
        <div className="login-left">

          <h2 className="card-title">
            {t("appTitle")} {/* ← CHANGED */}
          </h2>

          <p className="guru-text">{t("guruText")}</p>       {/* ← CHANGED */}
          <p className="guru-subtext">{t("guruSubtext")}</p> {/* ← CHANGED */}

          <form onSubmit={handleLogin}>

            <input
              type="text"
              placeholder={t("enterIdNo")} // ← CHANGED
              className="login-input"
              maxLength={6}
              value={id}
              onChange={(e) => {
                const filtered = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                setId(filtered);
              }}
            />

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("enterPassword")} // ← CHANGED
                className="login-input"
                maxLength={8}
                value={password}
                onChange={(e) => {
                  const filtered = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                  setPassword(filtered);
                }}
              />
              <span
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁"}
              </span>
            </div>

            {errorMessage && <p className="login-error">{errorMessage}</p>}

            <button className="login-button" disabled={loading}>
              {loading ? t("pleaseWait") : t("login")} {/* ← CHANGED */}
            </button>

          </form>

          <p className="forgot-password" onClick={() => navigate("/forgot-password")}>
            {t("forgotPassword")} {/* ← CHANGED */}
          </p>

        </div>

        {/* RIGHT SIDE IMAGE */}
        <div className="login-right">
          <img src={dhyanImage} alt="Dhyan" />
        </div>

      </div>
    </div>
  );
};

export default Login;