import React, { useEffect, useState } from "react";
import "./VerifyEmail.css";
import { db, secondaryAuth, secondaryDb } from "../firebase/firebase";
import {
    isSignInWithEmailLink,
    signInWithEmailLink,
    signOut as authSignOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

function VerifyEmail() {
    const { t } = useTranslation();
    const [status, setStatus] = useState("verifying"); // verifying | needs-email | success | error
    const [manualEmail, setManualEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const completeVerification = async (rawEmail) => {
        const email = rawEmail.trim().toLowerCase();
        try {
            await signInWithEmailLink(secondaryAuth, email, window.location.href);

            await setDoc(doc(secondaryDb, "emailVerifications", email), {   // ← secondaryDb, not db
                email: email,
                verified: true,
                verifiedAt: new Date().toISOString(),
            });

            await authSignOut(secondaryAuth);
            localStorage.removeItem("emailForSignIn");
            setStatus("success");
        } catch (err) {
            console.error(err);
            setStatus("error");
        }
    };

    useEffect(() => {
        if (!isSignInWithEmailLink(secondaryAuth, window.location.href)) {
            setStatus("error");
            return;
        }

        const storedEmail = localStorage.getItem("emailForSignIn");

        if (storedEmail) {
            completeVerification(storedEmail);
        } else {
            // Opened on a different device/browser than where it was requested
            setStatus("needs-email");
        }
    }, []);

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (manualEmail.trim()) {
            setSubmitting(true);
            await completeVerification(manualEmail.trim());
            setSubmitting(false);
        }
    };

    return (
        <div className="vfy__page" data-theme={theme}>
            <div className="vfy__blob vfy__blob--1" />
            <div className="vfy__blob vfy__blob--2" />

            <div className="vfy__card">

                {status === "verifying" && (
                    <div className="vfy__state">
                        <span className="vfy__spinner" />
                        <p className="vfy__text">{t("verifyingEmail")}</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="vfy__state">
                        <span className="vfy__icon vfy__icon--ok">✓</span>
                        <h2 className="vfy__title">{t("emailVerifiedTitle")}</h2>
                        <p className="vfy__text">{t("emailVerifiedSub")}</p>
                    </div>
                )}

                {status === "error" && (
                    <div className="vfy__state">
                        <span className="vfy__icon vfy__icon--err">!</span>
                        <h2 className="vfy__title">{t("verificationFailedTitle")}</h2>
                        <p className="vfy__text">{t("verificationFailedSub")}</p>
                    </div>
                )}

                {status === "needs-email" && (
                    <div className="vfy__state">
                        <h2 className="vfy__title">{t("confirmEmailTitle")}</h2>
                        <p className="vfy__text">{t("confirmEmailSub")}</p>
                        <form className="vfy__form" onSubmit={handleManualSubmit}>
                            <input
                                className="vfy__input"
                                type="email"
                                value={manualEmail}
                                onChange={(e) => setManualEmail(e.target.value)}
                                placeholder={t("enterEmail")}
                                required
                            />
                            <button type="submit" className="vfy__btn" disabled={submitting}>
                                {submitting ? t("verifyingEmail") : t("verifyEmailBtn")}
                            </button>
                        </form>
                    </div>
                )}

            </div>
        </div>
    );
}

export default VerifyEmail;