import React, { useEffect, useState, useMemo } from "react";
import "./MyActivity.css";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import useAutoLogout from "../hooks/useAutoLogout";
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
    qr: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            <path d="M14 14h3v3h-3z" /><path d="M17 17h4" /><path d="M17 21v-4" />
        </svg>
    ),
    profile: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    ),
    leave: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    ),
    ticket: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
        </svg>
    ),
    experience: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
    ),
    dot: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
        </svg>
    ),
};

// maps an action key -> { icon, type (for color), titleKey }
const actionMeta = (action) => {
    const a = (action || "").toLowerCase();
    if (a.includes("attendance") || a.includes("qr"))
        return { icon: icons.qr, type: "attendance", titleKey: "uaMarkAttendance" };
    if (a.includes("profile"))
        return { icon: icons.profile, type: "profile", titleKey: "uaUpdateProfile" };
    if (a.includes("absence") || a.includes("leave"))
        return { icon: icons.leave, type: "leave", titleKey: "uaSubmitAbsence" };
    if (a.includes("ticket"))
        return { icon: icons.ticket, type: "ticket", titleKey: "uaRaiseTicket" };
    if (a.includes("experience") || a.includes("feedback"))
        return { icon: icons.experience, type: "experience", titleKey: "uaShareExperience" };
    return { icon: icons.dot, type: "other", titleKey: "" };
};

const TYPE_FILTERS = ["all", "attendance", "leave", "ticket", "experience"];

function MyActivity() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    useAutoLogout();

    const [userId, setUserId] = useState("");
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    useEffect(() => {
        const disableRightClick = (e) => e.preventDefault();
        const disableInspectKeys = (e) => {
            if (e.key === "F12") e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) e.preventDefault();
            if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
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
            if (!user || !user.email) { navigate("/"); return; }
            const id = String(
                user.email?.split("@")[0] || ""
            ).toUpperCase();
            setUserId(id);

            try {
                const userSnap = await getDoc(doc(db, "users", id));
                if (!userSnap.exists()) { navigate("/"); return; }
                if (
                    userSnap.data().role === "admin" &&
                    userSnap.data().uid === auth.currentUser.uid
                ) {
                    navigate("/admin-dashboard");
                    return;
                }

                // Try ordered query first; fall back to unordered if composite index missing.
                let list = [];
                try {
                    const qy = query(
                        collection(db, "userLogs"),
                        where("userId", "==", id),
                        orderBy("timestamp", "desc")
                    );
                    const snap = await getDocs(qy);
                    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
                } catch (idxErr) {
                    const qy = query(collection(db, "userLogs"), where("userId", "==", id));
                    const snap = await getDocs(qy);
                    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
                    list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                }
                setLogs(list);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const decorated = useMemo(
        () => logs.map((l) => ({ ...l, meta: actionMeta(l.action) })),
        [logs]
    );

    const filtered = useMemo(
        () => (filter === "all" ? decorated : decorated.filter((l) => l.meta.type === filter)),
        [decorated, filter]
    );

    const stats = useMemo(() => {
        const counts = { total: decorated.length, attendance: 0, leave: 0, ticket: 0, experience: 0 };
        decorated.forEach((l) => {
            if (counts[l.meta.type] !== undefined) counts[l.meta.type]++;
        });
        return counts;
    }, [decorated]);

    const filterLabel = (f) => {
        if (f === "all") return t("all");
        if (f === "attendance") return t("attendance");
        if (f === "leave") return t("absenceRequests");
        if (f === "ticket") return t("myTickets");
        return t("shareExperience");
    };

    const titleFor = (l) =>
        l.meta.titleKey
            ? t(l.meta.titleKey)
            : String(l.action || "—").substring(0, 50);

    const formatTime = (ts) => {
        if (!ts) return "—";
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        if (isNaN(d)) return "—";
        return d.toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
        });
    };

    return (
        <div className="myactv__page" data-theme={theme}>
            <div className="myactv__orb myactv__orb--1" />
            <div className="myactv__orb myactv__orb--2" />

            <button className="myactv__back" onClick={() => navigate("/user-dashboard")}>
                {icons.back} {t("back")}
            </button>

            <div className="myactv__header">
                <div className="myactv__eyebrow">
                    <span className="myactv__eyebrow-dot" /> {t("activity") || "Activity"}
                </div>
                <h1 className="myactv__title">{t("myActivity") || "My Activity"}</h1>
                <p className="myactv__sub">{userId}</p>
            </div>

            <div className="myactv__stats">
                <div className="myactv__stat">
                    <span className="myactv__stat-icon myactv__stat-icon--teal">{icons.pulse}</span>
                    <div className="myactv__stat-body">
                        <span className="myactv__stat-num">{loading ? "—" : stats.total}</span>
                        <span className="myactv__stat-lbl">{t("total")}</span>
                    </div>
                </div>
                <div className="myactv__stat">
                    <span className="myactv__stat-icon myactv__stat-icon--green">{icons.qr}</span>
                    <div className="myactv__stat-body">
                        <span className="myactv__stat-num">{loading ? "—" : stats.attendance}</span>
                        <span className="myactv__stat-lbl">{t("attendance")}</span>
                    </div>
                </div>
                <div className="myactv__stat">
                    <span className="myactv__stat-icon myactv__stat-icon--amber">{icons.leave}</span>
                    <div className="myactv__stat-body">
                        <span className="myactv__stat-num">{loading ? "—" : stats.leave}</span>
                        <span className="myactv__stat-lbl">{t("absenceRequests")}</span>
                    </div>
                </div>
                <div className="myactv__stat">
                    <span className="myactv__stat-icon myactv__stat-icon--purple">{icons.ticket}</span>
                    <div className="myactv__stat-body">
                        <span className="myactv__stat-num">{loading ? "—" : stats.ticket}</span>
                        <span className="myactv__stat-lbl">{t("myTickets")}</span>
                    </div>
                </div>
            </div>

            <div className="myactv__filters">
                {TYPE_FILTERS.map((f) => (
                    <button
                        key={f}
                        className={`myactv__filter-btn ${filter === f ? "myactv__filter-btn--active" : ""}`}
                        onClick={() => setFilter(f)}
                    >
                        {filterLabel(f)}
                    </button>
                ))}
            </div>

            <div className="myactv__feed-card">
                {loading ? (
                    <div className="myactv__loading">
                        <div className="myactv__ring" />
                        <p>{t("loading")}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="myactv__empty">
                        <span className="myactv__empty-icon">🪷</span>
                        <p>{t("noActivityLogsFound") || t("allCaughtUp")}</p>
                    </div>
                ) : (
                    <div className="myactv__timeline">
                        {filtered.map((l, i) => (
                            <div key={l.id} className="myactv__item" style={{ animationDelay: `${i * 35}ms` }}>
                                <div className={`myactv__item-icon myactv__item-icon--${l.meta.type}`}>{l.meta.icon}</div>
                                <div className="myactv__item-body">
                                    <span className="myactv__item-title">{titleFor(l)}</span>
                                    {l.details && (
                                        <span className="myactv__item-sub">
                                            {String(l.details).substring(0, 200)}
                                        </span>
                                    )}
                                </div>
                                <span className="myactv__item-date">{formatTime(l.timestamp)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyActivity;