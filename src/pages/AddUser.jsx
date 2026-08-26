import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AddUser.css";
import { logAdminAction } from "../utils/logAdminAction";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, secondaryAuth } from "../firebase/firebase";
import {
    doc,
    setDoc,
    serverTimestamp,
    getDoc
} from "firebase/firestore";

import { useTranslation } from "react-i18next";

import guruji from "../assets/guruji.webp";

/* ------------------------------------------------------------------ */
/* Inline icons (presentational only)                                 */
/* ------------------------------------------------------------------ */
const icons = {
    person: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    ),
    idCard: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2.5" /><circle cx="8.5" cy="11.5" r="2" />
            <path d="M14 10h4M14 13.5h4M5 16.5h6" />
        </svg>
    ),
    lock: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
            <circle cx="12" cy="15.5" r="1.4" />
        </svg>
    ),
    eye: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.8 12S5.4 5.5 12 5.5 22.2 12 22.2 12 18.6 18.5 12 18.5 1.8 12 1.8 12z" />
            <circle cx="12" cy="12" r="3.2" />
        </svg>
    ),
    eyeOff: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.9 5.7A9.8 9.8 0 0 1 12 5.5c6.6 0 10.2 6.5 10.2 6.5a18.4 18.4 0 0 1-3.3 4.2" />
            <path d="M6.3 7.8A18.6 18.6 0 0 0 1.8 12S5.4 18.5 12 18.5a9.9 9.9 0 0 0 4-.8" />
            <path d="M9.9 9.9a3.2 3.2 0 0 0 4.3 4.3" />
            <line x1="3" y1="3" x2="21" y2="21" />
        </svg>
    ),
    userPlus: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
        </svg>
    ),
    arrowLeft: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
    ),
    shieldCheck: (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2 4 5v6.1c0 4.7 3.1 8.6 8 9.9 4.9-1.3 8-5.2 8-9.9V5l-8-3z" opacity="0.22" />
            <path d="M12 2 4 5v6.1c0 4.7 3.1 8.6 8 9.9 4.9-1.3 8-5.2 8-9.9V5l-8-3zm-.8 13.3-3.1-3.1 1.4-1.4 1.7 1.7 4-4 1.4 1.4-5.4 5.4z" />
        </svg>
    ),
    lotus: (
        <svg viewBox="0 0 48 40" fill="currentColor" stroke="none">
            <path d="M24 4c3.4 3.5 5.1 7.6 5.1 12.2 0 4.6-1.7 8.7-5.1 12.2-3.4-3.5-5.1-7.6-5.1-12.2C18.9 11.6 20.6 7.5 24 4z" />
            <path d="M13.6 9.8c4.3 1.1 7.4 3.3 9.4 6.6 2 3.3 2.6 7.1 1.8 11.4-4.3-1.1-7.4-3.3-9.4-6.6-2-3.3-2.6-7.1-1.8-11.4z" opacity="0.78" />
            <path d="M34.4 9.8c.8 4.3.2 8.1-1.8 11.4-2 3.3-5.1 5.5-9.4 6.6-.8-4.3-.2-8.1 1.8-11.4 2-3.3 5.1-5.5 9.4-6.6z" opacity="0.78" />
            <path d="M4 19.4c4.6-.7 8.6.1 11.9 2.4 3.3 2.3 5.4 5.8 6.4 10.4-4.6.7-8.6-.1-11.9-2.4C7.1 27.5 5 24 4 19.4z" opacity="0.58" />
            <path d="M44 19.4c-1 4.6-3.1 8.1-6.4 10.4-3.3 2.3-7.3 3.1-11.9 2.4 1-4.6 3.1-8.1 6.4-10.4 3.3-2.3 7.3-3.1 11.9-2.4z" opacity="0.58" />
        </svg>
    ),
    quoteMark: (
        <svg viewBox="0 0 32 24" fill="currentColor" stroke="none">
            <path d="M13 24V13.4C13 6.5 16.7 2 23.3 0L25 3.3c-3.8 1.4-5.7 3.9-5.9 7.4H24V24h-11zM0 24V13.4C0 6.5 3.7 2 10.3 0L12 3.3C8.2 4.7 6.3 7.2 6.1 10.7H11V24H0z" />
        </svg>
    ),
};

/* Decorative dotted panel used in the corners of the card */
const Dots = ({ className }) => (
    <svg className={`au-dots ${className}`} viewBox="0 0 76 76" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {[...Array(6)].map((_, r) =>
            [...Array(6)].map((_, c) => (
                <circle key={`${r}-${c}`} cx={6 + c * 13} cy={6 + r * 13} r="2.4" fill="currentColor" />
            ))
        )}
    </svg>
);

function AddUser() {

    const { t } = useTranslation();

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
        checkAdmin();
    }, []);

    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [idNo, setIdNo] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const checkAdmin = async () => {

        const currentUser = auth.currentUser;

        if (!currentUser) {
            navigate("/");
            return;
        }

        try {

            const userRef = doc(
                db,
                "users",
                localStorage.getItem("userId")
            );

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

        } catch (error) {
            console.error(error);
            navigate("/");
        }
    };

    const clearMessages = () => {
        setTimeout(() => {
            setMessage("");
            setErrorMsg("");
        }, 3000);
    };

    const handleAddUser = async (e) => {

        e.preventDefault();
        setMessage("");
        setErrorMsg("");
        setLoading(true);

        if (!/^[A-Z ]+$/.test(name)) {
            setErrorMsg(t("nameLettersOnly"));
            setLoading(false);
            clearMessages();
            return;
        }

        if (!/^[A-Z0-9]{4}$/.test(idNo)) {
            setErrorMsg(t("idLettersNumbers"));
            setLoading(false);
            clearMessages();
            return;
        }

        if (!/^[0-9]{8}$/.test(password)) {
            setErrorMsg(t("noSpecialChars"));
            setLoading(false);
            clearMessages();
            return;
        }

        try {
            const cleanId = idNo.toUpperCase();
            const email = cleanId + "@gmail.com";

            const existingUser = await getDoc(
                doc(db, "users", cleanId)
            );

            if (existingUser.exists()) {
                setErrorMsg(t("userIdExists"));
                setLoading(false);
                return;
            }

            const userCredential =
                await createUserWithEmailAndPassword(
                    secondaryAuth,
                    email,
                    password
                );

            const uid = userCredential.user.uid;

            await setDoc(doc(db, "users", cleanId), {
                uid: uid,
                name: name,
                id: idNo,
                email: email,
                role: "user",
                deleted: false,
                createdAt: serverTimestamp()
            });
            await logAdminAction("create_user", { targetId: cleanId, details: t("logCreatedUser", { name }) });
            setMessage(t("userAddedSuccess"));
            setName("");
            setIdNo("");
            setPassword("");
            setShowPassword(false);
            setLoading(false);
            clearMessages();

        } catch (error) {

            if (error.code === "auth/email-already-in-use") {
                setErrorMsg(t("userIdExists"));
            } else if (error.code === "auth/weak-password") {
                setErrorMsg(t("weakPassword"));
            } else {
                setErrorMsg(t("somethingWentWrong"));
            }

            setName("");
            setIdNo("");
            setPassword("");
            setShowPassword(false);
            setLoading(false);
            clearMessages();
        }
    };

    /* Two-tone heading. Rather than hard-coding an "Add New" + "User" split
       (which breaks the moment a language reorders the words), we take the
       translated string and tint its final word. Single-word translations
       simply come out fully accented, which still reads correctly. */
    const titleFull = (t("addNewUser") || "Add New User").trim();
    const titleWords = titleFull.split(/\s+/);
    const titleAccent = titleWords.length > 1 ? titleWords.pop() : titleFull;
    const titleLead = titleWords.length ? titleWords.join(" ") : "";

    return (
        <div className="adduser-container" data-theme={theme}>
            <div className="adduser-card">

                {/* ---------------------- LEFT: PORTRAIT ---------------------- */}
                <div className="adduser-image">
                    <img src={guruji} alt={t("guruQuoteAuthor") || "Guruji"} />

                    <span className="au-img-scrim" aria-hidden="true" />

                    <svg className="au-img-wave" viewBox="0 0 400 120" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M0 54C74 18 150 74 226 50C302 26 350 44 400 30V120H0V54Z" fill="currentColor" opacity="0.55" />
                        <path d="M0 84C80 52 148 100 228 78C308 56 352 72 400 60V120H0V84Z" fill="currentColor" opacity="0.85" />
                    </svg>

                    <div className="au-lotus-badge" aria-hidden="true">{icons.lotus}</div>

                    <Dots className="au-dots--portrait" />

                    <figure className="au-quote">
                        <span className="au-quote-mark" aria-hidden="true">{icons.quoteMark}</span>
                        <blockquote className="au-quote-text">
                            {t("guruQuote") || "Service to humanity is service to God."}
                        </blockquote>
                        <figcaption className="au-quote-author">
                            <span className="au-quote-dash" aria-hidden="true">—</span>
                            {t("guruQuoteAuthor") || "Param Sant Swami Jai Gurubande Ji Maharaj"}
                        </figcaption>
                    </figure>
                </div>

                {/* ------------------------ RIGHT: FORM ----------------------- */}
                <form className="adduser-form" onSubmit={handleAddUser}>

                    <Dots className="au-dots--form" />

                    <h2 className="au-title">
                        {titleLead && <span className="au-title-lead">{titleLead} </span>}
                        <span className="au-title-accent">{titleAccent}</span>
                    </h2>

                    <div className="au-divider" aria-hidden="true">
                        <span className="au-divider-line" />
                        <span className="au-divider-mark">{icons.lotus}</span>
                        <span className="au-divider-line" />
                    </div>

                    <p className="au-subtitle">
                        {t("addUserSubtitle") || "Create a new user account"}
                    </p>

                    {message && <div className="success-message">{message}</div>}
                    {errorMsg && <div className="error-message">{errorMsg}</div>}

                    <div className="au-field">
                        <span className="au-field-icon">{icons.person}</span>
                        <input
                            type="text"
                            placeholder={t("enterFullName")}
                            value={name}
                            maxLength={30}
                            autoComplete="off"
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^[a-zA-Z ]*$/.test(value)) setName(value.toUpperCase());
                            }}
                            required
                        />
                    </div>

                    <div className="au-field">
                        <span className="au-field-icon">{icons.idCard}</span>
                        <input
                            type="text"
                            placeholder={t("enterIdNumber")}
                            value={idNo}
                            maxLength={4}
                            autoComplete="off"
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^[a-zA-Z0-9]*$/.test(value)) setIdNo(value.toUpperCase());
                            }}
                            required
                        />
                    </div>

                    <div className="au-field">
                        <span className="au-field-icon">{icons.lock}</span>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder={t("enterPassword")}
                            value={password}
                            maxLength={8}
                            autoComplete="new-password"
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^[0-9]*$/.test(value)) setPassword(value);
                            }}
                            required
                        />
                        <button
                            type="button"
                            className="au-eye"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword
                                ? (t("hidePassword") || "Hide password")
                                : (t("showPassword") || "Show password")}
                        >
                            {showPassword ? icons.eyeOff : icons.eye}
                        </button>
                    </div>

                    <button type="submit" className="au-submit" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="au-btn-spinner" aria-hidden="true" />
                                {t("pleaseWait")}
                            </>
                        ) : (
                            <>
                                <span className="au-btn-icon">{icons.userPlus}</span>
                                {t("addUser")}
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="back-btn"
                        onClick={() => navigate("/admin-dashboard")}
                    >
                        <span className="au-btn-icon">{icons.arrowLeft}</span>
                        {t("back")}
                    </button>

                    <p className="au-note">
                        <span className="au-note-icon">{icons.shieldCheck}</span>
                        {t("adminOnlyNote") || "Only authorized administrators can add new users."}
                    </p>

                </form>
            </div>
        </div>
    );
}

export default AddUser;