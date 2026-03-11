import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ForgotPassword.css";

import guruji from "../assets/guruji.webp";
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
            <div className="forgot-card">

                <div className="forgot-left">

                    <h1>Meditation (Dhyan) Program</h1>

                    <h2>🙏 Jai Gurubande 🙏</h2>

                    <p className="forgot-text">
                        If you forgot your password or want to reset it,
                        please contact us on the email below.
                    </p>

                    <div className="email-box">
                        📧 jaigurubande15@gmail.com
                    </div>

                    <button
                        className="back-login-btn"
                        onClick={() => navigate("/")}
                    >
                        Back to Login
                    </button>

                </div>

                <div className="forgot-right">
                    <img src={guruji} alt="Guruji" />
                </div>

            </div>
        </div>
    );
}

export default ForgotPassword;