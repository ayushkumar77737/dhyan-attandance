import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    writeBatch,
    getDoc
} from "firebase/firestore";
import "./BlockedAccounts.css";
import { logAdminAction } from "../utils/logAdminAction";

const BlockedAccounts = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [records, setRecords] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("attempts");
    const [filterStatus, setFilterStatus] = useState("all");
    const [toast, setToast] = useState(null);
    const [resetting, setResetting] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [deletingAll, setDeletingAll] = useState(false);
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
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

            fetchData();

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
        let result = [...records];
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter((r) => r.id.toLowerCase().includes(q));
        }
        if (filterStatus === "locked") result = result.filter((r) => isLocked(r.lockUntil));
        else if (filterStatus === "active") result = result.filter((r) => !isLocked(r.lockUntil) && r.attempts > 0);
        else if (filterStatus === "clean") result = result.filter((r) => r.attempts === 0);
        if (sortBy === "attempts") result.sort((a, b) => b.attempts - a.attempts);
        else if (sortBy === "id") result.sort((a, b) => a.id.localeCompare(b.id));
        else if (sortBy === "status") result.sort((a, b) => isLocked(b.lockUntil) - isLocked(a.lockUntil));
        setFiltered(result);
    }, [search, sortBy, filterStatus, records]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const snap = await getDocs(collection(db, "loginAttempts"));
            const list = [];
            snap.forEach((docItem) => {
                list.push({ id: docItem.id, ...docItem.data() });
            });
            setRecords(list);
        } catch (err) {
            console.error(err);
            showToast(t("blockedAccounts.toast.fetchFailed"), "error");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (userId) => {
        try {
            setResetting(userId);
            if (!userId) {
                return;
            }
            await updateDoc(doc(db, "loginAttempts", userId), {
                attempts: 0,
                lockUntil: null,
            });
            await logAdminAction("update_blocked_account", {
                targetId: userId,
                details: t("logResetBlockedAccount", { id: userId }),
            });
            setRecords((prev) =>
                prev.map((r) => r.id === userId ? { ...r, attempts: 0, lockUntil: null } : r)
            );
            showToast(t("blockedAccounts.toast.resetSuccess", { userId }));
        } catch (err) {
            console.error(err);
            showToast(t("blockedAccounts.toast.resetFailed"), "error");
        } finally {
            setResetting(null);
        }
    };

    const handleDelete = async (userId) => {
        try {
            setDeleting(userId);
            if (!userId) {
                return;
            }
            await deleteDoc(doc(db, "loginAttempts", userId));
            await logAdminAction("delete_blocked_account", {
                targetId: userId,
                details: t("logDeletedBlockedAccount", { id: userId }),
            });
            setRecords((prev) => prev.filter((r) => r.id !== userId));
            showToast(t("blockedAccounts.toast.deleteSuccess", { userId }));
        } catch (err) {
            console.error(err);
            showToast(t("blockedAccounts.toast.deleteFailed"), "error");
        } finally {
            setDeleting(null);
            setConfirmDeleteId(null);
        }
    };

    const handleDeleteAll = async () => {
        try {
            setDeletingAll(true);
            if (filtered.length === 0) {
                return;
            }
            const batch = writeBatch(db);
            filtered.forEach((record) => {
                batch.delete(doc(db, "loginAttempts", record.id));
            });
            await batch.commit();
            await logAdminAction("delete_all_blocked_accounts", {
                details: t("logDeletedAllBlockedAccounts", { count: filtered.length }),
            });
            const deletedIds = new Set(filtered.map((r) => r.id));
            setRecords((prev) => prev.filter((r) => !deletedIds.has(r.id)));
            showToast(t("blockedAccounts.toast.deleteAllSuccess", { count: filtered.length }));
        } catch (err) {
            console.error(err);
            showToast(t("blockedAccounts.toast.deleteAllFailed"), "error");
        } finally {
            setDeletingAll(false);
            setConfirmDeleteAll(false);
        }
    };

    const isLocked = (lockUntil) => {
        if (!lockUntil) return false;
        const lockDate = lockUntil?.toDate ? lockUntil.toDate() : new Date(lockUntil);
        return lockDate > new Date();
    };

    const formatLockUntil = (lockUntil) => {
        if (!lockUntil) return "—";
        const d = lockUntil?.toDate ? lockUntil.toDate() : new Date(lockUntil);
        if (isNaN(d)) return "—";
        return d.toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    };

    const getLockRemaining = (lockUntil) => {
        if (!lockUntil) return null;
        const d = lockUntil?.toDate ? lockUntil.toDate() : new Date(lockUntil);
        const diff = d - new Date();
        if (diff <= 0) return null;
        const mins = Math.floor(diff / 60000);
        const hrs = Math.floor(mins / 60);
        if (hrs > 0) return t("blockedAccounts.remaining.hoursMinutes", { hours: hrs, minutes: mins % 60 });
        return t("blockedAccounts.remaining.minutesOnly", { minutes: mins });
    };

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const totalLocked = records.filter((r) => isLocked(r.lockUntil)).length;
    const highRisk = records.filter((r) => r.attempts >= 3 && !isLocked(r.lockUntil)).length;
    const totalAttempts = records.reduce((sum, r) => sum + (r.attempts || 0), 0);

    const getAttemptColor = (attempts) => {
        if (attempts === 0) return "ba-dot--clean";
        if (attempts <= 2) return "ba-dot--warn";
        return "ba-dot--danger";
    };

    return (
        <div className="ba-wrapper">
            <div className="ba-orb ba-orb--1" />
            <div className="ba-orb ba-orb--2" />
            <div className="ba-orb ba-orb--3" />

            {toast && (
                <div className={`ba-toast ${toast.type === "error" ? "ba-toast--error" : "ba-toast--success"}`}>
                    {toast.type === "success" ? "✓" : "✕"} {toast.msg}
                </div>
            )}

            {confirmDeleteId && (
                <div className="ba-modal-overlay" onClick={() => setConfirmDeleteId(null)}>
                    <div className="ba-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ba-modal-icon">🗑️</div>
                        <h3 className="ba-modal-title">{t("blockedAccounts.modal.deleteSingle.title")}</h3>
                        <p className="ba-modal-desc">
                            {t("blockedAccounts.modal.deleteSingle.description")}<br />
                            <span className="ba-modal-id">{confirmDeleteId}</span>
                        </p>
                        <div className="ba-modal-actions">
                            <button className="ba-modal-cancel" onClick={() => setConfirmDeleteId(null)}>
                                {t("blockedAccounts.modal.deleteSingle.cancel")}
                            </button>
                            <button
                                className="ba-modal-confirm"
                                onClick={() => handleDelete(confirmDeleteId)}
                                disabled={deleting === confirmDeleteId}
                            >
                                {deleting === confirmDeleteId
                                    ? <span className="ba-spinner" />
                                    : t("blockedAccounts.modal.deleteSingle.confirm")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDeleteAll && (
                <div className="ba-modal-overlay" onClick={() => setConfirmDeleteAll(false)}>
                    <div className="ba-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ba-modal-icon">⚠️</div>
                        <h3 className="ba-modal-title">{t("blockedAccounts.modal.deleteAll.title")}</h3>
                        <p className="ba-modal-desc">
                            {t("blockedAccounts.modal.deleteAll.description")}{" "}
                            <span className="ba-modal-count">{filtered.length}</span>{" "}
                            {t("blockedAccounts.modal.deleteAll.descriptionSuffix")}
                        </p>
                        <div className="ba-modal-actions">
                            <button className="ba-modal-cancel" onClick={() => setConfirmDeleteAll(false)}>
                                {t("blockedAccounts.modal.deleteAll.cancel")}
                            </button>
                            <button
                                className="ba-modal-confirm ba-modal-confirm--danger"
                                onClick={handleDeleteAll}
                                disabled={deletingAll}
                            >
                                {deletingAll
                                    ? <span className="ba-spinner" />
                                    : `${t("blockedAccounts.modal.deleteAll.confirm")} (${filtered.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button className="ba-back-btn ba-back-btn--fixed" onClick={() => navigate("/admin-dashboard")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("blockedAccounts.back")}
            </button>

            <div className="ba-header">
                <div className="ba-header-badge">
                    <span className="ba-badge-dot" />
                    {t("blockedAccounts.securityMonitor")}
                </div>
                <h1 className="ba-title">
                    {t("blockedAccounts.title")} <span className="ba-title-accent">{t("blockedAccounts.titleAccent")}</span>
                </h1>
                <p className="ba-subtitle">{t("blockedAccounts.subtitle")}</p>
            </div>

            <div className="ba-analytics">
                <div className="ba-stat ba-stat--red">
                    <div className="ba-stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                    <div>
                        <span className="ba-stat-label">{t("blockedAccounts.stats.lockedAccounts")}</span>
                        <span className="ba-stat-value">{loading ? "—" : totalLocked}</span>
                    </div>
                </div>
                <div className="ba-stat ba-stat--amber">
                    <div className="ba-stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>
                    <div>
                        <span className="ba-stat-label">{t("blockedAccounts.stats.highRisk")}</span>
                        <span className="ba-stat-value">{loading ? "—" : highRisk}</span>
                    </div>
                </div>
                <div className="ba-stat ba-stat--blue">
                    <div className="ba-stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                    </div>
                    <div>
                        <span className="ba-stat-label">{t("blockedAccounts.stats.totalAttempts")}</span>
                        <span className="ba-stat-value">{loading ? "—" : totalAttempts}</span>
                    </div>
                </div>
                <div className="ba-stat ba-stat--green">
                    <div className="ba-stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                    <div>
                        <span className="ba-stat-label">{t("blockedAccounts.stats.totalRecords")}</span>
                        <span className="ba-stat-value">{loading ? "—" : records.length}</span>
                    </div>
                </div>
            </div>

            <div className="ba-controls">
                <div className="ba-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" className="ba-search-icon">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="ba-search"
                        type="text"
                        placeholder={t("blockedAccounts.search.placeholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && <button className="ba-clear" onClick={() => setSearch("")}>✕</button>}
                </div>
                <div className="ba-filter-tabs">
                    {["all", "locked", "active", "clean"].map((f) => (
                        <button
                            key={f}
                            className={`ba-filter-tab ${filterStatus === f ? "ba-filter-tab--active" : ""}`}
                            onClick={() => setFilterStatus(f)}
                        >
                            {f === "locked" ? "🔒 " : f === "active" ? "⚠️ " : f === "clean" ? "✓ " : ""}
                            {t(`blockedAccounts.filter.${f}`)}
                        </button>
                    ))}
                </div>
                <div className="ba-right-controls">
                    <select className="ba-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="attempts">{t("blockedAccounts.sort.attempts")}</option>
                        <option value="id">{t("blockedAccounts.sort.id")}</option>
                        <option value="status">{t("blockedAccounts.sort.status")}</option>
                    </select>
                    <button className="ba-refresh-btn" onClick={fetchData}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                        {t("blockedAccounts.refresh")}
                    </button>
                </div>
            </div>

            <div className="ba-section-label">
                <span>{t("blockedAccounts.section.title")}</span>
                {!loading && <span className="ba-count-pill">{filtered.length}</span>}
                {!loading && filtered.length > 0 && (
                    <button
                        className="ba-delete-all-btn"
                        onClick={() => setConfirmDeleteAll(true)}
                        disabled={deletingAll}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                        {t("blockedAccounts.section.deleteAll")} ({filtered.length})
                    </button>
                )}
            </div>

            {loading ? (
                <div className="ba-loading">
                    <div className="ba-ring" />
                    <span>{t("blockedAccounts.loading")}</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="ba-empty">
                    <div className="ba-empty-icon">🛡️</div>
                    <h3>{t("blockedAccounts.empty.icon")}</h3>
                    <p>{search
                        ? t("blockedAccounts.empty.withSearch")
                        : t("blockedAccounts.empty.withoutSearch")}
                    </p>
                </div>
            ) : (
                <>
                    <div className="ba-table-wrap">
                        <table className="ba-table">
                            <thead>
                                <tr>
                                    <th>{t("blockedAccounts.table.hash")}</th>
                                    <th>{t("blockedAccounts.table.userId")}</th>
                                    <th>{t("blockedAccounts.table.attempts")}</th>
                                    <th>{t("blockedAccounts.table.status")}</th>
                                    <th>{t("blockedAccounts.table.lockUntil")}</th>
                                    <th>{t("blockedAccounts.table.actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((record, index) => {
                                    const locked = isLocked(record.lockUntil);
                                    const remaining = getLockRemaining(record.lockUntil);
                                    return (
                                        <tr key={record.id} className={`ba-row ${locked ? "ba-row--locked" : ""}`}>
                                            <td className="ba-index">{index + 1}</td>
                                            <td>
                                                <div className="ba-id-wrap">
                                                    <div className={`ba-dot ${getAttemptColor(record.attempts)}`} />
                                                    <span className="ba-id-text">{record.id}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="ba-attempts-wrap">
                                                    <span className={`ba-attempts-badge ${record.attempts === 0 ? "ba-attempts--zero"
                                                        : record.attempts <= 2 ? "ba-attempts--warn"
                                                            : "ba-attempts--danger"
                                                        }`}>
                                                        {record.attempts}
                                                    </span>
                                                    <div className="ba-attempts-bar-wrap">
                                                        <div
                                                            className={`ba-attempts-bar ${record.attempts === 0 ? "ba-bar--zero"
                                                                : record.attempts <= 2 ? "ba-bar--warn"
                                                                    : "ba-bar--danger"
                                                                }`}
                                                            style={{ width: `${Math.min((record.attempts / 5) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {locked ? (
                                                    <span className="ba-status ba-status--locked">
                                                        <span className="ba-status-dot ba-status-dot--red" />
                                                        {t("blockedAccounts.status.locked")}
                                                        {remaining && <span className="ba-remaining">{remaining}</span>}
                                                    </span>
                                                ) : record.attempts > 0 ? (
                                                    <span className="ba-status ba-status--warn">
                                                        <span className="ba-status-dot ba-status-dot--amber" />
                                                        {t("blockedAccounts.status.atRisk")}
                                                    </span>
                                                ) : (
                                                    <span className="ba-status ba-status--clean">
                                                        <span className="ba-status-dot ba-status-dot--green" />
                                                        {t("blockedAccounts.status.clean")}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="ba-lock-time">
                                                {locked ? (
                                                    <span className="ba-lock-val">{formatLockUntil(record.lockUntil)}</span>
                                                ) : (
                                                    <span className="ba-null-val">—</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="ba-action-group">
                                                    <button
                                                        className="ba-reset-btn"
                                                        onClick={() => handleReset(record.id)}
                                                        disabled={resetting === record.id || (record.attempts === 0 && !locked)}
                                                        title={t("blockedAccounts.actions.resetTitle")}
                                                    >
                                                        {resetting === record.id ? (
                                                            <span className="ba-spinner" />
                                                        ) : (
                                                            <>
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                                                                    <polyline points="23 4 23 10 17 10" />
                                                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                                                </svg>
                                                                {t("blockedAccounts.actions.reset")}
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        className="ba-delete-btn"
                                                        onClick={() => setConfirmDeleteId(record.id)}
                                                        disabled={deleting === record.id}
                                                        title={t("blockedAccounts.actions.deleteTitle")}
                                                    >
                                                        {deleting === record.id ? (
                                                            <span className="ba-spinner ba-spinner--red" />
                                                        ) : (
                                                            <>
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                                                                    <polyline points="3 6 5 6 21 6" />
                                                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                                    <path d="M10 11v6M14 11v6" />
                                                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                                                </svg>
                                                                {t("blockedAccounts.actions.delete")}
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="ba-mobile-cards">
                        {filtered.map((record) => {
                            const locked = isLocked(record.lockUntil);
                            const remaining = getLockRemaining(record.lockUntil);
                            return (
                                <div key={record.id} className={`ba-card ${locked ? "ba-card--locked" : ""}`}>
                                    <div className="ba-card-top">
                                        <div className="ba-card-id">
                                            <div className={`ba-dot ${getAttemptColor(record.attempts)}`} />
                                            <span className="ba-id-text">{record.id}</span>
                                        </div>
                                        {locked ? (
                                            <span className="ba-status ba-status--locked">
                                                <span className="ba-status-dot ba-status-dot--red" />
                                                {t("blockedAccounts.status.locked")}
                                            </span>
                                        ) : record.attempts > 0 ? (
                                            <span className="ba-status ba-status--warn">
                                                <span className="ba-status-dot ba-status-dot--amber" />
                                                {t("blockedAccounts.status.atRisk")}
                                            </span>
                                        ) : (
                                            <span className="ba-status ba-status--clean">
                                                <span className="ba-status-dot ba-status-dot--green" />
                                                {t("blockedAccounts.status.clean")}
                                            </span>
                                        )}
                                    </div>
                                    <div className="ba-card-body">
                                        <div className="ba-card-row">
                                            <span className="ba-card-label">{t("blockedAccounts.card.attempts")}</span>
                                            <span className={`ba-attempts-badge ${record.attempts === 0 ? "ba-attempts--zero"
                                                : record.attempts <= 2 ? "ba-attempts--warn"
                                                    : "ba-attempts--danger"
                                                }`}>{record.attempts}</span>
                                        </div>
                                        <div className="ba-card-row">
                                            <span className="ba-card-label">{t("blockedAccounts.card.lockUntil")}</span>
                                            <span className="ba-card-val">
                                                {locked ? formatLockUntil(record.lockUntil) : "—"}
                                            </span>
                                        </div>
                                        {remaining && (
                                            <div className="ba-card-row">
                                                <span className="ba-card-label">{t("blockedAccounts.card.remaining")}</span>
                                                <span className="ba-remaining">{remaining}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="ba-card-actions">
                                        <button
                                            className="ba-reset-btn ba-reset-btn--half"
                                            onClick={() => handleReset(record.id)}
                                            disabled={resetting === record.id || (record.attempts === 0 && !locked)}
                                        >
                                            {resetting === record.id
                                                ? <span className="ba-spinner" />
                                                : <>↺ {t("blockedAccounts.actions.reset")}</>}
                                        </button>
                                        <button
                                            className="ba-delete-btn ba-delete-btn--half"
                                            onClick={() => setConfirmDeleteId(record.id)}
                                            disabled={deleting === record.id}
                                        >
                                            {deleting === record.id
                                                ? <span className="ba-spinner ba-spinner--red" />
                                                : <>🗑 {t("blockedAccounts.actions.delete")}</>}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default BlockedAccounts;