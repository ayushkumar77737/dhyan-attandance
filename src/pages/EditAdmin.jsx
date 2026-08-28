import React, { useEffect, useState } from "react";
import "./EditAdmin.css";
import { useNavigate, useParams } from "react-router-dom";
import { logAdminAction } from "../utils/logAdminAction";
import { db, auth } from "../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import { useTranslation } from "react-i18next";
import useAutoLogout from "../hooks/useAutoLogout";

import logo from "../assets/logo2.png";

/* ------------------------------------------------------------------ */
/* Inline icons (presentational only)                                 */
/* ------------------------------------------------------------------ */
const icons = {
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
    ),
    pencil: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
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
    check: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    alert: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
    info: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
    inbox: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
    ),
};

/* Decorative dotted grid used in a page corner */
const Dots = ({ className }) => (
    <svg className={`ea-dots ${className}`} viewBox="0 0 76 76" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {[...Array(6)].map((_, r) =>
            [...Array(6)].map((_, c) => (
                <circle key={`${r}-${c}`} cx={6 + c * 13} cy={6 + r * 13} r="2.4" fill="currentColor" />
            ))
        )}
    </svg>
);

function EditAdmin() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();

    useAutoLogout();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [avatarImage, setAvatarImage] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });
    const [original, setOriginal] = useState({ name: "", email: "" });
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

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

    const fetchAdmin = async () => {
        try {
            setLoading(true);
            const ref = doc(db, "users", id);
            const snap = await getDoc(ref);
            if (!snap.exists() || snap.data().role !== "admin") {
                setNotFound(true);
                return;
            }
            const data = snap.data();
            setName(data.name || "");
            setEmail(data.email || "");
            setOriginal({ name: data.name || "", email: data.email || "" });

            /* Profile photos live in `profiles/{ID}.profileImage` — the same
               Cloudinary secure_url lookup AllAdmins uses. Falls back to the
               `profileImage` field stored on the user doc itself, and finally
               to initials if neither is set (handled at render time). */
            try {
                const profileKey = String(data.id || id).toUpperCase();
                const profileRef = doc(db, "profiles", profileKey);
                const profileSnap = await getDoc(profileRef);
                const profileImg = profileSnap.exists() ? profileSnap.data().profileImage : "";
                setAvatarImage(profileImg || data.profileImage || "");
            } catch (e) {
                // Photo lookup is optional — fall back to initials rather than failing.
                console.warn("EditAdmin: could not load profile image —", e);
                setAvatarImage(data.profileImage || "");
            }
        } catch (err) {
            console.error(err);
            setNotFound(true);
        } finally {
            setLoading(false);
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

    useEffect(() => {
        checkAdmin();
        fetchAdmin();
    }, [id]);

    useEffect(() => {
        if (!msg.text) return;
        if (msg.type === "success") return;
        const timer = setTimeout(() => setMsg({ type: "", text: "" }), 3000);
        return () => clearTimeout(timer);
    }, [msg]);

    const handleUpdate = async () => {
        setMsg({ type: "", text: "" });

        const trimmedName = name.trim();
        const trimmedEmail = String(email).trim().toLowerCase();
        if (id.toUpperCase() === "ADMIN1") {
            setMsg({ type: "error", text: t("superAdminProtected") });
            return;
        }
        if (trimmedName.length > 50) {
            setMsg({ type: "error", text: t("nameTooLong") });
            return;
        }

        if (!trimmedName) {
            setMsg({ type: "error", text: t("nameRequired") });
            return;
        }
        if (!/^[A-Za-z\s.]+$/.test(trimmedName)) {
            setMsg({ type: "error", text: t("nameLettersOnly") });
            return;
        }
        if (trimmedEmail.length > 100) {
            setMsg({ type: "error", text: t("emailTooLong") });
            return;
        }

        if (!/^[a-zA-Z0-9.]+@[a-zA-Z0-9.]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
            setMsg({ type: "error", text: t("invalidEmail") });
            return;
        }
        if (trimmedName === original.name && trimmedEmail === original.email) {
            setMsg({ type: "error", text: t("noChangesMade") });
            return;
        }

        try {
            setSaving(true);
            const ref = doc(db, "users", id);
            await updateDoc(ref, {
                name: trimmedName,
                email: trimmedEmail,
            });
            await logAdminAction("update_admin", {
                targetId: id,
                details: `Updated admin ${trimmedName}`,
            });
            setMsg({ type: "success", text: t("adminUpdatedSuccess") });
            setTimeout(() => navigate("/all-admins"), 900);
        } catch (err) {
            console.error(err);
            setMsg({ type: "error", text: t("errorUpdatingAdmin") });
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (val) =>
        val && val.trim()
            ? val.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
            : "A";

    return (
        <div className="editadmin-container" data-theme={theme}>

            <Dots className="ea-dots--tr" />
            <Dots className="ea-dots--bl" />

            <div className="editadmin-header">
                <div className="editadmin-header-left">
                    <img src={logo} alt="Logo" className="editadmin-logo" />
                    <div className="editadmin-header-text">
                        <p className="editadmin-portal-label">{t("appTitle")}</p>
                        <h1 className="editadmin-title">{t("editAdmin")}</h1>
                    </div>
                </div>
                <button className="editadmin-back-btn" onClick={() => navigate("/all-admins")}>
                    <span className="ea-btn-icon">{icons.back}</span>
                    {t("back")}
                </button>
            </div>

            {loading ? (
                <div className="editadmin-spinner-wrap"><div className="editadmin-spinner" /></div>
            ) : notFound ? (
                <div className="editadmin-empty">
                    <span className="ea-empty-icon">{icons.inbox}</span>
                    {t("noAdminsFound")}
                </div>
            ) : (
                <div className="editadmin-card">
                    <span className="ea-card-sheen" aria-hidden="true" />

                    <div className="ea-card-head">
                        <span className="ea-avatar">
                            {getInitials(original.name || name)}
                            {avatarImage ? (
                                <img
                                    className="ea-avatar-img"
                                    src={avatarImage}
                                    alt={original.name || name}
                                    loading="lazy"
                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                            ) : null}
                            <span className="ea-avatar-badge" aria-hidden="true">{icons.pencil}</span>
                        </span>
                        <div className="ea-card-head-text">
                            <p className="ea-card-eyebrow">{t("editingRecord") || "Editing admin record"}</p>
                            <span className="editadmin-id-pill">ID: {id}</span>
                        </div>
                    </div>

                    <p className="editadmin-required-note">
                        <span className="editadmin-required" aria-hidden="true">*</span>
                        {t("mandatoryFieldsNote") || "All fields marked with an asterisk are mandatory"}
                    </p>

                    {msg.text && (
                        <div className={`editadmin-msg editadmin-msg--${msg.type}`}>
                            <span className="ea-msg-icon">
                                {msg.type === "success" ? icons.check : msg.type === "error" ? icons.alert : icons.info}
                            </span>
                            <span>{msg.text}</span>
                        </div>
                    )}

                    <label className="editadmin-label">
                        {t("fullName")}
                        <span className="editadmin-required" aria-hidden="true">*</span>
                    </label>
                    <div className="ea-input-wrap">
                        <span className="ea-input-icon">{icons.user}</span>
                        <input
                            type="text"
                            className="editadmin-input"
                            value={name}
                            onChange={(e) =>
                                setName(e.target.value.replace(/[^a-zA-Z .]/g, "").toUpperCase())
                            }
                            placeholder={t("enterFullName")}
                            required
                            aria-required="true"
                        />
                    </div>

                    <label className="editadmin-label">
                        {t("email")}
                        <span className="editadmin-required" aria-hidden="true">*</span>
                    </label>
                    <div className="ea-input-wrap">
                        <span className="ea-input-icon">{icons.mail}</span>
                        <input
                            type="email"
                            className="editadmin-input"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value.replace(/[^a-zA-Z0-9@.]/g, ""))
                            }
                            placeholder={t("enterEmail")}
                            required
                            aria-required="true"
                        />
                    </div>

                    <button className="editadmin-save-btn" onClick={handleUpdate} disabled={saving}>
                        {saving
                            ? <span className="ea-spinner-sm" />
                            : <span className="ea-btn-icon">{icons.check}</span>}
                        {saving ? t("saving") : t("updateAdmin")}
                    </button>
                </div>
            )}
        </div>
    );
}

export default EditAdmin;