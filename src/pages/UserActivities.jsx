import React, { useEffect, useState } from "react";
import "./UserActivities.css";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

import { db } from "../firebase/firebase";
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
} from "firebase/firestore";

import { useTranslation } from "react-i18next";
import useAutoLogout from "../hooks/useAutoLogout";
import { logAdminAction } from "../utils/logAdminAction";

import logo from "../assets/logo2.png";

const icons = {
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
    ),
    trash: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
        </svg>
    ),
    chevron: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    ),
    clock: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    search: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    ),
    warn: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
};

const normalize = (id, d) => ({
    id,
    userId: d.userId || d.uid || d.user || "—",
    name: d.name || d.userName || d.user || d.userId || "—",
    action: d.action || d.message || d.activity || d.event || "—",
    page: d.page || d.location || d.path || "",
    ts: d.timestamp?.toDate
        ? d.timestamp.toDate()
        : d.createdAt?.toDate
            ? d.createdAt.toDate()
            : d.time?.toDate
                ? d.time.toDate()
                : d.timestamp
                    ? new Date(d.timestamp)
                    : null,
});

const fmtDateTime = (date) => {
    if (!date) return "—";
    return date.toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
};

function UserActivities() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    useAutoLogout();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openUser, setOpenUser] = useState(null);
    const [search, setSearch] = useState("");
    const [busy, setBusy] = useState(false);

    // Confirm dialog state: { message, onConfirm } or null
    const [confirmState, setConfirmState] = useState(null);
    // Toast state: { text, type: "success" | "error" } or null
    const [toast, setToast] = useState(null);

    const showToast = (text, type = "success") => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3000);
    };

    const askConfirm = (message, onConfirm) => setConfirmState({ message, onConfirm });

    const fetchLogs = async () => {
        try {
            setLoading(true);
            let snap;
            try {
                snap = await getDocs(query(collection(db, "userLogs"), orderBy("timestamp", "desc")));
            } catch {
                snap = await getDocs(collection(db, "userLogs"));
            }
            const rows = snap.docs.map((d) => normalize(d.id, d.data()));
            rows.sort((a, b) => (b.ts?.getTime() || 0) - (a.ts?.getTime() || 0));
            setLogs(rows);
        } catch (err) {
            console.log(err);
            setLogs([]);
        } finally {
            setLoading(false);
        }
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
        fetchLogs();
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    const groups = {};
    logs.forEach((l) => {
        if (!groups[l.userId]) groups[l.userId] = { userId: l.userId, name: l.name, items: [] };
        groups[l.userId].items.push(l);
    });
    let groupList = Object.values(groups);

    const q = search.trim().toLowerCase();
    if (q) {
        groupList = groupList.filter(
            (g) => g.name.toLowerCase().includes(q) || g.userId.toLowerCase().includes(q)
        );
    }
    groupList.sort((a, b) => a.name.localeCompare(b.name));

    const doDeleteOne = async (logId, log) => {
        try {
            setBusy(true);
            await deleteDoc(doc(db, "userLogs", logId));
            setLogs((prev) => prev.filter((l) => l.id !== logId));
            await logAdminAction("Deleted a user activity log", {
                targetId: log?.userId || logId,
                details: `Activity: "${log?.action || ""}" (log ${logId})`,
            });
            showToast(t("ua_deletedOne"), "success");
        } catch (err) { console.log(err); showToast(t("ua_deleteFailed"), "error"); }
        finally { setBusy(false); }
    };

    const doDeleteUserAll = async (userId, items) => {
        try {
            setBusy(true);
            await Promise.all(items.map((l) => deleteDoc(doc(db, "userLogs", l.id))));
            setLogs((prev) => prev.filter((l) => l.userId !== userId));
            setOpenUser(null);
            await logAdminAction("Deleted all activity logs for a user", {
                targetId: userId,
                details: `Removed ${items.length} activity log(s)`,
            });
            showToast(t("ua_deletedUser"), "success");
        } catch (err) { console.log(err); showToast(t("ua_deleteFailed"), "error"); }
        finally { setBusy(false); }
    };

    const doDeleteAll = async () => {
        try {
            setBusy(true);
            const count = logs.length;
            await Promise.all(logs.map((l) => deleteDoc(doc(db, "userLogs", l.id))));
            setLogs([]);
            setOpenUser(null);
            await logAdminAction("Deleted ALL user activity logs", {
                details: `Removed ${count} activity log(s) across all users`,
            });
            showToast(t("ua_deletedAll"), "success");
        } catch (err) { console.log(err); showToast(t("ua_deleteFailed"), "error"); }
        finally { setBusy(false); }
    };

    return (
        <div className="usract__container">
            <div className="usract__header">
                <div className="usract__header-left">
                    <button className="usract__back-btn" onClick={() => navigate("/admin-dashboard")}>
                        {icons.back}
                    </button>
                    <img src={logo} alt="Logo" className="usract__logo" />
                    <div className="usract__header-text">
                        <p className="usract__portal-label">{t("appTitle")}</p>
                        <h1 className="usract__title">{t("userActivities")}</h1>
                    </div>
                </div>
                {logs.length > 0 && (
                    <button
                        className="usract__delete-all-btn"
                        onClick={() => askConfirm(t("ua_confirmDeleteAll"), doDeleteAll)}
                        disabled={busy}
                    >
                        {icons.trash}
                        {t("ua_deleteAll")}
                    </button>
                )}
            </div>

            <div className="usract__search-wrap">
                <span className="usract__search-icon">{icons.search}</span>
                <input
                    className="usract__search"
                    type="text"
                    placeholder={t("ua_searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                {search && <button className="usract__search-clear" onClick={() => setSearch("")}>✕</button>}
            </div>

            {loading ? (
                <div className="usract__spinner-wrap"><div className="usract__spinner" /></div>
            ) : groupList.length === 0 ? (
                <div className="usract__empty"><span>📭</span>{t("ua_noActivities")}</div>
            ) : (
                <div className="usract__list">
                    {groupList.map((g) => {
                        const isOpen = openUser === g.userId;
                        return (
                            <div className={`usract__user-card ${isOpen ? "open" : ""}`} key={g.userId}>
                                <div
                                    className="usract__user-head"
                                    onClick={() => setOpenUser(isOpen ? null : g.userId)}
                                >
                                    <div className="usract__user-avatar">
                                        {(g.name || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="usract__user-meta">
                                        <p className="usract__user-name">{g.name}</p>
                                        <p className="usract__user-id">{g.userId}</p>
                                    </div>
                                    <span className="usract__user-count">{g.items.length}</span>
                                    <button
                                        className="usract__user-delete"
                                        title={t("ua_deleteUser")}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            askConfirm(t("ua_confirmDeleteUser"), () => doDeleteUserAll(g.userId, g.items));
                                        }}
                                        disabled={busy}
                                    >
                                        {icons.trash}
                                    </button>
                                    <span className={`usract__chevron ${isOpen ? "open" : ""}`}>{icons.chevron}</span>
                                </div>

                                {isOpen && (
                                    <div className="usract__activity-list">
                                        {g.items.map((l) => (
                                            <div className="usract__activity-row" key={l.id}>
                                                <div className="usract__activity-main">
                                                    <p className="usract__activity-action">{l.action}</p>
                                                    <p className="usract__activity-time">
                                                        {icons.clock}
                                                        {fmtDateTime(l.ts)}
                                                        {l.page && <span className="usract__activity-page">· {l.page}</span>}
                                                    </p>
                                                </div>
                                                <button
                                                    className="usract__activity-delete"
                                                    title={t("ua_deleteOne")}
                                                    onClick={() => askConfirm(t("ua_confirmDeleteOne"), () => doDeleteOne(l.id, l))}
                                                    disabled={busy}
                                                >
                                                    {icons.trash}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Styled confirm dialog */}
            {confirmState && createPortal(
                <div className="usract__cf-overlay" onClick={() => setConfirmState(null)}>
                    <div className="usract__cf-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="usract__cf-icon">{icons.warn}</div>
                        <p className="usract__cf-text">{confirmState.message}</p>
                        <div className="usract__cf-actions">
                            <button className="usract__cf-cancel" onClick={() => setConfirmState(null)}>
                                {t("cancel")}
                            </button>
                            <button
                                className="usract__cf-confirm"
                                onClick={() => {
                                    const fn = confirmState.onConfirm;
                                    setConfirmState(null);
                                    fn && fn();
                                }}
                            >
                                {icons.trash}
                                {t("ua_deleteAll")}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Toast */}
            {toast && createPortal(
                <div className={`usract__toast usract__toast--${toast.type}`}>
                    <span className="usract__toast-icon">
                        {toast.type === "success" ? icons.check : icons.warn}
                    </span>
                    {toast.text}
                </div>,
                document.body
            )}
        </div>
    );
}

export default UserActivities;