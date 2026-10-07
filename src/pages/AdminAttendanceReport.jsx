import React, { useEffect, useState } from "react";
import "./AdminAttendanceReport.css";
import { logAdminAction } from "../utils/logAdminAction";
import { SUPER_ADMIN_ID } from "../utils/accessControl";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    getDoc,
    query,
    where
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

import { useTranslation } from "react-i18next";

/* ------------------------------------------------------------------ */
/* Inline icons (presentational only)                                 */
/* ------------------------------------------------------------------ */
const icons = {
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
    ),
    calendar: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2.5" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
    sparkle: (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2.5l1.9 5.2 5.2 1.9-5.2 1.9L12 16.7l-1.9-5.2-5.2-1.9 5.2-1.9L12 2.5z" />
            <path d="M18.5 14.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z" opacity="0.75" />
        </svg>
    ),
    users: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    checkSquare: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 20 6" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
    ),
    xCircle: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
        </svg>
    ),
    sheet: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9.5" y1="12.5" x2="14.5" y2="17.5" /><line x1="14.5" y1="12.5" x2="9.5" y2="17.5" />
        </svg>
    ),
    pencil: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    ),
    inbox: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
    ),
    close: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    user: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    ),
    save: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
        </svg>
    ),
    search: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7.5" /><line x1="21" y1="21" x2="16.8" y2="16.8" />
        </svg>
    ),
};

/* Decorative dotted grid used in the page corners */
const Dots = ({ className }) => (
    <svg className={`aar-dots ${className}`} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {[...Array(8)].map((_, r) =>
            [...Array(8)].map((_, c) => (
                <circle key={`${r}-${c}`} cx={7 + c * 15} cy={7 + r * 15} r="3" fill="currentColor" />
            ))
        )}
    </svg>
);

/* Local calendar date (YYYY-MM-DD). toISOString() gives the UTC date,
   which is "yesterday" in India before 05:30 AM. */
const getLocalToday = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
};

function AdminAttendanceReport() {

    const { t } = useTranslation();

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
        checkAdmin();
    }, []);

    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [reportUsers, setReportUsers] = useState([]);
    const [presentCount, setPresentCount] = useState(0);
    const [absentCount, setAbsentCount] = useState(0);
    const [selectedDate, setSelectedDate] = useState("");
    const [reportGenerated, setReportGenerated] = useState(false);
    const [noAttendance, setNoAttendance] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");
    const [editUser, setEditUser] = useState(null);
    const [editStatus, setEditStatus] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);
    const [search, setSearch] = useState("");
    const today = getLocalToday();

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

        } catch (error) {
            console.error(error);
            navigate("/");
        }
    };

    useEffect(() => {
        const today = getLocalToday();
        setSelectedDate(today);
    }, []);

    useEffect(() => {
        const fetchUsers = async () => {
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
                console.warn("AdminAttendanceReport: could not load profile images —", e);
            }

            const snap = await getDocs(collection(db, "users"));
            let list = [];
            snap.forEach((docItem) => {
                const data = docItem.data();

                /* Admins only — the super admin is excluded. */
                if (
                    data.deleted !== true &&
                    data.role === "admin" &&
                    String(data.id || docItem.id).toUpperCase() !== SUPER_ADMIN_ID
                ) {
                    list.push({
                        ...data,
                        id: data.id || docItem.id,
                        image:
                            imageMap[String(data.id || docItem.id).toUpperCase()] ||
                            data.profileImage ||
                            "",
                    });
                }
            });
            setUsers(list);
        };
        fetchUsers();
    }, []);

    const getInitials = (name) =>
        name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

    const fetchReport = async () => {
        if (!selectedDate) return;
        setSearch("");
        if (selectedDate > today) {
            setNoAttendance(false);
            setReportGenerated(false);
            return;
        }

        setGenerating(true);
        setReportGenerated(true);
        setNoAttendance(false);

        try {
            const attendanceSnap = await getDocs(
                query(collection(db, "adminAttendance"), where("date", "==", selectedDate))
            );

            let attendanceForDate = [];
            let presentUsers = [];

            attendanceSnap.forEach((docItem) => {
                const data = docItem.data();
                if (data.date === selectedDate) {
                    attendanceForDate.push(data);
                    if (data.status === "Present") presentUsers.push(data.userId);
                }
            });

            if (attendanceForDate.length === 0) {
                setNoAttendance(true);
                setReportUsers([]);
                setPresentCount(0);
                setAbsentCount(0);
                setTimeout(() => setNoAttendance(false), 3000);
                return;
            }

            let updated = users
                .filter(user => attendanceForDate.some(record => record.userId === user.id))
                .map((user) => ({
                    ...user,
                    status: presentUsers.includes(user.id) ? "Present" : "Absent"
                }));

            setReportUsers(updated);
            setPresentCount(updated.filter(u => u.status === "Present").length);
            setAbsentCount(updated.filter(u => u.status === "Absent").length);
        } finally {
            setGenerating(false);
        }
    };

    const openEditModal = (user) => {
        setEditUser(user);
        setEditStatus(user.status);
        setShowEditModal(true);
    };

    const saveEdit = async () => {
        if (!editUser || !editStatus) return;
        try {
            setSavingEdit(true);
            const docId = `${editUser.id}_${selectedDate}`;
            if (
                editStatus !== "Present" &&
                editStatus !== "Absent"
            ) {
                return;
            }
            await updateDoc(doc(db, "adminAttendance", docId), {
                status: editStatus,
                editedBy: localStorage.getItem("userId"),
                editedAt: new Date().toISOString()
            });
            await logAdminAction("update_admin_attendance", {
                targetId: editUser.id,
                details: t("logEditedAdminAttendance", { name: editUser.name, status: editStatus, defaultValue: "Edited admin attendance: {{name}} → {{status}}" }),
            });
            const updated = reportUsers.map(u =>
                u.id === editUser.id ? { ...u, status: editStatus } : u
            );
            setReportUsers(updated);
            setPresentCount(updated.filter(u => u.status === "Present").length);
            setAbsentCount(updated.filter(u => u.status === "Absent").length);
            setShowEditModal(false);
            setEditUser(null);
        } catch (error) {
            console.error("Error updating attendance:", error);
        } finally {
            setSavingEdit(false);
        }
    };

    const exportToExcel = () => {
        const data = reportUsers.map(user => ({
            Name: user.name,
            ID: user.id,
            Status: user.status
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Admin Attendance");
        XLSX.writeFile(workbook, `admin_attendance_${selectedDate}.xlsx`);
    };

    /* search: filters the table by name or ID (stats and export keep
       using the full report) */
    const q = search.trim().toLowerCase();
    const filteredUsers = q
        ? reportUsers.filter(
            (u) =>
                String(u.name || "").toLowerCase().includes(q) ||
                String(u.id || "").toLowerCase().includes(q)
        )
        : reportUsers;

    return (
        <div className="aar-container" data-theme={theme}>

            <div className="aar-blob aar-blob--1" />
            <div className="aar-blob aar-blob--2" />
            <Dots className="aar-dots--tr" />
            <Dots className="aar-dots--bl" />

            <button className="aar-back" onClick={() => navigate("/admin-dashboard")}>
                <span className="aar-back-icon">{icons.back}</span>
                {t("back")}
            </button>

            {/* ============================ HEADER ============================ */}
            <div className="aar-head">
                <span className="aar-eyebrow">{t("adminPanel")}</span>
                <h1 className="aar-title">{t("adminAttendanceReport", "Admin Attendance Report")}</h1>
                <p className="aar-subtitle">{t("adminAttendanceReportSub", "View and edit admin attendance")}</p>
            </div>

            {/* =========================== CONTROLS =========================== */}
            <div className="aar-controls">
                <div className="aar-date">
                    <input
                        type="date"
                        value={selectedDate}
                        max={today}
                        onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setReportGenerated(false);
                            setNoAttendance(false);
                            setReportUsers([]);
                            setSearch("");
                        }}
                    />
                    <span className="aar-date-icon" aria-hidden="true">{icons.calendar}</span>
                </div>

                <button className="aar-generate" onClick={fetchReport} disabled={generating}>
                    {generating
                        ? <span className="aar-spinner" />
                        : <span className="aar-btn-icon">{icons.sparkle}</span>}
                    {t("generateReport")}
                </button>
            </div>

            {selectedDate > today && (
                <div className="aar-empty-note">
                    <span className="aar-empty-note-icon">{icons.inbox}</span>
                    {t("futureDateNotAllowed") || "Future dates are not available to search."}
                </div>
            )}

            {reportGenerated && noAttendance && (
                <div className="aar-empty-note">
                    <span className="aar-empty-note-icon">{icons.inbox}</span>
                    {t("attendanceNotMarked")}
                </div>
            )}

            {reportGenerated && !noAttendance && reportUsers.length > 0 && (
                <>
                    {/* ============================ STATS ============================ */}
                    <div className="aar-stats">
                        <div className="aar-stat aar-stat--total">
                            <span className="aar-stat-icon">{icons.users}</span>
                            <div className="aar-stat-body">
                                <span className="aar-stat-label">{t("totalAdmins")}</span>
                                <span className="aar-stat-num">{reportUsers.length}</span>
                            </div>
                        </div>

                        <div className="aar-stat aar-stat--present">
                            <span className="aar-stat-icon">{icons.checkSquare}</span>
                            <div className="aar-stat-body">
                                <span className="aar-stat-label">{t("present")}</span>
                                <span className="aar-stat-num">{presentCount}</span>
                            </div>
                        </div>

                        <div className="aar-stat aar-stat--absent">
                            <span className="aar-stat-icon">{icons.xCircle}</span>
                            <div className="aar-stat-body">
                                <span className="aar-stat-label">{t("absent")}</span>
                                <span className="aar-stat-num">{absentCount}</span>
                            </div>
                        </div>
                    </div>

                    <div className="aar-export-wrap">
                        <button className="aar-export" onClick={exportToExcel}>
                            <span className="aar-btn-icon">{icons.sheet}</span>
                            {t("exportExcel")}
                        </button>
                    </div>

                    {/* =========================== SEARCH =========================== */}
                    <div className="aar-search-row">
                        <div className="aar-search">
                            <span className="aar-search-icon">{icons.search}</span>
                            <input
                                type="text"
                                value={search}
                                placeholder={t("aarSearchPh", "Search by name or ID...")}
                                autoComplete="off"
                                maxLength={40}
                                onChange={(e) =>
                                    setSearch(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""))
                                }
                            />
                            {search && (
                                <button
                                    type="button"
                                    className="aar-search-clear"
                                    onClick={() => setSearch("")}
                                    aria-label={t("clearSearch", "Clear search")}
                                >
                                    {icons.close}
                                </button>
                            )}
                        </div>
                        <span className="aar-search-count">
                            {t("aarShowing", {
                                shown: filteredUsers.length,
                                total: reportUsers.length,
                                defaultValue: "Showing {{shown}} of {{total}}",
                            })}
                        </span>
                    </div>

                    {/* ============================ TABLE ============================ */}
                    <div className="aar-table">
                        <div className="aar-thead">
                            <span>{t("name")}</span>
                            <span>{t("id")}</span>
                            <span>{t("status")}</span>
                            <span>{t("actions")}</span>
                        </div>

                        {filteredUsers.map((user, index) => (
                            <div
                                className="aar-row"
                                key={user.id}
                                style={{ animationDelay: `${index * 0.04}s` }}
                            >
                                <div className="aar-cell aar-cell--name">
                                    <span className="aar-avatar">
                                        {getInitials(user.name)}
                                        {user.image ? (
                                            <img
                                                className="aar-avatar-img"
                                                src={user.image}
                                                alt={user.name}
                                                loading="lazy"
                                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                                            />
                                        ) : null}
                                    </span>
                                    <span className="aar-name">{user.name}</span>
                                </div>

                                <div className="aar-cell aar-cell--id">
                                    <span className="aar-id-chip">{user.id}</span>
                                </div>

                                <div className="aar-cell aar-cell--status">
                                    <span className={`aar-status ${user.status === "Present" ? "aar-status--on" : "aar-status--off"}`}>
                                        <span className="aar-status-dot" />
                                        {user.status === "Present" ? t("present") : t("absent")}
                                    </span>
                                </div>

                                <div className="aar-cell aar-cell--actions">
                                    <button className="aar-edit" onClick={() => openEditModal(user)}>
                                        <span className="aar-btn-icon">{icons.pencil}</span>
                                        {t("edit")}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {filteredUsers.length === 0 && (
                            <div className="aar-noresult">
                                <span className="aar-noresult-icon">{icons.inbox}</span>
                                {t("aarNoMatch", "No admins match your search.")}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ============================ MODAL ============================ */}
            {showEditModal && editUser && (
                <div className="aar-modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="aar-modal" onClick={(e) => e.stopPropagation()}>

                        <div className="aar-modal-head">
                            <span className="aar-modal-icon">{icons.pencil}</span>
                            <h3>{t("editAttendance")}</h3>
                            <button
                                className="aar-modal-close"
                                onClick={() => setShowEditModal(false)}
                                aria-label={t("close")}
                            >
                                {icons.close}
                            </button>
                        </div>

                        <div className="aar-modal-info">
                            <p>
                                <span className="aar-modal-info-icon">{icons.user}</span>
                                {editUser.name} ({editUser.id})
                            </p>
                            <p>
                                <span className="aar-modal-info-icon">{icons.calendar}</span>
                                {selectedDate}
                            </p>
                        </div>

                        <p className="aar-modal-label">{t("status")}</p>

                        <div className="aar-modal-options">
                            <button
                                className={`aar-opt aar-opt--present ${editStatus === "Present" ? "aar-opt--active" : ""}`}
                                onClick={() => setEditStatus("Present")}
                            >
                                <span className="aar-btn-icon">{icons.checkSquare}</span>
                                {t("present")}
                            </button>
                            <button
                                className={`aar-opt aar-opt--absent ${editStatus === "Absent" ? "aar-opt--active" : ""}`}
                                onClick={() => setEditStatus("Absent")}
                            >
                                <span className="aar-btn-icon">{icons.xCircle}</span>
                                {t("absent")}
                            </button>
                        </div>

                        <div className="aar-modal-footer">
                            <button
                                className="aar-modal-cancel"
                                onClick={() => setShowEditModal(false)}
                                disabled={savingEdit}
                            >
                                {t("cancel")}
                            </button>
                            <button
                                className="aar-modal-save"
                                onClick={saveEdit}
                                disabled={savingEdit}
                            >
                                {savingEdit
                                    ? <span className="aar-spinner" />
                                    : <span className="aar-btn-icon">{icons.save}</span>}
                                {t("save")}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default AdminAttendanceReport;