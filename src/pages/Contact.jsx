import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./Contact.css";

// Reuse your existing asset
import logo2 from "../assets/logo2.png";

// Firestore (same firebase config that exports `auth`)
import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/* ------------------------------------------------------------------ */
/* Inline icons (same stroke style as your Login / About screens)     */
/* ------------------------------------------------------------------ */
const I = {
    lotus: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4c1.3 1.5 2 3.1 2 4.7 0 .8-.2 1.6-.6 2.4.7-.4 1.3-1 1.9-1.9.3 1.4.1 2.7-.6 3.9 1-.3 1.9-.8 2.8-1.6-.1 2.2-1.5 4-3.6 5.1-.6.4-1.2.6-1.9.8-.7-.2-1.3-.4-1.9-.8C8 15.4 6.6 13.6 6.5 11.4c.9.8 1.8 1.3 2.8 1.6-.7-1.2-.9-2.5-.6-3.9.6.9 1.2 1.5 1.9 1.9-.4-.8-.6-1.6-.6-2.4C10 7.1 10.7 5.5 12 4z" />
        </svg>
    ),
    pin: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
    ),
    phone: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    ),
    mail: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
        </svg>
    ),
    globe: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M3 12h18" />
            <path d="M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18" />
        </svg>
    ),
    arrow: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
    ),
    send: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" />
        </svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    external: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    ),
    facebook: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z" />
        </svg>
    ),
    instagram: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" />
            <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
        </svg>
    ),
    youtube: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M23 12s0-3.2-.4-4.74a2.5 2.5 0 0 0-1.76-1.77C19.3 5.1 12 5.1 12 5.1s-7.3 0-8.84.39A2.5 2.5 0 0 0 1.4 7.26C1 8.8 1 12 1 12s0 3.2.4 4.74a2.5 2.5 0 0 0 1.76 1.77C4.7 18.9 12 18.9 12 18.9s7.3 0 8.84-.39a2.5 2.5 0 0 0 1.76-1.77C23 15.2 23 12 23 12zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
        </svg>
    ),
    whatsapp: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35zM12.05 21.5a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5A9.45 9.45 0 0 1 18.74 5.3a9.38 9.38 0 0 1 2.76 6.67 9.45 9.45 0 0 1-9.45 9.53zM20.52 3.49A11.78 11.78 0 0 0 12.05.01 11.82 11.82 0 0 0 .22 11.97c0 2.08.55 4.11 1.59 5.9L.12 24l6.3-1.65a11.78 11.78 0 0 0 5.63 1.43h.01a11.82 11.82 0 0 0 8.46-20.29z" />
        </svg>
    ),
    telegram: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.94 4.27a1 1 0 0 0-1.05-.16L3.4 11.04c-.86.35-.83 1.6.05 1.9l4.3 1.46 1.64 5.2c.25.78 1.25.98 1.78.36l2.4-2.78 4.32 3.18c.6.44 1.46.12 1.62-.6l3.34-14.7a1 1 0 0 0-.5-1.05zM9.7 13.9l8.2-5.07-6.66 6.2c-.16.16-.27.36-.31.58l-.3 2.02-.93-3.73z" />
        </svg>
    ),
};

/* ------------------------------------------------------------------ */
/* Reveal-on-scroll hook                                              */
/* ------------------------------------------------------------------ */
function useInView(options = { threshold: 0.18 }) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setInView(true); obs.unobserve(el); }
        }, options);
        obs.observe(el);
        return () => obs.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return [ref, inView];
}

function Reveal({ children, className = "", delay = 0, as: Tag = "div" }) {
    const [ref, inView] = useInView();
    return (
        <Tag ref={ref} className={`mdgt-reveal ${inView ? "mdgt-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
            {children}
        </Tag>
    );
}

/* ------------------------------------------------------------------ */
/* Floating particles (deterministic positions)                       */
/* ------------------------------------------------------------------ */
const PARTICLES = [
    { l: 8, t: 18, s: 5, d: 0 }, { l: 22, t: 64, s: 3, d: 1.4 }, { l: 35, t: 28, s: 6, d: 2.1 },
    { l: 48, t: 72, s: 4, d: 0.6 }, { l: 60, t: 22, s: 5, d: 1.1 }, { l: 73, t: 58, s: 3, d: 2.6 },
    { l: 84, t: 30, s: 6, d: 0.9 }, { l: 92, t: 66, s: 4, d: 1.8 }, { l: 15, t: 44, s: 4, d: 2.3 },
    { l: 40, t: 50, s: 3, d: 1.6 }, { l: 66, t: 42, s: 5, d: 0.3 }, { l: 80, t: 12, s: 4, d: 2.0 },
];

/* ------------------------------------------------------------------ */
/* Contact form (floating labels + validation + success popup)        */
/* ------------------------------------------------------------------ */
function ContactForm() {
    const { t } = useTranslation();
    const [form, setForm] = useState({ name: "", email: "", phone: "", memberId: "", subject: "", message: "" });
    const [errors, setErrors] = useState({});
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const validate = () => {
        const e = {};
        if (form.name.trim().length < 2) e.name = t("ctErrName") || "Please enter your name";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t("ctErrEmail") || "Enter a valid email address";
        if (!/^[0-9]{10}$/.test(form.phone)) e.phone = t("ctErrPhone") || "Enter a valid 10-digit phone number";
        if (form.subject.trim().length < 2) e.subject = t("ctErrSubject") || "Please enter a subject";
        if (form.message.trim().length < 5) e.message = t("ctErrMessage") || "Please enter your message";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return;

        setSubmitError("");
        setSending(true);
        try {
            await addDoc(collection(db, "contactMessages"), {
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                memberId: form.memberId.trim() || null,
                subject: form.subject.trim(),
                message: form.message.trim(),
                status: "new",
                source: "contact-page",
                createdAt: serverTimestamp(),
            });
            setSent(true);
        } catch (err) {
            console.error("Contact form submission failed:", err);
            setSubmitError(
                t("ctSubmitError") ||
                "Sorry, something went wrong while sending. Please try again, or reach us on WhatsApp."
            );
        } finally {
            setSending(false);
        }
    };

    const reset = () => {
        setForm({ name: "", email: "", phone: "", memberId: "", subject: "", message: "" });
        setErrors({});
        setSent(false);
        setSubmitError("");
    };

    useEffect(() => {
        if (!sent) return;
        const onKey = (e) => { if (e.key === "Escape") reset(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [sent]);

    return (
        <>
            <form className="mdgt-card mdgt-form" onSubmit={handleSubmit} noValidate>
                <div className="mdgt-form-grid">
                    <div className="mdgt-field">
                        <input className={`mdgt-input ${errors.name ? "mdgt-input-err" : ""}`} id="ct-name" type="text" autoComplete="name" placeholder=" " value={form.name} onChange={(e) => update("name", e.target.value)} />
                        <label htmlFor="ct-name" className="mdgt-label">{t("ctFldName") || "Full Name"}</label>
                        {errors.name && <span className="mdgt-err">{errors.name}</span>}
                    </div>

                    <div className="mdgt-field">
                        <input className={`mdgt-input ${errors.email ? "mdgt-input-err" : ""}`} id="ct-email" type="email" autoComplete="email" placeholder=" " value={form.email} onChange={(e) => update("email", e.target.value)} />
                        <label htmlFor="ct-email" className="mdgt-label">{t("ctFldEmail") || "Email Address"}</label>
                        {errors.email && <span className="mdgt-err">{errors.email}</span>}
                    </div>

                    <div className="mdgt-field">
                        <input className={`mdgt-input ${errors.phone ? "mdgt-input-err" : ""}`} id="ct-phone" type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} placeholder=" " value={form.phone} onChange={(e) => update("phone", e.target.value.replace(/[^0-9]/g, ""))} />
                        <label htmlFor="ct-phone" className="mdgt-label">{t("ctFldPhone") || "Phone Number"}</label>
                        {errors.phone && <span className="mdgt-err">{errors.phone}</span>}
                    </div>

                    <div className="mdgt-field">
                        <input className="mdgt-input" id="ct-member" type="text" maxLength={12} placeholder=" " value={form.memberId} onChange={(e) => update("memberId", e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())} />
                        <label htmlFor="ct-member" className="mdgt-label">{t("ctFldMemberId") || "Member ID (Optional)"}</label>
                    </div>

                    <div className="mdgt-field mdgt-field-full">
                        <input className={`mdgt-input ${errors.subject ? "mdgt-input-err" : ""}`} id="ct-subject" type="text" placeholder=" " value={form.subject} onChange={(e) => update("subject", e.target.value)} />
                        <label htmlFor="ct-subject" className="mdgt-label">{t("ctFldSubject") || "Subject"}</label>
                        {errors.subject && <span className="mdgt-err">{errors.subject}</span>}
                    </div>

                    <div className="mdgt-field mdgt-field-full">
                        <textarea className={`mdgt-input mdgt-textarea ${errors.message ? "mdgt-input-err" : ""}`} id="ct-message" rows={5} placeholder=" " value={form.message} onChange={(e) => update("message", e.target.value)} />
                        <label htmlFor="ct-message" className="mdgt-label">{t("ctFldMessage") || "Message"}</label>
                        {errors.message && <span className="mdgt-err">{errors.message}</span>}
                    </div>
                </div>

                <button
                    type="submit"
                    className="mdgt-btn mdgt-btn-primary mdgt-form-submit"
                    disabled={sending}
                    style={{ opacity: sending ? 0.7 : 1, cursor: sending ? "not-allowed" : "pointer" }}
                >
                    <span>{sending ? (t("ctSending") || "Sending…") : (t("ctSend") || "Send Message")}</span>
                    <span className="mdgt-btn-arrow">{I.send}</span>
                </button>
                {submitError && (
                    <p className="mdgt-err" style={{ textAlign: "center", marginTop: "14px" }}>{submitError}</p>
                )}
            </form>

            {sent && (
                <div className="mdgt-popup" onClick={reset}>
                    <div className="mdgt-card mdgt-popup-card" onClick={(e) => e.stopPropagation()}>
                        <span className="mdgt-popup-icon">{I.check}</span>
                        <h3 className="mdgt-popup-title">{t("ctSuccessTitle") || "Message Sent"}</h3>
                        <p className="mdgt-popup-hi">{(t("ctSuccessHi") || "Thank you")}{form.name ? `, ${form.name}` : ""} 🙏</p>
                        <p className="mdgt-popup-sub">{t("ctSuccessText") || "We've received your message and will get back to you shortly."}</p>
                        <button className="mdgt-btn mdgt-btn-ghost" onClick={reset}>{t("ctSuccessClose") || "Done"}</button>
                    </div>
                </div>
            )}
        </>
    );
}

/* ================================================================== */
/* PAGE                                                               */
/* ================================================================== */
const Contact = () => {
    const { t } = useTranslation();

    const formRef = useRef(null);
    const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth" });

    // ── Edit these to your real details ──────────────────────────────
    const joinHref = "/membership"; // change to your join / membership route
    const address = t("ctAddressValue") || "Jai Gurubande, Varanasi, Uttar Pradesh, India";
    const phones = [
        { txt: "+91 70802 24214", href: "tel:+917080224214" },
        { txt: "+91 70802 24215", href: "tel:+917080224215" },
        { txt: "+91 70802 24216", href: "tel:+917080224216" },
    ];
    const emailVal = "support@jaigurubande.in";
    const webTxt = t("ctWebValue") || "www.jaigurubande.in";
    const webHref = "https://jaigurubande.in";

    // Exact location pin from your Google Maps link ("Jai Gurubande")
    const mapEmbed = "https://www.google.com/maps?q=25.3755304,83.1428266&z=16&output=embed";
    const mapsLink = "https://maps.app.goo.gl/r9sNPsgPng9cFJDg7";

    const info = [
        { icon: I.pin, cls: "mdgt-ic-violet", label: t("ctAddressLabel") || "Ashram Address", value: address, href: mapsLink, ext: true },
        { icon: I.phone, cls: "mdgt-ic-gold", label: t("ctPhoneLabel") || "Phone Number", values: phones },
        { icon: I.mail, cls: "mdgt-ic-rose", label: t("ctEmailLabel") || "Email Address", value: emailVal, href: `mailto:${emailVal}` },
        { icon: I.globe, cls: "mdgt-ic-blue", label: t("ctWebLabel") || "Website", value: webTxt, href: webHref, ext: true },
    ];

    // ── Official Meditation Dhyan Portal profiles ────────────────────
    const socials = [
        { icon: I.facebook, label: "Facebook", href: "https://www.facebook.com/share/g/1AZvFisxcs/", cls: "mdgt-soc-fb" },
        { icon: I.instagram, label: "Instagram", href: "https://www.instagram.com/jaigurubande__official?igsh=NnIwdnI5cGMxemYy", cls: "mdgt-soc-ig" },
        { icon: I.youtube, label: "YouTube", href: "https://youtube.com/@jaigurubande?feature=shared", cls: "mdgt-soc-yt" },
        { icon: I.whatsapp, label: "WhatsApp", href: "https://chat.whatsapp.com/GwdDS530clKJsNc4zkPCyD", cls: "mdgt-soc-wa" },
        { icon: I.telegram, label: "Telegram", href: "https://t.me/+5APCSKB6YC85MjRl", cls: "mdgt-soc-tg" },
    ];

    return (
        <div className="mdgt-page">

            {/* ---------------- ambient background ---------------- */}
            <div className="mdgt-bg" aria-hidden="true">
                <span className="mdgt-orb mdgt-orb-1" />
                <span className="mdgt-orb mdgt-orb-2" />
                <span className="mdgt-orb mdgt-orb-3" />
                <span className="mdgt-grid" />
            </div>

            {/* ============================ HERO ============================ */}
            <header className="mdgt-hero">
                <div className="mdgt-hero-glow" />
                <span className="mdgt-hero-lotus" aria-hidden="true">{I.lotus}</span>
                <div className="mdgt-particles" aria-hidden="true">
                    {PARTICLES.map((p, i) => (
                        <span key={i} className="mdgt-particle" style={{ left: `${p.l}%`, top: `${p.t}%`, width: p.s, height: p.s, animationDelay: `${p.d}s` }} />
                    ))}
                </div>

                <Reveal className="mdgt-hero-inner">
                    <img src={logo2} alt="Logo" className="mdgt-hero-logo" loading="lazy" />
                    <p className="mdgt-kicker mdgt-kicker-center">🙏 {t("guruText") || "Jai Gurubande"} 🙏</p>
                    <h1 className="mdgt-hero-title">
                        <span className="mdgt-gold-text">{t("ctHeroTitle") || "Contact Us"}</span>
                    </h1>
                    <p className="mdgt-hero-sub">
                        {t("ctHeroSub") || "We're here to support your spiritual journey. Reach out to us for guidance, membership assistance, or any questions."}
                    </p>
                    <div className="mdgt-hero-actions">
                        <button className="mdgt-btn mdgt-btn-primary" onClick={scrollToForm}>
                            <span>{t("ctContactNow") || "Contact Now"}</span>
                            <span className="mdgt-btn-arrow">{I.arrow}</span>
                        </button>
                        <a className="mdgt-btn mdgt-btn-ghost" href={joinHref}>{t("ctJoinPortal") || "Join Portal"}</a>
                    </div>
                </Reveal>
                <div className="mdgt-scroll-cue" aria-hidden="true"><span /></div>
            </header>

            {/* ====================== CONTACT INFORMATION ====================== */}
            <section className="mdgt-section">
                <div className="mdgt-container">
                    <Reveal className="mdgt-section-head">
                        <span className="mdgt-kicker mdgt-kicker-center">{t("ctInfoKicker") || "Reach Us"}</span>
                        <h2 className="mdgt-section-title mdgt-center">{t("ctInfoHeading") || "Contact Information"}</h2>
                    </Reveal>

                    <div className="mdgt-info-grid">
                        {info.map((c, i) => (
                            <Reveal key={i} className="mdgt-card mdgt-info-card" delay={i * 90}>
                                <span className={`mdgt-icon ${c.cls}`}>{c.icon}</span>
                                <span className="mdgt-info-label">{c.label}</span>
                                {c.values
                                    ? <span className="mdgt-info-lines" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                        {c.values.map((v, k) => (
                                            <a key={k} className="mdgt-info-value" href={v.href}>{v.txt}</a>
                                        ))}
                                    </span>
                                    : c.href
                                        ? <a className="mdgt-info-value" href={c.href} {...(c.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{c.value}</a>
                                        : <span className="mdgt-info-value">{c.value}</span>}
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========================= CONTACT FORM ========================= */}
            <section className="mdgt-section" ref={formRef}>
                <div className="mdgt-container">
                    <Reveal className="mdgt-section-head">
                        <span className="mdgt-kicker mdgt-kicker-center">{t("ctFormKicker") || "Send a Message"}</span>
                        <h2 className="mdgt-section-title mdgt-center">{t("ctFormHeading") || "Get in Touch"}</h2>
                        <p className="mdgt-section-sub">{t("ctFormSub") || "Fill in the form below and our team will respond as soon as possible."}</p>
                    </Reveal>
                    <Reveal delay={120}><ContactForm /></Reveal>
                </div>
            </section>

            {/* ========================= LOCATION MAP ========================= */}
            <section className="mdgt-section">
                <div className="mdgt-container">
                    <Reveal className="mdgt-section-head">
                        <span className="mdgt-kicker mdgt-kicker-center">{t("ctMapKicker") || "Find Us"}</span>
                        <h2 className="mdgt-section-title mdgt-center">{t("ctMapHeading") || "Our Location"}</h2>
                    </Reveal>

                    <Reveal className="mdgt-map-wrap">
                        <div className="mdgt-map-frame">
                            <iframe
                                title="Meditation Dhyan Portal location"
                                src={mapEmbed}
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                        <div className="mdgt-card mdgt-map-card">
                            <span className="mdgt-icon mdgt-ic-violet">{I.pin}</span>
                            <h3 className="mdgt-map-name">{t("ctMapName") || "Meditation Dhyan Portal"}</h3>
                            <p className="mdgt-map-addr">{address}</p>
                            <a className="mdgt-btn mdgt-btn-primary mdgt-map-open" href={mapsLink} target="_blank" rel="noopener noreferrer">
                                <span>{t("ctOpenMaps") || "Open in Google Maps"}</span>
                                <span className="mdgt-btn-arrow">{I.external}</span>
                            </a>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ========================= SOCIAL MEDIA ========================= */}
            <section className="mdgt-section">
                <div className="mdgt-container">
                    <Reveal className="mdgt-section-head">
                        <span className="mdgt-kicker mdgt-kicker-center">{t("ctSocialKicker") || "Stay Connected"}</span>
                        <h2 className="mdgt-section-title mdgt-center">{t("ctSocialHeading") || "Follow Us"}</h2>
                        <p className="mdgt-section-sub">{t("ctSocialSub") || "Join our community across your favourite platforms for daily inspiration."}</p>
                    </Reveal>

                    <Reveal className="mdgt-socials">
                        {socials.map((s, i) => (
                            <a key={i} className={`mdgt-soc ${s.cls}`} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                                {s.icon}
                            </a>
                        ))}
                    </Reveal>
                </div>
            </section>

            {/* ========================= CALL TO ACTION ========================= */}
            <section className="mdgt-section">
                <div className="mdgt-container">
                    <Reveal className="mdgt-cta-card">
                        <span className="mdgt-cta-lotus" aria-hidden="true">{I.lotus}</span>
                        <h2 className="mdgt-cta-heading">{t("ctCtaHeading") || "Begin Your Spiritual Journey Today"}</h2>
                        <p className="mdgt-cta-sub">
                            {t("ctCtaSub") || "Whether you have questions, wish to join our community, or need spiritual guidance, we're always here to help."}
                        </p>
                        <div className="mdgt-cta-actions">
                            <a className="mdgt-btn mdgt-btn-primary" href={joinHref}>
                                <span>✨ {t("ctJoinPortal") || "Join Portal"}</span>
                            </a>
                            <button className="mdgt-btn mdgt-btn-ghost" onClick={scrollToForm}>
                                {t("ctContactNow") || "Contact Now"}
                            </button>
                        </div>
                    </Reveal>
                </div>
            </section>

        </div>
    );
};

export default Contact;