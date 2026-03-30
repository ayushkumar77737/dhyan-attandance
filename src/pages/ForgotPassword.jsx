import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ForgotPassword.css";

import guruji from "../assets/Dhyan.png";
import bgImage from "../assets/bg1.webp";

function ForgotPassword() {
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

    const navigate = useNavigate();

    return (
        <div
            className="forgot-container"
            style={{ backgroundImage: `url(${bgImage})` }}
        >
            {/* Decorative orbs */}
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="orb orb-3" />

            <div className="forgot-card">

                <div className="forgot-left">

                    <div className="title-badge">✦ Sacred Portal ✦</div>

                    <h1>Meditation (Dhyan) Program</h1>

                    <h2>🙏 Jai Gurubande 🙏</h2>

                    <p className="forgot-text">
                        If you forgot your password or want to reset it,
                        please contact us on the email below.
                    </p>

                    <div className="email-box">
                        <span className="email-icon">📧</span>
                        <span className="email-text">support@jaigurubande.in</span>
                        <div className="email-glow" />
                    </div>

                    <button
                        className="back-login-btn"
                        onClick={() => navigate("/")}
                    >
                        <span className="btn-icon">←</span>
                        <span>Back to Login</span>
                        <div className="btn-shine" />
                    </button>

                </div>

                <div className="forgot-divider" />

                <div className="forgot-right">
                    <div className="image-frame">
                        <div className="image-ring ring-1" />
                        <div className="image-ring ring-2" />
                        <div className="image-ring ring-3" />
                        <img src={guruji} alt="Guruji" />
                    </div>
                </div>

            </div>
        </div>
    );
}

export default ForgotPassword;