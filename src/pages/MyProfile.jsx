import React, { useEffect, useState } from "react";
import "./MyProfile.css";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { logUserAction } from "../utils/logUserAction";

/* ------------------------------------------------------------------ */
/* Input sanitizers — applied on every keystroke and paste             */
/* ------------------------------------------------------------------ */

/* Names: capital letters and single spaces only. Lowercase is upper-cased
   as you type; digits and special characters are dropped. */
const sanitizeName = (v) =>
    (v || "").toUpperCase().replace(/[^A-Z ]/g, "").replace(/\s{2,}/g, " ").slice(0, 60);

/* Email: letters, digits, "@" and "." only. The dot is kept because a
   domain can't be valid without one. Everything else is stripped. */
const sanitizeEmail = (v) =>
    (v || "").replace(/[^a-zA-Z0-9@.]/g, "").slice(0, 100);

const NAME_RE = /^[A-Z]+( [A-Z]+)*$/;
const EMAIL_RE = /^[a-zA-Z0-9.]+@[a-zA-Z0-9.]+\.[a-zA-Z]{2,}$/;

/* Red asterisk shown after every mandatory field label. */
const Required = () => (
    <span className="mprf__required" aria-hidden="true">*</span>
);

function MyProfile() {

    const { t } = useTranslation();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: "",
        fatherHusbandName: "",
        address: "",
        email: ""
    });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");
    const [profileId, setProfileId] = useState("");
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

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

            if (
                userData.uid !== user.uid
            ) {
                navigate("/");
                return;
            }

            if (userData.role === "admin") {
                navigate("/admin-dashboard");
                return;
            }

            try {
                const profileSnap = await getDoc(doc(db, "profiles", id));
                if (profileSnap.exists()) {
                    const data = profileSnap.data();
                    setProfile(data);
                    setProfileId(id);
                    /* Normalise existing values so an old lowercase name
                       doesn't fail validation on the first save. */
                    setEditForm({
                        name: sanitizeName(data.name),
                        fatherHusbandName: sanitizeName(data.fatherHusbandName),
                        address: data.address || "",
                        email: sanitizeEmail(data.email)
                    });
                } else {
                    setNotFound(true);
                }
            } catch (error) {
                console.error(error);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const openEditModal = () => {
        setEditError("");
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        if (editLoading) return;
        setEditError("");
        setShowEditModal(false);
    };

    const handleField = (key, value) => {
        let clean = value;
        if (key === "name" || key === "fatherHusbandName") clean = sanitizeName(value);
        if (key === "email") clean = sanitizeEmail(value);
        setEditForm((prev) => ({ ...prev, [key]: clean }));
        if (editError) setEditError("");
    };

    /* Block disallowed keys before they land, so the caret never jumps. */
    const nameKeyDown = (e) => {
        const allowedKeys = [
            "Backspace", "Delete", "ArrowLeft", "ArrowRight",
            "ArrowUp", "ArrowDown", "Tab", "Home", "End", " "
        ];
        if (
            !allowedKeys.includes(e.key) &&
            !/^[a-zA-Z]$/.test(e.key) &&
            !(e.ctrlKey || e.metaKey)
        ) {
            e.preventDefault();
        }
    };

    const emailKeyDown = (e) => {
        const allowedKeys = [
            "Backspace", "Delete", "ArrowLeft", "ArrowRight",
            "ArrowUp", "ArrowDown", "Tab", "Home", "End"
        ];
        if (
            !allowedKeys.includes(e.key) &&
            !/^[a-zA-Z0-9@.]$/.test(e.key) &&
            !(e.ctrlKey || e.metaKey)
        ) {
            e.preventDefault();
        }
    };

    const saveProfile = async () => {
        if (!profileId) return;

        const safeName = sanitizeName(editForm.name).trim();
        const safeFather = sanitizeName(editForm.fatherHusbandName).trim();
        const safeEmail = sanitizeEmail(editForm.email).trim();
        const safeAddress = (editForm.address || "").trim().slice(0, 300);

        if (!safeName || !safeFather || !safeEmail || !safeAddress) {
            setEditError(t("allFieldsRequired"));
            return;
        }
        if (!NAME_RE.test(safeName) || !NAME_RE.test(safeFather)) {
            setEditError(t("nameLettersOnly"));
            return;
        }
        if (!EMAIL_RE.test(safeEmail)) {
            setEditError(t("emailInvalid"));
            return;
        }
        if (safeAddress.length < 5) {
            setEditError(t("addressTooShort"));
            return;
        }

        try {
            setEditLoading(true);
            setEditError("");

            await updateDoc(doc(db, "profiles", profileId), {
                name: safeName,
                fatherHusbandName: safeFather,
                address: safeAddress,
                email: safeEmail
            });

            await updateDoc(doc(db, "users", profileId), {
                name: safeName
            });
            await logUserAction("update_profile", { details: t("uaUpdateProfileDetail") });
            setProfile((prev) => ({
                ...prev,
                name: safeName,
                fatherHusbandName: safeFather,
                address: safeAddress,
                email: safeEmail
            }));
            setShowEditModal(false);
        } catch (error) {
            console.error(error);
            setEditError(t("profileSaveFailed"));
        } finally {
            setEditLoading(false);
        }
    };

    return (
        <div className="mprf__page" data-theme={theme}>

            <button className="mprf__back-btn" onClick={() => navigate("/user-dashboard")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("back")}
            </button>

            <div className="mprf__header">
                <div className="mprf__header-badge">
                    <svg className="mprf__badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    {t("myProfile")}
                </div>
                <h1 className="mprf__title">{t("myProfile")}</h1>
                <p className="mprf__subtitle">{t("profileInfoSubtitle")}</p>
            </div>

            {loading && (
                <div className="mprf__loading">
                    <div className="mprf__loader">
                        <div className="mprf__loader-ring" />
                        <div className="mprf__loader-ring mprf__loader-ring--2" />
                    </div>
                    <p className="mprf__loading-text">{t("loading")}</p>
                </div>
            )}

            {!loading && notFound && (
                <div className="mprf__card">
                    <div className="mprf__card-glow" />
                    <div className="mprf__not-found">
                        <div className="mprf__not-found-circle">
                            <span>👤</span>
                        </div>
                        <h3 className="mprf__not-found-title">{t("profileNotFound")}</h3>
                        <p className="mprf__not-found-sub">{t("profileNotFoundSub")}</p>
                    </div>
                </div>
            )}

            {!loading && profile && (
                <div className="mprf__card">
                    <div className="mprf__card-glow" />
                    <div className="mprf__card-stripe" />

                    <button className="mprf__edit-trigger" onClick={openEditModal}>
                        ✎ {t("edit")}
                    </button>

                    <div className="mprf__avatar-section">
                        <div className="mprf__avatar-ring">
                            <div className="mprf__avatar">
                                {profile.profileImage ? (
                                    <img
                                        src={profile.profileImage}
                                        alt={profile.name}
                                        className="mprf__avatar-img"
                                    />
                                ) : (
                                    <span className="mprf__avatar-letter">
                                        {profile.name ? profile.name.charAt(0).toUpperCase() : "?"}
                                    </span>
                                )}
                            </div>
                            <span className="mprf__avatar-status" />
                        </div>
                        <h2 className="mprf__profile-name">{profile.name}</h2>
                        <div className="mprf__id-badge">
                            <span className="mprf__id-dot" />
                            {profile.idNo}
                        </div>
                    </div>

                    <div className="mprf__divider" />

                    <div className="mprf__grid">

                        <div className="mprf__item">
                            <div className="mprf__item-icon mprf__item-icon--blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg></div>
                            <div className="mprf__item-body">
                                <span className="mprf__item-label">{t("idNo")}</span>
                                <span className="mprf__item-value">{profile.idNo}</span>
                            </div>
                        </div>

                        <div className="mprf__item">
                            <div className="mprf__item-icon mprf__item-icon--violet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
                            <div className="mprf__item-body">
                                <span className="mprf__item-label">{t("fullName")}</span>
                                <span className="mprf__item-value">{profile.name}</span>
                            </div>
                        </div>

                        <div className="mprf__item">
                            <div className="mprf__item-icon mprf__item-icon--indigo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></div>
                            <div className="mprf__item-body">
                                <span className="mprf__item-label">{t("fatherHusbandName")}</span>
                                <span className="mprf__item-value">{profile.fatherHusbandName}</span>
                            </div>
                        </div>

                        <div className="mprf__item">
                            <div className="mprf__item-icon mprf__item-icon--purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg></div>
                            <div className="mprf__item-body">
                                <span className="mprf__item-label">{t("phoneNumberLabel")}</span>
                                <span className="mprf__item-value">{profile.phoneNumber}</span>
                            </div>
                        </div>

                        <div className="mprf__item">
                            <div className="mprf__item-icon mprf__item-icon--cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg></div>
                            <div className="mprf__item-body">
                                <span className="mprf__item-label">{t("phoneType")}</span>
                                <span className={`mprf__phone-tag mprf__phone-tag--${profile.phoneType === "WhatsApp" ? "wa" : "kp"}`}>
                                    {profile.phoneType === "WhatsApp" ? `📲 ${t("whatsapp")}` : `📵 ${t("keypad")}`}
                                </span>
                            </div>
                        </div>

                        <div className="mprf__item">
                            <div className="mprf__item-icon mprf__item-icon--green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg></div>
                            <div className="mprf__item-body">
                                <span className="mprf__item-label">{t("emailIdLabel")}</span>
                                <span className="mprf__item-value">{profile.email}</span>
                                {profile.email && (
                                    <span className="mprf__verified-tag">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                        {t("verified") || "Verified"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {profile.dob && (
                            <div className="mprf__item">
                                <div className="mprf__item-icon mprf__item-icon--amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>
                                <div className="mprf__item-body">
                                    <span className="mprf__item-label">{t("dateOfBirth")}</span>
                                    <span className="mprf__item-value">{profile.dob}</span>
                                </div>
                            </div>
                        )}

                        <div className="mprf__item mprf__item--full">
                            <div className="mprf__item-icon mprf__item-icon--rose"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg></div>
                            <div className="mprf__item-body">
                                <span className="mprf__item-label">{t("address")}</span>
                                <span className="mprf__item-value">{profile.address}</span>
                            </div>
                        </div>

                    </div>

                </div>
            )}

            {!loading && profile && (
                <div className="mprf__secure-footer">
                    <div className="mprf__secure-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    </div>
                    <div className="mprf__secure-text">
                        <span className="mprf__secure-title">{t("profileSecureTitle") || "Secure & Private"}</span>
                        <span className="mprf__secure-sub">{t("profileSecureSub") || "Your information is safe with us and will never be shared."}</span>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className="mprf__modal-overlay" onClick={closeEditModal}>
                    <div className="mprf__modal" onClick={(e) => e.stopPropagation()}>

                        <div className="mprf__modal-header">
                            <h3>✎ {t("edit")} {t("myProfile")}</h3>
                            <button className="mprf__modal-close" onClick={closeEditModal}>✕</button>
                        </div>

                        <div className="mprf__modal-field">
                            <label htmlFor="mprf-name">{t("fullName")}<Required /></label>
                            <input
                                id="mprf-name"
                                type="text"
                                autoComplete="off"
                                spellCheck={false}
                                maxLength={60}
                                value={editForm.name}
                                onChange={(e) => handleField("name", e.target.value)}
                                onKeyDown={nameKeyDown}
                                placeholder={t("fullName")}
                                required
                            />
                        </div>

                        <div className="mprf__modal-field">
                            <label htmlFor="mprf-father">{t("fatherHusbandName")}<Required /></label>
                            <input
                                id="mprf-father"
                                type="text"
                                autoComplete="off"
                                spellCheck={false}
                                maxLength={60}
                                value={editForm.fatherHusbandName}
                                onChange={(e) => handleField("fatherHusbandName", e.target.value)}
                                onKeyDown={nameKeyDown}
                                placeholder={t("fatherHusbandName")}
                                required
                            />
                        </div>

                        <div className="mprf__modal-field">
                            <label htmlFor="mprf-email">{t("emailIdLabel")}<Required /></label>
                            <input
                                id="mprf-email"
                                type="text"
                                inputMode="email"
                                autoComplete="off"
                                spellCheck={false}
                                maxLength={100}
                                value={editForm.email}
                                onChange={(e) => handleField("email", e.target.value)}
                                onKeyDown={emailKeyDown}
                                placeholder={t("emailIdLabel")}
                                required
                            />
                        </div>

                        <div className="mprf__modal-field">
                            <label htmlFor="mprf-address">{t("address")}<Required /></label>
                            <textarea
                                id="mprf-address"
                                maxLength={300}
                                value={editForm.address}
                                onChange={(e) => handleField("address", e.target.value)}
                                placeholder={t("address")}
                                required
                            />
                        </div>

                        {editError && (
                            <p className="mprf__modal-error" role="alert">{editError}</p>
                        )}

                        <div className="mprf__modal-footer">
                            <button className="mprf__modal-cancel" onClick={closeEditModal} disabled={editLoading}>
                                {t("cancel")}
                            </button>
                            <button className="mprf__modal-save" onClick={saveProfile} disabled={editLoading}>
                                {editLoading ? `⏳ ${t("loading")}` : `💾 ${t("save")}`}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default MyProfile;