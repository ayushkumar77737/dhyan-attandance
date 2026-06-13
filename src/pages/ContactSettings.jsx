import React, { useEffect, useState } from "react";
import "./ContactSettings.css";
import { logAdminAction } from "../utils/logAdminAction";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

function ContactSettings() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        supportEmail: "support@jaigurubande.in",
        supportPhone1: "+91 831 858 3110",
        supportPhone2: "+91 9502967959",
        telegramChannel: "https://t.me/+5APCSKB6YC85MjRl",
        ashramAddress: "https://maps.app.goo.gl/2YCp1hCbfK66C7mo7",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [errors, setErrors] = useState({});
    const checkAdmin = async () => {

        const currentUser = auth.currentUser;

        if (!currentUser) {
            navigate("/");
            return;
        }

        try {

            const userRef = doc(db, "users", localStorage.getItem("userId"));
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                navigate("/");
                return;
            }

            const userData = userSnap.data();

            if (
                userData.role !== "admin" ||
                userData.uid !== auth.currentUser.uid
            ) {
                navigate("/");
                return;
            }

            fetchContact();

        } catch (error) {
            console.error(error);
            navigate("/");
        }
    };

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
        checkAdmin();
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    const fetchContact = async () => {
        try {
            setLoading(true);
            const snap = await getDoc(doc(db, "settings", "contact"));
            if (snap.exists()) {
                setForm((prev) => ({ ...prev, ...snap.data() }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const validate = () => {
        const errs = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[\d\s\-()]{7,20}$/;
        const urlRegex = /^https?:\/\/.+/;

        if (!form.supportEmail.trim()) errs.supportEmail = t("csEmailRequired");
        else if (!emailRegex.test(form.supportEmail)) errs.supportEmail = t("csEmailInvalid");

        if (!form.supportPhone1.trim()) errs.supportPhone1 = t("csPhone1Required");
        else if (!phoneRegex.test(form.supportPhone1)) errs.supportPhone1 = t("csPhoneInvalid");

        if (form.supportPhone2.trim() && !phoneRegex.test(form.supportPhone2))
            errs.supportPhone2 = t("csPhoneInvalid");

        if (!form.telegramChannel.trim()) errs.telegramChannel = t("csTelegramRequired");
        else if (!urlRegex.test(form.telegramChannel)) errs.telegramChannel = t("csUrlInvalid");

        if (!form.ashramAddress.trim()) errs.ashramAddress = t("csAddressRequired");
        else if (!urlRegex.test(form.ashramAddress)) errs.ashramAddress = t("csUrlInvalid");

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        try {
            setSaving(true);
            if (
                form.supportEmail.length > 100 ||
                form.supportPhone1.length > 20 ||
                form.supportPhone2.length > 20 ||
                form.telegramChannel.length > 300 ||
                form.ashramAddress.length > 300
            ) {
                return;
            }
            await setDoc(doc(db, "settings", "contact"), form);
            await logAdminAction("update_contact_settings", {
                targetId: "contact",
                details: t("logUpdatedContactSettings"),
            });
            showToast(t("csContactSaved"), "success");
        } catch (err) {
            console.error(err);
            showToast(t("csSaveError"), "error");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {

        value = value.trimStart();

        setForm((prev) => ({
            ...prev,
            [field]: value
        }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const handleReset = () => {
        setForm({
            supportEmail: "support@jaigurubande.in",
            supportPhone1: "+91 831 858 3110",
            supportPhone2: "+91 9502967959",
            telegramChannel: "https://t.me/+5APCSKB6YC85MjRl",
            ashramAddress: "https://maps.app.goo.gl/2YCp1hCbfK66C7mo7",
        });
        setErrors({});
        setToast(null);
    };

    return (
        <div className="cset__page">
            <div className="cset__orb cset__orb--1" />
            <div className="cset__orb cset__orb--2" />
            <div className="cset__orb cset__orb--3" />
            <div className="cset__grid" />

            {toast && (
                <div className={`cset__toast cset__toast--${toast.type}`}>
                    <span className="cset__toast-icon">
                        {toast.type === "success" ? "✅" : "❌"}
                    </span>
                    {toast.msg}
                </div>
            )}

            <button className="cset__back-btn" onClick={() => navigate("/admin-dashboard")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("back")}
            </button>

            <div className="cset__header">
                <div className="cset__eyebrow">
                    <span className="cset__eyebrow-pulse" />
                    <span className="cset__eyebrow-text">{t("adminPanel")}</span>
                </div>
                <h1 className="cset__title">
                    <span className="cset__title-main">{t("csPageTitleMain")}</span>
                    <span className="cset__title-accent"> {t("csPageTitleAccent")}</span>
                </h1>
                <p className="cset__subtitle">{t("csPageSubtitle")}</p>
            </div>

            {loading ? (
                <div className="cset__loading">
                    <div className="cset__loader">
                        <div className="cset__loader-ring" />
                        <div className="cset__loader-ring cset__loader-ring--2" />
                        <div className="cset__loader-core" />
                    </div>
                    <p>{t("loading")}</p>
                </div>
            ) : (
                <div className="cset__content">
                    <div className="cset__preview-row">
                        <a href={`mailto:${form.supportEmail}`} className="cset__preview-card cset__preview-card--blue" target="_blank" rel="noreferrer">
                            <div className="cset__preview-icon-wrap cset__preview-icon-wrap--blue">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                            </div>
                            <div className="cset__preview-info">
                                <span className="cset__preview-label">{t("csSupportEmail")}</span>
                                <span className="cset__preview-value">{form.supportEmail || "—"}</span>
                            </div>
                            <span className="cset__preview-arrow">↗</span>
                        </a>

                        <a href={`tel:${form.supportPhone1.replace(/\s/g, "")}`} className="cset__preview-card cset__preview-card--green" target="_blank" rel="noreferrer">
                            <div className="cset__preview-icon-wrap cset__preview-icon-wrap--green">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l1.63-1.63a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                            </div>
                            <div className="cset__preview-info">
                                <span className="cset__preview-label">{t("csSupportPhone")}</span>
                                <span className="cset__preview-value">{form.supportPhone1 || "—"}</span>
                                {form.supportPhone2 && <span className="cset__preview-value2">{form.supportPhone2}</span>}
                            </div>
                            <span className="cset__preview-arrow">↗</span>
                        </a>

                        <a href={form.telegramChannel} className="cset__preview-card cset__preview-card--purple" target="_blank" rel="noreferrer">
                            <div className="cset__preview-icon-wrap cset__preview-icon-wrap--purple">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                            </div>
                            <div className="cset__preview-info">
                                <span className="cset__preview-label">{t("csTelegramChannel")}</span>
                                <span className="cset__preview-value cset__preview-value--url">{t("csOpenChannel")}</span>
                            </div>
                            <span className="cset__preview-arrow">↗</span>
                        </a>

                        <a href={form.ashramAddress} className="cset__preview-card cset__preview-card--orange" target="_blank" rel="noreferrer">
                            <div className="cset__preview-icon-wrap cset__preview-icon-wrap--orange">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                            </div>
                            <div className="cset__preview-info">
                                <span className="cset__preview-label">{t("csAshramAddress")}</span>
                                <span className="cset__preview-value cset__preview-value--url">{t("csOpenMaps")}</span>
                            </div>
                            <span className="cset__preview-arrow">↗</span>
                        </a>
                    </div>

                    <div className="cset__form-card">
                        <div className="cset__form-header">
                            <div className="cset__form-header-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="cset__form-title">{t("csEditDetails")}</h2>
                                <p className="cset__form-sub">{t("csEditDetailsSub")}</p>
                            </div>
                        </div>

                        <div className="cset__form-grid">
                            <div className="cset__field">
                                <label className="cset__label">
                                    <span className="cset__label-icon">✉️</span>
                                    {t("csSupportEmail")}
                                </label>
                                <div className={`cset__input-wrap ${errors.supportEmail ? "cset__input-wrap--error" : ""}`}>
                                    <input
                                        className="cset__input"
                                        type="email"
                                        placeholder="support@example.com"
                                        value={form.supportEmail}
                                        onChange={(e) => handleChange("supportEmail", e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>
                                {errors.supportEmail && <span className="cset__error">{errors.supportEmail}</span>}
                            </div>

                            <div className="cset__field">
                                <label className="cset__label">
                                    <span className="cset__label-icon">📞</span>
                                    {t("csSupportPhone")} 1
                                </label>
                                <div className={`cset__input-wrap ${errors.supportPhone1 ? "cset__input-wrap--error" : ""}`}>
                                    <input
                                        className="cset__input"
                                        type="text"
                                        placeholder="+91 XXXXX XXXXX"
                                        value={form.supportPhone1}
                                        onChange={(e) => handleChange("supportPhone1", e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>
                                {errors.supportPhone1 && <span className="cset__error">{errors.supportPhone1}</span>}
                            </div>

                            <div className="cset__field">
                                <label className="cset__label">
                                    <span className="cset__label-icon">📱</span>
                                    {t("csSupportPhone")} 2 <span className="cset__optional">({t("csOptional")})</span>
                                </label>
                                <div className={`cset__input-wrap ${errors.supportPhone2 ? "cset__input-wrap--error" : ""}`}>
                                    <input
                                        className="cset__input"
                                        type="text"
                                        placeholder="+91 XXXXX XXXXX"
                                        value={form.supportPhone2}
                                        onChange={(e) => handleChange("supportPhone2", e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>
                                {errors.supportPhone2 && <span className="cset__error">{errors.supportPhone2}</span>}
                            </div>

                            <div className="cset__field">
                                <label className="cset__label">
                                    <span className="cset__label-icon">✈️</span>
                                    {t("csTelegramChannel")}
                                </label>
                                <div className={`cset__input-wrap ${errors.telegramChannel ? "cset__input-wrap--error" : ""}`}>
                                    <input
                                        className="cset__input"
                                        type="url"
                                        placeholder="https://t.me/..."
                                        value={form.telegramChannel}
                                        onChange={(e) => handleChange("telegramChannel", e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>
                                {errors.telegramChannel && <span className="cset__error">{errors.telegramChannel}</span>}
                            </div>

                            <div className="cset__field cset__field--full">
                                <label className="cset__label">
                                    <span className="cset__label-icon">📍</span>
                                    {t("csAshramAddress")} (Google Maps URL)
                                </label>
                                <div className={`cset__input-wrap ${errors.ashramAddress ? "cset__input-wrap--error" : ""}`}>
                                    <input
                                        className="cset__input"
                                        type="url"
                                        placeholder="https://maps.app.goo.gl/..."
                                        value={form.ashramAddress}
                                        onChange={(e) => handleChange("ashramAddress", e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>
                                {errors.ashramAddress && <span className="cset__error">{errors.ashramAddress}</span>}
                            </div>
                        </div>

                        <div className="cset__actions">
                            <button className="cset__reset-btn" onClick={handleReset}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="1 4 1 10 7 10" />
                                    <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
                                </svg>
                                {t("csReset")}
                            </button>
                            <button className="cset__save-btn" onClick={handleSave} disabled={saving}>
                                {saving ? (
                                    <>
                                        <span className="cset__save-spinner" />
                                        {t("csSaving")}
                                    </>
                                ) : (
                                    <>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                            <polyline points="17 21 17 13 7 13 7 21" />
                                            <polyline points="7 3 7 8 15 8" />
                                        </svg>
                                        {t("csSaveChanges")}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="cset__note">
                        <span className="cset__note-icon">💡</span>
                        <p>{t("csNote")}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ContactSettings;