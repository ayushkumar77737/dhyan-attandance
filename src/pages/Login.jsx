import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { useTranslation } from "react-i18next";

import dhyanImage from "../assets/Dhyan.png";
import bg1 from "../assets/bg1.webp";
import bg2 from "../assets/bg2.webp";
import bg3 from "../assets/bg3.webp";
import bg4 from "../assets/pic.jpeg";
import { logLogin } from "../utils/logActivity";

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

  // Auto-advance carousel every 5 seconds
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
      showError(t("fillAllFields"));
      return;
    }

    setLoading(true);

    const userRef = doc(db, "loginAttempts", id);
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
      const email = id + "@dhyan.in";
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedEmail = userCredential.user.email;

      await setDoc(userRef, { attempts: 0, lockUntil: null });

      const userDoc = await getDoc(doc(db, "users", id.toUpperCase()));
      if (userDoc.exists() && userDoc.data().disabled === true) {
        await signOut(auth);
        showError(t("accountDisabled"));
        setLoading(false);
        return;
      }

      // ← ADD THIS — log the login after disabled check passes
      const userName = userDoc.exists() ? userDoc.data().name || id.toUpperCase() : id.toUpperCase();
      await logLogin(id.toUpperCase(), userName);

      const ADMIN_EMAIL = "admin1@dhyan.in";

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

      if (attempts >= 3) showError(t("tooManyAttempts"));
      else if (error.code === "auth/user-not-found") showError(t("userNotFound"));
      else if (error.code === "auth/wrong-password") showError(t("incorrectPassword"));
      else if (error.code === "auth/invalid-email") showError(t("invalidIdFormat"));
      else if (error.code === "auth/invalid-credential") showError(t("invalidCredential"));
      else showError(t("loginFailed"));
    }

    setLoading(false);
  };

  return (
    <div className="login-page">

      {/* ← BACKGROUND CAROUSEL IMAGES */}
      <div className="login-bg-wrapper">
        {bgImages.map((img, index) => (
          <div
            key={index}
            className={`login-bg ${index === bgIndex ? "active" : ""}`}
            style={{ backgroundImage: `url(${img})` }}
          ></div>
        ))}
      </div>

      {/* ← CAROUSEL DOTS OVER BACKGROUND */}
      <div className="carousel-dots">
        {bgImages.map((_, index) => (
          <span
            key={index}
            className={`carousel-dot ${index === bgIndex ? "active" : ""}`}
            onClick={() => setBgIndex(index)}
          />
        ))}
      </div>

      <div className="login-container">

        {/* LEFT SIDE FORM */}
        <div className="login-left">

          <h2 className="card-title">{t("appTitle")}</h2>
          <p className="guru-text">{t("guruText")}</p>
          <p className="guru-subtext">{t("guruSubtext")}</p>

          <form onSubmit={handleLogin}>

            <input
              type="text"
              placeholder={t("enterIdNo")}
              className="login-input"
              maxLength={6}
              value={id}
              onChange={(e) => {
                const filtered = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                setId(filtered);
              }}
            />

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("enterPassword")}
                className="login-input"
                maxLength={8}
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
                {showPassword ? "🙈" : "👁"}
              </span>
            </div>

            {errorMessage && <p className="login-error">{errorMessage}</p>}

            <button className="login-button" disabled={loading}>
              {loading ? t("pleaseWait") : t("login")}
            </button>

          </form>

          <div className="login-bottom-links">
            <p className="new-user-link" onClick={() => navigate("/get-id")}>
              {t("getId")} →
            </p>
            <p className="forgot-password" onClick={() => navigate("/forgot-password")}>
              {t("forgotPassword")}
            </p>
          </div>

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