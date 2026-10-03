import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { doc, getDoc } from "firebase/firestore";

import { db } from "../firebase/firebase";

/* reuse the exact same look as the login / account recovery pages */
import "./Login.css";
import "./AccountRecovery.css";
import "./AccountRecoveryStatus.css";

import dhyanImage from "../assets/Dhyan.png";
import logo2 from "../assets/logo2.png";
import bgSunrise from "../assets/landing-bg.webp";
import lotusCorner from "../assets/landing-lotus-corner.png";

/* ------------------------------------------------------------------ */
/* Icons                                                              */
/* ------------------------------------------------------------------ */
const I = {
    id: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" />
            <line x1="13" y1="10" x2="18" y2="10" /><line x1="13" y1="14" x2="18" y2="14" />
        </svg>
    ),
    search: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    ),
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
    ),
    lotus: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4c1.3 1.5 2 3.1 2 4.7 0 .8-.2 1.6-.6 2.4.7-.4 1.3-1 1.9-1.9.3 1.4.1 2.7-.6 3.9 1-.3 1.9-.8 2.8-1.6-.1 2.2-1.5 4-3.6 5.1-.6.4-1.2.6-1.9.8-.7-.2-1.3-.4-1.9-.8C8 15.4 6.6 13.6 6.5 11.4c.9.8 1.8 1.3 2.8 1.6-.7-1.2-.9-2.5-.6-3.9.6.9 1.2 1.5 1.9 1.9-.4-.8-.6-1.6-.6-2.4C10 7.1 10.7 5.5 12 4z" />
        </svg>
    ),
    clock: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    progress: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.22-8.56" /><polyline points="21 3 21 9 15 9" />
        </svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    inbox: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 13.5h4l1.5 2.5h6l1.5-2.5h4" />
            <path d="M5.6 4.5h12.8l2.1 9v4.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2v-4.5l2.1-9Z" />
        </svg>
    ),
    mail: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22 6 12 13 2 6" />
        </svg>
    ),
    phone: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    ),
    calendar: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
};

/* ------------------------------------------------------------------ */
/* Validation + masking helpers                                       */
/* ------------------------------------------------------------------ */
const ID_REGEX = /^[A-Z0-9]{4}$/;
const filterId = (v) => v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4);

const normalizeStatus = (s) => {
    const v = String(s || "pending").toLowerCase().trim().replace(/[\s-]+/g, "_");
    return ["pending", "in_progress", "solved"].includes(v) ? v : "pending";
};

/* shows just enough of the email/phone to confirm "yes, this is mine",
   without exposing the full contact details on an unauthenticated page */
const maskEmail = (email) => {
    if (!email) return "—";
    const [user, domain] = email.split("@");
    if (!domain) return email;
    const visible = user.slice(0, 2);
    return `${visible}${"•".repeat(Math.max(user.length - 2, 2))}@${domain}`;
};

const maskPhone = (phone) => {
    if (!phone || phone.length < 4) return "—";
    return `${"•".repeat(phone.length - 4)}${phone.slice(-4)}`;
};

const formatDate = (ts) =>
    ts?.seconds ? new Date(ts.seconds * 1000).toLocaleDateString(undefined, {
        day: "2-digit", month: "short", year: "numeric",
    }) : "—";

function AccountRecoveryStatus() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [idNo, setIdNo] = useState("");
    const [touched, setTouched] = useState(false);
    const [checking, setChecking] = useState(false);
    const [result, setResult] = useState(null);   // the fetched request data
    const [notFound, setNotFound] = useState(false);
    const [serverError, setServerError] = useState("");

    /* same protections as the other login-flow pages */
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

    const idError = !idNo
        ? t("arIdRequired", "ID No is required")
        : !ID_REGEX.test(idNo)
            ? t("arIdInvalid", "ID No must be exactly 4 characters (capital letters and numbers)")
            : "";

    const showIdError = touched && idError;

    const statusMeta = {
        pending: {
            icon: I.clock,
            label: t("arqPending", "Pending"),
            help: t("arsHelpPending", "Our team hasn't started reviewing this yet."),
        },
        in_progress: {
            icon: I.progress,
            label: t("arqInProgress", "In Progress"),
            help: t("arsHelpInProgress", "Our team is working on your request."),
        },
        solved: {
            icon: I.check,
            label: t("arqSolved", "Solved"),
            help: t("arsHelpSolved", "This request has been resolved."),
        },
    };

    const handleCheck = async (e) => {
        e.preventDefault();
        setTouched(true);
        setServerError("");
        setNotFound(false);

        if (idError || checking) return;

        setChecking(true);
        try {
            const snap = await getDoc(doc(db, "accountRecoveryRequests", idNo));
            if (!snap.exists()) {
                setNotFound(true);
                setResult(null);
            } else {
                setResult({ ...snap.data(), status: normalizeStatus(snap.data().status) });
            }
        } catch (err) {
            console.error("Account recovery status check failed:", err);
            setServerError(t("arsCheckFailed", "Something went wrong. Please try again in a moment."));
        }
        setChecking(false);
    };

    const checkAnother = () => {
        setResult(null);
        setNotFound(false);
        setServerError("");
        setTouched(false);
        setIdNo("");
    };

    const titleWords = t("appTitle", "Dhyan Attendance Portal").split(" ");
    const titleLast = titleWords.pop();

    return (
        <div className="login-page">

            {/* same sunrise background + lotus corners as the login page */}
            <div
                className="login-sunrise-bg"
                style={{ backgroundImage: `url(${bgSunrise})` }}
            />
            <img src={lotusCorner} alt="" className="login-corner login-corner--l" />
            <img src={lotusCorner} alt="" className="login-corner login-corner--r" />

            <div className="login-shell">
                <div className="login-container">

                    {/* ----------------------- LEFT ----------------------- */}
                    <div className="login-left">

                        <img src={logo2} alt="Logo" className="login-logo" loading="lazy" />

                        <p className="guru-text">🙏🙏 {t("guruText", "Jai Gurubande")} 🙏🙏</p>

                        {result ? (
                            /* ---------------- RESULT VIEW ---------------- */
                            <div className="ars-result">
                                <div className={`ars-status-icon ars-status-icon--${result.status}`}>
                                    {statusMeta[result.status].icon}
                                </div>

                                <span className={`ars-status-pill ars-status-pill--${result.status}`}>
                                    {statusMeta[result.status].label}
                                </span>

                                <h2 className="ars-result-title">{result.idNo}</h2>
                                <p className="ars-result-help">{statusMeta[result.status].help}</p>

                                <div className="login-divider">
                                    <span className="login-divider-lotus">{I.lotus}</span>
                                </div>

                                <div className="ars-detail-list">
                                    <div className="ars-detail-row">
                                        <span className="ars-detail-icon">{I.mail}</span>
                                        <div className="ars-detail-body">
                                            <span className="ars-detail-label">{t("arEmailLabel", "Mail ID")}</span>
                                            <span className="ars-detail-value">{maskEmail(result.email)}</span>
                                        </div>
                                    </div>
                                    <div className="ars-detail-row">
                                        <span className="ars-detail-icon">{I.phone}</span>
                                        <div className="ars-detail-body">
                                            <span className="ars-detail-label">{t("arPhoneLabel", "Phone Number")}</span>
                                            <span className="ars-detail-value">{maskPhone(result.phone)}</span>
                                        </div>
                                    </div>
                                    <div className="ars-detail-row">
                                        <span className="ars-detail-icon">{I.calendar}</span>
                                        <div className="ars-detail-body">
                                            <span className="ars-detail-label">{t("arqSubmittedOn", "Submitted On")}</span>
                                            <span className="ars-detail-value">{formatDate(result.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                <button type="button" className="ars-check-another" onClick={checkAnother}>
                                    {t("arsCheckAnother", "Check another ID")}
                                </button>

                                <button
                                    type="button"
                                    className="ar-back-btn"
                                    onClick={() => navigate("/login")}
                                >
                                    <span className="ar-back-btn-icon">{I.back}</span>
                                    <span>{t("backToLogin", "Back to Login")}</span>
                                </button>
                            </div>
                        ) : notFound ? (
                            /* ---------------- NOT FOUND VIEW ---------------- */
                            <div className="ars-result">
                                <div className="ars-notfound-icon">{I.inbox}</div>

                                <h2 className="ars-result-title">{t("arsNotFoundTitle", "No request found")}</h2>
                                <p className="ars-result-help">
                                    {t(
                                        "arsNotFoundText",
                                        "We couldn't find a recovery request with that ID No. Please check it and try again, or submit a new request."
                                    )}
                                </p>

                                <button type="button" className="ars-check-another" onClick={checkAnother}>
                                    {t("arsTryAgain", "Try a different ID")}
                                </button>

                                <button
                                    type="button"
                                    className="ar-back-btn"
                                    onClick={() => navigate("/account-recovery")}
                                >
                                    <span className="ar-back-btn-icon">{I.back}</span>
                                    <span>{t("arsGoSubmit", "Submit a New Request")}</span>
                                </button>
                            </div>
                        ) : (
                            /* ---------------- FORM VIEW ---------------- */
                            <>
                                <h2 className="card-title">
                                    <span className="card-title-welcome">
                                        {t("arsPageTitle", "Recovery Status")}
                                    </span>
                                    <span className="card-title-name ar-title-name">
                                        {titleWords.join(" ")}
                                        <span className="card-title-last">{titleLast}</span>
                                    </span>
                                </h2>

                                <div className="login-divider">
                                    <span className="login-divider-lotus">{I.lotus}</span>
                                </div>

                                <p className="guru-subtext">
                                    {t(
                                        "arsSubtitle",
                                        "Enter your ID No to check the status of your recovery request."
                                    )}
                                </p>

                                <form onSubmit={handleCheck} noValidate>

                                    <div className="ar-field">
                                        <label className="ar-label" htmlFor="ars-id">
                                            {t("arIdLabel", "ID No")} <span className="ar-star">*</span>
                                        </label>
                                        <div className="input-wrap">
                                            <span className="input-icon">{I.id}</span>
                                            <input
                                                id="ars-id"
                                                type="text"
                                                className={`login-input ${showIdError ? "ar-input-error" : ""}`}
                                                placeholder={t("arIdPlaceholder", "Enter your 4 character ID No")}
                                                maxLength={4}
                                                autoComplete="off"
                                                value={idNo}
                                                onChange={(e) => setIdNo(filterId(e.target.value))}
                                                onBlur={() => setTouched(true)}
                                            />
                                        </div>
                                        {showIdError && <p className="ar-error">{idError}</p>}
                                    </div>

                                    {serverError && <p className="login-error">{serverError}</p>}

                                    <button
                                        type="submit"
                                        className="login-button"
                                        disabled={checking}
                                    >
                                        <span>
                                            {checking
                                                ? t("pleaseWait", "Please wait...")
                                                : t("arsCheckBtn", "Check Status")}
                                        </span>
                                        {!checking && (
                                            <span className="login-button-arrow">{I.search}</span>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        className="ar-back-btn"
                                        onClick={() => navigate("/login")}
                                    >
                                        <span className="ar-back-btn-icon">{I.back}</span>
                                        <span>{t("backToLogin", "Back to Login")}</span>
                                    </button>

                                </form>
                            </>
                        )}

                    </div>

                    {/* ----------------------- RIGHT (Guruji) ----------------------- */}
                    <div className="login-right">
                        <div className="login-right-glow" />
                        <img src={dhyanImage} alt="Guruji" className="login-right-img" loading="lazy" />
                    </div>

                </div>
            </div>
        </div>
    );
}

export default AccountRecoveryStatus;