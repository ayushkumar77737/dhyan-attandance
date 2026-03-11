// src/auth/Login.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";

import dhyanImage from "../assets/guruji.webp";
import bg1 from "../assets/bg1.webp";
import bg2 from "../assets/bg2.webp";
import bg3 from "../assets/bg3.webp";
import bg4 from "../assets/pic.jpeg";

const Login = () => {

  const navigate = useNavigate();

  const bgImages = [bg1, bg2, bg3, bg4];

  const [bgIndex, setBgIndex] = useState(0);

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  /* Background Slider */
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % bgImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  /* Disable Inspect */
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

  /* ERROR MESSAGE */
  const showError = (message) => {

    setErrorMessage(message);

    setTimeout(() => {
      setErrorMessage("");
    }, 3000);

  };

  /* LOGIN FUNCTION */
  const handleLogin = async (e) => {

    e.preventDefault();

    setErrorMessage("");

    if (!id || !password) {
      showError("Please fill all fields");
      return;
    }

    setLoading(true);

    try {

      const email = id + "@dhyan.com";

      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      const loggedEmail = userCredential.user.email;

      const ADMIN_EMAIL = "admin1@dhyan.com";

      /* ADMIN LOGIN */
      if (loggedEmail === ADMIN_EMAIL) {

        localStorage.setItem("adminAuth", "true");
        localStorage.removeItem("userAuth");
        localStorage.setItem("userId", id);

        navigate("/admin-dashboard");

      }

      /* USER LOGIN */
      else {

        localStorage.setItem("userAuth", "true");
        localStorage.removeItem("adminAuth");
        localStorage.setItem("userId", id);

        navigate("/user-dashboard");

      }

    } catch (error) {

      console.log(error);

      setId("");
      setPassword("");

      if (error.code === "auth/user-not-found") {
        showError("User ID does not exist.");
      }
      else if (error.code === "auth/wrong-password") {
        showError("Incorrect password.");
      }
      else if (error.code === "auth/invalid-email") {
        showError("Invalid ID format.");
      }
      else if (error.code === "auth/invalid-credential") {
        showError("Invalid ID or Password.");
      }
      else {
        showError("Login failed. Please try again.");
      }

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

      <div className="login-container">

        {/* LEFT SIDE FORM */}
        <div className="login-left">

          <h2 className="card-title">
            Meditation <span>(Dhyan)</span> Program
          </h2>
          <p className="guru-text">🙏 Jai Gurubande 🙏</p>
          <p className="guru-subtext">Saheb Sabaka</p>
          <form onSubmit={handleLogin}>

            {/* ID FIELD */}
            <input
              type="text"
              placeholder="Enter Id No"
              className="login-input"
              maxLength={10}
              value={id}
              onChange={(e) => {
                const filtered = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                setId(filtered);
              }}
            />

            {/* PASSWORD */}
            <div className="password-wrapper">

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                className="login-input"
                maxLength={10}
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

            {/* ERROR MESSAGE */}
            {errorMessage && (
              <p className="login-error">{errorMessage}</p>
            )}

            <button
              className="login-button"
              disabled={loading}
            >
              {loading ? "Please Wait..." : "Login"}
            </button>

          </form>

          <p
            className="forgot-password"
            onClick={() => navigate("/forgot-password")}
          >
            Forgot Password?
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