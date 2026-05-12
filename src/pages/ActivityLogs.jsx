import React, { useEffect, useState } from "react";
import "./ActivityLogs.css";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
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
        fetchLogs();
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

    const exportCSV = () => {
        const headers = ["User ID", "User Name", "Action", "Login Time", "Logout Time", "Last Active", "Browser", "IP Address"];
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
        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
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
        <div className="alog__page">
            <div className="alog__orb alog__orb--1" />
            <div className="alog__orb alog__orb--2" />
            <div className="alog__orb alog__orb--3" />

            {/* Back */}
            <button className="alog__back-btn" onClick={() => navigate("/admin-dashboard")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("back")}
            </button>

            {/* Header */}
            <div className="alog__header">
                <div className="alog__eyebrow">
                    <span className="alog__eyebrow-dot" />
                    <span>{t("activityLogs")}</span>
                </div>
                <h1 className="alog__title">{t("activityLogs")}</h1>
                <p className="alog__subtitle">Track every login and logout across your system</p>
            </div>

            {/* Stats Row */}
            <div className="alog__stats">
                <div className="alog__stat alog__stat--total">
                    <span className="alog__stat-icon">📋</span>
                    <div>
                        <span className="alog__stat-num">{logs.length}</span>
                        <span className="alog__stat-label">Total Logs</span>
                    </div>
                </div>
                <div className="alog__stat alog__stat--login">
                    <span className="alog__stat-icon">🔓</span>
                    <div>
                        <span className="alog__stat-num">{loginCount}</span>
                        <span className="alog__stat-label">Logins</span>
                    </div>
                </div>
                <div className="alog__stat alog__stat--logout">
                    <span className="alog__stat-icon">🔒</span>
                    <div>
                        <span className="alog__stat-num">{logoutCount}</span>
                        <span className="alog__stat-label">Logouts</span>
                    </div>
                </div>
                <div className="alog__stat alog__stat--users">
                    <span className="alog__stat-icon">👥</span>
                    <div>
                        <span className="alog__stat-num">{uniqueUsers}</span>
                        <span className="alog__stat-label">Unique Users</span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="alog__controls">
                <div className="alog__search-wrap">
                    <svg className="alog__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="alog__search"
                        type="text"
                        placeholder="Search by user, IP, browser..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && <button className="alog__search-clear" onClick={() => setSearch("")}>✕</button>}
                </div>

                <div className="alog__filters">
                    {["all", "login", "logout"].map((f) => (
                        <button
                            key={f}
                            className={`alog__filter-btn ${filterType === f ? "alog__filter-btn--active" : ""}`}
                            onClick={() => setFilterType(f)}
                        >
                            {f === "all" ? "All" : f === "login" ? "🔓 Logins" : "🔒 Logouts"}
                        </button>
                    ))}
                </div>

                <button className="alog__export-btn" onClick={exportCSV}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export CSV
                </button>
            </div>

            {/* Count */}
            {!loading && (
                <p className="alog__result-count">
                    Showing <span>{filtered.length}</span> of <span>{logs.length}</span> logs
                </p>
            )}

            {/* Loading */}
            {loading && (
                <div className="alog__loading">
                    <div className="alog__loader">
                        <div className="alog__loader-ring" />
                        <div className="alog__loader-ring alog__loader-ring--2" />
                        <div className="alog__loader-core" />
                    </div>
                    <p>{t("loading")}</p>
                </div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
                <div className="alog__empty">
                    <span>📭</span>
                    <p>No activity logs found</p>
                </div>
            )}

            {/* Logs Timeline */}
            {!loading && filtered.length > 0 && (
                <div className="alog__timeline">
                    {filtered.map((log, index) => {
                        const isLogin = log.action === "login";
                        const isExpanded = expandedLog === log.docId;
                        const duration = getSessionDuration(log.loginTime, log.logoutTime);

                        return (
                            <div
                                key={log.docId}
                                className={`alog__entry ${isLogin ? "alog__entry--login" : "alog__entry--logout"} ${isExpanded ? "alog__entry--expanded" : ""}`}
                                style={{ animationDelay: `${index * 30}ms` }}
                                onClick={() => setExpandedLog(isExpanded ? null : log.docId)}
                            >
                                {/* Timeline dot */}
                                <div className="alog__entry-dot">
                                    <div className="alog__entry-dot-inner" />
                                </div>

                                {/* Main row */}
                                <div className="alog__entry-main">
                                    <div className="alog__entry-left">
                                        <span className={`alog__action-badge ${isLogin ? "alog__action-badge--login" : "alog__action-badge--logout"}`}>
                                            {isLogin ? "🔓 LOGIN" : "🔒 LOGOUT"}
                                        </span>
                                        <div className="alog__entry-user">
                                            <span className="alog__entry-name">{log.userName || log.userId}</span>
                                            <span className="alog__entry-id">#{log.userId}</span>
                                        </div>
                                    </div>
                                    <div className="alog__entry-right">
                                        <span className="alog__entry-date">{formatDate(log.timestamp)}</span>
                                        <span className="alog__entry-time">{formatTime(log.timestamp)}</span>
                                        <svg className={`alog__chevron ${isExpanded ? "alog__chevron--open" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {isExpanded && (
                                    <div className="alog__entry-details">
                                        <div className="alog__detail-grid">

                                            <div className="alog__detail-item">
                                                <span className="alog__detail-icon">🪪</span>
                                                <div>
                                                    <span className="alog__detail-label">User ID</span>
                                                    <span className="alog__detail-value">{log.userId || "—"}</span>
                                                </div>
                                            </div>

                                            <div className="alog__detail-item">
                                                <span className="alog__detail-icon">👤</span>
                                                <div>
                                                    <span className="alog__detail-label">User Name</span>
                                                    <span className="alog__detail-value">{log.userName || "—"}</span>
                                                </div>
                                            </div>

                                            <div className="alog__detail-item">
                                                <span className="alog__detail-icon">🔓</span>
                                                <div>
                                                    <span className="alog__detail-label">Login Time</span>
                                                    <span className="alog__detail-value">{formatDateTime(log.loginTime)}</span>
                                                </div>
                                            </div>

                                            <div className="alog__detail-item">
                                                <span className="alog__detail-icon">🔒</span>
                                                <div>
                                                    <span className="alog__detail-label">Logout Time</span>
                                                    <span className="alog__detail-value">{formatDateTime(log.logoutTime)}</span>
                                                </div>
                                            </div>

                                            <div className="alog__detail-item">
                                                <span className="alog__detail-icon">⏱️</span>
                                                <div>
                                                    <span className="alog__detail-label">Last Active</span>
                                                    <span className="alog__detail-value">{formatDateTime(log.lastActive)}</span>
                                                </div>
                                            </div>

                                            {duration && (
                                                <div className="alog__detail-item">
                                                    <span className="alog__detail-icon">⏳</span>
                                                    <div>
                                                        <span className="alog__detail-label">Session Duration</span>
                                                        <span className="alog__detail-value alog__detail-value--accent">{duration}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {log.browser && (
                                                <div className="alog__detail-item">
                                                    <span className="alog__detail-icon">🌐</span>
                                                    <div>
                                                        <span className="alog__detail-label">Device / Browser</span>
                                                        <span className="alog__detail-value">{log.browser}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {log.ipAddress && (
                                                <div className="alog__detail-item">
                                                    <span className="alog__detail-icon">📡</span>
                                                    <div>
                                                        <span className="alog__detail-label">IP Address</span>
                                                        <span className="alog__detail-value alog__detail-value--mono">{log.ipAddress}</span>
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
    );
}

export default ActivityLogs;