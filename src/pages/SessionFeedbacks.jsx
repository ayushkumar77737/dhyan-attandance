import React, { useEffect, useState, useMemo } from "react";
import "./SessionFeedbacks.css";
import { logAdminAction } from "../utils/logAdminAction";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import { collection, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

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
                let userName = data.userId || "Unknown";
                try {
                    const userSnap = await getDoc(doc(db, "users", data.userId));
                    if (
                        userSnap.exists() &&
                        userSnap.data().deleted !== true
                    ) {
                        userName = userSnap.data().name || data.userId;
                    }
                } catch (_) { }
                list.push({
                    id: docItem.id,
                    userId: data.userId,
                    userName,
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
            list.sort((a, b) => new Date(b.date) - new Date(a.date));
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
    const ratingLabels = { 1: "Difficult", 2: "Okay", 3: "Good", 4: "Great", 5: "Transcendent" };

    const stars = (n) => {
        n = Math.min(Math.max(Number(n) || 0, 0), 5);
        return "★".repeat(n) + "☆".repeat(5 - n);
    };

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
            ratingLabels[f.rating] || "",
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

    return (
        <div className="ssfb__page" data-theme={theme}>

            <div className="ssfb__orb ssfb__orb--1" />
            <div className="ssfb__orb ssfb__orb--2" />
            <div className="ssfb__orb ssfb__orb--3" />
            <div className="ssfb__grid" />

            <button className="ssfb__back" onClick={() => navigate("/admin-dashboard")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("back")}
            </button>

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
                        <div className="ssfb__scard-icon">📋</div>
                        <div className="ssfb__scard-val">{filtered.length}</div>
                        <div className="ssfb__scard-lbl">{t("totalFeedbacks")}</div>
                    </div>
                    <div className="ssfb__scard ssfb__scard--avg">
                        <div className="ssfb__scard-icon">⭐</div>
                        <div className="ssfb__scard-val ssfb__scard-val--gold">{avgRating}</div>
                        <div className="ssfb__scard-lbl">{t("averageRating")}</div>
                    </div>
                    <div className="ssfb__scard ssfb__scard--top">
                        <div className="ssfb__scard-icon">🏆</div>
                        <div className="ssfb__scard-val ssfb__scard-val--sm">
                            {Object.entries(sessionDist).sort((a, b) => b[1] - a[1])[0]?.[0]
                                ? `${sessionIcons[Object.entries(sessionDist).sort((a, b) => b[1] - a[1])[0][0]] || ""} ${Object.entries(sessionDist).sort((a, b) => b[1] - a[1])[0][0]}`
                                : "—"}
                        </div>
                        <div className="ssfb__scard-lbl">{t("topSession")}</div>
                    </div>
                    <div className="ssfb__scard ssfb__scard--mood">
                        <div className="ssfb__scard-icon">✨</div>
                        <div className="ssfb__scard-val ssfb__scard-val--sm">
                            {filtered.length > 0
                                ? (() => { const m = {}; filtered.forEach(f => { m[f.moodAfter] = (m[f.moodAfter] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"; })()
                                : "—"}
                        </div>
                        <div className="ssfb__scard-lbl">{t("topMoodAfter")}</div>
                    </div>
                </div>
            )}

            {!loading && filtered.length > 0 && (
                <div className="ssfb__analytics">
                    <div className="ssfb__chart-card">
                        <div className="ssfb__chart-top-line" />
                        <div className="ssfb__chart-title">
                            <span>✦</span> {t("ratingDistribution")}
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
                        <div className="ssfb__chart-title">
                            <span>🧘</span> {t("sessionsBreakdown")}
                        </div>
                        <div className="ssfb__bar-chart">
                            {Object.entries(sessionDist).sort((a, b) => b[1] - a[1]).map(([sess, count]) => (
                                <div key={sess} className="ssfb__bar-row">
                                    <span className="ssfb__bar-lbl">{sessionIcons[sess] || "○"} {sess}</span>
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
                    <label className="ssfb__filter-lbl">🧘 {t("session")}</label>
                    <select className="ssfb__select" value={filterSession} onChange={e => setFilterSession(e.target.value)}>
                        <option value="all">{t("allSessions")}</option>
                        <option value="breathing">🌬️ Breathing</option>
                        <option value="guided">🎙️ Guided</option>
                        <option value="silent">🤫 Silent</option>
                        <option value="movement">🌊 Movement</option>
                        <option value="sleep">🌙 Sleep</option>
                    </select>
                </div>
                <div className="ssfb__filter-group">
                    <label className="ssfb__filter-lbl">★ {t("rating")}</label>
                    <select className="ssfb__select" value={filterRating} onChange={e => setFilterRating(e.target.value)}>
                        <option value="all">{t("allRatings")}</option>
                        <option value="5">★★★★★ Transcendent</option>
                        <option value="4">★★★★☆ Great</option>
                        <option value="3">★★★☆☆ Good</option>
                        <option value="2">★★☆☆☆ Okay</option>
                        <option value="1">★☆☆☆☆ Difficult</option>
                    </select>
                </div>
                <div className="ssfb__filter-group">
                    <label className="ssfb__filter-lbl">📅 {t("date")}</label>
                    <input
                        type="date"
                        className="ssfb__date-input"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                    />
                </div>

                {(filterSession !== "all" || filterRating !== "all" || filterDate) && (
                    <button className="ssfb__clear-btn" onClick={() => { setFilterSession("all"); setFilterRating("all"); setFilterDate(""); }}>
                        ✕ {t("clearFilters")}
                    </button>
                )}

                <button className="ssfb__export-btn" onClick={handleExport} disabled={filtered.length === 0}>
                    📥 {t("exportCsv")}
                </button>

                <button className="ssfb__deleteall-btn" onClick={() => setShowDeleteAll(true)} disabled={feedbacks.length === 0}>
                    🗑️ {t("deleteAll")}
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
                            <span className="ssfb__empty-icon">🪷</span>
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
                                                    <div className="ssfb__avatar">{f.userName.charAt(0).toUpperCase()}</div>
                                                    <div className="ssfb__user-info">
                                                        <span className="ssfb__user-name">{f.userName}</span>
                                                        <span className="ssfb__user-id">{f.userId}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="ssfb__session-chip">
                                                    {sessionIcons[f.sessionType] || "○"} {f.sessionType}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="ssfb__rating-cell">
                                                    <span className="ssfb__stars">{stars(f.rating)}</span>
                                                    <span className="ssfb__rating-word">{ratingLabels[f.rating]}</span>
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
                                                            <span className="ssfb__expand-label">🪶 {t("fullComment")}</span>
                                                            <p className="ssfb__expand-text">{f.comment || "—"}</p>
                                                        </div>
                                                        <div className="ssfb__expand-meta">
                                                            <div className="ssfb__expand-item">
                                                                <span className="ssfb__expand-label">{t("moodBefore")}</span>
                                                                <span>{moodIcons[f.moodBefore]} {f.moodBefore}</span>
                                                            </div>
                                                            <div className="ssfb__expand-item">
                                                                <span className="ssfb__expand-label">{t("moodAfter")}</span>
                                                                <span>{moodIcons[f.moodAfter]} {f.moodAfter}</span>
                                                            </div>
                                                            <div className="ssfb__expand-item">
                                                                <span className="ssfb__expand-label">{t("session")}</span>
                                                                <span>{sessionIcons[f.sessionType]} {f.sessionType}</span>
                                                            </div>
                                                            <div className="ssfb__expand-item">
                                                                <span className="ssfb__expand-label">{t("rating")}</span>
                                                                <span className="ssfb__stars--sm">{stars(f.rating)} ({ratingLabels[f.rating]})</span>
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

            {showDeleteAll && (
                <div className="ssfb__modal-overlay" onClick={() => !deletingAll && setShowDeleteAll(false)}>
                    <div className="ssfb__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ssfb__modal-icon">🗑️</div>
                        <h3 className="ssfb__modal-title">{t("deleteAllFeedbacksTitle")}</h3>
                        <p className="ssfb__modal-desc">{t("deleteAllFeedbacksMsg")}</p>
                        <div className="ssfb__modal-actions">
                            <button className="ssfb__modal-cancel" onClick={() => setShowDeleteAll(false)} disabled={deletingAll}>
                                {t("cancel")}
                            </button>
                            <button className="ssfb__modal-confirm" onClick={handleDeleteAll} disabled={deletingAll}>
                                {deletingAll ? `⏳ ${t("deleting")}` : `🗑 ${t("deleteAll")}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default SessionFeedbacks;