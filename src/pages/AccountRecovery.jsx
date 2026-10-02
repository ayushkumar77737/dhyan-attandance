import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";

import { db } from "../firebase/firebase";

/* reuse the exact same look as the login page */
import "./Login.css";
import "./AccountRecovery.css";

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
    mail: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22 6 12 13 2 6" />
        </svg>
    ),
    phone: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    ),
    arrow: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
    ),
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    lotus: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4c1.3 1.5 2 3.1 2 4.7 0 .8-.2 1.6-.6 2.4.7-.4 1.3-1 1.9-1.9.3 1.4.1 2.7-.6 3.9 1-.3 1.9-.8 2.8-1.6-.1 2.2-1.5 4-3.6 5.1-.6.4-1.2.6-1.9.8-.7-.2-1.3-.4-1.9-.8C8 15.4 6.6 13.6 6.5 11.4c.9.8 1.8 1.3 2.8 1.6-.7-1.2-.9-2.5-.6-3.9.6.9 1.2 1.5 1.9 1.9-.4-.8-.6-1.6-.6-2.4C10 7.1 10.7 5.5 12 4z" />
        </svg>
    ),
};

/* ------------------------------------------------------------------ */
/* Validation helpers                                                 */
/* ------------------------------------------------------------------ */
const ID_REGEX = /^[A-Z0-9]{4}$/;                       // exactly 4, capital letters + digits
const EMAIL_REGEX = /^[a-z0-9.]+@[a-z0-9]+(\.[a-z0-9]+)+$/; // letters, digits, one @, dots in domain
const PHONE_REGEX = /^[0-9]{10}$/;                      // exactly 10 digits

/* input filters – run on every keystroke so bad characters never appear */
const filterId = (v) => v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4);
const filterPhone = (v) => v.replace(/[^0-9]/g, "").slice(0, 10);
const filterEmail = (v) => {
    // allow only letters, digits, "." and "@"
    let cleaned = v.replace(/[^a-zA-Z0-9@.]/g, "").toLowerCase();
    // allow only ONE "@"
    const first = cleaned.indexOf("@");
    if (first !== -1) {
        cleaned =
            cleaned.slice(0, first + 1) + cleaned.slice(first + 1).replace(/@/g, "");
    }
    return cleaned.slice(0, 60);
};

function AccountRecovery() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [idNo, setIdNo] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const [touched, setTouched] = useState({ idNo: false, email: false, phone: false });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [serverError, setServerError] = useState("");

    /* Server-side duplicate errors (email/phone already used on another
       request) sit alongside the format errors from `errors` below, but
       are only cleared once the person edits that specific field again —
       re-validating on every keystroke would mean a second Firestore
       query per keystroke. */
    const [dupError, setDupError] = useState({ email: "", phone: "" });

    /* same protections as the login page */
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

    /* ---------------- per-field error messages ---------------- */
    const errors = {
        idNo: !idNo
            ? t("arIdRequired", "ID No is required")
            : !ID_REGEX.test(idNo)
                ? t("arIdInvalid", "ID No must be exactly 4 characters (capital letters and numbers)")
                : "",
        email: !email
            ? t("arEmailRequired", "Mail ID is required")
            : !EMAIL_REGEX.test(email)
                ? t("arEmailInvalid", "Enter a valid Mail ID (example: name@gmail.com)")
                : dupError.email,
        phone: !phone
            ? t("arPhoneRequired", "Phone number is required")
            : !PHONE_REGEX.test(phone)
                ? t("arPhoneInvalid", "Phone number must be exactly 10 digits")
                : dupError.phone,
    };

    const isValid = !errors.idNo && !errors.email && !errors.phone;
    const showErr = (f) => touched[f] && errors[f];
    const markTouched = (f) => setTouched((p) => ({ ...p, [f]: true }));

    /* ---------------- submit ---------------- */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError("");

        setTouched({ idNo: true, email: true, phone: true });
        if (!isValid || submitting) return;

        setSubmitting(true);
        try {
            /* Check for an existing request with the same email or phone
               (under a different ID No — same-ID duplicates are already
               blocked by the doc ID itself). Run both checks together. */
            const recoveryRef = collection(db, "accountRecoveryRequests");
            const [emailSnap, phoneSnap] = await Promise.all([
                getDocs(query(recoveryRef, where("email", "==", email))),
                getDocs(query(recoveryRef, where("phone", "==", phone))),
            ]);

            const emailTaken = !emailSnap.empty;
            const phoneTaken = !phoneSnap.empty;

            if (emailTaken || phoneTaken) {
                setDupError({
                    email: emailTaken
                        ? t("arEmailAlreadyUsed", "This Mail ID has already been submitted for recovery.")
                        : "",
                    phone: phoneTaken
                        ? t("arPhoneAlreadyUsed", "This phone number has already been submitted for recovery.")
                        : "",
                });
                setSubmitting(false);
                return;
            }

            setDupError({ email: "", phone: "" });

            /* the ID No is the document ID, so one ID can only ever have one request.
               If it already exists, Firestore rejects the write (permission-denied). */
            await setDoc(doc(db, "accountRecoveryRequests", idNo), {
                idNo,
                email,
                phone,
                status: "pending",
                createdAt: serverTimestamp(),
            });
            setSubmitted(true);
        } catch (err) {
            console.error("Account recovery submit failed:", err);
            if (err.code === "permission-denied") {
                setServerError(
                    t(
                        "arAlreadySubmitted",
                        "A recovery request for this ID No has already been submitted. Our team will contact you soon."
                    )
                );
            } else {
                setServerError(
                    t("arSubmitFailed", "Something went wrong. Please try again in a moment.")
                );
            }
        }
        setSubmitting(false);
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

                        {submitted ? (
                            /* ---------------- THANK YOU VIEW ---------------- */
                            <div className="ar-success">
                                <div className="ar-success-icon">{I.check}</div>

                                <h2 className="ar-success-title">
                                    {t("arThankYou", "Thank you for submitting!")}
                                </h2>

                                <div className="login-divider">
                                    <span className="login-divider-lotus">{I.lotus}</span>
                                </div>

                                <p className="ar-success-text">
                                    {t(
                                        "arSuccessMessage",
                                        "Thank you for submitting. Our team will contact you to get your account recovered."
                                    )}
                                </p>

                                <button
                                    type="button"
                                    className="login-button ar-success-btn"
                                    onClick={() => navigate("/login")}
                                >
                                    <span className="login-button-arrow ar-back-arrow">{I.back}</span>
                                    <span>{t("backToLogin", "Back to Login")}</span>
                                </button>
                            </div>
                        ) : (
                            /* ---------------- FORM VIEW ---------------- */
                            <>
                                <h2 className="card-title">
                                    <span className="card-title-welcome">
                                        {t("accountRecovery", "Account Recovery")}
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
                                        "arSubtitle",
                                        "Fill in your details below and our team will contact you to recover your account."
                                    )}
                                </p>

                                <form onSubmit={handleSubmit} noValidate>

                                    {/* ID NO */}
                                    <div className="ar-field">
                                        <label className="ar-label" htmlFor="ar-id">
                                            {t("arIdLabel", "ID No")} <span className="ar-star">*</span>
                                        </label>
                                        <div className="input-wrap">
                                            <span className="input-icon">{I.id}</span>
                                            <input
                                                id="ar-id"
                                                type="text"
                                                className={`login-input ${showErr("idNo") ? "ar-input-error" : ""}`}
                                                placeholder={t("arIdPlaceholder", "Enter your 4 character ID No")}
                                                maxLength={4}
                                                autoComplete="off"
                                                value={idNo}
                                                onChange={(e) => setIdNo(filterId(e.target.value))}
                                                onBlur={() => markTouched("idNo")}
                                            />
                                        </div>
                                        {showErr("idNo") && <p className="ar-error">{errors.idNo}</p>}
                                    </div>

                                    {/* MAIL ID */}
                                    <div className="ar-field">
                                        <label className="ar-label" htmlFor="ar-mail">
                                            {t("arEmailLabel", "Mail ID")} <span className="ar-star">*</span>
                                        </label>
                                        <div className="input-wrap">
                                            <span className="input-icon">{I.mail}</span>
                                            <input
                                                id="ar-mail"
                                                type="text"
                                                inputMode="email"
                                                className={`login-input ${showErr("email") ? "ar-input-error" : ""}`}
                                                placeholder={t("arEmailPlaceholder", "Enter your Mail ID")}
                                                maxLength={60}
                                                autoComplete="off"
                                                value={email}
                                                onChange={(e) => {
                                                    setEmail(filterEmail(e.target.value));
                                                    if (dupError.email) setDupError((p) => ({ ...p, email: "" }));
                                                }}
                                                onBlur={() => markTouched("email")}
                                            />
                                        </div>
                                        {showErr("email") && <p className="ar-error">{errors.email}</p>}
                                    </div>

                                    {/* PHONE */}
                                    <div className="ar-field">
                                        <label className="ar-label" htmlFor="ar-phone">
                                            {t("arPhoneLabel", "Phone Number")} <span className="ar-star">*</span>
                                        </label>
                                        <div className="input-wrap">
                                            <span className="input-icon">{I.phone}</span>
                                            <input
                                                id="ar-phone"
                                                type="text"
                                                inputMode="numeric"
                                                className={`login-input ${showErr("phone") ? "ar-input-error" : ""}`}
                                                placeholder={t("arPhonePlaceholder", "Enter your 10 digit phone number")}
                                                maxLength={10}
                                                autoComplete="off"
                                                value={phone}
                                                onChange={(e) => {
                                                    setPhone(filterPhone(e.target.value));
                                                    if (dupError.phone) setDupError((p) => ({ ...p, phone: "" }));
                                                }}
                                                onBlur={() => markTouched("phone")}
                                            />
                                        </div>
                                        {showErr("phone") && <p className="ar-error">{errors.phone}</p>}
                                    </div>

                                    {serverError && <p className="login-error">{serverError}</p>}

                                    <button
                                        type="submit"
                                        className="login-button"
                                        disabled={submitting}
                                    >
                                        <span>
                                            {submitting
                                                ? t("pleaseWait", "Please wait...")
                                                : t("arSubmit", "Submit")}
                                        </span>
                                        {!submitting && (
                                            <span className="login-button-arrow">{I.arrow}</span>
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

export default AccountRecovery;