import React, { useEffect, useMemo, useState } from "react";
import "./UserPercentage.css";
import { db, auth } from "../firebase/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

import { useTranslation } from "react-i18next";

/* Attendance bands used for the summary cards and the row pills.
   Keep these in one place so the cards and pills can never disagree. */
const HIGH_THRESHOLD = 85;
const LOW_THRESHOLD = 60;

/* ------------------------------------------------------------------ */
/* Inline icons (presentational only)                                 */
/* ------------------------------------------------------------------ */
const icons = {
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
    ),
    users: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    warn: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <line x1="12" y1="9" x2="12" y2="13.5" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    sheet: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9.5" y1="12.5" x2="14.5" y2="17.5" /><line x1="14.5" y1="12.5" x2="9.5" y2="17.5" />
        </svg>
    ),
    inbox: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
    ),
};

/* Small 2x3 dot cluster shown in the corner of each stat card */
const DotCluster = () => (
    <svg className="upc-stat-dots" viewBox="0 0 22 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {[...Array(3)].map((_, r) =>
            [...Array(2)].map((_, c) => (
                <circle key={`${r}-${c}`} cx={4 + c * 14} cy={4 + r * 13} r="3" fill="currentColor" />
            ))
        )}
    </svg>
);

/* Decorative dotted grid, top-right of the page */
const Dots = () => (
    <svg className="upc-dots" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {[...Array(7)].map((_, r) =>
            [...Array(8)].map((_, c) => (
                <circle key={`${r}-${c}`} cx={7 + c * 18} cy={7 + r * 18} r="3.2" fill="currentColor" />
            ))
        )}
    </svg>
);

function UserPercentage() {

    const { t } = useTranslation();
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

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

    const checkAdmin = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) { navigate("/"); return; }
        try {
            const userRef = doc(db, "users", localStorage.getItem("userId"));
            const userSnap = await getDoc(userRef);
            if (
                !userSnap.exists() ||
                userSnap.data().role !== "admin" ||
                userSnap.data().uid !== auth.currentUser.uid
            ) {
                navigate("/");
                return;
            }
            fetchData();
        } catch (err) {
            console.error(err);
            navigate("/");
        }
    };

    useEffect(() => {
        checkAdmin();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            /* Profile photos live in `profiles/{ID}.profileImage` — the
               Cloudinary secure_url written by uploadProfileImage(). Build a
               lookup first, then attach each URL to its user below. */
            const imageMap = {};
            try {
                const profileSnap = await getDocs(collection(db, "profiles"));
                profileSnap.forEach((p) => {
                    const pd = p.data();
                    const key = String(p.id || "").toUpperCase();
                    if (pd.profileImage) imageMap[key] = pd.profileImage;
                });
            } catch (e) {
                // Photos are optional — fall back to initials rather than failing.
                console.warn("UserPercentage: could not load profile images —", e);
            }

            const usersSnap = await getDocs(collection(db, "users"));
            const attendanceSnap = await getDocs(collection(db, "attendance"));

            /* Tally each user's marked days in one pass, rather than
               re-scanning the whole attendance collection per user. */
            const tally = {};
            attendanceSnap.forEach((docItem) => {
                const data = docItem.data();
                const uid = String(data.userId || "").toUpperCase();
                if (!uid) return;
                if (!tally[uid]) tally[uid] = { present: 0, total: 0 };
                const status = String(data.status || "").trim();
                if (status === "Present") {
                    tally[uid].present++;
                    tally[uid].total++;
                } else if (status === "Absent") {
                    tally[uid].total++;
                }
            });

            const list = [];
            usersSnap.forEach((docItem) => {
                const data = docItem.data();
                if (data.deleted === true || data.role === "admin") return;

                const id = String(data.id || docItem.id).toUpperCase();
                const counts = tally[id] || { present: 0, total: 0 };
                const percentage = counts.total > 0
                    ? (counts.present / counts.total) * 100
                    : 0;

                list.push({
                    docId: docItem.id,
                    id,
                    name: data.name || "—",
                    email: data.email || "—",
                    present: counts.present,
                    totalDays: counts.total,
                    percentage,
                    image: imageMap[id] || data.profileImage || "",
                });
            });

            list.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
            setRows(list);
        } catch (err) {
            console.error(err);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => ({
        total: rows.length,
        high: rows.filter((r) => r.percentage >= HIGH_THRESHOLD).length,
        low: rows.filter((r) => r.percentage < LOW_THRESHOLD).length,
    }), [rows]);

    const getInitials = (name) =>
        name && name !== "—"
            ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
            : "?";

    /* three bands, matching the summary cards above */
    const bandOf = (pct) =>
        pct >= HIGH_THRESHOLD ? "high" : pct < LOW_THRESHOLD ? "low" : "mid";

    const exportToExcel = () => {
        if (rows.length === 0) return;
        const data = rows.map((r) => ({
            "User ID": r.id,
            Name: r.name,
            Email: r.email,
            Present: r.present,
            "Total Days": r.totalDays,
            "Attendance %": `${r.percentage.toFixed(2)}%`,
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
        const date = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `attendance_percentage_${date}.xlsx`);
    };

    return (
        <div className="percentage-container" data-theme={theme}>

            <div className="upc-blob upc-blob--1" />
            <div className="upc-blob upc-blob--2" />
            <Dots />

            <button className="upc-back" onClick={() => navigate("/admin-dashboard")}>
                <span className="upc-back-icon">{icons.back}</span>
                {t("back")}
            </button>

            {/* ============================ HEADER ============================ */}
            <div className="upc-head">
                <span className="upc-eyebrow">{t("adminPanel")}</span>
                <h1 className="upc-title">{t("attendanceOverview")}</h1>
                <p className="upc-subtitle">{t("overviewSubtitle")}</p>
            </div>

            {/* ============================ STATS ============================= */}
            <div className="upc-stats">
                <div className="upc-stat upc-stat--total">
                    <span className="upc-stat-icon">{icons.users}</span>
                    <div className="upc-stat-body">
                        <span className="upc-stat-label">{t("totalUsers")}</span>
                        <span className="upc-stat-num">{loading ? "—" : stats.total}</span>
                    </div>
                    <DotCluster />
                    <svg className="upc-stat-wave" viewBox="0 0 300 90" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M0 58C56 26 108 74 164 50C220 26 258 44 300 30V90H0V58Z" fill="currentColor" />
                    </svg>
                </div>

                <div className="upc-stat upc-stat--high">
                    <span className="upc-stat-icon">{icons.check}</span>
                    <div className="upc-stat-body">
                        <span className="upc-stat-label">{t("above85")}</span>
                        <span className="upc-stat-num">{loading ? "—" : stats.high}</span>
                    </div>
                    <DotCluster />
                    <svg className="upc-stat-wave" viewBox="0 0 300 90" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M0 58C56 26 108 74 164 50C220 26 258 44 300 30V90H0V58Z" fill="currentColor" />
                    </svg>
                </div>

                <div className="upc-stat upc-stat--low">
                    <span className="upc-stat-icon">{icons.warn}</span>
                    <div className="upc-stat-body">
                        <span className="upc-stat-label">{t("below60")}</span>
                        <span className="upc-stat-num">{loading ? "—" : stats.low}</span>
                    </div>
                    <DotCluster />
                    <svg className="upc-stat-wave" viewBox="0 0 300 90" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M0 58C56 26 108 74 164 50C220 26 258 44 300 30V90H0V58Z" fill="currentColor" />
                    </svg>
                </div>
            </div>

            <div className="upc-export-wrap">
                <button className="upc-export" onClick={exportToExcel} disabled={rows.length === 0}>
                    <span className="upc-btn-icon">{icons.sheet}</span>
                    {t("exportExcel")}
                </button>
            </div>

            {/* ============================ TABLE ============================= */}
            <div className="upc-table">
                <div className="upc-thead">
                    <span>{t("userId")}</span>
                    <span>{t("name")}</span>
                    <span>{t("attendancePercent")}</span>
                </div>

                {loading ? (
                    <div className="upc-state">
                        <span className="upc-spinner" />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="upc-state">
                        <span className="upc-state-icon">{icons.inbox}</span>
                        <p className="upc-state-title">{t("noUsersFound")}</p>
                    </div>
                ) : (
                    rows.map((r, index) => (
                        <div
                            className="upc-row"
                            key={r.docId}
                            style={{ animationDelay: `${index * 0.04}s` }}
                        >
                            <div className="upc-cell upc-cell--id">
                                <span className="upc-id-chip">{r.id}</span>
                            </div>

                            <div className="upc-cell upc-cell--name">
                                <span className="upc-avatar">
                                    {getInitials(r.name)}
                                    {r.image ? (
                                        <img
                                            className="upc-avatar-img"
                                            src={r.image}
                                            alt={r.name}
                                            loading="lazy"
                                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                                        />
                                    ) : null}
                                </span>
                                <span className="upc-name-text">
                                    <span className="upc-name">{r.name}</span>
                                    <span className="upc-email">{r.email}</span>
                                </span>
                            </div>

                            <div className="upc-cell upc-cell--pct">
                                <span className={`upc-pct upc-pct--${bandOf(r.percentage)}`}>
                                    {r.percentage.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default UserPercentage;