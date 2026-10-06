import React, { useEffect, useState } from "react";
import "./AdminAttendanceView.css";
import { useNavigate, useParams } from "react-router-dom";

import { auth, db } from "../firebase/firebase";
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";
import { SUPER_ADMIN_ID } from "../utils/accessControl";

import { useTranslation } from "react-i18next";
import useAutoLogout from "../hooks/useAutoLogout";

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
};

/* Attendance history of ONE admin (stored in `adminAttendance`).
   Opened from the "Attendance" button on the admin's own page. */
function AdminAttendanceView() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    useAutoLogout();

    const [adminName, setAdminName] = useState("");
    const [adminImage, setAdminImage] = useState("");
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
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

        const load = async () => {
            try {
                if (!auth.currentUser) { navigate("/"); return; }

                /* The super admin is never part of admin attendance. */
                if (String(id || "").toUpperCase() === SUPER_ADMIN_ID) {
                    setNotFound(true);
                    return;
                }

                const adminSnap = await getDoc(doc(db, "users", id));
                if (!adminSnap.exists() || adminSnap.data().role !== "admin") {
                    setNotFound(true);
                    return;
                }
                setAdminName(adminSnap.data().name || "");

                /* Photo lives in profiles/{ID}.profileImage (same source as
                   All Admins). Falls back to users/{id}.profileImage, then
                   to initials. */
                let photo = adminSnap.data().profileImage || "";
                try {
                    const keys = [id, String(id).toUpperCase()].filter(
                        (k, i, arr) => arr.indexOf(k) === i
                    );
                    for (const k of keys) {
                        const profSnap = await getDoc(doc(db, "profiles", k));
                        if (profSnap.exists() && profSnap.data().profileImage) {
                            photo = profSnap.data().profileImage;
                            break;
                        }
                    }
                } catch (e) {
                    console.warn("AdminAttendanceView: could not load profile image —", e);
                }
                setAdminImage(photo);

                const snap = await getDocs(
                    query(collection(db, "adminAttendance"), where("userId", "==", id))
                );
                const list = [];
                snap.forEach((d) => {
                    const data = d.data();
                    list.push({ date: data.date, status: data.status });
                });
                list.sort((a, b) => new Date(b.date) - new Date(a.date)); // newest first
                setRecords(list);
            } catch (err) {
                console.error(err);
                setRecords([]);
            } finally {
                setLoading(false);
            }
        };
        load();

        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, [id]);

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

    /* "Ayush Kumar" -> "AK" */
    const getInitials = (name) =>
        name
            ? name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
            : "A";

    return (
        <div className="admattn__container" data-theme={theme}>
            <div className="admattn__orb admattn__orb--1" />
            <div className="admattn__orb admattn__orb--2" />

            <button className="admattn__back-btn" onClick={() => navigate(`/edit-admin/${id}`)}>
                {icons.back}{t("back") || "Back"}
            </button>

            <div className="admattn__inner">
                <div className="admattn__header">
                    <div className="admattn__header-left">
                        <div className="admattn__avatar">
                            {getInitials(adminName || id)}
                            {adminImage ? (
                                <img
                                    className="admattn__avatar-img"
                                    src={adminImage}
                                    alt={adminName}
                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                            ) : null}
                        </div>
                        <div className="admattn__header-text">
                            <p className="admattn__portal-label">{t("adminAttendance", "Admin Attendance")}</p>
                            <h1 className="admattn__title">{adminName || id}</h1>
                            <p className="admattn__subtitle">ID: {String(id || "").toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                {notFound ? (
                    <div className="admattn__empty"><span>📭</span>{t("noAdminsFound")}</div>
                ) : (
                    <>
                        <div className="admattn__stats">
                            <div className="admattn__stat admattn__stat--pct">
                                <span className="admattn__stat-blob" aria-hidden="true" />
                                <div className="admattn__stat-top">
                                    <span className="admattn__stat-icon">{icons.calendarCheck}</span>
                                    <div className="admattn__stat-nums">
                                        <span className="admattn__stat-val">{percentage}%</span>
                                        <span className="admattn__stat-label">{t("attendance")}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="admattn__stat admattn__stat--present">
                                <span className="admattn__stat-blob" aria-hidden="true" />
                                <div className="admattn__stat-top">
                                    <span className="admattn__stat-icon">{icons.person}</span>
                                    <div className="admattn__stat-nums">
                                        <span className="admattn__stat-val">{presentCount}</span>
                                        <span className="admattn__stat-label">{t("presentDays")}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="admattn__stat admattn__stat--absent">
                                <span className="admattn__stat-blob" aria-hidden="true" />
                                <div className="admattn__stat-top">
                                    <span className="admattn__stat-icon">{icons.personX}</span>
                                    <div className="admattn__stat-nums">
                                        <span className="admattn__stat-val">{absentCount}</span>
                                        <span className="admattn__stat-label">{t("absentDays")}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="admattn__stat admattn__stat--total">
                                <span className="admattn__stat-blob" aria-hidden="true" />
                                <div className="admattn__stat-top">
                                    <span className="admattn__stat-icon">{icons.calendar}</span>
                                    <div className="admattn__stat-nums">
                                        <span className="admattn__stat-val">{total}</span>
                                        <span className="admattn__stat-label">{t("totalDays") || "Total Days"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="admattn__filter">
                            <span className="admattn__filter-icon">{icons.calendar}</span>
                            <select
                                className="admattn__select"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                            >
                                <option value="all">{t("allMonths") || "All Months"}</option>
                                {monthOptions.map((m) => (
                                    <option key={m} value={m}>{fmtMonthLabel(m)}</option>
                                ))}
                            </select>
                        </div>

                        {loading ? (
                            <div className="admattn__spinner-wrap"><div className="admattn__spinner" /></div>
                        ) : filtered.length === 0 ? (
                            <div className="admattn__empty"><span>📭</span>{t("noAttendanceFound")}</div>
                        ) : (
                            <div className="admattn__table-wrap">
                                <table className="admattn__table">
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
                                                    <div className="admattn__td-date">
                                                        <span className="admattn__date-icon">{icons.calendar}</span>
                                                        {r.date}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={r.status === "Present" ? "admattn__badge admattn__badge--present" : "admattn__badge admattn__badge--absent"}>
                                                        {r.status === "Present" ? `✓ ${t("present")}` : `✗ ${t("absent")}`}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default AdminAttendanceView;