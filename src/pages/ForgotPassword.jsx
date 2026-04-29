import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ForgotPassword.css";

import { useTranslation } from "react-i18next";

import guruji from "../assets/Dhyan.png";
import bg1 from "../assets/bg1.webp";
import bg2 from "../assets/bg2.webp";
import bg3 from "../assets/bg3.webp";

const BG_IMAGES = [bg1, bg2, bg3];

function ForgotPassword() {

    const { t } = useTranslation();
    const navigate = useNavigate();

    const [currentBg, setCurrentBg] = useState(0);
    const [fading, setFading] = useState(false);

    // Background carousel — crossfade every 5.5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setFading(true);
            setTimeout(() => {
                setCurrentBg((prev) => (prev + 1) % BG_IMAGES.length);
                setFading(false);
            }, 1000);
        }, 5500);
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

    return (
        <div className="forgot-container">

            {/* ── Background Carousel ── */}
            <div className="fp-bg-carousel">
                {BG_IMAGES.map((img, i) => (
                    <div
                        key={i}
                        className={`fp-bg-slide ${i === currentBg ? "fp-bg-slide--active" : ""} ${i === currentBg && fading ? "fp-bg-slide--fading" : ""}`}
                        style={{ backgroundImage: `url(${img})` }}
                    />
                ))}
                <div className="fp-overlay-dark" />
                <div className="fp-overlay-warm" />
                <div className="fp-overlay-vignette" />
            </div>

            {/* ── Top gold bar ── */}
            <div className="fp-top-bar" />

            {/* ── Faint OM watermark ── */}
            <div className="fp-om-watermark">🕉</div>

            {/* ── Decorative gold orbs ── */}
            <div className="fp-orb fp-orb-1" />
            <div className="fp-orb fp-orb-2" />

            {/* ── Card ── */}
            <div className="forgot-card">

                <div className="forgot-left">

                    <div className="title-badge">{t("sacredPortal")}</div>

                    <h1>{t("appTitle")}</h1>

                    <h2>{t("guruText")}</h2>

                    <p className="forgot-text">
                        {t("forgotPasswordText")}
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
                        <span>{t("backToLogin")}</span>
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

            {/* ── Carousel dots ── */}
            <div className="fp-dots">
                {BG_IMAGES.map((_, i) => (
                    <span
                        key={i}
                        className={`fp-dot ${i === currentBg ? "fp-dot--active" : ""}`}
                        onClick={() => setCurrentBg(i)}
                    />
                ))}
            </div>

        </div>
    );
}

export default ForgotPassword;