import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./PrivacyPolicy.css";
import LanguageSwitcher from "../components/LanguageSwitcher";
import logo2 from "../assets/logo2.png";
import logo3 from "../assets/logo3.png";
import bgSunrise from "../assets/landing-bg.webp";
import lotusCorner from "../assets/landing-lotus-corner.png";

/* ==================================================================
   PRIVACY POLICY
   ------------------------------------------------------------------
   ALL text on this page comes from the translation files:
       src/i18n/locales/<lang>/translation.json  ->  "privacyPolicy" + "legal"

   To change content in future you only edit the JSON:
     - edit a sentence          -> change the text
     - add / remove a section   -> add / remove an object in "sections"
     - add / remove a paragraph -> add / remove a line in "paragraphs"
     - add / remove a bullet    -> add / remove a line in "points"
       (a bullet can be "plain text" or { "title": "...", "text": "..." })
     - change the date          -> change "lastUpdated"
   No change is needed in this file.
   ================================================================== */

const NS = "privacyPolicy"; // translation namespace (top-level key in JSON)

/* ---------- small helpers ---------- */
const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const asObject = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

/* ---------- icons (inline SVG, no extra assets) ---------- */
const Lotus = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2c1.2 1.8 1.8 3.6 1.8 5.4 0 1-.3 2-.9 3 .9-.5 1.8-1.3 2.6-2.5.4 2 .1 3.8-.9 5.4 1.4-.3 2.7-1 3.9-2.2-.2 2.6-1.6 4.8-4 6.4-.8.5-1.7.9-2.5 1.1-.8-.2-1.7-.6-2.5-1.1-2.4-1.6-3.8-3.8-4-6.4 1.2 1.2 2.5 1.9 3.9 2.2-1-1.6-1.3-3.4-.9-5.4.8 1.2 1.7 2 2.6 2.5-.6-1-.9-2-.9-3C10.2 5.6 10.8 3.8 12 2z" />
    </svg>
);

const svg = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const ShieldIcon = () => <svg {...svg}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>;
const MailIcon = () => <svg {...svg}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
const PinIcon = () => <svg {...svg}><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>;
const ArrowUp = () => <svg {...svg}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
const CheckDot = () => <svg {...svg} strokeWidth="2.4"><path d="M5 12l4 4 10-10" /></svg>;

const PrivacyPolicy = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeId, setActiveId] = useState("");

    /* ---------- content from JSON (re-read when language changes) ---------- */
    const page = asObject(t(NS, { returnObjects: true }));
    const legal = asObject(t("legal", { returnObjects: true }));
    const sections = useMemo(
        () => asArray(asObject(t(NS, { returnObjects: true })).sections)
            .map((s, i) => ({ ...asObject(s), id: `prvp-sec-${i + 1}` })),
        [t, i18n.resolvedLanguage]
    );
    const contact = asObject(page.contact);
    const year = new Date().getFullYear();

    useEffect(() => {
        document.title = `${page.title || "Privacy"} ${page.titleAccent || "Policy"} | ${t("appTitle") || "Dhyan Attendance Portal"}`;
    }, [page.title, page.titleAccent, t]);

    /* ---------- highlight the section being read in the "On this page" list ---------- */
    useEffect(() => {
        if (typeof IntersectionObserver === "undefined" || !sections.length) return;
        const obs = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) setActiveId(visible[0].target.id);
            },
            { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
        );
        sections.forEach((s) => {
            const el = document.getElementById(s.id);
            if (el) obs.observe(el);
        });
        return () => obs.disconnect();
    }, [sections]);

    const scrollToId = (id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    /* ---------- nav (same items as the landing page) ---------- */
    const navItems = [
        { key: "home", label: t("navHome") || "Home", path: "/" },
        { key: "about", label: t("navAbout") || "About", path: "/about" },
        { key: "teachings", label: t("navTeachings") || "Teachings", path: "/teachings" },
        { key: "events", label: t("navEvents") || "Events", path: "/events" },
        { key: "contact", label: t("navContact") || "Contact", path: "/contact" },
    ];
    const goTo = (path) => { setMenuOpen(false); navigate(path); };

    /* ---------- one bullet: "text" or { title, text } ---------- */
    const renderPoint = (p, i) => {
        const item = typeof p === "string" ? { text: p } : asObject(p);
        return (
            <li className="prvp__point" key={i}>
                <span className="prvp__point-icon"><CheckDot /></span>
                <span>
                    {item.title && <strong className="prvp__point-title">{item.title}</strong>}
                    {item.title && item.text ? " — " : ""}
                    {item.text}
                </span>
            </li>
        );
    };

    return (
        <div className="prvp__page">
            <div className="prvp__bg" style={{ backgroundImage: `url(${bgSunrise})` }} />
            <img src={lotusCorner} alt="" className="prvp__corner prvp__corner--l" />
            <img src={lotusCorner} alt="" className="prvp__corner prvp__corner--r" />

            {/* ============================== NAV ============================== */}
            <header className="prvp__nav">
                <button type="button" className="prvp__nav-brand" onClick={() => goTo("/")}>
                    <img src={logo2} alt="Logo" className="prvp__nav-logo" loading="lazy" />
                    <span className="prvp__nav-brand-text">
                        <span className="prvp__nav-title">{t("appTitle") || "Dhyan Attendance Portal"}</span>
                        <span className="prvp__nav-sub">🙏 {t("guruText") || "Jai Gurubande"} 🙏</span>
                    </span>
                </button>

                <nav className="prvp__nav-links">
                    {navItems.map((n) => (
                        <button key={n.key} className="prvp__nav-link" onClick={() => goTo(n.path)}>{n.label}</button>
                    ))}
                </nav>

                <div className="prvp__nav-right">
                    <img src={logo3} alt="Logo" className="prvp__nav-logo3" loading="lazy" />
                    <div className="prvp__nav-lang"><LanguageSwitcher /></div>
                    <button className="prvp__nav-burger" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu" aria-expanded={menuOpen}>
                        {menuOpen ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
                        )}
                    </button>
                </div>

                <div className={`prvp__nav-mobile ${menuOpen ? "open" : ""}`}>
                    {navItems.map((n) => (
                        <button key={n.key} className="prvp__nav-link" onClick={() => goTo(n.path)}>{n.label}</button>
                    ))}
                </div>
            </header>

            {/* ============================== HERO ============================= */}
            <section className="prvp__hero">
                <div className="prvp__pill">
                    <Lotus className="prvp__pill-icon" />
                    <span>{page.badge}</span>
                </div>
                <h1 className="prvp__title">
                    {page.title}{" "}<span className="prvp__title-gold">{page.titleAccent}</span>
                </h1>
                {page.subtitle && <p className="prvp__subtitle">{page.subtitle}</p>}
                {page.lastUpdated && (
                    <p className="prvp__updated">
                        <ShieldIcon />
                        <span>{legal.lastUpdatedLabel || "Last updated"}: <strong>{page.lastUpdated}</strong></span>
                    </p>
                )}
            </section>

            {/* ============================== BODY ============================= */}
            <main className="prvp__body">
                {/* -------- table of contents (auto-built from sections) -------- */}
                {sections.length > 0 && (
                    <aside className="prvp__toc">
                        <p className="prvp__toc-title">{legal.tocTitle || "On this page"}</p>
                        <ol className="prvp__toc-list">
                            {sections.map((s, i) => (
                                <li key={s.id}>
                                    <button
                                        type="button"
                                        className={`prvp__toc-link ${activeId === s.id ? "active" : ""}`}
                                        onClick={() => scrollToId(s.id)}
                                    >
                                        <span className="prvp__toc-num">{String(i + 1).padStart(2, "0")}</span>
                                        <span>{s.title}</span>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    </aside>
                )}

                <article className="prvp__content">
                    {asArray(page.intro).length > 0 && (
                        <div className="prvp__intro">
                            {asArray(page.intro).map((p, i) => <p key={i}>{p}</p>)}
                        </div>
                    )}

                    {sections.map((s, i) => (
                        <section className="prvp__section" id={s.id} key={s.id}>
                            <h2 className="prvp__section-title">
                                <span className="prvp__section-num">{String(i + 1).padStart(2, "0")}</span>
                                {s.title}
                            </h2>
                            {asArray(s.paragraphs).map((p, j) => <p className="prvp__para" key={j}>{p}</p>)}
                            {asArray(s.points).length > 0 && (
                                <ul className="prvp__points">{asArray(s.points).map(renderPoint)}</ul>
                            )}
                            {asArray(s.after).map((p, j) => <p className="prvp__para" key={`a${j}`}>{p}</p>)}
                            {s.note && <p className="prvp__note">{s.note}</p>}
                        </section>
                    ))}

                    {/* -------- contact card -------- */}
                    {(contact.title || contact.email) && (
                        <section className="prvp__contact">
                            <span className="prvp__contact-badge"><Lotus /></span>
                            <div className="prvp__contact-body">
                                {contact.title && <h2 className="prvp__contact-title">{contact.title}</h2>}
                                {contact.text && <p className="prvp__contact-text">{contact.text}</p>}
                                <div className="prvp__contact-rows">
                                    {contact.email && (
                                        <a className="prvp__contact-row" href={`mailto:${contact.email}`}>
                                            <MailIcon /><span>{contact.email}</span>
                                        </a>
                                    )}
                                    {contact.address && (
                                        <span className="prvp__contact-row"><PinIcon /><span>{contact.address}</span></span>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                </article>
            </main>

            {/* ============================== FOOTER ============================= */}
            <footer className="prvp__footer">
                <div className="prvp__footer-links">
                    <button type="button" onClick={() => goTo("/")}>{t("navHome") || "Home"}</button>
                    <button type="button" className="active" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                        {legal.privacyLink || "Privacy Policy"}
                    </button>
                    <button type="button" onClick={() => goTo("/terms-of-service")}>{legal.termsLink || "Terms of Service"}</button>
                    <button type="button" onClick={() => goTo("/contact")}>{t("navContact") || "Contact"}</button>
                </div>
                <p className="prvp__footer-copy">{t("legal.copyright", { year }) || `© ${year}`}</p>
            </footer>

            <button
                type="button"
                className="prvp__top"
                aria-label={legal.backToTop || "Back to top"}
                title={legal.backToTop || "Back to top"}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
                <ArrowUp />
            </button>
        </div>
    );
};

export default PrivacyPolicy;