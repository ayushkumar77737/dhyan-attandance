import React, { useEffect, useState } from "react";
import "./AddAdmin.css";
import { useNavigate } from "react-router-dom";
import { logAdminAction } from "../utils/logAdminAction";
import { auth, db, secondaryAuth } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signOut as authSignOut,
} from "firebase/auth";

import { useTranslation } from "react-i18next";
import useAutoLogout from "../hooks/useAutoLogout";

const icons = {
    shield: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    ),
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
    ),
    id: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" />
            <path d="M13 12h5" /><path d="M13 16h3" />
        </svg>
    ),
    user: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    ),
    mail: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
            <polyline points="22,6 12,13 2,6" />
        </svg>
    ),
    lock: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    ),
    eye: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
        </svg>
    ),
    eyeOff: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    alert: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
};

function AddAdmin() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    useAutoLogout();

    const [adminId, setAdminId] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPwd, setShowPwd] = useState(false);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        const checkAdmin = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) { navigate("/"); return; }
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
            } catch (err) { console.error(err); navigate("/"); }
        };
        checkAdmin();
    }, [navigate]);
    useEffect(() => {
        if (!error && !success) return;
        const timer = setTimeout(() => {
            setError("");
            setSuccess("");
            setAdminId("");
            setName("");
            setEmail("");
            setPassword("");
            setConfirm("");
        }, 3000);
        return () => clearTimeout(timer);
    }, [error, success]);

    const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

    const mapAuthError = (code) => {
        switch (code) {
            case "auth/email-already-in-use":
                return t("emailInUse");
            case "auth/invalid-email":
                return t("invalidEmail");
            case "auth/weak-password":
                return t("weakPassword");
            default:
                return t("somethingWentWrong");
        }
    };

    const handleSubmit = async () => {
        setError("");
        setSuccess("");

        const id = adminId.trim().toUpperCase();
        const trimmedName = name.trim();
        const trimmedEmail = email.trim();
        if (!/^[A-Z0-9]+$/.test(id)) {
            setError(t("idLettersNumbers"));
            return;
        }

        if (!/^[a-zA-Z ]+$/.test(trimmedName)) {
            setError(t("nameLettersOnly"));
            return;
        }

        if (!id || !trimmedName || !trimmedEmail || !password || !confirm) {
            setError(t("allFieldsRequired"));
            return;
        }
        if (/\s/.test(id)) {
            setError(t("idNoSpaces"));
            return;
        }
        if (!isValidEmail(trimmedEmail)) {
            setError(t("invalidEmail"));
            return;
        }
        if (password.length < 6) {
            setError(t("weakPassword"));
            return;
        }
        if (password !== confirm) {
            setError(t("passwordMismatch"));
            return;
        }

        try {
            setSaving(true);
            if (id === "ADMIN1") {
                setError(t("admin1Reserved"));
                setSaving(false);
                return;
            }
            const ref = doc(db, "users", id);
            const existing = await getDoc(ref);
            if (existing.exists()) {
                setError(t("idAlreadyExists"));
                setSaving(false);
                return;
            }

            const cred = await createUserWithEmailAndPassword(
                secondaryAuth,
                trimmedEmail,
                password
            );
            const uid = cred.user.uid;

            await authSignOut(secondaryAuth);

            await setDoc(ref, {
                id,
                name: trimmedName,
                email: trimmedEmail,
                role: "admin",
                deleted: false,
                uid,
                createdAt: new Date().toISOString(),
            });
            await logAdminAction("create_admin", { targetId: id, details: t("logCreatedAdmin", { name: trimmedName }) });
            setSuccess(t("adminAddedSuccess"));
            setAdminId("");
            setName("");
            setEmail("");
            setPassword("");
            setConfirm("");
        } catch (err) {
            console.error(err);
            setError(mapAuthError(err.code));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="aapg-container">
            <div className="aapg-card">

                <div className="aapg-head">
                    <button className="aapg-back" onClick={() => navigate(-1)}>
                        {icons.back}
                    </button>
                    <div className="aapg-head-text">
                        <div className="aapg-head-icon">{icons.shield}</div>
                        <div>
                            <p className="aapg-portal-label">{t("coreManagement")}</p>
                            <h1 className="aapg-title">{t("addAdmin")}</h1>
                        </div>
                    </div>
                </div>

                <p className="aapg-desc">{t("addAdminDesc")}</p>

                {error && (
                    <div className="aapg-alert aapg-alert--error">
                        {icons.alert}<span>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="aapg-alert aapg-alert--success">
                        {icons.check}<span>{success}</span>
                    </div>
                )}

                <div className="aapg-field">
                    <label>{t("adminId")}</label>
                    <div className="aapg-input-wrap">
                        <span className="aapg-input-icon">{icons.id}</span>
                        <input
                            type="text"
                            placeholder="ADMIN3"
                            value={adminId}
                            onChange={(e) => setAdminId(e.target.value.toUpperCase())}
                            autoComplete="off"
                        />
                    </div>
                    <p className="aapg-hint">{t("adminIdHint")}</p>
                </div>

                <div className="aapg-field">
                    <label>{t("name")}</label>
                    <div className="aapg-input-wrap">
                        <span className="aapg-input-icon">{icons.user}</span>
                        <input
                            type="text"
                            placeholder="ADMIN"
                            value={name}
                            onChange={(e) => setName(e.target.value.toUpperCase())}
                            autoComplete="off"
                        />
                    </div>
                </div>

                <div className="aapg-field">
                    <label>{t("email")}</label>
                    <div className="aapg-input-wrap">
                        <span className="aapg-input-icon">{icons.mail}</span>
                        <input
                            type="email"
                            placeholder="admin3@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                </div>

                <div className="aapg-field">
                    <label>{t("password")}</label>
                    <div className="aapg-input-wrap">
                        <span className="aapg-input-icon">{icons.lock}</span>
                        <input
                            type={showPwd ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            className="aapg-pwd-toggle"
                            onClick={() => setShowPwd((s) => !s)}
                            tabIndex={-1}
                        >
                            {showPwd ? icons.eyeOff : icons.eye}
                        </button>
                    </div>
                    <p className="aapg-hint">{t("passwordHint")}</p>
                </div>

                <div className="aapg-field">
                    <label>{t("confirmPassword")}</label>
                    <div className="aapg-input-wrap">
                        <span className="aapg-input-icon">{icons.lock}</span>
                        <input
                            type={showPwd ? "text" : "password"}
                            placeholder="••••••••"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            autoComplete="new-password"
                        />
                    </div>
                </div>

                <div className="aapg-auto">
                    <span className="aapg-auto-label">{t("autoFields")}</span>
                    <div className="aapg-auto-row">
                        <span className="aapg-chip">role: <b>admin</b></span>
                        <span className="aapg-chip">deleted: <b>false</b></span>
                    </div>
                </div>

                <button className="aapg-submit" onClick={handleSubmit} disabled={saving}>
                    {saving ? <span className="aapg-spinner" /> : icons.shield}
                    {saving ? t("saving") : t("addAdmin")}
                </button>

            </div>
        </div>
    );
}

export default AddAdmin;