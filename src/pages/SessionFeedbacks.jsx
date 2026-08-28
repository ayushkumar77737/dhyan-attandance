import React, { useEffect, useState, useMemo } from "react";
import "./SessionFeedbacks.css";
import { logAdminAction } from "../utils/logAdminAction";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import { collection, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

/* ----------------------------------------------------------------
   Cloudinary
   Mirrors the public_id formula used in utils/cloudinaryUpload.js:
   `${employeeId}_${name with spaces -> underscores}`
   If that formula ever changes there, change it here too.
   ---------------------------------------------------------------- */

const CLOUD_NAME = "dgvjq9bhl";

const getProfileImageUrl = (employeeId, name = "", size = 120) => {
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

/* ---------------------------------------------------------------- */
/* Inline icons (stroke = currentColor, so they inherit theme color) */
/* ---------------------------------------------------------------- */

const IcoChevron = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" className="ssfb__ico">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const IcoClipboard = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="ssfb__ico">
        <rect x="5" y="4" width="14" height="17" rx="2.6" />
        <path d="M9 4.2a1.6 1.6 0 0 1 1.6-1.4h2.8A1.6 1.6 0 0 1 15 4.2v1.3H9V4.2Z" />
        <path d="M9 11h6M9 15h4" />
    </svg>
);

const IcoStar = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="ssfb__ico">
        <path d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.4l5.9-.8L12 3.2Z" />
    </svg>
);

const IcoTrophy = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="ssfb__ico">
        <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4Z" />
        <path d="M7.5 5.5H5a2 2 0 0 0 0 4h2.6M16.5 5.5H19a2 2 0 0 1 0 4h-2.6" />
        <path d="M12 13.5V17M9 20.5h6M10 17h4" />
    </svg>
);

const IcoSparkle = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="ssfb__ico">
        <path d="M12 2.8l1.7 4.9 4.9 1.7-4.9 1.7-1.7 4.9-1.7-4.9L5.4 9.4l4.9-1.7L12 2.8Z" />
        <path d="M18.5 15l.8 2.3 2.2.8-2.2.8-.8 2.3-.8-2.3-2.2-.8 2.2-.8.8-2.3Z" opacity="0.7" />
    </svg>
);

const IcoLotus = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" className="ssfb__ico">
        <path d="M12 4.5c1.9 1.9 2.8 4 2.8 6.4S13.9 15.6 12 17.5c-1.9-1.9-2.8-4.1-2.8-6.6S10.1 6.4 12 4.5Z" />
        <path d="M9.2 10.9C7.6 9.9 5.8 9.6 3.8 10c.3 3.4 2.4 6.2 5.6 7.3M14.8 10.9c1.6-1 3.4-1.3 5.4-.9-.3 3.4-2.4 6.2-5.6 7.3" />
        <path d="M4.4 15.5c2.1 2.5 4.6 3.8 7.6 3.8s5.5-1.3 7.6-3.8" />
    </svg>
);

const IcoCalendar = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="ssfb__ico">
        <rect x="3" y="4.5" width="18" height="17" rx="3" />
        <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </svg>
);

const IcoDownload = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" className="ssfb__ico">
        <path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M4 20h16" />
    </svg>
);

const IcoTrash = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="ssfb__ico">
        <path d="M4 7h16M9.5 7V4.8A.8.8 0 0 1 10.3 4h3.4a.8.8 0 0 1 .8.8V7" />
        <path d="M6.5 7l.8 12.2a1.8 1.8 0 0 0 1.8 1.8h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
    </svg>
);

const IcoClose = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" className="ssfb__ico">
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

const IcoQuote = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="ssfb__ico">
        <path d="M9.5 5.5c-3 1.6-4.8 4.2-4.8 7.4 0 3.2 1.7 5.3 4.2 5.3 2 0 3.5-1.5 3.5-3.4 0-1.9-1.3-3.2-3-3.2-.3 0-.7 0-1 .2.4-1.7 1.6-3.2 3.4-4.3l-2.3-2Zm9 0c-3 1.6-4.8 4.2-4.8 7.4 0 3.2 1.7 5.3 4.2 5.3 2 0 3.5-1.5 3.5-3.4 0-1.9-1.3-3.2-3-3.2-.3 0-.7 0-1 .2.4-1.7 1.6-3.2 3.4-4.3l-2.3-2Z" />
    </svg>
);

/* ---------------------------------------------------------------- */
/* Avatar — photo if we have one, gold initial otherwise             */
/* ---------------------------------------------------------------- */

function UserAvatar({ src, name, label }) {

    const [showImage, setShowImage] = useState(Boolean(src));
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setShowImage(Boolean(src));
        setLoaded(false);
    }, [src]);

    return (
        <div className="ssfb__avatar">
            {showImage ? (
                <img
                    src={src}
                    alt={label}
                    className={`ssfb__avatar-img${loaded ? " is-loaded" : ""}`}
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

function SessionFeedbacks() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterSession, setFilterSession] = useState("all");
    const [filterRating, setFilterRating] = useState("all");
    const [filterDate, setFilterDate] = useState("");
    const [expandedRow, setExpandedRow] = useState(null);

    const [showDeleteAll, setShowDeleteAll] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

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

            fetchFeedbacks();

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
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    useEffect(() => {
        checkAdmin();
    }, []);

    const fetchFeedbacks = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "experiences"));
            const list = [];
            for (const docItem of snap.docs) {
                const data = docItem.data();
                let userName = data.userId || t("unknownUser");
                let photo = "";
                try {
                    const userSnap = await getDoc(doc(db, "users", data.userId));
                    if (
                        userSnap.exists() &&
                        userSnap.data().deleted !== true
                    ) {
                        const user = userSnap.data();
                        userName = user.name || data.userId;
                        photo =
                            user.profileImage ||
                            user.photoURL ||
                            user.profileImageUrl ||
                            user.imageUrl ||
                            "";
                    }
                } catch (_) { }
                list.push({
                    id: docItem.id,
                    userId: data.userId,
                    userName,
                    photo: photo || getProfileImageUrl(data.userId, userName),
                    sessionType: data.sessionType || "-",
                    rating: Math.min(
                        Math.max(Number(data.rating) || 0, 0),
                        5
                    ),
                    comment: data.comment || "",
                    moodBefore: data.moodBefore || "-",
                    moodAfter: data.moodAfter || "-",
                    date: data.date || data.createdAt?.split("T")[0] || "-",
                });
            }
            list.sort((a, b) =>
                String(a.userId || "").localeCompare(String(b.userId || ""), undefined, { numeric: true })
            );
            setFeedbacks(list);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        return feedbacks.filter(f => {
            if (filterSession !== "all" && f.sessionType !== filterSession) return false;
            if (filterRating !== "all" && f.rating !== parseInt(filterRating)) return false;
            if (filterDate && f.date !== filterDate) return false;
            return true;
        });
    }, [feedbacks, filterSession, filterRating, filterDate]);

    const avgRating = useMemo(() => {
        if (!filtered.length) return 0;
        return (filtered.reduce((s, f) => s + f.rating, 0) / filtered.length).toFixed(1);
    }, [filtered]);

    const ratingDist = useMemo(() => {
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        filtered.forEach(f => { if (f.rating) dist[f.rating]++; });
        return dist;
    }, [filtered]);

    const sessionDist = useMemo(() => {
        const dist = {};
        filtered.forEach(f => {
            dist[f.sessionType] = (dist[f.sessionType] || 0) + 1;
        });
        return dist;
    }, [filtered]);

    const maxSessionCount = Math.max(...Object.values(sessionDist), 1);
    const maxRatingCount = Math.max(...Object.values(ratingDist), 1);

    const sessionIcons = {
        breathing: "🌬️", guided: "🎙️", silent: "🤫", movement: "🌊", sleep: "🌙"
    };
    const moodIcons = {
        anxious: "😰", tired: "😴", neutral: "😐", calm: "😌", joyful: "✨"
    };

    /* Session + mood + rating names all come from the locale files. */
    const sessionLabel = (key) => {
        const map = {
            breathing: "sessionBreathing",
            guided: "sessionGuided",
            silent: "sessionSilent",
            movement: "sessionMovement",
            sleep: "sessionSleep",
        };
        return map[key] ? t(map[key]) : key;
    };

    const moodLabel = (key) => {
        const map = {
            anxious: "moodAnxious",
            tired: "moodTired",
            neutral: "moodNeutral",
            calm: "moodCalm",
            joyful: "moodJoyful",
        };
        return map[key] ? t(map[key]) : key;
    };

    const ratingLabel = (n) => {
        const map = {
            1: "ratingDifficult",
            2: "ratingOkay",
            3: "ratingGood",
            4: "ratingGreat",
            5: "ratingTranscendent",
        };
        return map[n] ? t(map[n]) : "";
    };

    const stars = (n) => {
        n = Math.min(Math.max(Number(n) || 0, 0), 5);
        return "★".repeat(n) + "☆".repeat(5 - n);
    };

    const topSession = useMemo(() => {
        const entries = Object.entries(sessionDist).sort((a, b) => b[1] - a[1]);
        return entries[0]?.[0] || "";
    }, [sessionDist]);

    const topMood = useMemo(() => {
        if (!filtered.length) return "";
        const m = {};
        filtered.forEach(f => { m[f.moodAfter] = (m[f.moodAfter] || 0) + 1; });
        return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    }, [filtered]);

    const handleDeleteAll = async () => {
        try {
            setDeletingAll(true);
            const snap = await getDocs(collection(db, "experiences"));
            await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "experiences", d.id))));
            await logAdminAction("delete_all_feedbacks", {
                details: t("logDeletedAllFeedbacks", { count: snap.docs.length }),
            });
            setFeedbacks([]);
            setExpandedRow(null);
            setShowDeleteAll(false);
        } catch (err) {
            console.error(err);
        } finally {
            setDeletingAll(false);
        }
    };

    const handleExport = () => {
        const headers = ["User Name", "User ID", "Session", "Rating", "Rating Label", "Mood Before", "Mood After", "Date", "Comment"];
        if (filtered.length === 0) {
            return;
        }
        const rows = filtered.map(f => [
            f.userName,
            f.userId,
            f.sessionType,
            f.rating,
            ratingLabel(f.rating),
            f.moodBefore,
            f.moodAfter,
            f.date,
            `"${f.comment.replace(/"/g, '""')}"`
        ]);
        const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `session-feedbacks-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const hasFilters =
        filterSession !== "all" || filterRating !== "all" || filterDate;

    return (
        <div className="ssfb__page" data-theme={theme}>

            <div className="ssfb__blob ssfb__blob--1" />
            <div className="ssfb__blob ssfb__blob--2" />
            <div className="ssfb__grid" />

            <button className="ssfb__back" onClick={() => navigate("/admin-dashboard")}>
                <IcoChevron /> {t("back")}
            </button>

            <div className="ssfb__shell">

                <div className="ssfb__hero">
                    <div className="ssfb__badge">
                        <span className="ssfb__badge-dot" />
                        {t("adminPanel")}
                    </div>
                    <h1 className="ssfb__title">{t("sessionFeedbacks")}</h1>
                    <p className="ssfb__sub">{t("sessionFeedbacksSub")}</p>
                    <div className="ssfb__title-line" />
                </div>

                {!loading && (
                    <div className="ssfb__summary">

                        <div className="ssfb__scard ssfb__scard--total">
                            <span className="ssfb__scard-icon"><IcoClipboard /></span>
                            <span className="ssfb__scard-val">{filtered.length}</span>
                            <span className="ssfb__scard-lbl">{t("totalFeedbacks")}</span>
                        </div>

                        <div className="ssfb__scard ssfb__scard--avg">
                            <span className="ssfb__scard-icon"><IcoStar /></span>
                            <span className="ssfb__scard-val ssfb__scard-val--gold">{avgRating}</span>
                            <span className="ssfb__scard-lbl">{t("averageRating")}</span>
                        </div>

                        <div className="ssfb__scard ssfb__scard--top">
                            <span className="ssfb__scard-icon"><IcoTrophy /></span>
                            <span className="ssfb__scard-val ssfb__scard-val--sm">
                                {topSession ? (
                                    <>
                                        <span className="ssfb__scard-emoji">
                                            {sessionIcons[topSession] || "○"}
                                        </span>
                                        {sessionLabel(topSession)}
                                    </>
                                ) : "—"}
                            </span>
                            <span className="ssfb__scard-lbl">{t("topSession")}</span>
                        </div>

                        <div className="ssfb__scard ssfb__scard--mood">
                            <span className="ssfb__scard-icon"><IcoSparkle /></span>
                            <span className="ssfb__scard-val ssfb__scard-val--sm">
                                {topMood ? (
                                    <>
                                        <span className="ssfb__scard-emoji">
                                            {moodIcons[topMood] || "○"}
                                        </span>
                                        {moodLabel(topMood)}
                                    </>
                                ) : "—"}
                            </span>
                            <span className="ssfb__scard-lbl">{t("topMoodAfter")}</span>
                        </div>

                    </div>
                )}

                {!loading && filtered.length > 0 && (
                    <div className="ssfb__analytics">

                        <div className="ssfb__chart-card">
                            <div className="ssfb__chart-top-line" />
                            <div className="ssfb__chart-title">
                                <IcoStar /> {t("ratingDistribution")}
                            </div>
                            <div className="ssfb__bar-chart">
                                {[5, 4, 3, 2, 1].map(r => (
                                    <div key={r} className="ssfb__bar-row">
                                        <span className="ssfb__bar-lbl">{r}★</span>
                                        <div className="ssfb__bar-track">
                                            <div
                                                className="ssfb__bar-fill ssfb__bar-fill--gold"
                                                style={{ width: `${(ratingDist[r] / maxRatingCount) * 100}%` }}
                                            />
                                        </div>
                                        <span className="ssfb__bar-count">{ratingDist[r]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="ssfb__chart-card">
                            <div className="ssfb__chart-top-line ssfb__chart-top-line--teal" />
                            <div className="ssfb__chart-title ssfb__chart-title--teal">
                                <IcoLotus /> {t("sessionsBreakdown")}
                            </div>
                            <div className="ssfb__bar-chart">
                                {Object.entries(sessionDist).sort((a, b) => b[1] - a[1]).map(([sess, count]) => (
                                    <div key={sess} className="ssfb__bar-row">
                                        <span className="ssfb__bar-lbl">
                                            <span className="ssfb__bar-emoji">{sessionIcons[sess] || "○"}</span>
                                            {sessionLabel(sess)}
                                        </span>
                                        <div className="ssfb__bar-track">
                                            <div
                                                className="ssfb__bar-fill ssfb__bar-fill--teal"
                                                style={{ width: `${(count / maxSessionCount) * 100}%` }}
                                            />
                                        </div>
                                        <span className="ssfb__bar-count">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

                <div className="ssfb__filters">

                    <div className="ssfb__filter-group">
                        <label className="ssfb__filter-lbl">
                            <IcoLotus /> {t("session")}
                        </label>
                        <select
                            className="ssfb__select"
                            value={filterSession}
                            onChange={e => setFilterSession(e.target.value)}
                        >
                            <option value="all">{t("allSessions")}</option>
                            <option value="breathing">{t("sessionBreathing")}</option>
                            <option value="guided">{t("sessionGuided")}</option>
                            <option value="silent">{t("sessionSilent")}</option>
                            <option value="movement">{t("sessionMovement")}</option>
                            <option value="sleep">{t("sessionSleep")}</option>
                        </select>
                    </div>

                    <div className="ssfb__filter-group">
                        <label className="ssfb__filter-lbl">
                            <IcoStar /> {t("rating")}
                        </label>
                        <select
                            className="ssfb__select"
                            value={filterRating}
                            onChange={e => setFilterRating(e.target.value)}
                        >
                            <option value="all">{t("allRatings")}</option>
                            <option value="5">★★★★★ {t("ratingTranscendent")}</option>
                            <option value="4">★★★★☆ {t("ratingGreat")}</option>
                            <option value="3">★★★☆☆ {t("ratingGood")}</option>
                            <option value="2">★★☆☆☆ {t("ratingOkay")}</option>
                            <option value="1">★☆☆☆☆ {t("ratingDifficult")}</option>
                        </select>
                    </div>

                    <div className="ssfb__filter-group">
                        <label className="ssfb__filter-lbl">
                            <IcoCalendar /> {t("date")}
                        </label>
                        <input
                            type="date"
                            className="ssfb__date-input"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                        />
                    </div>

                    {hasFilters && (
                        <button
                            className="ssfb__clear-btn"
                            onClick={() => {
                                setFilterSession("all");
                                setFilterRating("all");
                                setFilterDate("");
                            }}
                        >
                            <IcoClose /> {t("clearFilters")}
                        </button>
                    )}

                    <button
                        className="ssfb__export-btn"
                        onClick={handleExport}
                        disabled={filtered.length === 0}
                    >
                        <IcoDownload /> {t("exportCsv")}
                    </button>

                    <button
                        className="ssfb__deleteall-btn"
                        onClick={() => setShowDeleteAll(true)}
                        disabled={feedbacks.length === 0}
                    >
                        <IcoTrash /> {t("deleteAll")}
                    </button>

                </div>

                {loading && (
                    <div className="ssfb__loading">
                        <div className="ssfb__loader">
                            <div className="ssfb__loader-ring" />
                            <div className="ssfb__loader-ring ssfb__loader-ring--2" />
                        </div>
                        <p>{t("loadingFeedbacks")}</p>
                    </div>
                )}

                {!loading && (
                    <div className="ssfb__table-wrap">
                        {filtered.length === 0 ? (
                            <div className="ssfb__empty">
                                <span className="ssfb__empty-icon"><IcoLotus /></span>
                                <p>{t("noFeedbacksFound")}</p>
                            </div>
                        ) : (
                            <table className="ssfb__table">
                                <thead>
                                    <tr>
                                        <th>{t("hash")}</th>
                                        <th>{t("user")}</th>
                                        <th>{t("session")}</th>
                                        <th>{t("rating")}</th>
                                        <th>{t("mood")}</th>
                                        <th>{t("date")}</th>
                                        <th>{t("comment")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((f, i) => (
                                        <React.Fragment key={f.id}>
                                            <tr
                                                className={`ssfb__row ${expandedRow === f.id ? "ssfb__row--expanded" : ""}`}
                                                onClick={() => setExpandedRow(expandedRow === f.id ? null : f.id)}
                                            >
                                                <td className="ssfb__td-num">{i + 1}</td>
                                                <td>
                                                    <div className="ssfb__user-cell">
                                                        <UserAvatar
                                                            src={f.photo}
                                                            name={f.userName}
                                                            label={f.userName || t("profilePhoto")}
                                                        />
                                                        <div className="ssfb__user-info">
                                                            <span className="ssfb__user-name">{f.userName}</span>
                                                            <span className="ssfb__user-id">{f.userId}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`ssfb__session-chip ssfb__session-chip--${f.sessionType}`}>
                                                        <span className="ssfb__chip-emoji">
                                                            {sessionIcons[f.sessionType] || "○"}
                                                        </span>
                                                        {sessionLabel(f.sessionType)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="ssfb__rating-cell">
                                                        <span className="ssfb__stars">{stars(f.rating)}</span>
                                                        <span className="ssfb__rating-word">{ratingLabel(f.rating)}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="ssfb__mood-cell">
                                                        <span>{moodIcons[f.moodBefore] || "○"}</span>
                                                        <span className="ssfb__mood-arrow">→</span>
                                                        <span>{moodIcons[f.moodAfter] || "○"}</span>
                                                    </div>
                                                </td>
                                                <td><span className="ssfb__date">{f.date}</span></td>
                                                <td>
                                                    <span className="ssfb__comment-preview">
                                                        {(f.comment || "").length > 40
                                                            ? (f.comment || "").slice(0, 40) + "..."
                                                            : (f.comment || "")}
                                                    </span>
                                                </td>
                                            </tr>
                                            {expandedRow === f.id && (
                                                <tr className="ssfb__expand-row">
                                                    <td colSpan="7">
                                                        <div className="ssfb__expand-content">
                                                            <div className="ssfb__expand-section">
                                                                <span className="ssfb__expand-label">
                                                                    <IcoQuote /> {t("fullComment")}
                                                                </span>
                                                                <p className="ssfb__expand-text">{f.comment || "—"}</p>
                                                            </div>
                                                            <div className="ssfb__expand-meta">
                                                                <div className="ssfb__expand-item">
                                                                    <span className="ssfb__expand-label">{t("moodBefore")}</span>
                                                                    <span>{moodIcons[f.moodBefore]} {moodLabel(f.moodBefore)}</span>
                                                                </div>
                                                                <div className="ssfb__expand-item">
                                                                    <span className="ssfb__expand-label">{t("moodAfter")}</span>
                                                                    <span>{moodIcons[f.moodAfter]} {moodLabel(f.moodAfter)}</span>
                                                                </div>
                                                                <div className="ssfb__expand-item">
                                                                    <span className="ssfb__expand-label">{t("session")}</span>
                                                                    <span>{sessionIcons[f.sessionType]} {sessionLabel(f.sessionType)}</span>
                                                                </div>
                                                                <div className="ssfb__expand-item">
                                                                    <span className="ssfb__expand-label">{t("rating")}</span>
                                                                    <span className="ssfb__stars--sm">
                                                                        {stars(f.rating)} ({ratingLabel(f.rating)})
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {!loading && filtered.length > 0 && (
                    <p className="ssfb__count-note">
                        {t("showingCount", { filtered: filtered.length, total: feedbacks.length })}
                    </p>
                )}

            </div>

            {showDeleteAll && (
                <div className="ssfb__modal-overlay" onClick={() => !deletingAll && setShowDeleteAll(false)}>
                    <div className="ssfb__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ssfb__modal-icon"><IcoTrash /></div>
                        <h3 className="ssfb__modal-title">{t("deleteAllFeedbacksTitle")}</h3>
                        <p className="ssfb__modal-desc">{t("deleteAllFeedbacksMsg")}</p>
                        <div className="ssfb__modal-actions">
                            <button
                                className="ssfb__modal-cancel"
                                onClick={() => setShowDeleteAll(false)}
                                disabled={deletingAll}
                            >
                                {t("cancel")}
                            </button>
                            <button
                                className="ssfb__modal-confirm"
                                onClick={handleDeleteAll}
                                disabled={deletingAll}
                            >
                                {deletingAll ? (
                                    <><span className="ssfb__btn-spin" /> {t("deleting")}</>
                                ) : (
                                    <><IcoTrash /> {t("deleteAll")}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default SessionFeedbacks;