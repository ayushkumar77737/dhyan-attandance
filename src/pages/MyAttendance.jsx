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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
    ),
    calendar: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
};

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

    return (
        <div className="myattn__container" data-theme={theme}>
            <div className="myattn__header">
                <div className="myattn__header-left">
                    <button className="myattn__back-btn" onClick={() => navigate("/user-dashboard")}>
                        {icons.back}
                    </button>
                    <img src={logo} alt="Logo" className="myattn__logo" />
                    <div className="myattn__header-text">
                        <p className="myattn__portal-label">{t("attendancePortal") || "Attendance Portal"}</p>
                        <h1 className="myattn__title">{t("myAttendance") || "My Attendance"}</h1>
                    </div>
                </div>
            </div>

            {/* Summary stats */}
            <div className="myattn__stats">
                <div className="myattn__stat myattn__stat--pct">
                    <span className="myattn__stat-val">{percentage}%</span>
                    <span className="myattn__stat-label">{t("attendance")}</span>
                </div>
                <div className="myattn__stat myattn__stat--present">
                    <span className="myattn__stat-val">{presentCount}</span>
                    <span className="myattn__stat-label">{t("presentDays")}</span>
                </div>
                <div className="myattn__stat myattn__stat--absent">
                    <span className="myattn__stat-val">{absentCount}</span>
                    <span className="myattn__stat-label">{t("absentDays")}</span>
                </div>
                <div className="myattn__stat myattn__stat--total">
                    <span className="myattn__stat-val">{total}</span>
                    <span className="myattn__stat-label">{t("totalDays") || "Total Days"}</span>
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
                                    <td>{r.date}</td>
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
    );
}

export default MyAttendance;