import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";
import dhyanImage from "../assets/Dhyan.png";
import logo2 from "../assets/logo2.png";

const LandingPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

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

    return (
        <div className="ldpg__page">
            <img
                src={logo2}
                alt="Logo"
                className="ldpg__logo"
                loading="lazy"
            />

            <div className="ldpg__orb ldpg__orb--1" />
            <div className="ldpg__orb ldpg__orb--2" />
            <div className="ldpg__orb ldpg__orb--3" />
            <div className="ldpg__orb ldpg__orb--4" />

            <div className="ldpg__grain" />

            <div className="ldpg__line ldpg__line--left" />
            <div className="ldpg__line ldpg__line--right" />

            <div className="ldpg__lang">
                <LanguageSwitcher />
            </div>

            <section className="ldpg__hero">

                <div className="ldpg__hero-left">

                    <div className="ldpg__eyebrow">
                        <span className="ldpg__eyebrow-dot" />
                        <span className="ldpg__eyebrow-line" />
                        <span>{t("guruText")}</span>
                    </div>

                    <h1 className="ldpg__hero-title">
                        <span className="ldpg__title-line ldpg__title-line--1">{t("appTitle")}</span>
                    </h1>

                    <p className="ldpg__hero-sub">{t("guruSubtext")}</p>

                    <div className="ldpg__divider">
                        <span className="ldpg__divider-gem" />
                    </div>

                    <p className="ldpg__about">{t("landingAbout")}</p>

                    <div className="ldpg__stats">
                        <div className="ldpg__stat">
                            <span className="ldpg__stat-icon">🧘</span>
                            <span className="ldpg__stat-label">{t("landingStat1")}</span>
                        </div>
                        <div className="ldpg__stat-sep" />
                        <div className="ldpg__stat">
                            <span className="ldpg__stat-icon">🌸</span>
                            <span className="ldpg__stat-label">{t("landingStat2")}</span>
                        </div>
                        <div className="ldpg__stat-sep" />
                        <div className="ldpg__stat">
                            <span className="ldpg__stat-icon">☮️</span>
                            <span className="ldpg__stat-label">{t("landingStat3")}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="ldpg__cta"
                        onClick={() => navigate("/login")}
                    >
                        <span className="ldpg__cta-shine" />
                        <span className="ldpg__cta-text">{t("landingLogin")}</span>
                        <span className="ldpg__cta-arrow">→</span>
                    </button>

                </div>

                <div className="ldpg__hero-right">

                    <div className="ldpg__image-frame">
                        <div className="ldpg__image-ring ldpg__image-ring--outer" />
                        <div className="ldpg__image-ring ldpg__image-ring--mid" />
                        <div className="ldpg__image-ring ldpg__image-ring--inner" />

                        <div className="ldpg__image-wrap">
                            <img
                                src={dhyanImage}
                                alt="Guruji"
                                className="ldpg__guruji-img"
                                loading="lazy"
                            />
                        </div>

                        <div className="ldpg__image-glow" />
                        <div className="ldpg__image-glow ldpg__image-glow--top" />
                    </div>

                    <div className="ldpg__corner ldpg__corner--tl" />
                    <div className="ldpg__corner ldpg__corner--br" />

                </div>

            </section>

            <div className="ldpg__bottom-bar">
                <div className="ldpg__bottom-line" />
            </div>

        </div>
    );
};

export default LandingPage;