import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";
import dhyanImage from "../assets/Dhyan.png";
import logo2 from "../assets/logo2.png";

const LandingPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [activeNav, setActiveNav] = useState("home");
    const [menuOpen, setMenuOpen] = useState(false);

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

    /* Nav links are visual for now — wire them to routes/scroll when sections exist */
    const navItems = [
        { key: "home", label: t("navHome") || "Home", path: "/" },
        { key: "about", label: t("navAbout") || "About", path: "/about" },
        { key: "benefits", label: t("navBenefits") || "Benefits", path: "/benefits" },
        { key: "teachings", label: t("navTeachings") || "Teachings", path: "/teachings" },
        { key: "events", label: t("navEvents") || "Events", path: "/events" },
        { key: "contact", label: t("navContact") || "Contact", path: "/contact" },
    ];

    return (
        <div className="ldpg__page">

            {/* ---------- ambient background ---------- */}
            <div className="ldpg__orb ldpg__orb--1" />
            <div className="ldpg__orb ldpg__orb--2" />
            <div className="ldpg__orb ldpg__orb--3" />
            <div className="ldpg__sparkles" />
            <div className="ldpg__grain" />

            {/* faint corner mandalas */}
            <svg className="ldpg__mandala ldpg__mandala--bl" viewBox="0 0 200 200" aria-hidden="true">
                <g fill="none" stroke="currentColor" strokeWidth="0.8">
                    <circle cx="100" cy="100" r="90" />
                    <circle cx="100" cy="100" r="66" />
                    <circle cx="100" cy="100" r="42" />
                    {Array.from({ length: 12 }).map((_, i) => (
                        <line key={i} x1="100" y1="10" x2="100" y2="190"
                            transform={`rotate(${i * 30} 100 100)`} />
                    ))}
                </g>
            </svg>
            <svg className="ldpg__mandala ldpg__mandala--tr" viewBox="0 0 200 200" aria-hidden="true">
                <g fill="none" stroke="currentColor" strokeWidth="0.8">
                    <circle cx="100" cy="100" r="90" />
                    <circle cx="100" cy="100" r="60" />
                    {Array.from({ length: 8 }).map((_, i) => (
                        <ellipse key={i} cx="100" cy="100" rx="30" ry="90"
                            transform={`rotate(${i * 45} 100 100)`} />
                    ))}
                </g>
            </svg>

            {/* ============================== NAV ============================== */}
            {/* ============================== NAV ============================== */}
            <header className="ldpg__nav">
                <div className="ldpg__nav-brand">
                    <img src={logo2} alt="Logo" className="ldpg__nav-logo" loading="lazy" />
                    <div className="ldpg__nav-brand-text">
                        <span className="ldpg__nav-title">{t("appTitle") || "Meditation Dhyan Portal"}</span>
                        <span className="ldpg__nav-sub">🙏 {t("guruText") || "Jai Gurubande"} 🙏</span>
                    </div>
                </div>

                {/* desktop links */}
                <nav className="ldpg__nav-links">
                    {navItems.map((n) => (
                        <button
                            key={n.key}
                            className={`ldpg__nav-link ${activeNav === n.key ? "active" : ""}`}
                            onClick={() => { setActiveNav(n.key); navigate(n.path); }}
                        >
                            {n.label}
                        </button>
                    ))}
                </nav>

                {/* right side: language + hamburger */}
                <div className="ldpg__nav-right">
                    <div className="ldpg__nav-lang">
                        <LanguageSwitcher />
                    </div>
                    <button
                        className="ldpg__nav-burger"
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-label="Menu"
                        aria-expanded={menuOpen}
                    >
                        {menuOpen ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* mobile dropdown */}
                <div className={`ldpg__nav-mobile ${menuOpen ? "open" : ""}`}>
                    {navItems.map((n) => (
                        <button
                            key={n.key}
                            className={`ldpg__nav-link ${activeNav === n.key ? "active" : ""}`}
                            onClick={() => { setActiveNav(n.key); navigate(n.path); setMenuOpen(false); }}
                        >
                            {n.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* ============================== HERO ============================= */}
            <section className="ldpg__hero">

                {/* -------- left -------- */}
                <div className="ldpg__hero-left">
                    <h1 className="ldpg__hero-title">
                        <span className="ldpg__title-plain">
                            {t("landingHeroTitle") || "Discover Inner Peace Through"}
                        </span>{" "}
                        <span className="ldpg__title-gold">
                            {t("landingHeroAccent") || "Meditation"}
                        </span>
                    </h1>

                    <p className="ldpg__hero-sub">
                        {t("guruSubtext") || "Walk the path of self-awareness, devotion, and divine connection"}
                    </p>

                    <div className="ldpg__divider">
                        <span className="ldpg__divider-lotus" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2c1.2 1.8 1.8 3.6 1.8 5.4 0 1-.3 2-.9 3 .9-.5 1.8-1.3 2.6-2.5.4 2 .1 3.8-.9 5.4 1.4-.3 2.7-1 3.9-2.2-.2 2.6-1.6 4.8-4 6.4-.8.5-1.7.9-2.5 1.1-.8-.2-1.7-.6-2.5-1.1-2.4-1.6-3.8-3.8-4-6.4 1.2 1.2 2.5 1.9 3.9 2.2-1-1.6-1.3-3.4-.9-5.4.8 1.2 1.7 2 2.6 2.5-.6-1-.9-2-.9-3C10.2 5.6 10.8 3.8 12 2z" />
                            </svg>
                        </span>
                    </div>

                    <p className="ldpg__about">
                        {t("landingAboutPre") || "The Dhyan Portal is a sacred spiritual journey guided by "}
                        <span className="ldpg__about-name">
                            {t("guruName") || "Param Sant Swami Jai Gurubande Ji Maharaj"}
                        </span>
                        {t("landingAboutPost") || ". Through daily meditation, members experience inner peace, self-awareness, and divine connection."}
                    </p>

                    {/* -------- stat trio -------- */}
                    <div className="ldpg__stats">
                        <div className="ldpg__stat">
                            <span className="ldpg__stat-icon ldpg__stat-icon--violet">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="4.5" r="2" />
                                    <path d="M12 8c-1.6 0-3 1.2-3 3v2.5" />
                                    <path d="M12 8c1.6 0 3 1.2 3 3v2.5" />
                                    <path d="M9 13.5c-2 .3-4 1.3-5 2.8 2.6 1 5.3 1.2 8 1.2s5.4-.2 8-1.2c-1-1.5-3-2.5-5-2.8" />
                                    <path d="M9 13.5l3 1 3-1" />
                                </svg>
                            </span>
                            <span className="ldpg__stat-label">{t("landingStat1") || "Daily Meditation"}</span>
                        </div>

                        <div className="ldpg__stat">
                            <span className="ldpg__stat-icon ldpg__stat-icon--rose">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 4c1.6 1.8 2.4 3.8 2.4 5.8 0 1-.3 2-.9 3" />
                                    <path d="M12 4c-1.6 1.8-2.4 3.8-2.4 5.8 0 1 .3 2 .9 3" />
                                    <path d="M12 12.8c2-2.2 4.4-3.4 6.6-3.6-.2 2.6-1.8 4.8-4.2 6" />
                                    <path d="M12 12.8c-2-2.2-4.4-3.4-6.6-3.6.2 2.6 1.8 4.8 4.2 6" />
                                    <path d="M5 13c-1 .5-1.8 1.3-2.4 2.4C5 16.8 8.4 17.5 12 17.5s7-.7 9.4-2.1c-.6-1.1-1.4-1.9-2.4-2.4" />
                                </svg>
                            </span>
                            <span className="ldpg__stat-label">{t("landingStat2") || "Inner Peace"}</span>
                        </div>

                        <div className="ldpg__stat">
                            <span className="ldpg__stat-icon ldpg__stat-icon--blue">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="4" />
                                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
                                </svg>
                            </span>
                            <span className="ldpg__stat-label">{t("landingStat3") || "Divine Connection"}</span>
                        </div>
                    </div>

                    {/* -------- CTA -------- */}
                    <button type="button" className="ldpg__cta" onClick={() => navigate("/login")}>
                        <span className="ldpg__cta-shine" />
                        <span className="ldpg__cta-text">{t("landingLogin") || "Enter Portal"}</span>
                        <span className="ldpg__cta-arrow">→</span>
                    </button>

                    <div className="ldpg__trust">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span>{t("landingTrust") || "Secure • Private • Spiritual"}</span>
                    </div>
                </div>

                {/* -------- right -------- */}
                <div className="ldpg__hero-right">
                    <div className="ldpg__image-frame">
                        <div className="ldpg__image-ring ldpg__image-ring--outer" />
                        <div className="ldpg__image-ring ldpg__image-ring--mid" />
                        <div className="ldpg__image-halo" />

                        <div className="ldpg__image-wrap">
                            <img
                                src={dhyanImage}
                                alt="Guruji"
                                className="ldpg__guruji-img"
                                loading="lazy"
                            />
                        </div>

                        {/* lotus glow beneath the portrait */}
                        <svg className="ldpg__lotus" viewBox="0 0 140 84" fill="none" aria-hidden="true">
                            <defs>
                                <linearGradient id="lotusGold" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f5e4b0" />
                                    <stop offset="100%" stopColor="#c9a84c" />
                                </linearGradient>
                            </defs>
                            <g strokeLinejoin="round">
                                {/* back row — wide, dim */}
                                <path d="M70 72 C53 49.3 61.5 33 70 26 C78.5 33 87 49.3 70 72 Z" fill="rgba(245,228,176,0.13)" stroke="url(#lotusGold)" strokeWidth="1.1" transform="rotate(-72 70 72)" />
                                <path d="M70 72 C53 49.3 61.5 33 70 26 C78.5 33 87 49.3 70 72 Z" fill="rgba(245,228,176,0.13)" stroke="url(#lotusGold)" strokeWidth="1.1" transform="rotate(72 70 72)" />
                                <path d="M70 72 C54 49 62 28 70 22 C78 28 86 49 70 72 Z" fill="rgba(245,228,176,0.13)" stroke="url(#lotusGold)" strokeWidth="1.1" transform="rotate(-46 70 72)" />
                                <path d="M70 72 C54 49 62 28 70 22 C78 28 86 49 70 72 Z" fill="rgba(245,228,176,0.13)" stroke="url(#lotusGold)" strokeWidth="1.1" transform="rotate(46 70 72)" />
                                {/* front row — narrow, bright */}
                                <path d="M70 72 C57 47.7 64.5 24 70 18 C75.5 24 83 47.7 70 72 Z" fill="rgba(245,228,176,0.30)" stroke="url(#lotusGold)" strokeWidth="1.4" transform="rotate(-24 70 72)" />
                                <path d="M70 72 C57 47.7 64.5 24 70 18 C75.5 24 83 47.7 70 72 Z" fill="rgba(245,228,176,0.30)" stroke="url(#lotusGold)" strokeWidth="1.4" transform="rotate(24 70 72)" />
                                {/* center petal */}
                                <path d="M70 72 C58 47 65 20 70 14 C75 20 82 47 70 72 Z" fill="rgba(245,228,176,0.30)" stroke="url(#lotusGold)" strokeWidth="1.5" />
                            </g>
                        </svg>
                    </div>

                    {/* -------- quote card -------- */}
                    <div className="ldpg__quote">
                        <span className="ldpg__quote-mark">“</span>
                        <p className="ldpg__quote-text">
                            {t("dashQuote") || "Discipline is the bridge between goals and accomplishment."}
                        </p>
                        <p className="ldpg__quote-author">
                            — {t("guruName") || "Param Sant Swami Jai Gurubande Ji Maharaj"}
                        </p>
                    </div>
                </div>

            </section>

            <div className="ldpg__bottom-bar">
                <div className="ldpg__bottom-line" />
            </div>

        </div>
    );
};

export default LandingPage;