import React, { useEffect, useState } from "react";
import "./AllProfiles.css";
import { logAdminAction } from "../utils/logAdminAction";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    getDoc
} from "firebase/firestore";
import { useTranslation } from "react-i18next";

/* ----------------------------------------------------------------
   Cloudinary
   Mirrors the public_id formula used in utils/cloudinaryUpload.js:
   `${employeeId}_${name with spaces -> underscores}`
   If that formula ever changes there, change it here too.
   ---------------------------------------------------------------- */

const CLOUD_NAME = "dgvjq9bhl";

const getProfileImageUrl = (employeeId, name = "", size = 160) => {
    if (!employeeId || !name) return "";

    const publicId = `${employeeId}_${name.replace(/\s+/g, "_")}`;

    const transforms = [
        "c_fill",
        "g_face",
        `w_${size}`,
        `h_${size}`,
        "r_max",
        "q_auto",
        "f_auto"
    ].join(",");

    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
};

/* ---------------------------------------------------------------- */
/* Inline icons (stroke = currentColor, so they inherit theme color) */
/* ---------------------------------------------------------------- */

const IcoChevronLeft = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const IcoChevronRight = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

const IcoSearch = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.6-3.6" />
    </svg>
);

const IcoClose = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

const IcoDownload = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M4 20h16" />
    </svg>
);

const IcoUsers = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <circle cx="9" cy="8" r="3.4" />
        <path d="M2.8 19.5a6.4 6.4 0 0 1 12.4 0" />
        <path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.4M17.6 14.2a6.4 6.4 0 0 1 3.6 5.3" />
    </svg>
);

const IcoPencil = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <path d="M16.4 4.6l3 3L8.5 18.5l-4 1 1-4L16.4 4.6Z" />
        <path d="M14.5 6.5l3 3" />
    </svg>
);

const IcoTrash = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <path d="M4 7h16M9.5 7V4.8A.8.8 0 0 1 10.3 4h3.4a.8.8 0 0 1 .8.8V7" />
        <path d="M6.5 7l.8 12.2a1.8 1.8 0 0 0 1.8 1.8h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
    </svg>
);

const IcoSave = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <path d="M5 4h11l4 4v12H5V4Z" />
        <path d="M8 4v5h7M8 15h8" />
    </svg>
);

const IcoBadge = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <circle cx="9" cy="11" r="2.2" />
        <path d="M5.6 16.4a3.8 3.8 0 0 1 6.8 0M14.5 10h4M14.5 13.5h3" />
    </svg>
);

const IcoUser = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <circle cx="12" cy="8.5" r="3.8" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
);

const IcoFamily = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <circle cx="7.5" cy="7.5" r="2.8" />
        <circle cx="16.5" cy="7.5" r="2.8" />
        <path d="M2.5 19a5 5 0 0 1 10 0M11.5 19a5 5 0 0 1 10 0" />
    </svg>
);

const IcoPhone = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" />
    </svg>
);

const IcoMobile = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <rect x="6.5" y="2.5" width="11" height="19" rx="2.6" />
        <path d="M10.5 18.5h3" />
    </svg>
);

const IcoMail = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M4 7.5l7.1 5a1.6 1.6 0 0 0 1.8 0l7.1-5" />
    </svg>
);

const IcoCake = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <path d="M4 20.5h16M4.5 20.5v-6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v6" />
        <path d="M4.5 16.5c1.5 0 1.5 1.5 3 1.5s1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5" />
        <path d="M12 12.5V9M12 6.2v.1" />
    </svg>
);

const IcoHome = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="allprf__ico">
        <path d="M4 10.5L12 4l8 6.5V20H4v-9.5Z" />
        <path d="M9.5 20v-5.5h5V20" />
    </svg>
);

/* ---------------------------------------------------------------- */
/* Avatar — photo if we have one, tinted initial otherwise           */
/* ---------------------------------------------------------------- */

function ProfileAvatar({ src, name, label, className = "" }) {

    const [showImage, setShowImage] = useState(Boolean(src));
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setShowImage(Boolean(src));
        setLoaded(false);
    }, [src]);

    return (
        <div className={`allprf__avatar ${className}`}>
            {showImage ? (
                <img
                    src={src}
                    alt={label}
                    className={`allprf__avatar-img${loaded ? " is-loaded" : ""}`}
                    loading="lazy"
                    onLoad={() => setLoaded(true)}
                    onError={() => setShowImage(false)}
                />
            ) : (
                <span>{(name || "?").charAt(0).toUpperCase()}</span>
            )}
        </div>
    );
}

function AllProfiles() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [profiles, setProfiles] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedProfile, setSelectedProfile] = useState(null);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: "",
        fatherHusbandName: "",
        phoneNumber: "",
        email: "",
        dob: "",
        address: ""
    });
    const [editLoading, setEditLoading] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
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

            fetchProfiles();

        } catch (error) {
            console.error(error);
            navigate("/");
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
        const q = search.toLowerCase();
        setFiltered(
            profiles.filter(
                (p) =>
                    p.name?.toLowerCase().includes(q) ||
                    p.idNo?.toLowerCase().includes(q) ||
                    p.email?.toLowerCase().includes(q) ||
                    String(p.phoneNumber || "").includes(q)
            )
        );
    }, [search, profiles]);

    const fetchProfiles = async () => {
        try {
            setLoading(true);

            /* `profiles` also holds mirrored admin photo records — written
               by AddAdmin.js with `{id, name, profileImage}` (no `idNo`,
               which is why they showed up here with a blank "#"). Cross-
               check against `users` and drop anyone whose role is admin,
               so this page shows registered users only. */
            const adminIds = new Set();
            try {
                const usersSnap = await getDocs(collection(db, "users"));
                usersSnap.forEach((u) => {
                    const ud = u.data();
                    if (ud.role === "admin") {
                        adminIds.add(String(ud.id || u.id).toUpperCase());
                    }
                });
            } catch (e) {
                console.warn("AllProfiles: could not load admin id list —", e);
            }

            const snap = await getDocs(collection(db, "profiles"));
            const data = [];
            snap.forEach((docItem) => {
                const d = docItem.data();
                const key = String(d.idNo || docItem.id).toUpperCase();

                if (adminIds.has(key)) return;

                data.push({
                    docId: docItem.id,
                    ...d,
                    /* Stored URL wins; otherwise rebuild it from id + name. */
                    photo:
                        d.profileImage ||
                        d.photoURL ||
                        getProfileImageUrl(d.idNo || docItem.id, d.name || ""),
                });
            });
            data.sort((a, b) => (a.idNo || "").localeCompare(b.idNo || ""));
            setProfiles(data);
            setFiltered(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        const headers = ["ID No", "Name", "Father/Husband Name", "Phone", "Phone Type", "Email", "Date of Birth", "Address"];
        const rows = filtered.map((p) => [
            p.idNo || "",
            p.name || "",
            p.fatherHusbandName || "",
            p.phoneNumber || "",
            p.phoneType || "",
            p.email || "",
            p.dob || "",
            `"${(p.address || "").replace(/"/g, '""')}"`,
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `all-profiles-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const openEdit = () => {
        setEditForm({
            name: selectedProfile.name || "",
            fatherHusbandName: selectedProfile.fatherHusbandName || "",
            phoneNumber: selectedProfile.phoneNumber || "",
            email: selectedProfile.email || "",
            dob: selectedProfile.dob || "",
            address: selectedProfile.address || ""
        });
        setShowEditModal(true);
    };

    const saveEdit = async () => {
        if (!editForm.name.trim() || !editForm.address.trim()) {
            return;
        }

        if (!selectedProfile?.docId) {
            return;
        }
        if (!/^[a-zA-Z ]+$/.test(editForm.name.trim())) {
            return;
        }

        if (
            editForm.phoneNumber &&
            !/^[0-9]{10}$/.test(editForm.phoneNumber.trim())
        ) {
            return;
        }
        try {
            setEditLoading(true);
            const phone = String(editForm.phoneNumber).replace(/\D/g, "");
            await updateDoc(doc(db, "profiles", selectedProfile.docId), {
                name: editForm.name.trim(),
                fatherHusbandName: editForm.fatherHusbandName.trim(),
                phoneNumber: phone,
                email: editForm.email.trim(),
                dob: editForm.dob.trim(),
                address: editForm.address.trim()
            });
            const userRef = doc(
                db,
                "users",
                selectedProfile.docId
            );

            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                await updateDoc(userRef, {
                    name: editForm.name.trim(),
                    phoneNumber: phone
                });
            }
            await logAdminAction("update_profile", {
                targetId: selectedProfile.idNo || selectedProfile.docId,
                details: t("logUpdatedProfile", { name: editForm.name.trim() }),
            });
            const updated = {
                ...selectedProfile,
                ...editForm,
                phoneNumber: phone
            };
            setProfiles((prev) => prev.map((p) => p.docId === selectedProfile.docId ? updated : p));
            setFiltered((prev) => prev.map((p) => p.docId === selectedProfile.docId ? updated : p));
            setSelectedProfile(updated);
            setShowEditModal(false);
        } catch (err) {
            console.error(err);
        } finally {
            setEditLoading(false);
        }
    };

    const deleteProfile = async () => {
        try {
            setDeleteLoading(true);
            if (!selectedProfile?.docId) {
                return;
            }
            await deleteDoc(doc(db, "profiles", selectedProfile.docId));
            await logAdminAction("delete_profile", {
                targetId: selectedProfile.idNo || selectedProfile.docId,
                details: t("logDeletedProfile", { name: selectedProfile.name }),
            });
            setProfiles((prev) => prev.filter((p) => p.docId !== selectedProfile.docId));
            setFiltered((prev) => prev.filter((p) => p.docId !== selectedProfile.docId));
            setShowDeleteConfirm(false);
            setSelectedProfile(null);
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="allprf__page" data-theme={theme}>

            <div className="allprf__blob allprf__blob--1" />
            <div className="allprf__blob allprf__blob--2" />
            <div className="allprf__dots" />

            <button
                className="allprf__back-btn"
                onClick={() => navigate("/admin-dashboard")}
            >
                <IcoChevronLeft /> {t("back")}
            </button>

            <div className="allprf__shell">

                <div className="allprf__header">
                    <div className="allprf__header-text">
                        <div className="allprf__eyebrow">
                            <span className="allprf__eyebrow-dot" />
                            <span>{t("allProfiles")}</span>
                        </div>
                        <h1 className="allprf__title">{t("allProfiles")}</h1>
                        <p className="allprf__subtitle">
                            <span className="allprf__count-pill">{filtered.length}</span>
                            {t("profilesFound")}
                        </p>
                    </div>
                    <div className="allprf__header-art" aria-hidden="true">
                        <span className="allprf__art-card allprf__art-card--back" />
                        <span className="allprf__art-card allprf__art-card--front">
                            <IcoUsers />
                        </span>
                    </div>
                </div>

                <div className="allprf__controls">
                    <div className="allprf__search-wrap">
                        <span className="allprf__search-icon"><IcoSearch /></span>
                        <input
                            className="allprf__search-input"
                            type="text"
                            placeholder={t("searchProfiles")}
                            value={search}
                            onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                if (/^[A-Z0-9@. ]*$/.test(value)) setSearch(value);
                            }}
                        />
                        {search && (
                            <button
                                className="allprf__search-clear"
                                onClick={() => setSearch("")}
                                aria-label={t("clearSearch")}
                            >
                                <IcoClose />
                            </button>
                        )}
                    </div>
                    <button className="allprf__export-btn" onClick={exportCSV}>
                        <IcoDownload /> {t("exportCsv")}
                    </button>
                </div>

                {loading && (
                    <div className="allprf__loading">
                        <div className="allprf__loader">
                            <div className="allprf__loader-ring" />
                            <div className="allprf__loader-ring allprf__loader-ring--inner" />
                            <div className="allprf__loader-core" />
                        </div>
                        <p className="allprf__loading-text">{t("loading")}</p>
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="allprf__empty">
                        <span className="allprf__empty-icon"><IcoUsers /></span>
                        <p>{t("noProfilesFound")}</p>
                    </div>
                )}

                {!loading && filtered.length > 0 && (
                    <div className="allprf__grid">
                        {filtered.map((profile, index) => (
                            <div
                                key={profile.docId}
                                className="allprf__card"
                                style={{ animationDelay: `${index * 40}ms` }}
                                onClick={() => setSelectedProfile(profile)}
                            >
                                <ProfileAvatar
                                    src={profile.photo}
                                    name={profile.name}
                                    label={profile.name || t("profilePhoto")}
                                />
                                <div className="allprf__card-body">
                                    <h3 className="allprf__card-name">{profile.name}</h3>
                                    <span className="allprf__card-id"># {profile.idNo}</span>
                                    <span className="allprf__card-phone">{profile.phoneNumber}</span>
                                </div>
                                <span className="allprf__card-chevron">
                                    <IcoChevronRight />
                                </span>
                            </div>
                        ))}
                    </div>
                )}

            </div>

            {selectedProfile && (
                <div className="allprf__overlay" onClick={() => setSelectedProfile(null)}>
                    <div className="allprf__modal" onClick={(e) => e.stopPropagation()}>

                        <div className="allprf__modal-topbar" />

                        <div className="allprf__modal-actions-bar">
                            <button
                                className="allprf__modal-delete-btn"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                <IcoTrash /> {t("delete")}
                            </button>
                            <div className="allprf__modal-actions-right">
                                <button className="allprf__modal-edit-btn" onClick={openEdit}>
                                    <IcoPencil /> {t("edit")}
                                </button>
                                <button
                                    className="allprf__modal-close"
                                    onClick={() => setSelectedProfile(null)}
                                    aria-label={t("cancel")}
                                >
                                    <IcoClose />
                                </button>
                            </div>
                        </div>

                        <div className="allprf__modal-hero">
                            <ProfileAvatar
                                src={selectedProfile.photo}
                                name={selectedProfile.name}
                                label={selectedProfile.name || t("profilePhoto")}
                                className="allprf__avatar--lg"
                            />
                            <h2 className="allprf__modal-name">{selectedProfile.name}</h2>
                            <div className="allprf__modal-id-pill">{selectedProfile.idNo}</div>
                        </div>

                        <div className="allprf__modal-divider" />

                        <div className="allprf__modal-rows">

                            <div className="allprf__modal-row">
                                <span className="allprf__modal-row-icon"><IcoBadge /></span>
                                <div className="allprf__modal-row-content">
                                    <span className="allprf__modal-row-label">{t("idNo")}</span>
                                    <span className="allprf__modal-row-value">{selectedProfile.idNo}</span>
                                </div>
                            </div>

                            <div className="allprf__modal-row">
                                <span className="allprf__modal-row-icon"><IcoUser /></span>
                                <div className="allprf__modal-row-content">
                                    <span className="allprf__modal-row-label">{t("fullName")}</span>
                                    <span className="allprf__modal-row-value">{selectedProfile.name}</span>
                                </div>
                            </div>

                            <div className="allprf__modal-row">
                                <span className="allprf__modal-row-icon"><IcoFamily /></span>
                                <div className="allprf__modal-row-content">
                                    <span className="allprf__modal-row-label">{t("fatherHusbandName")}</span>
                                    <span className="allprf__modal-row-value">{selectedProfile.fatherHusbandName || "—"}</span>
                                </div>
                            </div>

                            <div className="allprf__modal-row">
                                <span className="allprf__modal-row-icon"><IcoPhone /></span>
                                <div className="allprf__modal-row-content">
                                    <span className="allprf__modal-row-label">{t("phoneNumberLabel")}</span>
                                    <span className="allprf__modal-row-value">{selectedProfile.phoneNumber}</span>
                                </div>
                            </div>

                            <div className="allprf__modal-row">
                                <span className="allprf__modal-row-icon"><IcoMobile /></span>
                                <div className="allprf__modal-row-content">
                                    <span className="allprf__modal-row-label">{t("phoneType")}</span>
                                    <span className={`allprf__phone-badge allprf__phone-badge--${selectedProfile.phoneType === "WhatsApp" ? "wa" : "kp"}`}>
                                        {selectedProfile.phoneType === "WhatsApp" ? t("whatsapp") : t("keypad")}
                                    </span>
                                </div>
                            </div>

                            <div className="allprf__modal-row">
                                <span className="allprf__modal-row-icon"><IcoMail /></span>
                                <div className="allprf__modal-row-content">
                                    <span className="allprf__modal-row-label">{t("emailIdLabel")}</span>
                                    <span className="allprf__modal-row-value">{selectedProfile.email || "—"}</span>
                                </div>
                            </div>

                            {selectedProfile.dob && (
                                <div className="allprf__modal-row">
                                    <span className="allprf__modal-row-icon"><IcoCake /></span>
                                    <div className="allprf__modal-row-content">
                                        <span className="allprf__modal-row-label">{t("dateOfBirth")}</span>
                                        <span className="allprf__modal-row-value">{selectedProfile.dob}</span>
                                    </div>
                                </div>
                            )}

                            <div className="allprf__modal-row allprf__modal-row--full">
                                <span className="allprf__modal-row-icon"><IcoHome /></span>
                                <div className="allprf__modal-row-content">
                                    <span className="allprf__modal-row-label">{t("address")}</span>
                                    <span className="allprf__modal-row-value">{selectedProfile.address || "—"}</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className="allprf__edit-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="allprf__edit-modal" onClick={(e) => e.stopPropagation()}>

                        <div className="allprf__edit-header">
                            <h3><IcoPencil /> {t("editProfile")}</h3>
                            <button
                                className="allprf__edit-close"
                                onClick={() => setShowEditModal(false)}
                                aria-label={t("cancel")}
                            >
                                <IcoClose />
                            </button>
                        </div>

                        <div className="allprf__edit-field">
                            <label>{t("fullName")}</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                placeholder={t("fullName")}
                            />
                        </div>

                        <div className="allprf__edit-field">
                            <label>{t("fatherHusbandName")}</label>
                            <input
                                type="text"
                                value={editForm.fatherHusbandName}
                                onChange={(e) => setEditForm({ ...editForm, fatherHusbandName: e.target.value })}
                                placeholder={t("fatherHusbandName")}
                            />
                        </div>

                        <div className="allprf__edit-field">
                            <label>{t("phoneNumberLabel")}</label>
                            <input
                                type="text"
                                value={editForm.phoneNumber}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10)
                                    })
                                }
                                placeholder={t("phoneNumberLabel")}
                            />
                        </div>

                        <div className="allprf__edit-field">
                            <label>{t("emailIdLabel")}</label>
                            <input
                                type="text"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                placeholder={t("emailIdLabel")}
                            />
                        </div>

                        <div className="allprf__edit-field">
                            <label>{t("dateOfBirth")}</label>
                            <input
                                type="date"
                                value={editForm.dob}
                                onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                            />
                        </div>

                        <div className="allprf__edit-field">
                            <label>{t("address")}</label>
                            <textarea
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                placeholder={t("address")}
                            />
                        </div>

                        <div className="allprf__edit-footer">
                            <button className="allprf__edit-cancel" onClick={() => setShowEditModal(false)}>
                                {t("cancel")}
                            </button>
                            <button className="allprf__edit-save" onClick={saveEdit} disabled={editLoading}>
                                {editLoading ? (
                                    <><span className="allprf__btn-spin" /> {t("saving")}</>
                                ) : (
                                    <><IcoSave /> {t("save")}</>
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="allprf__edit-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="allprf__delete-modal" onClick={(e) => e.stopPropagation()}>

                        <div className="allprf__delete-icon"><IcoTrash /></div>
                        <h3 className="allprf__delete-title">{t("deleteUser")}</h3>
                        <p className="allprf__delete-msg">
                            {t("deleteConfirmMsg")}
                            <br />
                            <strong>{selectedProfile?.name}</strong> ({selectedProfile?.idNo})
                        </p>

                        <div className="allprf__edit-footer">
                            <button className="allprf__edit-cancel" onClick={() => setShowDeleteConfirm(false)}>
                                {t("cancel")}
                            </button>
                            <button className="allprf__delete-confirm-btn" onClick={deleteProfile} disabled={deleteLoading}>
                                {deleteLoading ? (
                                    <><span className="allprf__btn-spin" /> {t("deleting")}</>
                                ) : (
                                    <><IcoTrash /> {t("delete")}</>
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default AllProfiles;