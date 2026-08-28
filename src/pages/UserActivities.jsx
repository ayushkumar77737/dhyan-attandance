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
    getDoc,
    query,
    orderBy,
} from "firebase/firestore";

import { useTranslation } from "react-i18next";
import useAutoLogout from "../hooks/useAutoLogout";
import { logAdminAction } from "../utils/logAdminAction";

import logo from "../assets/logo2.png";

/* ----------------------------------------------------------------
   Cloudinary
   Mirrors the public_id formula used in utils/cloudinaryUpload.js:
   `${employeeId}_${name with spaces -> underscores}`
   If that formula ever changes there, change it here too.
   ---------------------------------------------------------------- */

const CLOUD_NAME = "dgvjq9bhl";

const getProfileImageUrl = (employeeId, name = "", size = 140) => {
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
    close: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
        </svg>
    ),
    download: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M4 20h16" />
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
    inbox: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 13.5h4l1.5 2.5h6l1.5-2.5h4" />
            <path d="M5.6 4.5h12.8l2.1 9v4.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2v-4.5l2.1-9Z" />
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

/* Stable accent per user, so the stripe colour doesn't shuffle on re-sort. */
const toneFor = (key = "") => {
    let sum = 0;
    for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    return ["a", "b", "c", "d", "e"][sum % 5];
};

/* ---------------------------------------------------------------- */
/* Avatar — photo if we have one, tinted initial otherwise           */
/* ---------------------------------------------------------------- */

function UserAvatar({ src, name, label, tone }) {

    const [showImage, setShowImage] = useState(Boolean(src));
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setShowImage(Boolean(src));
        setLoaded(false);
    }, [src]);

    return (
        <div className="usract__user-avatar" data-tone={tone}>
            {showImage ? (
                <img
                    src={src}
                    alt={label}
                    className={`usract__user-avatar-img${loaded ? " is-loaded" : ""}`}
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

function UserActivities() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    useAutoLogout();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openUser, setOpenUser] = useState(null);
    const [search, setSearch] = useState("");
    const [busy, setBusy] = useState(false);
    const [avatars, setAvatars] = useState({});

    // Confirm dialog state: { message, confirmLabel, onConfirm } or null
    const [confirmState, setConfirmState] = useState(null);
    // Toast state: { text, type: "success" | "error" } or null
    const [toast, setToast] = useState(null);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const showToast = (text, type = "success") => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3000);
    };

    const askConfirm = (message, confirmLabel, onConfirm) =>
        setConfirmState({ message, confirmLabel, onConfirm });

    /* One lookup per distinct user, not per log row. */
    const loadAvatars = async (rows) => {
        const ids = [...new Set(rows.map((l) => l.userId).filter((v) => v && v !== "—"))];

        const entries = await Promise.all(
            ids.map(async (userId) => {
                const fallbackName = rows.find((l) => l.userId === userId)?.name || "";

                for (const path of ["users", "profiles"]) {
                    try {
                        const snap = await getDoc(doc(db, path, userId));
                        if (snap.exists()) {
                            const u = snap.data();
                            const stored =
                                u.profileImage ||
                                u.photoURL ||
                                u.profileImageUrl ||
                                u.imageUrl;
                            if (stored) return [userId, stored];
                            const derived = getProfileImageUrl(userId, u.name || fallbackName);
                            if (derived) return [userId, derived];
                        }
                    } catch (err) {
                        console.log(err);
                    }
                }

                return [userId, getProfileImageUrl(userId, fallbackName)];
            })
        );

        setAvatars(Object.fromEntries(entries));
    };

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
            loadAvatars(rows);
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
            await logAdminAction("delete_user_activity", {
                targetId: log?.userId || logId,
                details: t("ua_logDeletedOne", { action: log?.action || "", id: logId }),
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
            await logAdminAction("delete_user_activities", {
                targetId: userId,
                details: t("ua_logDeletedUser", { count: items.length }),
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
            await logAdminAction("delete_all_user_activities", {
                details: t("ua_logDeletedAll", { count }),
            });
            showToast(t("ua_deletedAll"), "success");
        } catch (err) { console.log(err); showToast(t("ua_deleteFailed"), "error"); }
        finally { setBusy(false); }
    };

    const exportCSV = () => {
        if (logs.length === 0) {
            showToast(t("ua_nothingToExport"), "error");
            return;
        }

        const headers = ["User ID", "Name", "Action", "Page", "Date & Time"];
        const escape = (val) => `"${(val ?? "").toString().replace(/"/g, '""')}"`;

        const rows = logs.map((l) =>
            [l.userId, l.name, l.action, l.page, fmtDateTime(l.ts)].map(escape).join(",")
        );

        const csv = [headers.map(escape).join(","), ...rows].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `user-activities-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        logAdminAction("export_user_activities", {
            details: t("ua_logExported", { count: logs.length }),
        });
        showToast(t("ua_exported"), "success");
    };

    return (
        <div className="usract__container" data-theme={theme}>

            <div className="usract__blob usract__blob--1" />
            <div className="usract__blob usract__blob--2" />
            <div className="usract__dots" />

            <button
                className="usract__back-btn"
                onClick={() => navigate("/admin-dashboard")}
            >
                {icons.back} {t("back")}
            </button>

            <div className="usract__shell">

                <div className="usract__header">
                    <div className="usract__header-left">
                        <img src={logo} alt={t("appTitle")} className="usract__logo" />
                        <div className="usract__header-text">
                            <p className="usract__portal-label">{t("appTitle")}</p>
                            <h1 className="usract__title">{t("userActivities")}</h1>
                        </div>
                    </div>

                    {logs.length > 0 && (
                        <div className="usract__header-actions">
                            <button
                                className="usract__export-btn"
                                onClick={exportCSV}
                                disabled={busy}
                            >
                                {icons.download}
                                {t("exportCsv")}
                            </button>
                            <button
                                className="usract__delete-all-btn"
                                onClick={() =>
                                    askConfirm(t("ua_confirmDeleteAll"), t("ua_deleteAll"), doDeleteAll)
                                }
                                disabled={busy}
                            >
                                {icons.trash}
                                {t("ua_deleteAll")}
                            </button>
                        </div>
                    )}
                </div>

                <div className="usract__search-wrap">
                    <span className="usract__search-icon">{icons.search}</span>
                    <input
                        className="usract__search"
                        type="text"
                        placeholder={t("ua_searchPlaceholder")}
                        value={search}
                        onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            if (/^[A-Z0-9 ]*$/.test(value)) setSearch(value);
                        }}
                    />
                    {search && (
                        <button
                            className="usract__search-clear"
                            onClick={() => setSearch("")}
                            aria-label={t("clearSearch")}
                        >
                            {icons.close}
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="usract__spinner-wrap"><div className="usract__spinner" /></div>
                ) : groupList.length === 0 ? (
                    <div className="usract__empty">
                        <span className="usract__empty-icon">{icons.inbox}</span>
                        <p>{t("ua_noActivities")}</p>
                    </div>
                ) : (
                    <div className="usract__list">
                        {groupList.map((g) => {
                            const isOpen = openUser === g.userId;
                            const tone = toneFor(g.userId);

                            return (
                                <div
                                    className={`usract__user-card ${isOpen ? "open" : ""}`}
                                    data-tone={tone}
                                    key={g.userId}
                                >
                                    <div
                                        className="usract__user-head"
                                        onClick={() => setOpenUser(isOpen ? null : g.userId)}
                                    >
                                        <UserAvatar
                                            src={avatars[g.userId]}
                                            name={g.name}
                                            label={g.name || t("profilePhoto")}
                                            tone={tone}
                                        />

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
                                                askConfirm(
                                                    t("ua_confirmDeleteUser"),
                                                    t("ua_deleteUser"),
                                                    () => doDeleteUserAll(g.userId, g.items)
                                                );
                                            }}
                                            disabled={busy}
                                        >
                                            {icons.trash}
                                        </button>

                                        <span className={`usract__chevron ${isOpen ? "open" : ""}`}>
                                            {icons.chevron}
                                        </span>
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
                                                            {l.page && (
                                                                <span className="usract__activity-page">· {l.page}</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <button
                                                        className="usract__activity-delete"
                                                        title={t("ua_deleteOne")}
                                                        onClick={() =>
                                                            askConfirm(
                                                                t("ua_confirmDeleteOne"),
                                                                t("ua_deleteOne"),
                                                                () => doDeleteOne(l.id, l)
                                                            )
                                                        }
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

            </div>

            {/* Styled confirm dialog — portaled, so it carries its own theme attr */}
            {confirmState && createPortal(
                <div
                    className="usract__cf-overlay"
                    data-theme={theme}
                    onClick={() => setConfirmState(null)}
                >
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
                                {confirmState.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Toast */}
            {toast && createPortal(
                <div className={`usract__toast usract__toast--${toast.type}`} data-theme={theme}>
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