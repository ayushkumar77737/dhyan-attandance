import React, { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import "./AdminLogs.css";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    getDoc,
    doc,
    deleteDoc,
    writeBatch,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";

const icons = {
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    ),
    pulse: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    ),
    admins: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    today: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
    danger: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    search: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    ),
    refresh: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
    ),
    download: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    ),
    trash: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
        </svg>
    ),
};

const getActionMeta = (action) => {
    const a = (action || "").toLowerCase();
    if (a.includes("delete") || a.includes("remove")) return { cat: "delete", emoji: "🗑️" };
    if (a.includes("create") || a.includes("add")) return { cat: "create", emoji: "➕" };
    if (a.includes("update") || a.includes("edit") || a.includes("toggle")) return { cat: "update", emoji: "✎" };
    if (a.includes("login") || a.includes("logout") || a.includes("auth")) return { cat: "auth", emoji: "🔑" };
    return { cat: "other", emoji: "•" };
};

const humanize = (s) =>
    (s || "—")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

function AdminLogs() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const unsubRef = useRef(null);

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [filterAdmin, setFilterAdmin] = useState("all");
    const [filterAction, setFilterAction] = useState("all");
    const todayStr = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    const [dateFrom, setDateFrom] = useState(todayStr);
    const [dateTo, setDateTo] = useState(todayStr);

    const [confirmModal, setConfirmModal] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const checkAdmin = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) { navigate("/"); return false; }
        try {
            const userRef = doc(db, "users", localStorage.getItem("userId"));
            const userSnap = await getDoc(userRef);
            if (
                !userSnap.exists() ||
                userSnap.data().role !== "admin" ||
                userSnap.data().uid !== auth.currentUser.uid
            ) {
                navigate("/");
                return false;
            }
            return true;
        } catch (err) { console.error(err); navigate("/"); return false; }
    };

    const subscribe = () => {
        setLoading(true);
        if (!auth.currentUser) {
            navigate("/");
            return;
        }
        const q = query(collection(db, "adminLogs"), orderBy("timestamp", "desc"), limit(300));
        unsubRef.current = onSnapshot(
            q,
            (snap) => {
                const list = [];
                snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
                setLogs(list);
                setLoading(false);
            },
            (err) => { console.error(err); setLoading(false); }
        );
    };

    useEffect(() => {
        const disableRightClick = (e) => e.preventDefault();
        const disableInspectKeys = (e) => {
            if (e.key === "F12") e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) e.preventDefault();
            if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
        };
        document.addEventListener("contextmenu", disableRightClick);
        document.addEventListener("keydown", disableInspectKeys);

        (async () => {
            const ok = await checkAdmin();
            if (ok) subscribe();
        })();

        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
            if (unsubRef.current) unsubRef.current();
        };
    }, []);

    const toDate = (ts) => (ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null);

    const formatTime = (ts) => {
        const d = toDate(ts);
        if (!d || isNaN(d)) return "—";
        return d.toLocaleString("en-IN", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
        });
    };

    const timeAgo = (ts) => {
        const d = toDate(ts);
        if (!d || isNaN(d)) return "";
        const diff = Math.floor((Date.now() - d.getTime()) / 1000);
        if (diff < 60) return t("alJustNow");
        if (diff < 3600) return t("alMinutesAgo", { n: Math.floor(diff / 60) });
        if (diff < 86400) return t("alHoursAgo", { n: Math.floor(diff / 3600) });
        return t("alDaysAgo", { n: Math.floor(diff / 86400) });
    };

    const dateKey = (ts) => {
        const d = toDate(ts);
        if (!d || isNaN(d)) return "";
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    const adminOptions = useMemo(() => {
        const set = new Map();
        logs.forEach((l) => {
            const id = l.adminId || l.userId;
            if (id && !set.has(id)) set.set(id, l.adminName || id);
        });
        return Array.from(set, ([id, name]) => ({ id, name }));
    }, [logs]);

    const filtered = useMemo(() => {
        return logs.filter((l) => {
            const adminId = l.adminId || l.userId || "";
            const meta = getActionMeta(l.action);
            if (filterAdmin !== "all" && adminId !== filterAdmin) return false;
            if (filterAction !== "all" && meta.cat !== filterAction) return false;
            const dk = dateKey(l.timestamp);
            if (dateFrom && dk && dk < dateFrom) return false;
            if (dateTo && dk && dk > dateTo) return false;
            if (search.trim()) {
                const q = search.toLowerCase();
                const hay = `${adminId} ${l.adminName || ""} ${l.action || ""} ${l.targetId || ""} ${l.details || ""}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [logs, filterAdmin, filterAction, dateFrom, dateTo, search]);

    const stats = useMemo(() => {
        const now = new Date();
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const admins = new Set();
        let today = 0, critical = 0;
        logs.forEach((l) => {
            admins.add(l.adminId || l.userId);
            if (dateKey(l.timestamp) === todayKey) today++;
            if (getActionMeta(l.action).cat === "delete") critical++;
        });
        return { total: logs.length, admins: admins.size, today, critical };
    }, [logs]);

    const feed = useMemo(() => filtered.slice(0, 12), [filtered]);

    const hasFilters = search || filterAdmin !== "all" || filterAction !== "all" || dateFrom || dateTo;
    const clearFilters = () => {
        setSearch(""); setFilterAdmin("all"); setFilterAction("all"); setDateFrom(""); setDateTo("");
    };

    const exportCSV = () => {
        const headers = ["Admin ID", "Admin Name", "Action", "Category", "Target", "Details", "Time"];
        const rows = filtered.map((l) => {
            const d = toDate(l.timestamp);
            return [
                l.adminId || l.userId || "",
                l.adminName || "",
                l.action || "",
                getActionMeta(l.action).cat,
                l.targetId || "",
                `"${(l.details || "").replace(/"/g, '""')}"`,
                d ? d.toLocaleString("en-IN") : "",
            ];
        });
        const csv = [headers, ...rows]
            .map((r) =>
                r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
            )
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `admin-logs-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const askDeleteOne = (id) => setConfirmModal({ type: "one", id });
    const askDeleteAll = () => {
        if (filtered.length === 0) return;
        setConfirmModal({ type: "all", count: filtered.length });
    };

    const confirmDelete = async () => {
        if (!confirmModal) return;
        setDeleting(true);
        try {
            if (confirmModal.type === "one") {
                await deleteDoc(doc(db, "adminLogs", confirmModal.id));
            } else {
                const target = filtered;
                for (let i = 0; i < target.length; i += 450) {
                    const chunk = target.slice(i, i + 450);
                    const batch = writeBatch(db);
                    chunk.forEach((l) => batch.delete(doc(db, "adminLogs", l.id)));
                    await batch.commit();
                }
            }
            setConfirmModal(null);
        } catch (err) {
            console.error(err);
            alert(confirmModal.type === "one" ? t("alDeleteFailed") : t("alBulkDeleteFailed"));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="aamon__page" data-theme={theme}>
            <div className="aamon__grid-bg" />
            <div className="aamon__orb aamon__orb--1" />
            <div className="aamon__orb aamon__orb--2" />
            <div className="aamon__orb aamon__orb--3" />

            <button className="aamon__back" onClick={() => navigate("/admin-dashboard")}>
                {icons.back}{t("back")}
            </button>

            <div className="aamon__header">
                <div className="aamon__eyebrow">
                    <span className="aamon__eyebrow-dot" />
                    {t("alMonitorBadge")}
                </div>
                <h1 className="aamon__title">
                    {t("alTitleMain")} <span className="aamon__title-accent">{t("alTitleAccent")}</span>
                </h1>
                <p className="aamon__subtitle">{t("alSubtitle")}</p>
            </div>

            <div className="aamon__stats">
                <div className="aamon__stat aamon__stat--blue">
                    <div className="aamon__stat-icon">{icons.pulse}</div>
                    <div className="aamon__stat-body">
                        <span className="aamon__stat-num">{loading ? "—" : stats.total}</span>
                        <span className="aamon__stat-lbl">{t("alTotalActions")}</span>
                    </div>
                </div>
                <div className="aamon__stat aamon__stat--purple">
                    <div className="aamon__stat-icon">{icons.admins}</div>
                    <div className="aamon__stat-body">
                        <span className="aamon__stat-num">{loading ? "—" : stats.admins}</span>
                        <span className="aamon__stat-lbl">{t("alActiveAdmins")}</span>
                    </div>
                </div>
                <div className="aamon__stat aamon__stat--green">
                    <div className="aamon__stat-icon">{icons.today}</div>
                    <div className="aamon__stat-body">
                        <span className="aamon__stat-num">{loading ? "—" : stats.today}</span>
                        <span className="aamon__stat-lbl">{t("alTodayActions")}</span>
                    </div>
                </div>
                <div className="aamon__stat aamon__stat--red">
                    <div className="aamon__stat-icon">{icons.danger}</div>
                    <div className="aamon__stat-body">
                        <span className="aamon__stat-num">{loading ? "—" : stats.critical}</span>
                        <span className="aamon__stat-lbl">{t("alCriticalActions")}</span>
                    </div>
                </div>
            </div>

            <div className="aamon__filters">
                <div className="aamon__search-wrap">
                    <span className="aamon__search-icon">{icons.search}</span>
                    <input
                        className="aamon__search"
                        type="text"
                        placeholder={t("alSearchPlaceholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && <button className="aamon__search-clear" onClick={() => setSearch("")}>✕</button>}
                </div>

                <select className="aamon__select" value={filterAdmin} onChange={(e) => setFilterAdmin(e.target.value)}>
                    <option value="all">{t("alAllAdmins")}</option>
                    {adminOptions.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                    ))}
                </select>

                <select className="aamon__select" value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
                    <option value="all">{t("alAllActions")}</option>
                    <option value="create">{t("alActionCreate")}</option>
                    <option value="update">{t("alActionUpdate")}</option>
                    <option value="delete">{t("alActionDelete")}</option>
                    <option value="auth">{t("alActionAuth")}</option>
                    <option value="other">{t("alActionOther")}</option>
                </select>

                <div className="aamon__date-group">
                    <input type="date" className="aamon__date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} title={t("alDateFrom")} />
                    <span className="aamon__date-sep">→</span>
                    <input type="date" className="aamon__date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} title={t("alDateTo")} />
                </div>

                {hasFilters && (
                    <button className="aamon__clear-btn" onClick={clearFilters}>✕ {t("alClearFilters")}</button>
                )}

                <button className="aamon__icon-btn" onClick={subscribe} title={t("alRefresh")}>{icons.refresh}</button>
                <button className="aamon__export-btn" onClick={exportCSV} disabled={filtered.length === 0}>
                    {icons.download}{t("exportCsv")}
                </button>
                <button className="aamon__delete-all-btn" onClick={askDeleteAll} disabled={filtered.length === 0}>
                    {icons.trash}{t("alDeleteAll")}
                </button>
            </div>

            <div className="aamon__main">

                {/* Audit Table */}
                <div className="aamon__table-card">
                    <div className="aamon__card-head">
                        <span className="aamon__card-title">{t("alAuditLog")}</span>
                        {!loading && <span className="aamon__count-pill">{filtered.length}</span>}
                    </div>

                    {loading ? (
                        <div className="aamon__loading">
                            <div className="aamon__ring" />
                            <p>{t("alLoading")}</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="aamon__empty">
                            <span className="aamon__empty-icon">🛡️</span>
                            <p>{t("alNoLogs")}</p>
                        </div>
                    ) : (
                        <div className="aamon__table-wrap">
                            <table className="aamon__table">
                                <thead>
                                    <tr>
                                        <th>{t("alHash")}</th>
                                        <th>{t("alAdmin")}</th>
                                        <th>{t("alAction")}</th>
                                        <th>{t("alTarget")}</th>
                                        <th>{t("alDetails")}</th>
                                        <th>{t("alTime")}</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((l, i) => {
                                        const meta = getActionMeta(l.action);
                                        const adminId = l.adminId || l.userId || "—";
                                        return (
                                            <tr key={l.id} className="aamon__row">
                                                <td className="aamon__td-num">{i + 1}</td>
                                                <td>
                                                    <div className="aamon__admin-cell">
                                                        <div className="aamon__avatar">{(l.adminName || adminId).charAt(0).toUpperCase()}</div>
                                                        <div className="aamon__admin-info">
                                                            <span className="aamon__admin-name">{l.adminName || adminId}</span>
                                                            <span className="aamon__admin-id">{adminId}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`aamon__badge aamon__badge--${meta.cat}`}>
                                                        {meta.emoji} {humanize(l.action)}
                                                    </span>
                                                </td>
                                                <td><span className="aamon__target">{l.targetId || "—"}</span></td>
                                                <td><span className="aamon__details">{l.details || "—"}</span></td>
                                                <td><span className="aamon__time">{formatTime(l.timestamp)}</span></td>
                                                <td>
                                                    <button
                                                        className="aamon__row-del"
                                                        onClick={() => askDeleteOne(l.id)}
                                                        title={t("alDeleteLog")}
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="aamon__feed-card">
                    <div className="aamon__card-head">
                        <span className="aamon__card-title">
                            <span className="aamon__live-dot" /> {t("alLiveFeed")}
                        </span>
                    </div>
                    {loading ? (
                        <div className="aamon__loading aamon__loading--sm"><div className="aamon__ring" /></div>
                    ) : feed.length === 0 ? (
                        <div className="aamon__feed-empty">
                            <span>📡</span>
                            <p>{t("alNoActivity")}</p>
                        </div>
                    ) : (
                        <div className="aamon__feed-list">
                            {feed.map((l, i) => {
                                const meta = getActionMeta(l.action);
                                return (
                                    <div key={l.id} className="aamon__feed-item" style={{ animationDelay: `${i * 40}ms` }}>
                                        <div className={`aamon__feed-icon aamon__feed-icon--${meta.cat}`}>{meta.emoji}</div>
                                        <div className="aamon__feed-body">
                                            <p className="aamon__feed-text">
                                                <strong>{l.adminName || l.adminId || l.userId}</strong> · {humanize(l.action)}
                                            </p>
                                            <span className="aamon__feed-time">{timeAgo(l.timestamp)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {confirmModal && createPortal(
                <div className="aamon__modal-overlay" data-theme={theme} onClick={() => !deleting && setConfirmModal(null)}>
                    <div className="aamon__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="aamon__modal-icon">{icons.trash}</div>
                        <h3 className="aamon__modal-title">
                            {confirmModal.type === "one" ? t("alDeleteLogTitle") : t("alDeleteAllTitle")}
                        </h3>
                        <p className="aamon__modal-msg">
                            {confirmModal.type === "one"
                                ? t("alDeleteLogMsg")
                                : t("alDeleteAllMsg", { count: confirmModal.count })}
                        </p>
                        <div className="aamon__modal-actions">
                            <button className="aamon__modal-cancel" onClick={() => setConfirmModal(null)} disabled={deleting}>
                                {t("cancel")}
                            </button>
                            <button className="aamon__modal-confirm" onClick={confirmDelete} disabled={deleting}>
                                {deleting ? t("deleting") : (confirmModal.type === "one" ? t("alDeleteLog") : t("alDeleteAll"))}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default AdminLogs;