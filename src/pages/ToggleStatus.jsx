import React, { useEffect, useState } from "react";
import "./ToggleStatus.css";
import { logAdminAction } from "../utils/logAdminAction";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
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

const IcoChevron = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" className="tgls__ico">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const IcoUsers = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="tgls__ico">
        <circle cx="9" cy="8" r="3.4" />
        <path d="M2.8 19.5a6.4 6.4 0 0 1 12.4 0" />
        <path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.4M17.6 14.2a6.4 6.4 0 0 1 3.6 5.3" />
    </svg>
);

const IcoCheck = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="tgls__ico">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.2 12.3l2.6 2.6 5-5.2" />
    </svg>
);

const IcoBan = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" className="tgls__ico">
        <circle cx="12" cy="12" r="9" />
        <path d="M5.6 5.6l12.8 12.8" />
    </svg>
);

const IcoSearch = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="tgls__ico">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.6-3.6" />
    </svg>
);

const IcoClose = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" className="tgls__ico">
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

const IcoLock = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="tgls__ico">
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.6" />
        <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </svg>
);

const IcoUnlock = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="tgls__ico">
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.6" />
        <path d="M8 10.5V7.8a4 4 0 0 1 7.6-1.7" />
    </svg>
);

/* ---------------------------------------------------------------- */
/* Avatar — photo if we have one, tinted initial otherwise           */
/* ---------------------------------------------------------------- */

function UserAvatar({ src, name, disabled, label }) {

    const [showImage, setShowImage] = useState(Boolean(src));
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setShowImage(Boolean(src));
        setLoaded(false);
    }, [src]);

    return (
        <div className={`tgls__avatar ${disabled ? "tgls__avatar--off" : "tgls__avatar--on"}`}>
            {showImage ? (
                <img
                    src={src}
                    alt={label}
                    className={`tgls__avatar-img${loaded ? " is-loaded" : ""}`}
                    loading="lazy"
                    onLoad={() => setLoaded(true)}
                    onError={() => setShowImage(false)}
                />
            ) : (
                <span>{name ? name.charAt(0).toUpperCase() : "?"}</span>
            )}
        </div>
    );
}

function ToggleStatus() {

    const { t } = useTranslation();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState(null);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [search, setSearch] = useState("");
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const checkAdmin = async () => {

        const currentUser = auth.currentUser;

        if (!currentUser) {
            navigate("/");
            return;
        }

        try {

            const userRef = doc(db, "users", localStorage.getItem("userId"));
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

            fetchUsers();

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
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    useEffect(() => {
        checkAdmin();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, "users"));
            const list = [];
            snapshot.forEach((docItem) => {
                const data = docItem.data();
                if (
                    !data.deleted &&
                    data.role !== "admin"
                ) {
                    const name = data.name || "";
                    const idNo = data.id || docItem.id;

                    /* Stored URL wins; otherwise rebuild it from id + name. */
                    const stored =
                        data.profileImage ||
                        data.photoURL ||
                        data.profileImageUrl ||
                        data.imageUrl;

                    list.push({
                        docId: docItem.id,
                        name,
                        idNo,
                        photo: stored || getProfileImageUrl(idNo, name),
                        disabled: data.disabled === true,
                    });
                }
            });
            list.sort((a, b) =>
                (a.idNo || "").localeCompare(b.idNo || "")
            );
            setUsers(list);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const showMsg = (text, type = "success") => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    };

    const handleToggle = async (user) => {
        if (!user?.docId) {
            return;
        }

        setTogglingId(user.docId);
        try {
            const newStatus = !user.disabled;
            await updateDoc(doc(db, "users", user.docId), {
                disabled: newStatus
            });
            await logAdminAction("toggle_status", {
                targetId: user.idNo,
                details: newStatus
                    ? t("logDisabledUser", { name: user.name })
                    : t("logEnabledUser", { name: user.name }),
            });
            setUsers((prev) =>
                prev.map((u) =>
                    u.docId === user.docId ? { ...u, disabled: newStatus } : u
                )
            );
            showMsg(
                newStatus
                    ? t("userDisabledMsg", { name: user.name, idNo: user.idNo })
                    : t("userEnabledMsg", { name: user.name, idNo: user.idNo }),
                newStatus ? "error" : "success"
            );
        } catch (error) {
            console.error(error);
            showMsg(t("errorUpdatingStatus"), "error");
        } finally {
            setTogglingId(null);
        }
    };

    const handleToggleAll = async () => {
        if (users.length === 0) {
            return;
        }
        const allDisabled = users.every((u) => u.disabled);
        const newStatus = !allDisabled;
        setTogglingId("__all__");
        try {
            await Promise.all(
                users.map((user) =>
                    updateDoc(doc(db, "users", user.docId), { disabled: newStatus })
                )
            );
            await logAdminAction("toggle_status", {
                targetId: "ALL",
                details: newStatus
                    ? t("logDisabledAll", { count: users.length })
                    : t("logEnabledAll", { count: users.length }),
            });
            setUsers((prev) => prev.map((u) => ({ ...u, disabled: newStatus })));
            showMsg(
                newStatus ? t("allDisabledMsg") : t("allEnabledMsg"),
                newStatus ? "error" : "success"
            );
        } catch (error) {
            console.error(error);
            showMsg(t("errorUpdatingStatus"), "error");
        } finally {
            setTogglingId(null);
        }
    };

    const filtered = users.filter(
        (u) =>
            (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
            (u.idNo || "").toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = users.filter((u) => !u.disabled).length;
    const disabledCount = users.filter((u) => u.disabled).length;
    const allDisabled = users.length > 0 && users.every((u) => u.disabled);

    return (
        <div className="tgls__page" data-theme={theme}>

            <div className="tgls__blob tgls__blob--1" />
            <div className="tgls__blob tgls__blob--2" />
            <div className="tgls__dots tgls__dots--1" />
            <div className="tgls__dots tgls__dots--2" />

            <button
                className="tgls__back-btn"
                onClick={() => navigate("/admin-dashboard")}
            >
                <IcoChevron /> {t("back")}
            </button>

            <div className="tgls__shell">

                <div className="tgls__hero">
                    <div className="tgls__hero-badge">
                        <span className="tgls__badge-dot" />
                        {t("adminPanel")}
                    </div>
                    <h1 className="tgls__hero-title">{t("toggleStatus")}</h1>
                    <p className="tgls__hero-sub">{t("toggleStatusSub")}</p>
                </div>

                {message.text && (
                    <div className={`tgls__msg tgls__msg--${message.type}`}>
                        {message.text}
                    </div>
                )}

                {!loading && (
                    <div className="tgls__stats">

                        <div className="tgls__stat-card tgls__stat-card--total">
                            <span className="tgls__stat-icon"><IcoUsers /></span>
                            <span className="tgls__stat-text">
                                <span className="tgls__stat-num">{users.length}</span>
                                <span className="tgls__stat-lbl">{t("totalUsers")}</span>
                            </span>
                        </div>

                        <div className="tgls__stat-card tgls__stat-card--active">
                            <span className="tgls__stat-icon"><IcoCheck /></span>
                            <span className="tgls__stat-text">
                                <span className="tgls__stat-num">{activeCount}</span>
                                <span className="tgls__stat-lbl">{t("active")}</span>
                            </span>
                        </div>

                        <div className="tgls__stat-card tgls__stat-card--disabled">
                            <span className="tgls__stat-icon"><IcoBan /></span>
                            <span className="tgls__stat-text">
                                <span className="tgls__stat-num">{disabledCount}</span>
                                <span className="tgls__stat-lbl">{t("disabled")}</span>
                            </span>
                        </div>

                    </div>
                )}

                <div className="tgls__search-wrap">

                    <div className="tgls__search-inner">
                        <span className="tgls__search-icon"><IcoSearch /></span>
                        <input
                            className="tgls__search"
                            type="text"
                            placeholder={t("searchByNameOrId")}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                className="tgls__search-clear"
                                onClick={() => setSearch("")}
                                aria-label={t("clearSearch")}
                            >
                                <IcoClose />
                            </button>
                        )}
                    </div>

                    <button
                        className={`tgls__bulk-btn ${allDisabled ? "tgls__bulk-btn--enable" : "tgls__bulk-btn--disable"}`}
                        onClick={handleToggleAll}
                        disabled={togglingId === "__all__" || users.length === 0}
                    >
                        {togglingId === "__all__" ? (
                            <span className="tgls__btn-spin" />
                        ) : (
                            <>
                                {allDisabled ? <IcoUnlock /> : <IcoLock />}
                                {allDisabled ? t("enableAll") : t("disableAll")}
                            </>
                        )}
                    </button>

                </div>

                {loading && (
                    <div className="tgls__loading">
                        <div className="tgls__loader">
                            <div className="tgls__loader-ring" />
                            <div className="tgls__loader-ring tgls__loader-ring--2" />
                        </div>
                        <p>{t("loading")}</p>
                    </div>
                )}

                {!loading && (
                    <div className="tgls__list">
                        {filtered.length === 0 ? (
                            <div className="tgls__empty">
                                <span className="tgls__empty-icon"><IcoSearch /></span>
                                <p>{t("noUsersFound")}</p>
                            </div>
                        ) : (
                            filtered.map((user, index) => (
                                <div
                                    key={user.docId}
                                    className={`tgls__row ${user.disabled ? "tgls__row--disabled" : ""}`}
                                    style={{ animationDelay: `${index * 0.04}s` }}
                                >
                                    <UserAvatar
                                        src={user.photo}
                                        name={user.name}
                                        disabled={user.disabled}
                                        label={user.name || t("profilePhoto")}
                                    />

                                    <div className="tgls__info">
                                        <span className="tgls__name">{user.name}</span>
                                        <span className="tgls__id-chip">{user.idNo}</span>
                                    </div>

                                    <div className={`tgls__status ${user.disabled ? "tgls__status--off" : "tgls__status--on"}`}>
                                        <span className="tgls__status-dot" />
                                        {user.disabled ? t("disabled") : t("active")}
                                    </div>

                                    <button
                                        className={`tgls__btn ${user.disabled ? "tgls__btn--enable" : "tgls__btn--disable"}`}
                                        onClick={() => handleToggle(user)}
                                        disabled={togglingId === user.docId}
                                    >
                                        {togglingId === user.docId ? (
                                            <span className="tgls__btn-spin" />
                                        ) : (
                                            <>
                                                {user.disabled ? <IcoUnlock /> : <IcoLock />}
                                                {user.disabled ? t("enable") : t("disable")}
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}

export default ToggleStatus;