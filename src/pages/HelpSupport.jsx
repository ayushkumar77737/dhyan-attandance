import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { useTranslation } from "react-i18next";
import { db, auth } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import "./HelpSupport.css";
const HelpSupport = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [openSection, setOpenSection] = useState(null);
    const [copiedKey, setCopiedKey] = useState(null);
    const [contactData, setContactData] = useState(null);
    const [loading, setLoading] = useState(true);

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
    useEffect(() => {

        const unsubscribe = onAuthStateChanged(auth, async (user) => {

            if (!user || !user.email) {
                navigate("/");
                return;
            }

            const id = user.email
                .split("@")[0]
                .toUpperCase();

            const userRef = doc(db, "users", id);

            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                navigate("/");
                return;
            }

            const userData = userSnap.data();

            if (userData.uid !== user.uid) {
                navigate("/");
                return;
            }

            if (userData.role === "admin") {
                navigate("/admin-dashboard");
                return;
            }

        });

        return () => unsubscribe();

    }, []);
    useEffect(() => {
        const fetchContact = async () => {
            try {
                const docRef = doc(db, "settings", "contact");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setContactData(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching contact:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchContact();
    }, []);
    const toggleSection = (section) => {
        setOpenSection((prev) => (prev === section ? null : section));
    };
    const handleCopy = (text, key) => {
        if (!text) return;
        if (!text || typeof text !== "string") {
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        });
    };
    const faqs = [
        { id: "faq1", question: t("faq1Question"), answer: t("faq1Answer") },
        { id: "faq2", question: t("faq2Question"), answer: t("faq2Answer") },
        { id: "faq3", question: t("faq3Question"), answer: t("faq3Answer") },
        { id: "faq4", question: t("faq4Question"), answer: t("faq4Answer") },
    ];
    const CopyIcon = () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    );
    const CheckIcon = () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
    const ExternalIcon = () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    );
    const telegramLink =
        contactData?.telegramChannel?.startsWith("https://")
            ? contactData.telegramChannel
            : "#";

    const mapsLink =
        contactData?.ashramAddress?.startsWith("https://")
            ? contactData.ashramAddress
            : "#";
    return (
        <div className="helpsup__wrapper">
            <div className="helpsup__orb helpsup__orb--1" />
            <div className="helpsup__orb helpsup__orb--2" />
            <div className="helpsup__orb helpsup__orb--3" />
            <button className="helpsup__back-btn" onClick={() => navigate("/user-dashboard")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="helpsup__back-icon">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("back")}
            </button>
            <div className="helpsup__header">
                <div className="helpsup__header-badge">
                    <span className="helpsup__badge-dot" />
                    {t("supportCenter")}
                </div>
                <h1 className="helpsup__title">
                    {t("helpAnd")} <span className="helpsup__title-accent">{t("support")}</span>
                </h1>
                <p className="helpsup__subtitle">{t("helpSubtitle")}</p>
            </div>
            <section className="helpsup__section">
                <h2 className="helpsup__section-title">📞 {t("contactUs")}</h2>
                {loading ? (
                    <div className="helpsup__loading">
                        <span className="helpsup__loading-dot" />
                        <span className="helpsup__loading-dot" />
                        <span className="helpsup__loading-dot" />
                    </div>
                ) : contactData ? (
                    <div className="helpsup__cards-grid">
                        <div className="helpsup__card helpsup__card--phone">
                            <div className="helpsup__card-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                            </div>
                            <div className="helpsup__card-content">
                                <span className="helpsup__card-label">{t("supportPhone1")}</span>
                                <a href={`tel:${contactData.supportPhone1?.replace(/\s/g, "")}`} className="helpsup__card-value">
                                    {contactData.supportPhone1}
                                </a>
                            </div>
                            <button
                                className={`helpsup__copy-btn ${copiedKey === "phone1" ? "helpsup__copy-btn--copied" : ""}`}
                                onClick={() => handleCopy(contactData.supportPhone1, "phone1")}
                                title="Copy"
                            >
                                {copiedKey === "phone1" ? <CheckIcon /> : <CopyIcon />}
                            </button>
                        </div>
                        <div className="helpsup__card helpsup__card--phone">
                            <div className="helpsup__card-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                            </div>
                            <div className="helpsup__card-content">
                                <span className="helpsup__card-label">{t("supportPhone2")}</span>
                                <a href={`tel:${contactData.supportPhone2?.replace(/\s/g, "")}`} className="helpsup__card-value">
                                    {contactData.supportPhone2}
                                </a>
                            </div>
                            <button
                                className={`helpsup__copy-btn ${copiedKey === "phone2" ? "helpsup__copy-btn--copied" : ""}`}
                                onClick={() => handleCopy(contactData.supportPhone2, "phone2")}
                                title="Copy"
                            >
                                {copiedKey === "phone2" ? <CheckIcon /> : <CopyIcon />}
                            </button>
                        </div>
                        <div className="helpsup__card helpsup__card--email">
                            <div className="helpsup__card-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                            </div>
                            <div className="helpsup__card-content">
                                <span className="helpsup__card-label">{t("supportEmail")}</span>
                                <a href={`mailto:${contactData.supportEmail}`} className="helpsup__card-value">
                                    {contactData.supportEmail}
                                </a>
                            </div>
                            <button
                                className={`helpsup__copy-btn ${copiedKey === "email" ? "helpsup__copy-btn--copied" : ""}`}
                                onClick={() => handleCopy(contactData.supportEmail, "email")}
                                title="Copy"
                            >
                                {copiedKey === "email" ? <CheckIcon /> : <CopyIcon />}
                            </button>
                        </div>
                        <div className="helpsup__card helpsup__card--telegram">
                            <div className="helpsup__card-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.83.941z" />
                                </svg>
                            </div>
                            <div className="helpsup__card-content">
                                <span className="helpsup__card-label">{t("telegramChannel")}</span>
                                <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="helpsup__card-value helpsup__card-value--link">
                                    {t("joinTelegram")}
                                </a>
                            </div>
                            <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="helpsup__open-btn" title="Open">
                                <ExternalIcon />
                            </a>
                        </div>
                        <div className="helpsup__card helpsup__card--location helpsup__card--full">
                            <div className="helpsup__card-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                            </div>
                            <div className="helpsup__card-content">
                                <span className="helpsup__card-label">{t("ashramAddress")}</span>
                                <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="helpsup__card-value helpsup__card-value--link">
                                    {t("viewOnMaps")}
                                </a>
                            </div>
                            <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="helpsup__open-btn" title="Open Maps">
                                <ExternalIcon />
                            </a>
                        </div>
                    </div>
                ) : (
                    <p className="helpsup__no-data">{t("noContactFound")}</p>
                )}
            </section>
            <section className="helpsup__section">
                <h2 className="helpsup__section-title">❓ {t("faqTitle")}</h2>
                <div className="helpsup__faq-list">
                    {faqs.map((faq) => (
                        <div key={faq.id} className={`helpsup__faq-item ${openSection === faq.id ? "helpsup__faq-item--open" : ""}`}>
                            <button className="helpsup__faq-question" onClick={() => toggleSection(faq.id)}>
                                <span>{faq.question}</span>
                                <span className="helpsup__faq-chevron">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </span>
                            </button>
                            <div className="helpsup__faq-answer">
                                <p>{faq.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            <div className="helpsup__footer-note">
                <p>🕉️ {t("footerNote")}</p>
            </div>
        </div>
    );
};
export default HelpSupport;