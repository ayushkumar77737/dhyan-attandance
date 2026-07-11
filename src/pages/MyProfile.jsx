import React, { useEffect, useState } from "react";
import "./MyProfile.css";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { logUserAction } from "../utils/logUserAction";

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
                    setProfile(profileSnap.data());
                    setProfileId(id);
                    setEditForm({
                        name: profileSnap.data().name || "",
                        fatherHusbandName: profileSnap.data().fatherHusbandName || "",
                        address: profileSnap.data().address || "",
                        email: profileSnap.data().email || ""
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

    const saveProfile = async () => {
        if (
            !profileId ||
            !editForm.name.trim() ||
            !editForm.address.trim()
        ) return;
        if (
            editForm.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)
        ) {
            return;
        }
        try {
            setEditLoading(true);
            if (!/^[a-zA-Z ]+$/.test(editForm.name.trim())) {
                return;
            }
            const safeName = editForm.name.trim().slice(0, 60);

            const safeFather = editForm.fatherHusbandName
                .trim()
                .slice(0, 60);
            if (editForm.address.trim().length < 5) {
                return;
            }
            const safeAddress = editForm.address
                .trim()
                .slice(0, 300);

            const safeEmail = editForm.email
                .trim()
                .slice(0, 100);
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
            setProfile((prev) => ({ ...prev, ...editForm }));
            setShowEditModal(false);
        } catch (error) {
            console.error(error);
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

                    <button className="mprf__edit-trigger" onClick={() => setShowEditModal(true)}>
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
                <div className="mprf__modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="mprf__modal" onClick={(e) => e.stopPropagation()}>

                        <div className="mprf__modal-header">
                            <h3>✎ {t("edit")} {t("myProfile")}</h3>
                            <button className="mprf__modal-close" onClick={() => setShowEditModal(false)}>✕</button>
                        </div>

                        <div className="mprf__modal-field">
                            <label>{t("fullName")}</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                placeholder={t("fullName")}
                            />
                        </div>

                        <div className="mprf__modal-field">
                            <label>{t("fatherHusbandName")}</label>
                            <input
                                type="text"
                                value={editForm.fatherHusbandName}
                                onChange={(e) => setEditForm({ ...editForm, fatherHusbandName: e.target.value })}
                                placeholder={t("fatherHusbandName")}
                            />
                        </div>

                        <div className="mprf__modal-field">
                            <label>{t("emailIdLabel")}</label>
                            <input
                                type="text"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                placeholder={t("emailIdLabel")}
                            />
                        </div>

                        <div className="mprf__modal-field">
                            <label>{t("address")}</label>
                            <textarea
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                placeholder={t("address")}
                            />
                        </div>

                        <div className="mprf__modal-footer">
                            <button className="mprf__modal-cancel" onClick={() => setShowEditModal(false)}>
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