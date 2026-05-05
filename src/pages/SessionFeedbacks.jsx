import React, { useEffect, useState, useMemo } from "react";
import "./SessionFeedbacks.css";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
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
        fetchFeedbacks();
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
                    if (userSnap.exists()) userName = userSnap.data().name || data.userId;
                } catch (_) { }
                list.push({
                    id: docItem.id,
                    userId: data.userId,
                    userName,
                    sessionType: data.sessionType || "-",
                    rating: data.rating || 0,
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

    const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

    // ✅ Delete All
    const handleDeleteAll = async () => {
        if (!window.confirm(t("deleteAllConfirm"))) return;
        try {
            const snap = await getDocs(collection(db, "experiences"));
            await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "experiences", d.id))));
            setFeedbacks([]);
            setExpandedRow(null);
        } catch (err) {
            console.error(err);
        }
    };

    // ✅ Export CSV
    const handleExport = () => {
        const headers = ["User Name", "User ID", "Session", "Rating", "Rating Label", "Mood Before", "Mood After", "Date", "Comment"];
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
        <div className="sfb__page">

            <div className="sfb__orb sfb__orb--1" />
            <div className="sfb__orb sfb__orb--2" />
            <div className="sfb__orb sfb__orb--3" />
            <div className="sfb__grid" />

            {/* Back */}
            <button className="sfb__back" onClick={() => navigate("/admin-dashboard")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("back")}
            </button>

            {/* Hero */}
            <div className="sfb__hero">
                <div className="sfb__badge">
                    <span className="sfb__badge-dot" />
                    {t("adminPanel")}
                </div>
                <h1 className="sfb__title">{t("sessionFeedbacks")}</h1>
                <p className="sfb__sub">{t("sessionFeedbacksSub")}</p>
            </div>

            {/* Summary Cards */}
            {!loading && (
                <div className="sfb__summary">
                    <div className="sfb__scard sfb__scard--total">
                        <div className="sfb__scard-icon">📋</div>
                        <div className="sfb__scard-val">{filtered.length}</div>
                        <div className="sfb__scard-lbl">{t("totalFeedbacks")}</div>
                    </div>
                    <div className="sfb__scard sfb__scard--avg">
                        <div className="sfb__scard-icon">⭐</div>
                        <div className="sfb__scard-val sfb__scard-val--gold">{avgRating}</div>
                        <div className="sfb__scard-lbl">{t("averageRating")}</div>
                    </div>
                    <div className="sfb__scard sfb__scard--top">
                        <div className="sfb__scard-icon">🏆</div>
                        <div className="sfb__scard-val sfb__scard-val--sm">
                            {Object.entries(sessionDist).sort((a, b) => b[1] - a[1])[0]?.[0]
                                ? `${sessionIcons[Object.entries(sessionDist).sort((a, b) => b[1] - a[1])[0][0]] || ""} ${Object.entries(sessionDist).sort((a, b) => b[1] - a[1])[0][0]}`
                                : "—"}
                        </div>
                        <div className="sfb__scard-lbl">{t("topSession")}</div>
                    </div>
                    <div className="sfb__scard sfb__scard--mood">
                        <div className="sfb__scard-icon">✨</div>
                        <div className="sfb__scard-val sfb__scard-val--sm">
                            {filtered.length > 0
                                ? (() => { const m = {}; filtered.forEach(f => { m[f.moodAfter] = (m[f.moodAfter] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"; })()
                                : "—"}
                        </div>
                        <div className="sfb__scard-lbl">{t("topMoodAfter")}</div>
                    </div>
                </div>
            )}

            {/* Analytics */}
            {!loading && filtered.length > 0 && (
                <div className="sfb__analytics">
                    <div className="sfb__chart-card">
                        <div className="sfb__chart-title">
                            <span>✦</span> {t("ratingDistribution")}
                        </div>
                        <div className="sfb__bar-chart">
                            {[5, 4, 3, 2, 1].map(r => (
                                <div key={r} className="sfb__bar-row">
                                    <span className="sfb__bar-lbl">{r}★</span>
                                    <div className="sfb__bar-track">
                                        <div
                                            className="sfb__bar-fill sfb__bar-fill--gold"
                                            style={{ width: `${(ratingDist[r] / maxRatingCount) * 100}%` }}
                                        />
                                    </div>
                                    <span className="sfb__bar-count">{ratingDist[r]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="sfb__chart-card">
                        <div className="sfb__chart-title">
                            <span>🧘</span> {t("sessionsBreakdown")}
                        </div>
                        <div className="sfb__bar-chart">
                            {Object.entries(sessionDist).sort((a, b) => b[1] - a[1]).map(([sess, count]) => (
                                <div key={sess} className="sfb__bar-row">
                                    <span className="sfb__bar-lbl">{sessionIcons[sess] || "○"} {sess}</span>
                                    <div className="sfb__bar-track">
                                        <div
                                            className="sfb__bar-fill sfb__bar-fill--teal"
                                            style={{ width: `${(count / maxSessionCount) * 100}%` }}
                                        />
                                    </div>
                                    <span className="sfb__bar-count">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="sfb__filters">
                <div className="sfb__filter-group">
                    <label className="sfb__filter-lbl">🧘 {t("session")}</label>
                    <select className="sfb__select" value={filterSession} onChange={e => setFilterSession(e.target.value)}>
                        <option value="all">{t("allSessions")}</option>
                        <option value="breathing">🌬️ Breathing</option>
                        <option value="guided">🎙️ Guided</option>
                        <option value="silent">🤫 Silent</option>
                        <option value="movement">🌊 Movement</option>
                        <option value="sleep">🌙 Sleep</option>
                    </select>
                </div>
                <div className="sfb__filter-group">
                    <label className="sfb__filter-lbl">★ {t("rating")}</label>
                    <select className="sfb__select" value={filterRating} onChange={e => setFilterRating(e.target.value)}>
                        <option value="all">{t("allRatings")}</option>
                        <option value="5">★★★★★ Transcendent</option>
                        <option value="4">★★★★☆ Great</option>
                        <option value="3">★★★☆☆ Good</option>
                        <option value="2">★★☆☆☆ Okay</option>
                        <option value="1">★☆☆☆☆ Difficult</option>
                    </select>
                </div>
                <div className="sfb__filter-group">
                    <label className="sfb__filter-lbl">📅 {t("date")}</label>
                    <input
                        type="date"
                        className="sfb__date-input"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                    />
                </div>

                {/* ✅ Clear Filters */}
                {(filterSession !== "all" || filterRating !== "all" || filterDate) && (
                    <button className="sfb__clear-btn" onClick={() => { setFilterSession("all"); setFilterRating("all"); setFilterDate(""); }}>
                        ✕ {t("clearFilters")}
                    </button>
                )}

                {/* ✅ Export CSV */}
                <button
                    className="sfb__export-btn"
                    onClick={handleExport}
                    disabled={filtered.length === 0}
                >
                    📥 {t("exportCsv")}
                </button>

                {/* ✅ Delete All */}
                <button
                    className="sfb__deleteall-btn"
                    onClick={handleDeleteAll}
                    disabled={feedbacks.length === 0}
                >
                    🗑️ {t("deleteAll")}
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <div className="sfb__loading">
                    <div className="sfb__loader">
                        <div className="sfb__loader-ring" />
                        <div className="sfb__loader-ring sfb__loader-ring--2" />
                    </div>
                    <p>{t("loadingFeedbacks")}</p>
                </div>
            )}

            {/* Table */}
            {!loading && (
                <div className="sfb__table-wrap">
                    {filtered.length === 0 ? (
                        <div className="sfb__empty">
                            <span className="sfb__empty-icon">🪷</span>
                            <p>{t("noFeedbacksFound")}</p>
                        </div>
                    ) : (
                        <table className="sfb__table">
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
                                            className={`sfb__row ${expandedRow === f.id ? "sfb__row--expanded" : ""}`}
                                            onClick={() => setExpandedRow(expandedRow === f.id ? null : f.id)}
                                        >
                                            <td className="sfb__td-num">{i + 1}</td>
                                            <td>
                                                <div className="sfb__user-cell">
                                                    <div className="sfb__avatar">{f.userName.charAt(0).toUpperCase()}</div>
                                                    <div className="sfb__user-info">
                                                        <span className="sfb__user-name">{f.userName}</span>
                                                        <span className="sfb__user-id">{f.userId}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="sfb__session-chip">
                                                    {sessionIcons[f.sessionType] || "○"} {f.sessionType}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="sfb__rating-cell">
                                                    <span className="sfb__stars">{stars(f.rating)}</span>
                                                    <span className="sfb__rating-word">{ratingLabels[f.rating]}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="sfb__mood-cell">
                                                    <span>{moodIcons[f.moodBefore] || "○"}</span>
                                                    <span className="sfb__mood-arrow">→</span>
                                                    <span>{moodIcons[f.moodAfter] || "○"}</span>
                                                </div>
                                            </td>
                                            <td><span className="sfb__date">{f.date}</span></td>
                                            <td>
                                                <span className="sfb__comment-preview">
                                                    {f.comment.length > 40 ? f.comment.slice(0, 40) + "..." : f.comment}
                                                </span>
                                            </td>
                                        </tr>
                                        {expandedRow === f.id && (
                                            <tr className="sfb__expand-row">
                                                <td colSpan="7">
                                                    <div className="sfb__expand-content">
                                                        <div className="sfb__expand-section">
                                                            <span className="sfb__expand-label">🪶 {t("fullComment")}</span>
                                                            <p className="sfb__expand-text">{f.comment || "—"}</p>
                                                        </div>
                                                        <div className="sfb__expand-meta">
                                                            <div className="sfb__expand-item">
                                                                <span className="sfb__expand-label">{t("moodBefore")}</span>
                                                                <span>{moodIcons[f.moodBefore]} {f.moodBefore}</span>
                                                            </div>
                                                            <div className="sfb__expand-item">
                                                                <span className="sfb__expand-label">{t("moodAfter")}</span>
                                                                <span>{moodIcons[f.moodAfter]} {f.moodAfter}</span>
                                                            </div>
                                                            <div className="sfb__expand-item">
                                                                <span className="sfb__expand-label">{t("session")}</span>
                                                                <span>{sessionIcons[f.sessionType]} {f.sessionType}</span>
                                                            </div>
                                                            <div className="sfb__expand-item">
                                                                <span className="sfb__expand-label">{t("rating")}</span>
                                                                <span className="sfb__stars--sm">{stars(f.rating)} ({ratingLabels[f.rating]})</span>
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
                <p className="sfb__count-note">
                    {t("showingCount", { filtered: filtered.length, total: feedbacks.length })}
                </p>
            )}

        </div>
    );
}

export default SessionFeedbacks;