import React, { useEffect, useState } from "react";
import "./MyNotifications.css";

import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

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

function MyNotifications() {

    const { t } = useTranslation();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");
    const [userId, setUserId] = useState("");
    /* Timestamp of the last time this user cleared their notifications —
       anything newer is shown with the "New" tag until they mark it read. */
    const [readAt, setReadAt] = useState(0);

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

            const id = String(
                user.email?.split("@")[0] || ""
            ).toUpperCase();

            try {
                const userRef = doc(db, "users", id);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    navigate("/");
                    return;
                }

                const userData = userSnap.data();

                if (userData.uid !== user.uid) {
                    navigate("/");
                    return;
                }

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

                snap.forEach((d) => {
                    const data = d.data();
                    const target = data.userId ? String(data.userId).toUpperCase() : "ALL";
                    if (target !== "ALL" && target !== id) return;

                    const raw = data.createdAt || data.date || data.timestamp || null;
                    const ms = toMs(raw);

                    list.push({
                        id: d.id,
                        message: data.message || t("noMessage"),
                        createdMs: ms,
                        createdAt: ms ? new Date(ms).toLocaleString() : t("noDate")
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
                        {notifications.length > 0 && (
                            <button
                                className="mark-read-btn"
                                onClick={() => {
                                    const now = Date.now();
                                    setReadAt(now);
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
                        <div className="notification-list">
                            {notifications.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="notification-card"
                                    style={{ animationDelay: `${index * 60}ms` }}
                                >
                                    <div className="card-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                        </svg>
                                    </div>
                                    <div className="card-content">
                                        <p>{String(item.message).substring(0, 500)}</p>
                                        <span className="card-date">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                                                <line x1="16" x2="16" y1="2" y2="6" />
                                                <line x1="8" x2="8" y1="2" y2="6" />
                                                <line x1="3" x2="21" y1="10" y2="10" />
                                            </svg>
                                            {item.createdAt}
                                        </span>
                                    </div>
                                    {item.createdMs > readAt && (
                                        <div className="card-new">
                                            <span className="card-new-label">{t("newLabel") || "New"}</span>
                                            <span className="card-new-dot" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

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
                    </>
                )}

            </div>

        </div>
    );
}

export default MyNotifications;