import React, { useEffect, useRef, useState } from "react";
import "./ContactSettings.css";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { logAdminAction } from "../utils/logAdminAction";

const DEFAULTS = {
    supportEmail: "support@jagurubands.in",
    supportPhone1: "+91 831 858 3110",
    supportPhone2: "+91 8329367959",
    telegramUrl: "https://t.me/+fAP6C5BGY6C8YdRl",
    assamAddressUrl: "https://maps.app.goo.gl/2Ynp1hq5f6XhNC7wu7",
};

/* ---------------------------------------------------------------- */
/* Inline icons (stroke = currentColor, so they inherit theme color) */
/* ---------------------------------------------------------------- */

const icons = {
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
    ),
    mail: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M4 7.5l7.1 5a1.6 1.6 0 0 0 1.8 0l7.1-5" />
        </svg>
    ),
    phone: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" />
        </svg>
    ),
    telegram: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 3L10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3Z" />
        </svg>
    ),
    pin: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21.5s7-6.2 7-11.5a7 7 0 1 0-14 0c0 5.3 7 11.5 7 11.5Z" />
            <circle cx="12" cy="10" r="2.6" />
        </svg>
    ),
    pencil: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.4 4.6l3 3L8.5 18.5l-4 1 1-4L16.4 4.6Z" />
            <path d="M14.5 6.5l3 3" />
        </svg>
    ),
    editCard: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.5" />
            <path d="M17.4 3.6l3 3L13 14H10v-3l7.4-7.4Z" />
        </svg>
    ),
    save: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4h11l4 4v12H5V4Z" />
            <path d="M8 4v5h7M8 15h8" />
        </svg>
    ),
    reset: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
    ),
    bulb: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.2 17.5h5.6M10 20.5h4" />
            <path d="M12 2.8a6.2 6.2 0 0 0-3.6 11.3c.5.4.8 1 .8 1.6h5.6c0-.6.3-1.2.8-1.6A6.2 6.2 0 0 0 12 2.8Z" />
        </svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    warn: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5M12 16.2v.1" />
        </svg>
    ),
    idCard: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round">
            <rect x="2.5" y="5" width="19" height="14" rx="3" />
            <circle cx="8.5" cy="11" r="2.2" />
            <path d="M5.2 16.2a3.7 3.7 0 0 1 6.6 0M14.5 10h4.2M14.5 13.5h3" />
        </svg>
    ),
    gear: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 2.8v2.4M12 18.8v2.4M4.5 12H2.1M21.9 12h-2.4M6.7 6.7L5 5M19 19l-1.7-1.7M6.7 17.3L5 19M19 5l-1.7 1.7" />
        </svg>
    ),
};

function ContactSettings() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [form, setForm] = useState(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    /* Focus target for the preview cards' edit buttons. */
    const fieldRefs = {
        supportEmail: useRef(null),
        supportPhone1: useRef(null),
        telegramUrl: useRef(null),
        assamAddressUrl: useRef(null),
    };

    const checkAdmin = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            navigate("/");
            return;
        }
        try {
            const userRef = doc(db, "users", localStorage.getItem("userId"));
            const userSnap = await getDoc(userRef);
            if (
                !userSnap.exists() ||
                userSnap.data().role !== "admin" ||
                userSnap.data().uid !== auth.currentUser.uid
            ) {
                navigate("/");
                return;
            }
            fetchSettings();
        } catch (err) {
            console.error(err);
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

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const snap = await getDoc(doc(db, "settings", "contact"));
            if (snap.exists()) {
                setForm({ ...DEFAULTS, ...snap.data() });
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

    const handleChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const focusField = (key) => {
        const el = fieldRefs[key]?.current;
        if (!el) return;
        el.focus();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const handleSave = async () => {
        if (!form.supportEmail.trim() || !form.supportPhone1.trim()) {
            showToast(t("csRequiredFields"), "error");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail.trim())) {
            showToast(t("emailInvalid"), "error");
            return;
        }
        try {
            setSaving(true);
            await setDoc(doc(db, "settings", "contact"), {
                supportEmail: form.supportEmail.trim(),
                supportPhone1: form.supportPhone1.trim(),
                supportPhone2: form.supportPhone2.trim(),
                telegramUrl: form.telegramUrl.trim(),
                assamAddressUrl: form.assamAddressUrl.trim(),
                updatedAt: new Date().toISOString(),
                updatedBy: localStorage.getItem("userId"),
            });
            await logAdminAction("update_contact_settings", {
                details: t("csLogUpdated"),
            });
            showToast(t("csSaved"), "success");
        } catch (err) {
            console.error(err);
            showToast(t("csSaveFailed"), "error");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setForm(DEFAULTS);
        showToast(t("csResetNotice"), "success");
    };

    /* Preview cards mirror the form; each jumps focus to its input. */
    const previews = [
        {
            key: "supportEmail",
            tone: "blue",
            icon: icons.mail,
            label: t("csSupportEmail"),
            value: form.supportEmail,
        },
        {
            key: "supportPhone1",
            tone: "green",
            icon: icons.phone,
            label: t("csSupportPhone"),
            value: form.supportPhone1,
            sub: form.supportPhone2,
        },
        {
            key: "telegramUrl",
            tone: "violet",
            icon: icons.telegram,
            label: t("csTelegramChannel"),
            value: form.telegramUrl ? t("csOpenTelegram") : "—",
        },
        {
            key: "assamAddressUrl",
            tone: "amber",
            icon: icons.pin,
            label: t("csAssamAddress"),
            value: form.assamAddressUrl ? t("csOpenInMaps") : "—",
        },
    ];

    return (
        <div className="cset__page" data-theme={theme}>

            <div className="cset__blob cset__blob--1" />
            <div className="cset__blob cset__blob--2" />
            <div className="cset__dots" />

            {toast && (
                <div className={`cset__toast cset__toast--${toast.type}`}>
                    <span className="cset__toast-ico">
                        {toast.type === "success" ? icons.check : icons.warn}
                    </span>
                    {toast.msg}
                </div>
            )}

            <button className="cset__back-btn" onClick={() => navigate("/admin-dashboard")}>
                {icons.back} {t("back")}
            </button>

            <div className="cset__shell">

                <div className="cset__header">
                    <div className="cset__header-text">
                        <div className="cset__eyebrow">
                            <span className="cset__eyebrow-dot" />
                            {t("adminPanel")}
                        </div>
                        <h1 className="cset__title">
                            {t("csTitleMain")} <span className="cset__title-accent">{t("csTitleAccent")}</span>
                        </h1>
                        <p className="cset__subtitle">{t("csSubtitle")}</p>
                    </div>

                    <div className="cset__header-art" aria-hidden="true">
                        <span className="cset__art-ring" />
                        <span className="cset__art-card">{icons.idCard}</span>
                        <span className="cset__art-gear">{icons.gear}</span>
                    </div>
                </div>

                <div className="cset__previews">
                    {previews.map((p) => (
                        <div key={p.key} className={`cset__preview cset__preview--${p.tone}`}>
                            <span className="cset__preview-icon">{p.icon}</span>
                            <div className="cset__preview-body">
                                <span className="cset__preview-label">{p.label}</span>
                                <span className="cset__preview-value">{p.value || "—"}</span>
                                {p.sub && <span className="cset__preview-sub">{p.sub}</span>}
                            </div>
                            <button
                                className="cset__preview-edit"
                                onClick={() => focusField(p.key)}
                                aria-label={`${t("edit")} — ${p.label}`}
                            >
                                {icons.pencil}
                            </button>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="cset__loading">
                        <div className="cset__loader">
                            <div className="cset__loader-ring" />
                            <div className="cset__loader-ring cset__loader-ring--2" />
                        </div>
                        <p>{t("loading")}</p>
                    </div>
                ) : (
                    <div className="cset__form-card">

                        <div className="cset__form-head">
                            <span className="cset__form-head-icon">{icons.editCard}</span>
                            <div className="cset__form-head-text">
                                <h2 className="cset__form-title">{t("csEditTitle")}</h2>
                                <p className="cset__form-desc">{t("csEditDesc")}</p>
                            </div>
                        </div>

                        <div className="cset__grid">

                            <div className="cset__field">
                                <label className="cset__label" htmlFor="cset-email">
                                    <span className="cset__label-ico cset__label-ico--blue">{icons.mail}</span>
                                    {t("csSupportEmail")}
                                </label>
                                <input
                                    id="cset-email"
                                    ref={fieldRefs.supportEmail}
                                    className="cset__input"
                                    type="text"
                                    value={form.supportEmail}
                                    onChange={(e) => handleChange("supportEmail", e.target.value)}
                                    placeholder={t("csSupportEmail")}
                                />
                            </div>

                            <div className="cset__field">
                                <label className="cset__label" htmlFor="cset-phone1">
                                    <span className="cset__label-ico cset__label-ico--pink">{icons.phone}</span>
                                    {t("csSupportPhone1")}
                                </label>
                                <input
                                    id="cset-phone1"
                                    ref={fieldRefs.supportPhone1}
                                    className="cset__input"
                                    type="text"
                                    value={form.supportPhone1}
                                    onChange={(e) => handleChange("supportPhone1", e.target.value)}
                                    placeholder={t("csSupportPhone1")}
                                />
                            </div>

                            <div className="cset__field">
                                <label className="cset__label" htmlFor="cset-phone2">
                                    <span className="cset__label-ico cset__label-ico--pink">{icons.phone}</span>
                                    {t("csSupportPhone2")}
                                    <span className="cset__optional">{t("csOptional")}</span>
                                </label>
                                <input
                                    id="cset-phone2"
                                    className="cset__input"
                                    type="text"
                                    value={form.supportPhone2}
                                    onChange={(e) => handleChange("supportPhone2", e.target.value)}
                                    placeholder={t("csSupportPhone2")}
                                />
                            </div>

                            <div className="cset__field">
                                <label className="cset__label" htmlFor="cset-telegram">
                                    <span className="cset__label-ico cset__label-ico--violet">{icons.telegram}</span>
                                    {t("csTelegramChannel")}
                                </label>
                                <input
                                    id="cset-telegram"
                                    ref={fieldRefs.telegramUrl}
                                    className="cset__input"
                                    type="text"
                                    value={form.telegramUrl}
                                    onChange={(e) => handleChange("telegramUrl", e.target.value)}
                                    placeholder={t("csTelegramChannel")}
                                />
                            </div>

                            <div className="cset__field cset__field--full">
                                <label className="cset__label" htmlFor="cset-address">
                                    <span className="cset__label-ico cset__label-ico--amber">{icons.pin}</span>
                                    {t("csAssamAddressUrl")}
                                </label>
                                <input
                                    id="cset-address"
                                    ref={fieldRefs.assamAddressUrl}
                                    className="cset__input"
                                    type="text"
                                    value={form.assamAddressUrl}
                                    onChange={(e) => handleChange("assamAddressUrl", e.target.value)}
                                    placeholder={t("csAssamAddressUrl")}
                                />
                            </div>

                        </div>

                        <div className="cset__actions">
                            <button
                                className="cset__reset-btn"
                                onClick={handleReset}
                                disabled={saving}
                            >
                                {icons.reset} {t("csResetToDefault")}
                            </button>
                            <button
                                className="cset__save-btn"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving
                                    ? <><span className="cset__btn-spin" /> {t("saving")}</>
                                    : <>{icons.save} {t("csSaveChanges")}</>}
                            </button>
                        </div>

                    </div>
                )}

                <div className="cset__note">
                    <span className="cset__note-icon">{icons.bulb}</span>
                    <p>{t("csNote")}</p>
                </div>

            </div>
        </div>
    );
}

export default ContactSettings;