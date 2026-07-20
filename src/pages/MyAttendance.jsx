import React, { useEffect, useState } from "react";
import "./MyAttendance.css";
import { useNavigate } from "react-router-dom";

import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

import { useTranslation } from "react-i18next";
import useAutoLogout from "../hooks/useAutoLogout";

import logo from "../assets/logo2.png";

const icons = {
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
    ),
    calendar: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
    calendarCheck: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><polyline points="8.5 15 11 17.5 15.5 13" />
        </svg>
    ),
    person: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    ),
    personX: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <line x1="17" y1="8" x2="22" y2="13" /><line x1="22" y1="8" x2="17" y2="13" />
        </svg>
    ),
    star: (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2l2.9 6.06 6.6.72-4.9 4.48 1.32 6.54L12 17.9 6.08 20.3l1.32-6.54-4.9-4.48 6.6-.72L12 2z" />
        </svg>
    ),
    thumbsUp: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 10v11" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z" />
        </svg>
    ),
    heart: (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 21s-6.72-4.35-9.3-8.02C1 10.36 1.6 6.9 4.5 5.6 6.53 4.7 8.8 5.3 10 7c1.2-1.7 3.47-2.3 5.5-1.4 2.9 1.3 3.5 4.76 1.8 7.38C18.72 16.65 12 21 12 21z" />
        </svg>
    ),
};

const Leaf = () => (
    <svg className="myattn__deco myattn__leaf" width="190" viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M96 258C70 210 44 172 40 120C36 70 56 34 96 6" stroke="#86c98f" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
        <path d="M96 40C70 44 48 60 42 92C74 96 92 78 96 40Z" fill="#a7dbaf" />
        <path d="M96 40C122 44 144 60 150 92C118 96 100 78 96 40Z" fill="#8fd09a" />
        <path d="M84 108C60 114 42 132 40 162C68 162 84 142 84 108Z" fill="#9ad5a4" />
        <path d="M92 150C72 156 58 174 58 200C82 198 94 180 92 150Z" fill="#b6e2bd" />
    </svg>
);

const CalendarArt = () => (
    <svg className="myattn__cal-art" viewBox="0 0 210 170" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g opacity="0.6">
            <path d="M170 54C188 49 200 61 200 80C181 82 170 71 170 54Z" fill="#a7dbaf" />
            <path d="M176 92C193 92 204 105 202 122C185 120 176 108 176 92Z" fill="#8fd09a" />
            <path d="M28 120C14 124 4 135 6 151C24 149 30 137 28 120Z" fill="#b6e2bd" />
        </g>
        <rect x="66" y="12" width="9" height="22" rx="4.5" fill="#0f9d70" />
        <rect x="135" y="12" width="9" height="22" rx="4.5" fill="#0f9d70" />
        <rect x="40" y="24" width="130" height="124" rx="18" fill="#ffffff" stroke="#e6ebf2" strokeWidth="1.5" />
        <path d="M40 42a18 18 0 0 1 18-18h94a18 18 0 0 1 18 18v8H40z" fill="#10b981" />
        <g>
            <rect x="58" y="66" width="26" height="22" rx="6" fill="#d6f5e7" />
            <rect x="92" y="66" width="26" height="22" rx="6" fill="#10b981" />
            <rect x="126" y="66" width="26" height="22" rx="6" fill="#eef2f7" />
            <rect x="58" y="96" width="26" height="22" rx="6" fill="#10b981" />
            <rect x="92" y="96" width="26" height="22" rx="6" fill="#eef2f7" />
            <rect x="126" y="96" width="26" height="22" rx="6" fill="#d6f5e7" />
            <polyline points="99 77 103 81 111 73" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <polyline points="65 107 69 111 77 103" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
        <circle cx="156" cy="132" r="21" fill="#10b981" stroke="#ffffff" strokeWidth="4" />
        <circle cx="156" cy="126" r="5.2" fill="#ffffff" />
        <path d="M145 143a11 8.5 0 0 1 22 0z" fill="#ffffff" />
    </svg>
);

function MyAttendance() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    useAutoLogout();

    const [userName, setUserName] = useState("");
    const [userId, setUserId] = useState("");
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState("all");
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

        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user || !user.email) { navigate("/"); return; }
            const id = String(user.email.split("@")[0] || "").toUpperCase();
            setUserId(id);
            try {
                // Role guard — block admins from this user-only page
                const userRef = doc(db, "users", id);
                const userSnap = await getDoc(userRef);
                if (!userSnap.exists()) { navigate("/"); return; }
                const userData = userSnap.data();
                if (userData.role === "admin" && userData.uid === auth.currentUser.uid) {
                    navigate("/admin-dashboard");
                    return;
                }

                const snap = await getDocs(collection(db, "attendance"));
                const list = [];
                snap.forEach((d) => {
                    const data = d.data();
                    if (data.userId === id) {
                        list.push({ date: data.date, status: data.status });
                        if (data.name && !userName) setUserName(data.name);
                    }
                });
                list.sort((a, b) => new Date(b.date) - new Date(a.date)); // newest first
                setRecords(list);
            } catch (err) {
                console.log(err);
                setRecords([]);
            } finally {
                setLoading(false);
            }
        });

        return () => {
            unsub();
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    // Build list of available months for the dropdown
    const monthSet = {};
    records.forEach((r) => {
        if (r.date && /^\d{4}-\d{2}/.test(r.date)) monthSet[r.date.slice(0, 7)] = true;
    });
    const monthOptions = Object.keys(monthSet).sort((a, b) => b.localeCompare(a));

    const filtered = month === "all"
        ? records
        : records.filter((r) => r.date?.startsWith(month));

    const presentCount = filtered.filter((r) => r.status === "Present").length;
    const absentCount = filtered.filter((r) => r.status === "Absent").length;
    const total = presentCount + absentCount;
    const percentage = total > 0 ? Math.min(100, ((presentCount / total) * 100).toFixed(1)) : 0;

    const fmtMonthLabel = (m) => {
        const [y, mo] = m.split("-");
        return new Date(Number(y), Number(mo) - 1, 1).toLocaleString(undefined, {
            month: "long", year: "numeric",
        });
    };

    // Contextual badge labels (all translatable)
    const pctN = Number(percentage);
    const attnBadge = pctN >= 90
        ? (t("attnExcellent") || "Excellent!")
        : pctN >= 75
            ? (t("attnGood") || "Good")
            : (t("attnKeepGoing") || "Keep going");
    const absentBadge = absentCount === 0
        ? (t("attnPerfect") || "Perfect!")
        : (t("attnStayFocused") || "Stay focused");
    const periodBadge = month === "all"
        ? (t("allMonths") || "All Months")
        : fmtMonthLabel(month);

    return (
        <div className="myattn__container" data-theme={theme}>
            {/* decorations */}
            <div className="myattn__orb myattn__orb--1" />
            <div className="myattn__orb myattn__orb--2" />
            <div className="myattn__deco myattn__dots myattn__dots--1" aria-hidden="true" />
            <div className="myattn__deco myattn__dots myattn__dots--2" aria-hidden="true" />
            <Leaf />

            <div className="myattn__inner">
                <button className="myattn__back-btn" onClick={() => navigate("/user-dashboard")}>
                    {icons.back}{t("back") || "Back"}
                </button>

                <div className="myattn__header">
                    <div className="myattn__header-left">
                        <div className="myattn__logo-tile">
                            <img src={logo} alt="Logo" className="myattn__logo" />
                        </div>
                        <div className="myattn__header-text">
                            <p className="myattn__portal-label">{t("attendancePortal") || "Attendance Portal"}</p>
                            <h1 className="myattn__title">{t("myAttendance") || "My Attendance"}</h1>
                            <p className="myattn__subtitle">
                                {t("attendanceSubtitle") || "Track your daily attendance and stay consistent."}
                            </p>
                        </div>
                    </div>
                    <CalendarArt />
                </div>

                {/* Summary stats */}
                <div className="myattn__stats">
                    <div className="myattn__stat myattn__stat--pct">
                        <span className="myattn__stat-blob" aria-hidden="true" />
                        <div className="myattn__stat-top">
                            <span className="myattn__stat-icon">{icons.calendarCheck}</span>
                            <div className="myattn__stat-nums">
                                <span className="myattn__stat-val">{percentage}%</span>
                                <span className="myattn__stat-label">{t("attendance")}</span>
                            </div>
                        </div>
                        <span className="myattn__stat-badge">{icons.star}{attnBadge}</span>
                    </div>

                    <div className="myattn__stat myattn__stat--present">
                        <span className="myattn__stat-blob" aria-hidden="true" />
                        <div className="myattn__stat-top">
                            <span className="myattn__stat-icon">{icons.person}</span>
                            <div className="myattn__stat-nums">
                                <span className="myattn__stat-val">{presentCount}</span>
                                <span className="myattn__stat-label">{t("presentDays")}</span>
                            </div>
                        </div>
                        <span className="myattn__stat-badge">{icons.thumbsUp}{t("attnKeepItUp") || "Keep it up!"}</span>
                    </div>

                    <div className="myattn__stat myattn__stat--absent">
                        <span className="myattn__stat-blob" aria-hidden="true" />
                        <div className="myattn__stat-top">
                            <span className="myattn__stat-icon">{icons.personX}</span>
                            <div className="myattn__stat-nums">
                                <span className="myattn__stat-val">{absentCount}</span>
                                <span className="myattn__stat-label">{t("absentDays")}</span>
                            </div>
                        </div>
                        <span className="myattn__stat-badge">{icons.heart}{absentBadge}</span>
                    </div>

                    <div className="myattn__stat myattn__stat--total">
                        <span className="myattn__stat-blob" aria-hidden="true" />
                        <div className="myattn__stat-top">
                            <span className="myattn__stat-icon">{icons.calendar}</span>
                            <div className="myattn__stat-nums">
                                <span className="myattn__stat-val">{total}</span>
                                <span className="myattn__stat-label">{t("totalDays") || "Total Days"}</span>
                            </div>
                        </div>
                        <span className="myattn__stat-badge">{icons.calendar}{periodBadge}</span>
                    </div>
                </div>

                {/* Month filter */}
                <div className="myattn__filter">
                    <span className="myattn__filter-icon">{icons.calendar}</span>
                    <select
                        className="myattn__select"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                    >
                        <option value="all">{t("allMonths") || "All Months"}</option>
                        {monthOptions.map((m) => (
                            <option key={m} value={m}>{fmtMonthLabel(m)}</option>
                        ))}
                    </select>
                </div>

                {/* History table */}
                {loading ? (
                    <div className="myattn__spinner-wrap"><div className="myattn__spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="myattn__empty"><span>📭</span>{t("noAttendanceFound")}</div>
                ) : (
                    <div className="myattn__table-wrap">
                        <table className="myattn__table">
                            <thead>
                                <tr>
                                    <th>{t("date")}</th>
                                    <th>{t("status")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, i) => (
                                    <tr key={`${r.date}-${i}`}>
                                        <td>
                                            <div className="myattn__td-date">
                                                <span className="myattn__date-icon">{icons.calendar}</span>
                                                {r.date}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={r.status === "Present" ? "myattn__badge myattn__badge--present" : "myattn__badge myattn__badge--absent"}>
                                                {r.status === "Present" ? `✓ ${t("present")}` : `✗ ${t("absent")}`}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyAttendance;