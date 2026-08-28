import React, { useEffect, useState } from "react";
import "./ActivityLogs.css";
import { logAdminAction } from "../utils/logAdminAction";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    orderBy,
    query,
    deleteDoc,
    doc,
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

const getProfileImageUrl = (employeeId, name = "", size = 120) => {
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

const IcoArrow = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
);

const IcoClipboard = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <rect x="5" y="4" width="14" height="17" rx="2.6" />
        <path d="M9 4.2a1.6 1.6 0 0 1 1.6-1.4h2.8A1.6 1.6 0 0 1 15 4.2v1.3H9V4.2Z" />
        <path d="M9 11h6M9 15h4" />
    </svg>
);

const IcoUnlock = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.6" />
        <path d="M8 10.5V7.8a4 4 0 0 1 7.6-1.7" />
    </svg>
);

const IcoLock = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.6" />
        <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </svg>
);

const IcoUsers = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <circle cx="9" cy="8" r="3.4" />
        <path d="M2.8 19.5a6.4 6.4 0 0 1 12.4 0" />
        <path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.4M17.6 14.2a6.4 6.4 0 0 1 3.6 5.3" />
    </svg>
);

const IcoSearch = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.6-3.6" />
    </svg>
);

const IcoClose = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

const IcoDownload = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M4 20h16" />
    </svg>
);

const IcoTrash = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <path d="M4 7h16M9.5 7V4.8A.8.8 0 0 1 10.3 4h3.4a.8.8 0 0 1 .8.8V7" />
        <path d="M6.5 7l.8 12.2a1.8 1.8 0 0 0 1.8 1.8h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
        <path d="M10.5 11v6M13.5 11v6" />
    </svg>
);

const IcoChevronDown = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const IcoBadge = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <circle cx="9" cy="11" r="2.2" />
        <path d="M5.6 16.4a3.8 3.8 0 0 1 6.8 0M14.5 10h4M14.5 13.5h3" />
    </svg>
);

const IcoUser = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <circle cx="12" cy="8.5" r="3.8" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
);

const IcoClock = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <circle cx="12" cy="12" r="8.6" />
        <path d="M12 7.2V12l3.2 2" />
    </svg>
);

const IcoHourglass = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <path d="M7 3h10M7 21h10M8 3v3.5c0 2 4 3.6 4 5.5s-4 3.5-4 5.5V21M16 3v3.5c0 2-4 3.6-4 5.5s4 3.5 4 5.5V21" />
    </svg>
);

const IcoGlobe = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <circle cx="12" cy="12" r="8.6" />
        <path d="M3.4 12h17.2M12 3.4a13 13 0 0 1 0 17.2 13 13 0 0 1 0-17.2Z" />
    </svg>
);

const IcoSignal = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <circle cx="12" cy="12" r="2.2" />
        <path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6" />
        <path d="M5.4 5.4a9.4 9.4 0 0 0 0 13.2M18.6 5.4a9.4 9.4 0 0 1 0 13.2" />
    </svg>
);

const IcoInbox = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="actlog__ico">
        <path d="M3.5 13.5h4l1.5 2.5h6l1.5-2.5h4" />
        <path d="M5.6 4.5h12.8l2.1 9v4.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2v-4.5l2.1-9Z" />
    </svg>
);

/* ---------------------------------------------------------------- */
/* Avatar — photo if we have one, tinted initial otherwise           */
/* ---------------------------------------------------------------- */

function LogAvatar({ src, name, label }) {

    const [showImage, setShowImage] = useState(Boolean(src));
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setShowImage(Boolean(src));
        setLoaded(false);
    }, [src]);

    return (
        <div className="actlog__avatar">
            {showImage ? (
                <img
                    src={src}
                    alt={label}
                    className={`actlog__avatar-img${loaded ? " is-loaded" : ""}`}
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

function ActivityLogs() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [logs, setLogs] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [expandedLog, setExpandedLog] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const [deletingAll, setDeletingAll] = useState(false);
    const [avatars, setAvatars] = useState({});
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

            fetchLogs();

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
        let result = logs;
        if (filterType !== "all") {
            result = result.filter((l) => l.action === filterType);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (l) =>
                    l.userId?.toLowerCase().includes(q) ||
                    l.userName?.toLowerCase().includes(q) ||
                    l.ipAddress?.includes(q) ||
                    l.browser?.toLowerCase().includes(q)
            );
        }
        setFiltered(result);
    }, [search, filterType, logs]);

    /* One lookup per distinct user, not per log row. */
    const loadAvatars = async (list) => {
        const ids = [...new Set(list.map((l) => l.userId).filter(Boolean))];

        const entries = await Promise.all(
            ids.map(async (userId) => {
                const fallbackName =
                    list.find((l) => l.userId === userId)?.userName || "";

                try {
                    const snap = await getDoc(doc(db, "users", userId));
                    if (snap.exists()) {
                        const u = snap.data();
                        const stored =
                            u.profileImage ||
                            u.photoURL ||
                            u.profileImageUrl ||
                            u.imageUrl;
                        if (stored) return [userId, stored];
                        return [userId, getProfileImageUrl(userId, u.name || fallbackName)];
                    }
                } catch (err) {
                    console.error(err);
                }

                return [userId, getProfileImageUrl(userId, fallbackName)];
            })
        );

        setAvatars(Object.fromEntries(entries));
    };

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"));
            const snap = await getDocs(q);
            const data = [];
            snap.forEach((docItem) => data.push({ docId: docItem.id, ...docItem.data() }));
            setLogs(data);
            setFiltered(data);
            loadAvatars(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLog = async () => {
        if (!showDeleteModal) return;
        try {
            setDeletingId(showDeleteModal);
            await deleteDoc(doc(db, "activityLogs", showDeleteModal));
            await logAdminAction("delete_activity_log", {
                targetId: showDeleteModal,
                details: t("logDeletedActivityLog"),
            });
            setLogs((prev) => prev.filter((l) => l.docId !== showDeleteModal));
            if (expandedLog === showDeleteModal) setExpandedLog(null);
        } catch (err) {
            console.error(err);
        } finally {
            setDeletingId(null);
            setShowDeleteModal(null);
        }
    };

    const handleDeleteAll = async () => {
        try {
            setDeletingAll(true);
            if (logs.length === 0) {
                return;
            }
            const deletePromises = logs.map((l) => deleteDoc(doc(db, "activityLogs", l.docId)));
            await Promise.all(deletePromises);
            await logAdminAction("delete_all_activity_logs", {
                details: t("logDeletedAllActivityLogs", { count: logs.length }),
            });
            setLogs([]);
            setFiltered([]);
            setExpandedLog(null);
        } catch (err) {
            console.error(err);
        } finally {
            setDeletingAll(false);
            setShowDeleteAllModal(false);
        }
    };

    const exportCSV = () => {
        const headers = [
            t("userId"),
            t("name"),
            t("action"),
            t("loginTime"),
            t("logoutTime"),
            t("lastActive"),
            t("browserDevice"),
            t("ipAddress"),
        ];
        const rows = filtered.map((l) => [
            l.userId || "",
            l.userName || "",
            l.action || "",
            l.loginTime ? formatDateTime(l.loginTime) : "",
            l.logoutTime ? formatDateTime(l.logoutTime) : "",
            l.lastActive ? formatDateTime(l.lastActive) : "",
            l.browser || "",
            l.ipAddress || "",
        ]);
        const csv = [
            headers.join(","),
            ...rows.map((r) =>
                r.map((cell) => `"${cell}"`).join(",")
            )
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatDateTime = (ts) => {
        if (!ts) return "—";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
    };

    const formatTime = (ts) => {
        if (!ts) return "—";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };

    const formatDate = (ts) => {
        if (!ts) return "—";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    };

    const getSessionDuration = (login, logout) => {
        if (!login || !logout) return null;
        const start = login.toDate ? login.toDate() : new Date(login);
        const end = logout.toDate ? logout.toDate() : new Date(logout);
        const diff = Math.floor((end - start) / 1000);
        if (diff < 0) return null;
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    const loginCount = logs.filter((l) => l.action === "login").length;
    const logoutCount = logs.filter((l) => l.action === "logout").length;
    const uniqueUsers = [...new Set(logs.map((l) => l.userId))].length;

    const filterOptions = [
        { key: "all", label: t("all"), icon: null },
        { key: "login", label: t("logins"), icon: <IcoUnlock /> },
        { key: "logout", label: t("logouts"), icon: <IcoLock /> },
    ];

    return (
        <div className="actlog__page" data-theme={theme}>

            <div className="actlog__blob actlog__blob--1" />
            <div className="actlog__blob actlog__blob--2" />
            <div className="actlog__dots" />

            <button className="actlog__back-btn" onClick={() => navigate("/admin-dashboard")}>
                <IcoArrow /> {t("back")}
            </button>

            <div className="actlog__shell">

                <div className="actlog__header">
                    <div className="actlog__header-text">
                        <div className="actlog__eyebrow">
                            <span className="actlog__eyebrow-pulse" />
                            <span className="actlog__eyebrow-text">{t("activityLogs")}</span>
                        </div>
                        <h1 className="actlog__title">
                            <span className="actlog__title-main">{t("activityLogsTitle")}</span>
                            <span className="actlog__title-accent"> {t("activityLogsTitleAccent")}</span>
                        </h1>
                        <p className="actlog__subtitle">{t("activityLogsSubtitle")}</p>
                    </div>
                    <div className="actlog__header-art" aria-hidden="true">
                        <span className="actlog__art-halo" />
                        <span className="actlog__art-board"><IcoClipboard /></span>
                        <span className="actlog__art-clock"><IcoClock /></span>
                    </div>
                </div>

                <div className="actlog__stats">

                    <div className="actlog__stat actlog__stat--total">
                        <span className="actlog__stat-icon-wrap"><IcoClipboard /></span>
                        <span className="actlog__stat-info">
                            <span className="actlog__stat-num">{logs.length}</span>
                            <span className="actlog__stat-label">{t("totalLogs")}</span>
                        </span>
                        <span className="actlog__stat-wash" />
                    </div>

                    <div className="actlog__stat actlog__stat--login">
                        <span className="actlog__stat-icon-wrap"><IcoUnlock /></span>
                        <span className="actlog__stat-info">
                            <span className="actlog__stat-num">{loginCount}</span>
                            <span className="actlog__stat-label">{t("logins")}</span>
                        </span>
                        <span className="actlog__stat-wash" />
                    </div>

                    <div className="actlog__stat actlog__stat--logout">
                        <span className="actlog__stat-icon-wrap"><IcoLock /></span>
                        <span className="actlog__stat-info">
                            <span className="actlog__stat-num">{logoutCount}</span>
                            <span className="actlog__stat-label">{t("logouts")}</span>
                        </span>
                        <span className="actlog__stat-wash" />
                    </div>

                    <div className="actlog__stat actlog__stat--users">
                        <span className="actlog__stat-icon-wrap"><IcoUsers /></span>
                        <span className="actlog__stat-info">
                            <span className="actlog__stat-num">{uniqueUsers}</span>
                            <span className="actlog__stat-label">{t("uniqueUsers")}</span>
                        </span>
                        <span className="actlog__stat-wash" />
                    </div>

                </div>

                <div className="actlog__controls">

                    <div className="actlog__search-wrap">
                        <span className="actlog__search-icon"><IcoSearch /></span>
                        <input
                            className="actlog__search"
                            type="text"
                            placeholder={t("searchByUserIpBrowser")}
                            value={search}
                            onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                if (/^[A-Z0-9. ]*$/.test(value)) setSearch(value);
                            }}
                        />
                        {search && (
                            <button
                                className="actlog__search-clear"
                                onClick={() => setSearch("")}
                                aria-label={t("clearSearch")}
                            >
                                <IcoClose />
                            </button>
                        )}
                    </div>

                    <div className="actlog__filters">
                        {filterOptions.map((f) => (
                            <button
                                key={f.key}
                                className={`actlog__filter-btn actlog__filter-btn--${f.key} ${filterType === f.key ? "actlog__filter-btn--active" : ""}`}
                                onClick={() => setFilterType(f.key)}
                            >
                                {f.icon} {f.label}
                            </button>
                        ))}
                    </div>

                    <button className="actlog__export-btn" onClick={exportCSV}>
                        <IcoDownload /> {t("exportCsv")}
                    </button>

                    {logs.length > 0 && (
                        <button
                            className="actlog__delete-all-btn"
                            onClick={() => setShowDeleteAllModal(true)}
                        >
                            <IcoTrash /> {t("deleteAllLogs")}
                        </button>
                    )}

                </div>

                {!loading && (
                    <p className="actlog__result-count">
                        {t("showing")} <span>{filtered.length}</span> {t("of")} <span>{logs.length}</span> {t("logsLabel")}
                    </p>
                )}

                {loading && (
                    <div className="actlog__loading">
                        <div className="actlog__loader">
                            <div className="actlog__loader-ring" />
                            <div className="actlog__loader-ring actlog__loader-ring--2" />
                            <div className="actlog__loader-core" />
                        </div>
                        <p>{t("loading")}</p>
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="actlog__empty">
                        <span className="actlog__empty-icon"><IcoInbox /></span>
                        <p>{t("noActivityLogsFound")}</p>
                    </div>
                )}

                {!loading && filtered.length > 0 && (
                    <div className="actlog__timeline">
                        {filtered.map((log, index) => {
                            const isLogin = log.action === "login";
                            const isExpanded = expandedLog === log.docId;
                            const duration = getSessionDuration(log.loginTime, log.logoutTime);
                            const isDeleting = deletingId === log.docId;

                            return (
                                <div
                                    key={log.docId}
                                    className={`actlog__entry ${isLogin ? "actlog__entry--login" : "actlog__entry--logout"} ${isExpanded ? "actlog__entry--expanded" : ""}`}
                                    style={{ animationDelay: `${index * 30}ms` }}
                                >
                                    <div
                                        className="actlog__entry-main"
                                        onClick={() => setExpandedLog(isExpanded ? null : log.docId)}
                                    >
                                        <div className="actlog__entry-left">
                                            <span className={`actlog__badge ${isLogin ? "actlog__badge--login" : "actlog__badge--logout"}`}>
                                                <span className="actlog__badge-dot" />
                                                {isLogin ? t("loginBadge") : t("logoutBadge")}
                                            </span>

                                            <LogAvatar
                                                src={avatars[log.userId]}
                                                name={log.userName || log.userId}
                                                label={log.userName || t("profilePhoto")}
                                            />

                                            <div className="actlog__entry-user">
                                                <span className="actlog__entry-name">{log.userName || log.userId}</span>
                                                <span className="actlog__entry-id">{log.userId}</span>
                                            </div>
                                        </div>

                                        <div className="actlog__entry-right">
                                            <div className="actlog__entry-timestamp">
                                                <span className="actlog__entry-date">{formatDate(log.timestamp)}</span>
                                                <span className="actlog__entry-time">{formatTime(log.timestamp)}</span>
                                            </div>
                                            <button
                                                className="actlog__entry-delete-btn"
                                                onClick={(e) => { e.stopPropagation(); setShowDeleteModal(log.docId); }}
                                                disabled={isDeleting}
                                                title={t("deleteLog")}
                                            >
                                                {isDeleting ? (
                                                    <span className="actlog__entry-delete-spinner" />
                                                ) : (
                                                    <IcoTrash />
                                                )}
                                            </button>
                                            <span className={`actlog__chevron ${isExpanded ? "actlog__chevron--open" : ""}`}>
                                                <IcoChevronDown />
                                            </span>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="actlog__entry-details">
                                            <div className="actlog__detail-grid">

                                                <div className="actlog__detail-item">
                                                    <span className="actlog__detail-icon"><IcoBadge /></span>
                                                    <div className="actlog__detail-content">
                                                        <span className="actlog__detail-label">{t("userId")}</span>
                                                        <span className="actlog__detail-value">{log.userId || "—"}</span>
                                                    </div>
                                                </div>

                                                <div className="actlog__detail-item">
                                                    <span className="actlog__detail-icon"><IcoUser /></span>
                                                    <div className="actlog__detail-content">
                                                        <span className="actlog__detail-label">{t("name")}</span>
                                                        <span className="actlog__detail-value">{log.userName || "—"}</span>
                                                    </div>
                                                </div>

                                                <div className="actlog__detail-item">
                                                    <span className="actlog__detail-icon"><IcoUnlock /></span>
                                                    <div className="actlog__detail-content">
                                                        <span className="actlog__detail-label">{t("loginTime")}</span>
                                                        <span className="actlog__detail-value">{formatDateTime(log.loginTime)}</span>
                                                    </div>
                                                </div>

                                                <div className="actlog__detail-item">
                                                    <span className="actlog__detail-icon"><IcoLock /></span>
                                                    <div className="actlog__detail-content">
                                                        <span className="actlog__detail-label">{t("logoutTime")}</span>
                                                        <span className="actlog__detail-value">{formatDateTime(log.logoutTime)}</span>
                                                    </div>
                                                </div>

                                                <div className="actlog__detail-item">
                                                    <span className="actlog__detail-icon"><IcoClock /></span>
                                                    <div className="actlog__detail-content">
                                                        <span className="actlog__detail-label">{t("lastActive")}</span>
                                                        <span className="actlog__detail-value">{formatDateTime(log.lastActive)}</span>
                                                    </div>
                                                </div>

                                                {duration && (
                                                    <div className="actlog__detail-item actlog__detail-item--accent">
                                                        <span className="actlog__detail-icon"><IcoHourglass /></span>
                                                        <div className="actlog__detail-content">
                                                            <span className="actlog__detail-label">{t("sessionDuration")}</span>
                                                            <span className="actlog__detail-value actlog__detail-value--green">{duration}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {log.browser && (
                                                    <div className="actlog__detail-item">
                                                        <span className="actlog__detail-icon"><IcoGlobe /></span>
                                                        <div className="actlog__detail-content">
                                                            <span className="actlog__detail-label">{t("browserDevice")}</span>
                                                            <span className="actlog__detail-value">{log.browser}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {log.ipAddress && (
                                                    <div className="actlog__detail-item">
                                                        <span className="actlog__detail-icon"><IcoSignal /></span>
                                                        <div className="actlog__detail-content">
                                                            <span className="actlog__detail-label">{t("ipAddress")}</span>
                                                            <span className="actlog__detail-value actlog__detail-value--mono">{log.ipAddress}</span>
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>

            {showDeleteModal && (
                <div className="actlog__modal-overlay" onClick={() => setShowDeleteModal(null)}>
                    <div className="actlog__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="actlog__modal-icon"><IcoTrash /></div>
                        <h3 className="actlog__modal-title">{t("deleteLogTitle")}</h3>
                        <p className="actlog__modal-msg">{t("deleteLogMsg")}</p>
                        <div className="actlog__modal-actions">
                            <button className="actlog__modal-cancel" onClick={() => setShowDeleteModal(null)}>
                                {t("cancel")}
                            </button>
                            <button className="actlog__modal-confirm" onClick={handleDeleteLog} disabled={Boolean(deletingId)}>
                                {deletingId ? (
                                    <><span className="actlog__btn-spin" /> {t("deleting")}</>
                                ) : (
                                    <><IcoTrash /> {t("yesDelete")}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteAllModal && (
                <div className="actlog__modal-overlay" onClick={() => setShowDeleteAllModal(false)}>
                    <div className="actlog__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="actlog__modal-icon"><IcoTrash /></div>
                        <h3 className="actlog__modal-title">{t("deleteAllLogsTitle")}</h3>
                        <p className="actlog__modal-msg">{t("deleteAllLogsMsg")}</p>
                        <div className="actlog__modal-actions">
                            <button className="actlog__modal-cancel" onClick={() => setShowDeleteAllModal(false)}>
                                {t("cancel")}
                            </button>
                            <button className="actlog__modal-confirm" onClick={handleDeleteAll} disabled={deletingAll}>
                                {deletingAll ? (
                                    <><span className="actlog__btn-spin" /> {t("deleting")}</>
                                ) : (
                                    <><IcoTrash /> {t("yesDeleteAll")}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default ActivityLogs;