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

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"));
            const snap = await getDocs(q);
            const data = [];
            snap.forEach((doc) => data.push({ docId: doc.id, ...doc.data() }));
            setLogs(data);
            setFiltered(data);
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

    return (
        <div className="actlog__page">
            <div className="actlog__orb actlog__orb--1" />
            <div className="actlog__orb actlog__orb--2" />
            <div className="actlog__orb actlog__orb--3" />
            <div className="actlog__grid-lines" />

            <button className="actlog__back-btn" onClick={() => navigate("/admin-dashboard")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("back")}
            </button>

            <div className="actlog__header">
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

            <div className="actlog__stats">
                <div className="actlog__stat actlog__stat--total">
                    <div className="actlog__stat-icon-wrap actlog__stat-icon-wrap--blue">
                        <span className="actlog__stat-icon">📋</span>
                    </div>
                    <div className="actlog__stat-info">
                        <span className="actlog__stat-num">{logs.length}</span>
                        <span className="actlog__stat-label">{t("totalLogs")}</span>
                    </div>
                    <div className="actlog__stat-glow actlog__stat-glow--blue" />
                </div>
                <div className="actlog__stat actlog__stat--login">
                    <div className="actlog__stat-icon-wrap actlog__stat-icon-wrap--green">
                        <span className="actlog__stat-icon">🔓</span>
                    </div>
                    <div className="actlog__stat-info">
                        <span className="actlog__stat-num">{loginCount}</span>
                        <span className="actlog__stat-label">{t("logins")}</span>
                    </div>
                    <div className="actlog__stat-glow actlog__stat-glow--green" />
                </div>
                <div className="actlog__stat actlog__stat--logout">
                    <div className="actlog__stat-icon-wrap actlog__stat-icon-wrap--red">
                        <span className="actlog__stat-icon">🔒</span>
                    </div>
                    <div className="actlog__stat-info">
                        <span className="actlog__stat-num">{logoutCount}</span>
                        <span className="actlog__stat-label">{t("logouts")}</span>
                    </div>
                    <div className="actlog__stat-glow actlog__stat-glow--red" />
                </div>
                <div className="actlog__stat actlog__stat--users">
                    <div className="actlog__stat-icon-wrap actlog__stat-icon-wrap--purple">
                        <span className="actlog__stat-icon">👥</span>
                    </div>
                    <div className="actlog__stat-info">
                        <span className="actlog__stat-num">{uniqueUsers}</span>
                        <span className="actlog__stat-label">{t("uniqueUsers")}</span>
                    </div>
                    <div className="actlog__stat-glow actlog__stat-glow--purple" />
                </div>
            </div>

            <div className="actlog__controls">
                <div className="actlog__search-wrap">
                    <svg className="actlog__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="actlog__search"
                        type="text"
                        placeholder={t("searchByUserIpBrowser")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && <button className="actlog__search-clear" onClick={() => setSearch("")}>✕</button>}
                </div>

                <div className="actlog__filters">
                    {["all", "login", "logout"].map((f) => (
                        <button
                            key={f}
                            className={`actlog__filter-btn ${filterType === f ? "actlog__filter-btn--active" : ""} ${f === "login" ? "actlog__filter-btn--login" : ""} ${f === "logout" ? "actlog__filter-btn--logout" : ""}`}
                            onClick={() => setFilterType(f)}
                        >
                            {f === "all"
                                ? t("all")
                                : f === "login"
                                    ? `🔓 ${t("logins")}`
                                    : `🔒 ${t("logouts")}`}
                        </button>
                    ))}
                </div>

                <button className="actlog__export-btn" onClick={exportCSV}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {t("exportCsv")}
                </button>

                {logs.length > 0 && (
                    <button className="actlog__delete-all-btn" onClick={() => setShowDeleteAllModal(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                        {t("deleteAllLogs")}
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
                    <span className="actlog__empty-icon">📭</span>
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
                                {/* Main row */}
                                <div className="actlog__entry-main" onClick={() => setExpandedLog(isExpanded ? null : log.docId)}>
                                    <div className="actlog__entry-left">
                                        <span className={`actlog__badge ${isLogin ? "actlog__badge--login" : "actlog__badge--logout"}`}>
                                            <span className="actlog__badge-dot" />
                                            {isLogin ? t("loginBadge") : t("logoutBadge")}
                                        </span>
                                        <div className="actlog__entry-user">
                                            <span className="actlog__entry-name">{log.userName || log.userId}</span>
                                            <span className="actlog__entry-id">#{log.userId}</span>
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
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                    <path d="M10 11v6M14 11v6" />
                                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                                </svg>
                                            )}
                                        </button>
                                        <svg className={`actlog__chevron ${isExpanded ? "actlog__chevron--open" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="actlog__entry-details">
                                        <div className="actlog__detail-grid">
                                            <div className="actlog__detail-item">
                                                <span className="actlog__detail-icon">🪪</span>
                                                <div className="actlog__detail-content">
                                                    <span className="actlog__detail-label">{t("userId")}</span>
                                                    <span className="actlog__detail-value">{log.userId || "—"}</span>
                                                </div>
                                            </div>
                                            <div className="actlog__detail-item">
                                                <span className="actlog__detail-icon">👤</span>
                                                <div className="actlog__detail-content">
                                                    <span className="actlog__detail-label">{t("name")}</span>
                                                    <span className="actlog__detail-value">{log.userName || "—"}</span>
                                                </div>
                                            </div>
                                            <div className="actlog__detail-item">
                                                <span className="actlog__detail-icon">🔓</span>
                                                <div className="actlog__detail-content">
                                                    <span className="actlog__detail-label">{t("loginTime")}</span>
                                                    <span className="actlog__detail-value">{formatDateTime(log.loginTime)}</span>
                                                </div>
                                            </div>
                                            <div className="actlog__detail-item">
                                                <span className="actlog__detail-icon">🔒</span>
                                                <div className="actlog__detail-content">
                                                    <span className="actlog__detail-label">{t("logoutTime")}</span>
                                                    <span className="actlog__detail-value">{formatDateTime(log.logoutTime)}</span>
                                                </div>
                                            </div>
                                            <div className="actlog__detail-item">
                                                <span className="actlog__detail-icon">⏱️</span>
                                                <div className="actlog__detail-content">
                                                    <span className="actlog__detail-label">{t("lastActive")}</span>
                                                    <span className="actlog__detail-value">{formatDateTime(log.lastActive)}</span>
                                                </div>
                                            </div>
                                            {duration && (
                                                <div className="actlog__detail-item actlog__detail-item--accent">
                                                    <span className="actlog__detail-icon">⏳</span>
                                                    <div className="actlog__detail-content">
                                                        <span className="actlog__detail-label">{t("sessionDuration")}</span>
                                                        <span className="actlog__detail-value actlog__detail-value--green">{duration}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {log.browser && (
                                                <div className="actlog__detail-item">
                                                    <span className="actlog__detail-icon">🌐</span>
                                                    <div className="actlog__detail-content">
                                                        <span className="actlog__detail-label">{t("browserDevice")}</span>
                                                        <span className="actlog__detail-value">{log.browser}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {log.ipAddress && (
                                                <div className="actlog__detail-item">
                                                    <span className="actlog__detail-icon">📡</span>
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

            {showDeleteModal && (
                <div className="actlog__modal-overlay" onClick={() => setShowDeleteModal(null)}>
                    <div className="actlog__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="actlog__modal-icon actlog__modal-icon--red">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                        </div>
                        <h3 className="actlog__modal-title">{t("deleteLogTitle")}</h3>
                        <p className="actlog__modal-msg">{t("deleteLogMsg")}</p>
                        <div className="actlog__modal-actions">
                            <button className="actlog__modal-cancel" onClick={() => setShowDeleteModal(null)}>
                                {t("cancel")}
                            </button>
                            <button className="actlog__modal-confirm actlog__modal-confirm--red" onClick={handleDeleteLog}>
                                {deletingId ? t("deleting") : t("yesDelete")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteAllModal && (
                <div className="actlog__modal-overlay" onClick={() => setShowDeleteAllModal(false)}>
                    <div className="actlog__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="actlog__modal-icon actlog__modal-icon--red">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                        </div>
                        <h3 className="actlog__modal-title">{t("deleteAllLogsTitle")}</h3>
                        <p className="actlog__modal-msg">{t("deleteAllLogsMsg")}</p>
                        <div className="actlog__modal-actions">
                            <button className="actlog__modal-cancel" onClick={() => setShowDeleteAllModal(false)}>
                                {t("cancel")}
                            </button>
                            <button className="actlog__modal-confirm actlog__modal-confirm--red" onClick={handleDeleteAll}>
                                {deletingAll ? t("deleting") : t("yesDeleteAll")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ActivityLogs;