import React, { useEffect, useMemo, useState } from "react";
import "./MyNotifications.css";

import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
    limit
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";
import { NOTIF_LINKS } from "../utils/notifyUser";

/* createdAt has been stored as a Firestore Timestamp, an ISO string, or a
   Date over time. Normalise all of them to milliseconds so sorting and
   display work regardless of which page wrote the record. */
const toMs = (v) => {
    if (!v) return 0;
    if (typeof v === "object" && typeof v.toDate === "function") return v.toDate().getTime();
    if (typeof v === "object" && v.seconds) return v.seconds * 1000;
    const parsed = new Date(v).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
};

/* "Last read" marker, per user. Stored on users/{id}.notificationsReadAt
   (so it follows the user across devices) with a localStorage mirror in
   case that write is blocked by rules. */
const readKey = (id) => `notifReadAt_${id}`;

const getReadAt = (id, userData) =>
    Math.max(
        toMs(userData?.notificationsReadAt),
        Number(localStorage.getItem(readKey(id)) || 0)
    );

const persistReadAt = async (id, ms) => {
    localStorage.setItem(readKey(id), String(ms));
    try {
        await updateDoc(doc(db, "users", id), {
            notificationsReadAt: new Date(ms).toISOString(),
        });
    } catch (err) {
        console.warn("Could not persist notificationsReadAt to Firestore:", err);
    }
};

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */
const S = (children) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const ICONS = {
    bell: S(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>),
    leave: S(<><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M9 16l2 2 4-4" /></>),
    absence: S(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>),
    ticket: S(<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />),
    concern: S(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="15" x2="12.01" y2="15" /></>),
    announcement: S(<><path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>),
    timetable: S(<><path d="M21 10.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><circle cx="17.5" cy="17.5" r="4.5" /><polyline points="17.5 15.5 17.5 17.5 19 18.5" /></>),
    profile: S(<><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2.5" /><line x1="13" y1="10" x2="18" y2="10" /><line x1="13" y1="14" x2="17" y2="14" /></>),
    experience: S(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />),
};

/* Each notification type -> filter group, colour tone, chip label.
   Labels reuse the sidebar keys that already exist in every language. */
const TYPES = {
    leave: { group: "requests", tone: "violet" },
    absence: { group: "requests", tone: "amber" },
    ticket: { group: "tickets", tone: "blue" },
    concern: { group: "concerns", tone: "rose" },
    announcement: { group: "announcements", tone: "orange" },
    timetable: { group: "timetable", tone: "teal" },
    profile: { group: "profile", tone: "indigo" },
    experience: { group: "experience", tone: "pink" },
    general: { group: "general", tone: "teal" },
};
const GROUPS = [
    { id: "requests", labelKey: "myRequests", fallback: "My Requests" },
    { id: "tickets", labelKey: "myTickets", fallback: "My Tickets" },
    { id: "concerns", labelKey: "raiseConcern", fallback: "Concerns" },
    { id: "announcements", labelKey: "announcements", fallback: "Announcements" },
    { id: "timetable", labelKey: "dhyanTimetable", fallback: "Dhyan Timetable" },
    { id: "profile", labelKey: "myDigitalId", fallback: "My Digital ID" },
    { id: "experience", labelKey: "shareExperience", fallback: "Share Experience" },
    { id: "general", labelKey: "notifTypeGeneral", fallback: "General" },
];

/* "5 min ago", "yesterday", "3 days ago" — in the user's language, no
   translation keys needed. Older than a week shows the date. */
const relTime = (ms, locale) => {
    if (!ms) return "";
    const diff = (ms - Date.now()) / 1000;
    const abs = Math.abs(diff);
    try {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
        if (abs < 60) return rtf.format(0, "second");
        if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
        if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
        if (abs < 7 * 86400) return rtf.format(Math.round(diff / 86400), "day");
    } catch { /* very old browsers: fall through to a plain date */ }
    return new Date(ms).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
};

function MyNotifications() {

    const { t, i18n } = useTranslation();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");
    const [userId, setUserId] = useState("");
    /* Timestamp of the last time this user cleared their notifications —
       anything newer is shown with the "New" tag until they mark it read. */
    const [readAt, setReadAt] = useState(0);
    const [filter, setFilter] = useState("all");

    const locale = i18n.resolvedLanguage || i18n.language || "en";

    useEffect(() => {
        const disableRightClick = (e) => e.preventDefault();
        const disableInspectKeys = (e) => {
            if (e.key === "F12") e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase()))
                e.preventDefault();
            if (e.ctrlKey && e.key.toUpperCase() === "U")
                e.preventDefault();
        };
        document.addEventListener("contextmenu", disableRightClick);
        document.addEventListener("keydown", disableInspectKeys);
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                navigate("/");
                return;
            }

            try {
                /* Look up by Firebase uid, not by deriving the ID from the
                   email string — personal emails no longer follow the
                   id@gmail.com pattern (see AddUser.jsx / AddAdmin.jsx). */
                const usersQuery = await getDocs(
                    query(collection(db, "users"), where("uid", "==", user.uid), limit(1))
                );

                if (usersQuery.empty) {
                    navigate("/");
                    return;
                }

                const userSnap = usersQuery.docs[0];
                const id = userSnap.id;
                const userData = userSnap.data();

                if (userData.role === "admin") {
                    navigate("/admin-dashboard");
                    return;
                }

                setUserId(id);
                const prevReadAt = getReadAt(id, userData);
                setReadAt(prevReadAt);

                /* Opening this page counts as seeing everything: stamp "now"
                   so the dashboard badge is clear on the next visit. The
                   "New" tags on this render still use prevReadAt so the user
                   can see which ones were unread when they arrived. */
                persistReadAt(id, Date.now());

                /* Load the whole collection once and filter here instead of two
                   Firestore queries. This picks up:
                     - personal notifications  (userId === this user's id)
                     - broadcasts               (userId === "ALL")
                     - legacy admin posts       (no userId field at all) */
                const snap = await getDocs(collection(db, "notifications"));
                const list = [];
                const cutoff = Date.now() + 60 * 1000; /* ignore anything dated in the future */

                snap.forEach((d) => {
                    const data = d.data();
                    const target = data.userId ? String(data.userId).toUpperCase() : "ALL";
                    if (target !== "ALL" && target !== String(id).toUpperCase()) return;

                    const ms = toMs(data.createdAt || data.date || data.timestamp || null);
                    if (ms > cutoff) return;

                    const type = TYPES[data.type] ? data.type : "general";
                    list.push({
                        id: d.id,
                        type,
                        /* raw fields — the text is resolved at render time so it
                           follows the user's current language (see textOf) */
                        msgKey: data.msgKey || "",
                        msgParams: data.msgParams || {},
                        message: data.message || "",
                        titleKey: data.titleKey || "",
                        title: data.title || "",
                        link: data.link || (type !== "general" ? NOTIF_LINKS[type] : "") || "",
                        createdMs: ms,
                    });
                });

                list.sort((a, b) => b.createdMs - a.createdMs);
                setNotifications(list);
            } catch (err) {
                console.error(err);
                setNotifications([]);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    /* New-style records carry a key + params -> shown in the reader's language.
       Older records only have the sentence that was saved when they were written. */
    const textOf = (n) =>
        n.msgKey
            ? t(n.msgKey, { ...n.msgParams, defaultValue: n.message || t("noMessage") })
            : n.message || t("noMessage");
    const titleOf = (n) => (n.titleKey ? t(n.titleKey, { defaultValue: n.title }) : n.title);

    const unreadCount = useMemo(
        () => notifications.filter((n) => n.createdMs > readAt).length,
        [notifications, readAt]
    );

    /* only offer chips for groups that actually have notifications */
    const groupCounts = useMemo(() => {
        const c = {};
        notifications.forEach((n) => {
            const g = TYPES[n.type].group;
            c[g] = (c[g] || 0) + 1;
        });
        return c;
    }, [notifications]);

    const visible = useMemo(() => {
        if (filter === "all") return notifications;
        if (filter === "unread") return notifications.filter((n) => n.createdMs > readAt);
        return notifications.filter((n) => TYPES[n.type].group === filter);
    }, [notifications, filter, readAt]);

    const open = (n) => {
        if (n.link) navigate(n.link);
    };

    return (
        <div className="my-notifications-page" data-theme={theme}>

            <button
                onClick={() => navigate("/user-dashboard")}
                className="back-btn"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                {t("back")}
            </button>

            <div className="my-notifications-container">

                <div className="my-notifications-header">
                    <div className="header-title-group">
                        <div className="header-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </div>
                        <div className="header-text">
                            <h1>{t("notifications")}</h1>
                            <p className="header-subtitle">{t("notificationsSubtitle") || "Stay updated with your latest alerts"}</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        {notifications.length > 0 && (
                            <span className="count-badge">{notifications.length}</span>
                        )}
                        {unreadCount > 0 && (
                            <button
                                className="mark-read-btn"
                                onClick={() => {
                                    const now = Date.now();
                                    setReadAt(now);
                                    if (filter === "unread") setFilter("all");
                                    if (userId) persistReadAt(userId, now);
                                }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {t("markAllAsRead") || "Mark all as read"}
                            </button>
                        )}
                    </div>
                </div>

                {notifications.length > 0 && (
                    <div className="notif-filters" role="tablist">
                        <button
                            role="tab"
                            aria-selected={filter === "all"}
                            className={`notif-chip ${filter === "all" ? "is-on" : ""}`}
                            onClick={() => setFilter("all")}
                        >
                            {t("all", "All")}
                            <span className="notif-chip-count">{notifications.length}</span>
                        </button>
                        {unreadCount > 0 && (
                            <button
                                role="tab"
                                aria-selected={filter === "unread"}
                                className={`notif-chip notif-chip--unread ${filter === "unread" ? "is-on" : ""}`}
                                onClick={() => setFilter("unread")}
                            >
                                {t("notifFilterUnread", "Unread")}
                                <span className="notif-chip-count">{unreadCount}</span>
                            </button>
                        )}
                        {GROUPS.filter((g) => groupCounts[g.id]).map((g) => (
                            <button
                                key={g.id}
                                role="tab"
                                aria-selected={filter === g.id}
                                className={`notif-chip ${filter === g.id ? "is-on" : ""}`}
                                onClick={() => setFilter(g.id)}
                            >
                                {t(g.labelKey, g.fallback)}
                                <span className="notif-chip-count">{groupCounts[g.id]}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="divider" />

                {loading ? (
                    <div className="no-data-wrapper">
                        <p className="no-data">{t("loading")}</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="no-data-wrapper">
                        <div className="no-data-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </div>
                        <p className="no-data">{t("noNotificationsYet")}</p>
                        <span className="no-data-sub">{t("allCaughtUp")}</span>
                    </div>
                ) : (
                    <>
                        <div className="notification-list" key={filter}>
                            {visible.map((item, index) => {
                                const meta = TYPES[item.type];
                                const group = GROUPS.find((g) => g.id === meta.group);
                                const isNew = item.createdMs > readAt;
                                const title = titleOf(item);
                                const clickable = Boolean(item.link);
                                return (
                                    <div
                                        key={item.id}
                                        className={`notification-card tone-${meta.tone}${isNew ? " is-unread" : ""}${clickable ? " is-link" : ""}`}
                                        style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
                                        role={clickable ? "button" : undefined}
                                        tabIndex={clickable ? 0 : undefined}
                                        onClick={clickable ? () => open(item) : undefined}
                                        onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(item); } } : undefined}
                                    >
                                        <div className="card-icon">{ICONS[item.type] || ICONS.bell}</div>
                                        <div className="card-content">
                                            <span className="card-type">{t(group.labelKey, group.fallback)}</span>
                                            {title && <strong className="card-title">{title}</strong>}
                                            <p>{String(textOf(item)).substring(0, 500)}</p>
                                            <span
                                                className="card-date"
                                                title={item.createdMs ? new Date(item.createdMs).toLocaleString(locale) : ""}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="9" />
                                                    <polyline points="12 7 12 12 15 14" />
                                                </svg>
                                                {item.createdMs ? relTime(item.createdMs, locale) : t("noDate")}
                                            </span>
                                        </div>
                                        <div className="card-side">
                                            {isNew && (
                                                <div className="card-new">
                                                    <span className="card-new-label">{t("newLabel") || "New"}</span>
                                                    <span className="card-new-dot" />
                                                </div>
                                            )}
                                            {clickable && (
                                                <svg className="card-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <polyline points="9 18 15 12 9 6" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {visible.length === 0 ? (
                            <div className="no-data-wrapper no-data-wrapper--compact">
                                <span className="no-data-sub">{t("allCaughtUp")}</span>
                            </div>
                        ) : (
                            <div className="caught-up-footer">
                                <span className="caught-up-line" />
                                <span className="caught-up-text">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                    </svg>
                                    {t("allCaughtUp")}
                                </span>
                                <span className="caught-up-line" />
                            </div>
                        )}
                    </>
                )}

            </div>

        </div>
    );
}

export default MyNotifications;