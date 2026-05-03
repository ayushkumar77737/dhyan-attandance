import React, { useEffect, useState } from "react";
import "./MyProfile.css";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

function MyProfile() {

    const { t } = useTranslation();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

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
            if (!user) return;
            const id = user.email.split("@")[0].toUpperCase();
            try {
                const profileSnap = await getDoc(doc(db, "profiles", id));
                if (profileSnap.exists()) {
                    setProfile(profileSnap.data());
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

    return (
        <div className="mprf__page">

            {/* Back Button */}
            <button className="mprf__back-btn" onClick={() => navigate("/user-dashboard")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("back")}
            </button>

            {/* Header */}
            <div className="mprf__header">
                <div className="mprf__header-badge">
                    <span className="mprf__badge-dot" />
                    {t("myProfile")}
                </div>
                <h1 className="mprf__title">{t("myProfile")}</h1>
                <p className="mprf__subtitle">{t("profileInfoSubtitle")}</p>
            </div>

            {/* Loading */}
            {loading && (
                <div className="mprf__loading">
                    <div className="mprf__loader">
                        <div className="mprf__loader-ring" />
                        <div className="mprf__loader-ring mprf__loader-ring--2" />
                    </div>
                    <p className="mprf__loading-text">{t("loading")}</p>
                </div>
            )}

            {/* Not Found */}
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

            {/* Profile Card */}
            {!loading && profile && (
                <div className="mprf__card">
                    <div className="mprf__card-glow" />
                    <div className="mprf__card-stripe" />

                    {/* Avatar Section */}
                    <div className="mprf__avatar-section">
                        <div className="mprf__avatar-ring">
                            <div className="mprf__avatar">
                                <span className="mprf__avatar-letter">
                                    {profile.name ? profile.name.charAt(0).toUpperCase() : "?"}
                                </span>
                            </div>
                        </div>
                        <h2 className="mprf__profile-name">{profile.name}</h2>
                        <div className="mprf__id-badge">
                            <span className="mprf__id-dot" />
                            {profile.idNo}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="mprf__divider" />

                    {/* Details Grid */}
                    <div className="mprf__grid">

                        <div className="mprf__item">
                            <div className="mprf__item-icon">🪪</div>
                            <div className="mprf__item-body">
                                <span className="mprf__item-label">{t("idNo")}</span>
                                <span className="mprf__item-value">{profile.idNo}</span>
                            </div>
                        </div>

                        <div className="mprf__item">
                            <div className="mprf__item-icon">👤</div>
                            <div className="mprf__item-body">
                                <span className="mprf__item-label">{t("fullName")}</span>
                                <span className="mprf__item-value">{profile.name}</span>
                            </div>
                        </div>

                        <div className="mprf__item">
                            <div className="mprf__item-icon">👨‍👩‍👦</div>
                            <div className="mprf__item-body">
                                <span className="mprf__item-label">{t("fatherHusbandName")}</span>
                                <span className="mprf__item-value">{profile.fatherHusbandName}</span>
                            </div>
                        </div>

                        <div className="mprf__item">
                            <div className="mprf__item-icon">📞</div>
                            <div className="mprf__item-body">
                                <span className="mprf__item-label">{t("phoneNumberLabel")}</span>
                                <span className="mprf__item-value">{profile.phoneNumber}</span>
                            </div>
                        </div>

                        <div className="mprf__item">
                            <div className="mprf__item-icon">📱</div>
                            <div className="mprf__item-body">
                                <span className="mprf__item-label">{t("phoneType")}</span>
                                <span className={`mprf__phone-tag mprf__phone-tag--${profile.phoneType === "WhatsApp" ? "wa" : "kp"}`}>
                                    {profile.phoneType === "WhatsApp" ? `📲 ${t("whatsapp")}` : `📵 ${t("keypad")}`}
                                </span>
                            </div>
                        </div>

                        <div className="mprf__item">
                            <div className="mprf__item-icon">📧</div>
                            <div className="mprf__item-body">
                                <span className="mprf__item-label">{t("emailIdLabel")}</span>
                                <span className="mprf__item-value">{profile.email}</span>
                            </div>
                        </div>

                        {profile.dob && (
                            <div className="mprf__item">
                                <div className="mprf__item-icon">🎂</div>
                                <div className="mprf__item-body">
                                    <span className="mprf__item-label">{t("dateOfBirth")}</span>
                                    <span className="mprf__item-value">{profile.dob}</span>
                                </div>
                            </div>
                        )}

                        <div className="mprf__item mprf__item--full">
                            <div className="mprf__item-icon">🏠</div>
                            <div className="mprf__item-body">
                                <span className="mprf__item-label">{t("address")}</span>
                                <span className="mprf__item-value">{profile.address}</span>
                            </div>
                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

export default MyProfile;