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
        <div className="actlog__page">
            <div className="actlog__orb actlog__orb--1" />
            <div className="actlog__orb actlog__orb--2" />
            <div className="actlog__orb actlog__orb--3" />

            {/* Grid lines decoration */}
            <div className="actlog__grid-lines" />

            {/* Back */}
            <button className="actlog__back-btn" onClick={() => navigate("/admin-dashboard")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("back")}
            </button>

            {/* Header */}
            <div className="actlog__header">
                <div className="actlog__eyebrow">
                    <span className="actlog__eyebrow-pulse" />
                    <span className="actlog__eyebrow-text">{t("activityLogs")}</span>
                </div>
                <h1 className="actlog__title">
                    <span className="actlog__title-main">Activity</span>
                    <span className="actlog__title-accent"> Logs</span>
                </h1>
                <p className="actlog__subtitle">Track every login and logout across your system</p>
            </div>

            {/* Stats Row */}
            <div className="actlog__stats">
                <div className="actlog__stat actlog__stat--total">
                    <div className="actlog__stat-icon-wrap actlog__stat-icon-wrap--blue">
                        <span className="actlog__stat-icon">📋</span>
                    </div>
                    <div className="actlog__stat-info">
                        <span className="actlog__stat-num">{logs.length}</span>
                        <span className="actlog__stat-label">Total Logs</span>
                    </div>
                    <div className="actlog__stat-glow actlog__stat-glow--blue" />
                </div>
                <div className="actlog__stat actlog__stat--login">
                    <div className="actlog__stat-icon-wrap actlog__stat-icon-wrap--green">
                        <span className="actlog__stat-icon">🔓</span>
                    </div>
                    <div className="actlog__stat-info">
                        <span className="actlog__stat-num">{loginCount}</span>
                        <span className="actlog__stat-label">Logins</span>
                    </div>
                    <div className="actlog__stat-glow actlog__stat-glow--green" />
                </div>
                <div className="actlog__stat actlog__stat--logout">
                    <div className="actlog__stat-icon-wrap actlog__stat-icon-wrap--red">
                        <span className="actlog__stat-icon">🔒</span>
                    </div>
                    <div className="actlog__stat-info">
                        <span className="actlog__stat-num">{logoutCount}</span>
                        <span className="actlog__stat-label">Logouts</span>
                    </div>
                    <div className="actlog__stat-glow actlog__stat-glow--red" />
                </div>
                <div className="actlog__stat actlog__stat--users">
                    <div className="actlog__stat-icon-wrap actlog__stat-icon-wrap--purple">
                        <span className="actlog__stat-icon">👥</span>
                    </div>
                    <div className="actlog__stat-info">
                        <span className="actlog__stat-num">{uniqueUsers}</span>
                        <span className="actlog__stat-label">Unique Users</span>
                    </div>
                    <div className="actlog__stat-glow actlog__stat-glow--purple" />
                </div>
            </div>

            {/* Controls */}
            <div className="actlog__controls">
                <div className="actlog__search-wrap">
                    <svg className="actlog__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="actlog__search"
                        type="text"
                        placeholder="Search by user, IP, browser..."
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
                            {f === "all" ? "All" : f === "login" ? "🔓 Logins" : "🔒 Logouts"}
                        </button>
                    ))}
                </div>

                <button className="actlog__export-btn" onClick={exportCSV}>
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
                <p className="actlog__result-count">
                    Showing <span>{filtered.length}</span> of <span>{logs.length}</span> logs
                </p>
            )}

            {/* Loading */}
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

            {/* Empty */}
            {!loading && filtered.length === 0 && (
                <div className="actlog__empty">
                    <span className="actlog__empty-icon">📭</span>
                    <p>No activity logs found</p>
                </div>
            )}

            {/* Logs Timeline */}
            {!loading && filtered.length > 0 && (
                <div className="actlog__timeline">
                    {filtered.map((log, index) => {
                        const isLogin = log.action === "login";
                        const isExpanded = expandedLog === log.docId;
                        const duration = getSessionDuration(log.loginTime, log.logoutTime);

                        return (
                            <div
                                key={log.docId}
                                className={`actlog__entry ${isLogin ? "actlog__entry--login" : "actlog__entry--logout"} ${isExpanded ? "actlog__entry--expanded" : ""}`}
                                style={{ animationDelay: `${index * 30}ms` }}
                                onClick={() => setExpandedLog(isExpanded ? null : log.docId)}
                            >
                                {/* Main row */}
                                <div className="actlog__entry-main">
                                    <div className="actlog__entry-left">
                                        <span className={`actlog__badge ${isLogin ? "actlog__badge--login" : "actlog__badge--logout"}`}>
                                            <span className="actlog__badge-dot" />
                                            {isLogin ? "LOGIN" : "LOGOUT"}
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
                                        <svg className={`actlog__chevron ${isExpanded ? "actlog__chevron--open" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {isExpanded && (
                                    <div className="actlog__entry-details">
                                        <div className="actlog__detail-grid">

                                            <div className="actlog__detail-item">
                                                <span className="actlog__detail-icon">🪪</span>
                                                <div className="actlog__detail-content">
                                                    <span className="actlog__detail-label">User ID</span>
                                                    <span className="actlog__detail-value">{log.userId || "—"}</span>
                                                </div>
                                            </div>

                                            <div className="actlog__detail-item">
                                                <span className="actlog__detail-icon">👤</span>
                                                <div className="actlog__detail-content">
                                                    <span className="actlog__detail-label">User Name</span>
                                                    <span className="actlog__detail-value">{log.userName || "—"}</span>
                                                </div>
                                            </div>

                                            <div className="actlog__detail-item">
                                                <span className="actlog__detail-icon">🔓</span>
                                                <div className="actlog__detail-content">
                                                    <span className="actlog__detail-label">Login Time</span>
                                                    <span className="actlog__detail-value">{formatDateTime(log.loginTime)}</span>
                                                </div>
                                            </div>

                                            <div className="actlog__detail-item">
                                                <span className="actlog__detail-icon">🔒</span>
                                                <div className="actlog__detail-content">
                                                    <span className="actlog__detail-label">Logout Time</span>
                                                    <span className="actlog__detail-value">{formatDateTime(log.logoutTime)}</span>
                                                </div>
                                            </div>

                                            <div className="actlog__detail-item">
                                                <span className="actlog__detail-icon">⏱️</span>
                                                <div className="actlog__detail-content">
                                                    <span className="actlog__detail-label">Last Active</span>
                                                    <span className="actlog__detail-value">{formatDateTime(log.lastActive)}</span>
                                                </div>
                                            </div>

                                            {duration && (
                                                <div className="actlog__detail-item actlog__detail-item--accent">
                                                    <span className="actlog__detail-icon">⏳</span>
                                                    <div className="actlog__detail-content">
                                                        <span className="actlog__detail-label">Session Duration</span>
                                                        <span className="actlog__detail-value actlog__detail-value--green">{duration}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {log.browser && (
                                                <div className="actlog__detail-item">
                                                    <span className="actlog__detail-icon">🌐</span>
                                                    <div className="actlog__detail-content">
                                                        <span className="actlog__detail-label">Device / Browser</span>
                                                        <span className="actlog__detail-value">{log.browser}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {log.ipAddress && (
                                                <div className="actlog__detail-item">
                                                    <span className="actlog__detail-icon">📡</span>
                                                    <div className="actlog__detail-content">
                                                        <span className="actlog__detail-label">IP Address</span>
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
    );
}

export default ActivityLogs;