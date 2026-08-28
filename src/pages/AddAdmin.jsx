import React, { useEffect, useRef, useState } from "react";
import "./AddAdmin.css";
import { useNavigate } from "react-router-dom";
import { logAdminAction } from "../utils/logAdminAction";
import { auth, db, secondaryAuth } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
    createUserWithEmailAndPassword,
    signOut as authSignOut,
} from "firebase/auth";

/* Cloudinary helper — lives at src/utils/cloudinaryUpload.js */
import { uploadProfileImage } from "../utils/cloudinaryUpload";

import { useTranslation } from "react-i18next";
import useAutoLogout from "../hooks/useAutoLogout";

/* Photo constraints — mirrored in the hint text below the drop zone */
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_PHOTO_TYPES = ["image/png", "image/jpeg", "image/jpg"];

const icons = {
    shield: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    ),
    shieldFill: (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2 4 5v6.1c0 4.7 3.1 8.6 8 9.9 4.9-1.3 8-5.2 8-9.9V5l-8-3zm-.8 13.3-3.1-3.1 1.4-1.4 1.7 1.7 4-4 1.4 1.4-5.4 5.4z" />
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
    userFill: (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <circle cx="12" cy="8" r="4.4" />
            <path d="M12 14.2c-4.6 0-8.3 2.4-8.3 5.3V21h16.6v-1.5c0-2.9-3.7-5.3-8.3-5.3z" />
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
    info: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
    plus: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    ),
    trash: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
        </svg>
    ),
    close: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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

    /* photo: `photoFile` is what actually gets uploaded, `photoPreview` is a
       local object URL purely for the thumbnail. Nothing hits Cloudinary
       until the form is submitted and validation has passed. */
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState("");
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef(null);

    const [saving, setSaving] = useState(false);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");
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
            /* Only wipe the form after a SUCCESS. Clearing it on an error
               would make the admin retype everything to fix one field. */
            if (success) {
                setSuccess("");
                setAdminId("");
                setName("");
                setEmail("");
                setPassword("");
                setConfirm("");
                clearPhoto();
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [error, success]);

    /* revoke the object URL when the preview changes or the page unmounts,
       otherwise each pick leaks a blob into memory */
    useEffect(() => {
        return () => {
            if (photoPreview) URL.revokeObjectURL(photoPreview);
        };
    }, [photoPreview]);

    const clearPhoto = () => {
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoFile(null);
        setPhotoPreview("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handlePhotoPick = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
            setError(t("photoInvalidType") || "Only PNG and JPG images are allowed.");
            e.target.value = "";
            return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
            setError(t("photoTooLarge") || "Image must be under 2MB.");
            e.target.value = "";
            return;
        }

        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
        setError("");
    };

    const isValidEmail = (val) => /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[a-zA-Z]{2,}$/.test(val);

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

        if (!/^[A-Z0-9]{6}$/.test(id)) {
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
        if (!/^[0-9]{8}$/.test(password)) {
            setError(t("noSpecialChars") || "Password must be exactly 8 digits.");
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

            /* Upload BEFORE creating the auth user. Cloudinary is the most
               likely step to fail, and failing here leaves nothing behind —
               no orphaned auth account, no half-written Firestore doc. */
            let photoURL = "";
            if (photoFile) {
                try {
                    setUploadingPhoto(true);
                    photoURL = await uploadProfileImage(photoFile, id, trimmedName);
                } catch (uploadErr) {
                    console.error("[cloudinary] upload failed:", uploadErr);
                    setError(t("photoUploadFailed") || "Could not upload the photo. Please try again.");
                    setSaving(false);
                    setUploadingPhoto(false);
                    return;
                } finally {
                    setUploadingPhoto(false);
                }
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
                profileImage: photoURL,
                createdAt: new Date().toISOString(),
            });

            /* Mirror the image into `profiles/{ID}` so every screen that
               already reads profile photos from there picks it up too. */
            if (photoURL) {
                await setDoc(
                    doc(db, "profiles", id),
                    { id, name: trimmedName, profileImage: photoURL },
                    { merge: true }
                );
            }

            await logAdminAction("create_admin", {
                targetId: id,
                details: t("logCreatedAdmin", { name: trimmedName }),
            });

            setSuccess(t("adminAddedSuccess"));
            setAdminId("");
            setName("");
            setEmail("");
            setPassword("");
            setConfirm("");
            clearPhoto();
        } catch (err) {
            console.error(err);
            setError(mapAuthError(err.code));
        } finally {
            setSaving(false);
        }
    };

    const busy = saving || uploadingPhoto;

    return (
        <div className="aapg-container" data-theme={theme}>
            <div className="aapg-card">

                <div className="aapg-head">
                    <button
                        className="aapg-back"
                        onClick={() => navigate(-1)}
                        aria-label={t("back")}
                    >
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

                <p className="aapg-required-note">
                    <span className="aapg-required" aria-hidden="true">*</span>
                    {t("requiredFieldsNote") || "Fields marked with an asterisk are required"}
                </p>

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

                {/* -------------------- PROFILE PHOTO (optional) -------------------- */}
                <div className="aapg-field">
                    <label>{t("profilePhoto") || "Profile Photo"}</label>

                    <div className="aapg-photo-row">
                        <button
                            type="button"
                            className={`aapg-drop ${photoPreview ? "aapg-drop--filled" : ""}`}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={busy}
                        >
                            <span className="aapg-avatar">
                                {photoPreview ? (
                                    <img src={photoPreview} alt={t("profilePhoto") || "Profile Photo"} />
                                ) : (
                                    <span className="aapg-avatar-glyph">{icons.userFill}</span>
                                )}
                                <span className="aapg-avatar-plus" aria-hidden="true">{icons.plus}</span>
                            </span>

                            <span className="aapg-drop-title">
                                {photoPreview
                                    ? (t("changePhoto") || "Change Photo")
                                    : (t("uploadPhoto") || "Upload Photo")}
                            </span>
                            <span className="aapg-drop-hint">
                                {t("photoFormatHint") || "PNG, JPG up to 2MB"}
                            </span>
                        </button>

                        <div className="aapg-photo-info">
                            <span className="aapg-photo-info-icon">{icons.info}</span>
                            <div className="aapg-photo-info-text">
                                <p className="aapg-photo-info-title">
                                    {t("profilePhotoInfo") || "Profile photo helps identify the administrator."}
                                </p>
                                <p className="aapg-photo-info-sub">
                                    {t("recommendedSize") || "Recommended size: 512x512px"}
                                </p>
                                {photoFile && (
                                    <button
                                        type="button"
                                        className="aapg-photo-remove"
                                        onClick={clearPhoto}
                                        disabled={busy}
                                    >
                                        {icons.close}
                                        {t("removePhoto") || "Remove photo"}
                                    </button>
                                )}
                            </div>
                            <svg className="aapg-photo-info-art" viewBox="0 0 200 120" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M0 74C42 44 78 92 122 66C166 40 182 62 200 50V120H0V74Z" fill="currentColor" opacity="0.5" />
                                <path d="M0 96C46 68 80 108 126 88C172 68 184 82 200 74V120H0V96Z" fill="currentColor" opacity="0.75" />
                            </svg>
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg"
                        className="aapg-file-input"
                        onChange={handlePhotoPick}
                        tabIndex={-1}
                    />
                </div>

                {/* -------------------- ADMIN ID -------------------- */}
                <div className="aapg-field">
                    <label>
                        {t("adminIdDocId") || t("adminId")}
                        <span className="aapg-required" aria-hidden="true">*</span>
                    </label>
                    <div className="aapg-input-wrap">
                        <span className="aapg-input-icon">{icons.id}</span>
                        <input
                            type="text"
                            placeholder="ADMIN3"
                            value={adminId}
                            maxLength={6}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^[a-zA-Z0-9]*$/.test(value)) setAdminId(value.toUpperCase());
                            }}
                            autoComplete="off"
                            required
                            aria-required="true"
                        />
                    </div>
                    <p className="aapg-hint">{t("adminIdHint")}</p>
                </div>

                <div className="aapg-field">
                    <label>
                        {t("name")}
                        <span className="aapg-required" aria-hidden="true">*</span>
                    </label>
                    <div className="aapg-input-wrap">
                        <span className="aapg-input-icon">{icons.user}</span>
                        <input
                            type="text"
                            placeholder="ADMIN"
                            value={name}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^[a-zA-Z ]*$/.test(value)) setName(value.toUpperCase());
                            }}
                            autoComplete="off"
                            required
                            aria-required="true"
                        />
                    </div>
                </div>

                <div className="aapg-field">
                    <label>
                        {t("email")}
                        <span className="aapg-required" aria-hidden="true">*</span>
                    </label>
                    <div className="aapg-input-wrap">
                        <span className="aapg-input-icon">{icons.mail}</span>
                        <input
                            type="email"
                            placeholder="admin3@gmail.com"
                            value={email}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^[a-zA-Z0-9@.]*$/.test(value)) setEmail(value);
                            }}
                            autoComplete="off"
                            required
                            aria-required="true"
                        />
                    </div>
                </div>

                <div className="aapg-field">
                    <label>
                        {t("password")}
                        <span className="aapg-required" aria-hidden="true">*</span>
                    </label>
                    <div className="aapg-input-wrap">
                        <span className="aapg-input-icon">{icons.lock}</span>
                        <input
                            type={showPwd ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            maxLength={8}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^[0-9]*$/.test(value)) setPassword(value);
                            }}
                            autoComplete="new-password"
                            required
                            aria-required="true"
                        />
                        <button
                            type="button"
                            className="aapg-pwd-toggle"
                            onClick={() => setShowPwd((s) => !s)}
                            aria-label={showPwd
                                ? (t("hidePassword") || "Hide password")
                                : (t("showPassword") || "Show password")}
                            tabIndex={-1}
                        >
                            {showPwd ? icons.eyeOff : icons.eye}
                        </button>
                    </div>
                    <p className="aapg-hint">{t("passwordHint")}</p>
                </div>

                <div className="aapg-field">
                    <label>
                        {t("confirmPassword")}
                        <span className="aapg-required" aria-hidden="true">*</span>
                    </label>
                    <div className="aapg-input-wrap">
                        <span className="aapg-input-icon">{icons.lock}</span>
                        <input
                            type={showPwd ? "text" : "password"}
                            placeholder="••••••••"
                            value={confirm}
                            maxLength={8}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^[0-9]*$/.test(value)) setConfirm(value);
                            }}
                            autoComplete="new-password"
                            required
                            aria-required="true"
                        />
                    </div>
                </div>

                {/* -------------------- AUTO-SET FIELDS -------------------- */}
                <div className="aapg-auto">
                    <span className="aapg-auto-label">{t("autoFields")}</span>
                    <div className="aapg-auto-row">
                        <span className="aapg-chip">
                            <span className="aapg-chip-icon">{icons.user}</span>
                            role: <b>admin</b>
                        </span>
                        <span className="aapg-chip">
                            <span className="aapg-chip-icon">{icons.trash}</span>
                            deleted: <b>false</b>
                        </span>
                    </div>
                </div>

                <button className="aapg-submit" onClick={handleSubmit} disabled={busy}>
                    {busy ? <span className="aapg-spinner" /> : icons.shield}
                    {uploadingPhoto
                        ? (t("uploadingPhoto") || "Uploading photo…")
                        : saving
                            ? t("saving")
                            : t("addAdmin")}
                </button>

                <p className="aapg-note">
                    <span className="aapg-note-icon">{icons.shieldFill}</span>
                    {t("adminOnlyNote") || "Only authorized administrators can add new users."}
                </p>

            </div>
        </div>
    );
}

export default AddAdmin;