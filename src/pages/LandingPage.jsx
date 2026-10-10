import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";
import dhyanImage from "../assets/Dhyan.png";
import logo2 from "../assets/logo2.png";
import logo3 from "../assets/logo3.png";
/* --- artwork slots: add these files to src/assets (see notes) --- */
import bgSunrise from "../assets/landing-bg.webp";          // sunrise landscape, sun glare on the right
import lotusImg from "../assets/landing-lotus.png";         // pink lotus + green leaves, transparent PNG
import lotusCorner from "../assets/landing-lotus-corner.png"; // corner lotus/leaves, transparent PNG
/* true  = Dhyan.png is a transparent cut-out (body breaks out of the ring, like the mockup)
   false = Dhyan.png is a normal photo (cropped inside the circle) */
const PORTRAIT_IS_CUTOUT = false;

/* ------------------------------------------------------------------ */
/* Icons (inline SVG, no extra assets)                                */
/* ------------------------------------------------------------------ */
const svgProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    strokeLinecap: "round",
    strokeLinejoin: "round",
};

const Lotus = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2c1.2 1.8 1.8 3.6 1.8 5.4 0 1-.3 2-.9 3 .9-.5 1.8-1.3 2.6-2.5.4 2 .1 3.8-.9 5.4 1.4-.3 2.7-1 3.9-2.2-.2 2.6-1.6 4.8-4 6.4-.8.5-1.7.9-2.5 1.1-.8-.2-1.7-.6-2.5-1.1-2.4-1.6-3.8-3.8-4-6.4 1.2 1.2 2.5 1.9 3.9 2.2-1-1.6-1.3-3.4-.9-5.4.8 1.2 1.7 2 2.6 2.5-.6-1-.9-2-.9-3C10.2 5.6 10.8 3.8 12 2z" />
    </svg>
);

const icons = {
    meditate: (
        <svg {...svgProps}>
            <circle cx="12" cy="4.5" r="2" /><path d="M12 8c-1.6 0-3 1.2-3 3v2.5M12 8c1.6 0 3 1.2 3 3v2.5" />
            <path d="M9 13.5c-2 .3-4 1.3-5 2.8 2.6 1 5.3 1.2 8 1.2s5.4-.2 8-1.2c-1-1.5-3-2.5-5-2.8" />
        </svg>
    ),
    sun: (
        <svg {...svgProps}>
            <circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
        </svg>
    ),
    shield: (
        <svg {...svgProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
    ),
    lock: (
        <svg {...svgProps}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    ),
    book: (
        <svg {...svgProps}><path d="M2 4h6a3 3 0 0 1 4 1 3 3 0 0 1 4-1h6v15h-6a3 3 0 0 0-4 1 3 3 0 0 0-4-1H2z" /><path d="M12 5v15" /></svg>
    ),
    users: (
        <svg {...svgProps}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    calendar: (
        <svg {...svgProps}>
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
        </svg>
    ),
    leaf: (
        <svg {...svgProps}><path d="M20 4C10 4 4 9 4 16c0 2 .6 3.5 1.5 4.5C7 14 11 11 16 9c-4 3-6.5 6.5-7.5 11.5C17 20 20 13 20 4z" /></svg>
    ),
};

const LandingPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [activeNav, setActiveNav] = useState("home");
    const [menuOpen, setMenuOpen] = useState(false);
    const [legalOpen, setLegalOpen] = useState(false);
    const [mobileLegalOpen, setMobileLegalOpen] = useState(false);
    const legalRef = useRef(null);

    /* close the Legal & Policies dropdown on outside click / Esc */
    useEffect(() => {
        const onClick = (e) => { if (legalRef.current && !legalRef.current.contains(e.target)) setLegalOpen(false); };
        const onKey = (e) => { if (e.key === "Escape") setLegalOpen(false); };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
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

    /* ---------- content lists: add a row here + a t() key = new content ---------- */
    const navItems = [
        { key: "home", label: t("navHome") || "Home", path: "/" },
        { key: "about", label: t("navAbout") || "About", path: "/about" },
        { key: "teachings", label: t("navTeachings") || "Teachings", path: "/teachings" },
        { key: "events", label: t("navEvents") || "Events", path: "/events" },
        { key: "contact", label: t("navContact") || "Contact", path: "/contact" },
    ];

    /* Legal & Policies dropdown: add a row here + a t() key = new legal page */
    const legalItems = [
        { key: "privacy", label: t("legal.privacyLink") || "Privacy Policy", path: "/privacy-policy" },
        { key: "terms", label: t("legal.termsLink") || "Terms of Service", path: "/terms-of-service" },
    ];

    const cards = [
        { icon: icons.meditate, cls: "violet", title: t("landingStat1") || "Daily Meditation", desc: t("landingStat1Desc") || "Develop a peaceful mind and positive life" },
        { icon: <Lotus />, cls: "rose", title: t("landingStat2") || "Inner Peace", desc: t("landingStat2Desc") || "Discover tranquility within yourself" },
        { icon: icons.sun, cls: "blue", title: t("landingStat3") || "Divine Connection", desc: t("landingStat3Desc") || "Stay connected to divine wisdom" },
    ];

    const trust = [
        { icon: icons.shield, label: t("landingTrust1") || "Secure" },
        { icon: icons.lock, label: t("landingTrust2") || "Private" },
        { icon: <Lotus />, label: t("landingTrust3") || "Spiritual" },
    ];

    const features = [
        { icon: icons.book, label: t("landingFeat1") || "Spiritual Teachings" },
        { icon: icons.users, label: t("landingFeat2") || "Satsang Community" },
        { icon: icons.calendar, label: t("landingFeat3") || "Events & Programs" },
        { icon: icons.leaf, label: t("landingFeat4") || "Inner Growth" },
    ];

    const goTo = (n) => { setActiveNav(n.key); navigate(n.path); setMenuOpen(false); setLegalOpen(false); setMobileLegalOpen(false); };
    const guruName = t("guruName") || "Param Sant Swami Jai Gurubande Ji Maharaj";

    return (
        <div className="ldpg__page">
            <div className="ldpg__bg" style={{ backgroundImage: `url(${bgSunrise})` }} />
            <img src={lotusCorner} alt="" className="ldpg__corner ldpg__corner--l" />
            <img src={lotusCorner} alt="" className="ldpg__corner ldpg__corner--r" />

            {/* ============================== NAV ============================== */}
            <header className="ldpg__nav">
                <div className="ldpg__nav-brand">
                    <img src={logo2} alt="Logo" className="ldpg__nav-logo" loading="lazy" />
                    <div className="ldpg__nav-brand-text">
                        <span className="ldpg__nav-title">{t("appTitle") || "Dhyan Attendance Portal"}</span>
                        <span className="ldpg__nav-sub">🙏 {t("guruText") || "Jai Gurubande"} 🙏</span>
                    </div>
                </div>

                <nav className="ldpg__nav-links">
                    {navItems.map((n) => (
                        <button key={n.key} className={`ldpg__nav-link ${activeNav === n.key ? "active" : ""}`} onClick={() => goTo(n)}>
                            {n.label}
                        </button>
                    ))}

                    <div className="ldpg__legal" ref={legalRef}>
                        <button
                            type="button"
                            className={`ldpg__nav-link ldpg__legal-btn ${legalOpen ? "open" : ""}`}
                            onClick={() => setLegalOpen((v) => !v)}
                            aria-haspopup="true"
                            aria-expanded={legalOpen}
                        >
                            {t("legal.navLabel") || "Legal & Policies"}
                            <svg className="ldpg__legal-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                        </button>
                        {legalOpen && (
                            <div className="ldpg__legal-menu" role="menu">
                                {legalItems.map((n) => (
                                    <button key={n.key} type="button" role="menuitem" className="ldpg__legal-item" onClick={() => goTo(n)}>
                                        {n.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </nav>

                <div className="ldpg__nav-right">
                    <img src={logo3} alt="Logo" className="ldpg__nav-logo3" loading="lazy" />
                    <div className="ldpg__nav-lang"><LanguageSwitcher /></div>
                    <button className="ldpg__nav-burger" onClick={() => { setMenuOpen((v) => !v); setMobileLegalOpen(false); }} aria-label="Menu" aria-expanded={menuOpen}>
                        {menuOpen ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
                        )}
                    </button>
                </div>

                <div className={`ldpg__nav-mobile ${menuOpen ? "open" : ""}`}>
                    {navItems.map((n) => (
                        <button key={n.key} className={`ldpg__nav-link ${activeNav === n.key ? "active" : ""}`} onClick={() => goTo(n)}>
                            {n.label}
                        </button>
                    ))}

                    <button
                        type="button"
                        className={`ldpg__nav-link ldpg__legal-mobile-toggle ${mobileLegalOpen ? "open" : ""}`}
                        onClick={() => setMobileLegalOpen((v) => !v)}
                        aria-expanded={mobileLegalOpen}
                    >
                        {t("legal.navLabel") || "Legal & Policies"}
                        <svg className="ldpg__legal-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    {mobileLegalOpen && legalItems.map((n) => (
                        <button key={n.key} className="ldpg__nav-link ldpg__legal-mobile-link" onClick={() => goTo(n)}>
                            {n.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* ============================== HERO ============================= */}
            <section className="ldpg__hero">

                {/* -------- left -------- */}
                <div className="ldpg__hero-left">
                    <div className="ldpg__pill">
                        <Lotus className="ldpg__pill-icon" />
                        <span>
                            {t("landingGuidedBy") || "Guided by"} <strong>{guruName}</strong>
                        </span>
                    </div>

                    <h1 className="ldpg__hero-title">
                        {t("landingHeroTitle") || "Stay Connected to Your Dhyan &"}{" "}
                        <span className="ldpg__title-gold">{t("landingHeroAccent") || "Sadhana"}</span>
                    </h1>

                    <p className="ldpg__about">
                        {t("landingAboutPre") || "The Dhyan Portal is a sacred spiritual journey guided by "}
                        <span className="ldpg__about-name">{guruName}</span>
                        {t("landingAboutPost") || ". Through daily meditation, members experience inner peace, self-awareness, and divine connection."}
                    </p>

                    <div className="ldpg__cards">
                        {cards.map((c, i) => (
                            <div className="ldpg__card" key={i}>
                                <span className={`ldpg__card-icon ldpg__card-icon--${c.cls}`}>{c.icon}</span>
                                <span className="ldpg__card-text">
                                    <span className="ldpg__card-title">{c.title}</span>
                                    <span className="ldpg__card-desc">{c.desc}</span>
                                </span>
                            </div>
                        ))}
                    </div>

                    <button type="button" className="ldpg__cta" onClick={() => navigate("/login")}>
                        <span className="ldpg__cta-badge"><Lotus /></span>
                        <span className="ldpg__cta-text">{t("landingLogin") || "Enter Portal"}</span>
                        <span className="ldpg__cta-arrow">→</span>
                    </button>

                    <div className="ldpg__trust">
                        {trust.map((x, i) => (
                            <span className="ldpg__trust-item" key={i}>{x.icon}{x.label}</span>
                        ))}
                    </div>
                </div>

                {/* -------- right -------- */}
                <div className="ldpg__hero-right">
                    <div className="ldpg__image-frame">
                        <div className="ldpg__image-ring" />
                        <div className="ldpg__swoosh" />
                        <div className={`ldpg__image-wrap ${PORTRAIT_IS_CUTOUT ? "ldpg__image-wrap--cutout" : ""}`}>
                            <img src={dhyanImage} alt="Guruji" className="ldpg__guruji-img" loading="lazy" />
                        </div>
                        <img src={lotusImg} alt="" className="ldpg__lotus-img" />
                    </div>

                    <blockquote className="ldpg__quote">
                        <p className="ldpg__quote-text">
                            “{t("dashQuote") || "Discipline is the bridge between goals and accomplishment."}”
                        </p>
                        <Lotus className="ldpg__quote-lotus" />
                        <p className="ldpg__quote-author">— {guruName}</p>
                    </blockquote>

                    <div className="ldpg__features">
                        {features.map((f, i) => (
                            <div className="ldpg__feature" key={i}>
                                {f.icon}
                                <span>{f.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </section>
        </div>
    );
};

export default LandingPage;