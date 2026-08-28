import React, { useEffect, useState } from "react";
import "./AttendanceReport.css";
import { logAdminAction } from "../utils/logAdminAction";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    getDoc
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
};

/* Decorative dotted grid used in the page corners */
const Dots = ({ className }) => (
    <svg className={`arp-dots ${className}`} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {[...Array(8)].map((_, r) =>
            [...Array(8)].map((_, c) => (
                <circle key={`${r}-${c}`} cx={7 + c * 15} cy={7 + r * 15} r="3" fill="currentColor" />
            ))
        )}
    </svg>
);

function AttendanceReport() {

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
    const today = new Date().toISOString().split("T")[0];

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
        const today = new Date().toISOString().split("T")[0];
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
                console.warn("AttendanceReport: could not load profile images —", e);
            }

            const snap = await getDocs(collection(db, "users"));
            let list = [];
            snap.forEach((docItem) => {
                const data = docItem.data();

                if (
                    data.deleted !== true &&
                    data.role !== "admin"
                ) {
                    list.push({
                        ...data,
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
        if (selectedDate > today) {
            setNoAttendance(false);
            setReportGenerated(false);
            return;
        }

        setGenerating(true);
        setReportGenerated(true);
        setNoAttendance(false);

        try {
            const attendanceSnap = await getDocs(collection(db, "attendance"));

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
            await updateDoc(doc(db, "attendance", docId), {
                status: editStatus,
                editedBy: localStorage.getItem("userId"),
                editedAt: new Date().toISOString()
            });
            await logAdminAction("update_attendance", {
                targetId: editUser.id,
                details: t("logEditedAttendance", { name: editUser.name, status: editStatus }),
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
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
        XLSX.writeFile(workbook, `attendance_${selectedDate}.xlsx`);
    };

    return (
        <div className="report-container" data-theme={theme}>

            <div className="arp-blob arp-blob--1" />
            <div className="arp-blob arp-blob--2" />
            <Dots className="arp-dots--tr" />
            <Dots className="arp-dots--bl" />

            <button className="arp-back" onClick={() => navigate("/admin-dashboard")}>
                <span className="arp-back-icon">{icons.back}</span>
                {t("back")}
            </button>

            {/* ============================ HEADER ============================ */}
            <div className="arp-head">
                <span className="arp-eyebrow">{t("adminPanel")}</span>
                <h1 className="arp-title">{t("attendanceReport")}</h1>
                <p className="arp-subtitle">{t("reportSubtitle")}</p>
            </div>

            {/* =========================== CONTROLS =========================== */}
            <div className="arp-controls">
                <div className="arp-date">
                    <input
                        type="date"
                        value={selectedDate}
                        max={today}
                        onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setReportGenerated(false);
                            setNoAttendance(false);
                            setReportUsers([]);
                        }}
                    />
                    <span className="arp-date-icon" aria-hidden="true">{icons.calendar}</span>
                </div>

                <button className="arp-generate" onClick={fetchReport} disabled={generating}>
                    {generating
                        ? <span className="arp-spinner" />
                        : <span className="arp-btn-icon">{icons.sparkle}</span>}
                    {t("generateReport")}
                </button>
            </div>

            {selectedDate > today && (
                <div className="arp-empty-note">
                    <span className="arp-empty-note-icon">{icons.inbox}</span>
                    {t("futureDateNotAllowed") || "Future dates are not available to search."}
                </div>
            )}

            {reportGenerated && noAttendance && (
                <div className="arp-empty-note">
                    <span className="arp-empty-note-icon">{icons.inbox}</span>
                    {t("attendanceNotMarked")}
                </div>
            )}

            {reportGenerated && !noAttendance && reportUsers.length > 0 && (
                <>
                    {/* ============================ STATS ============================ */}
                    <div className="arp-stats">
                        <div className="arp-stat arp-stat--total">
                            <span className="arp-stat-icon">{icons.users}</span>
                            <div className="arp-stat-body">
                                <span className="arp-stat-label">{t("totalUsers")}</span>
                                <span className="arp-stat-num">{reportUsers.length}</span>
                            </div>
                        </div>

                        <div className="arp-stat arp-stat--present">
                            <span className="arp-stat-icon">{icons.checkSquare}</span>
                            <div className="arp-stat-body">
                                <span className="arp-stat-label">{t("present")}</span>
                                <span className="arp-stat-num">{presentCount}</span>
                            </div>
                        </div>

                        <div className="arp-stat arp-stat--absent">
                            <span className="arp-stat-icon">{icons.xCircle}</span>
                            <div className="arp-stat-body">
                                <span className="arp-stat-label">{t("absent")}</span>
                                <span className="arp-stat-num">{absentCount}</span>
                            </div>
                        </div>
                    </div>

                    <div className="arp-export-wrap">
                        <button className="arp-export" onClick={exportToExcel}>
                            <span className="arp-btn-icon">{icons.sheet}</span>
                            {t("exportExcel")}
                        </button>
                    </div>

                    {/* ============================ TABLE ============================ */}
                    <div className="arp-table">
                        <div className="arp-thead">
                            <span>{t("name")}</span>
                            <span>{t("id")}</span>
                            <span>{t("status")}</span>
                            <span>{t("actions")}</span>
                        </div>

                        {reportUsers.map((user, index) => (
                            <div
                                className="arp-row"
                                key={user.id}
                                style={{ animationDelay: `${index * 0.04}s` }}
                            >
                                <div className="arp-cell arp-cell--name">
                                    <span className="arp-avatar">
                                        {getInitials(user.name)}
                                        {user.image ? (
                                            <img
                                                className="arp-avatar-img"
                                                src={user.image}
                                                alt={user.name}
                                                loading="lazy"
                                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                                            />
                                        ) : null}
                                    </span>
                                    <span className="arp-name">{user.name}</span>
                                </div>

                                <div className="arp-cell arp-cell--id">
                                    <span className="arp-id-chip">{user.id}</span>
                                </div>

                                <div className="arp-cell arp-cell--status">
                                    <span className={`arp-status ${user.status === "Present" ? "arp-status--on" : "arp-status--off"}`}>
                                        <span className="arp-status-dot" />
                                        {user.status === "Present" ? t("present") : t("absent")}
                                    </span>
                                </div>

                                <div className="arp-cell arp-cell--actions">
                                    <button className="arp-edit" onClick={() => openEditModal(user)}>
                                        <span className="arp-btn-icon">{icons.pencil}</span>
                                        {t("edit")}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ============================ MODAL ============================ */}
            {showEditModal && editUser && (
                <div className="arp-modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="arp-modal" onClick={(e) => e.stopPropagation()}>

                        <div className="arp-modal-head">
                            <span className="arp-modal-icon">{icons.pencil}</span>
                            <h3>{t("editAttendance")}</h3>
                            <button
                                className="arp-modal-close"
                                onClick={() => setShowEditModal(false)}
                                aria-label={t("close")}
                            >
                                {icons.close}
                            </button>
                        </div>

                        <div className="arp-modal-info">
                            <p>
                                <span className="arp-modal-info-icon">{icons.user}</span>
                                {editUser.name} ({editUser.id})
                            </p>
                            <p>
                                <span className="arp-modal-info-icon">{icons.calendar}</span>
                                {selectedDate}
                            </p>
                        </div>

                        <p className="arp-modal-label">{t("status")}</p>

                        <div className="arp-modal-options">
                            <button
                                className={`arp-opt arp-opt--present ${editStatus === "Present" ? "arp-opt--active" : ""}`}
                                onClick={() => setEditStatus("Present")}
                            >
                                <span className="arp-btn-icon">{icons.checkSquare}</span>
                                {t("present")}
                            </button>
                            <button
                                className={`arp-opt arp-opt--absent ${editStatus === "Absent" ? "arp-opt--active" : ""}`}
                                onClick={() => setEditStatus("Absent")}
                            >
                                <span className="arp-btn-icon">{icons.xCircle}</span>
                                {t("absent")}
                            </button>
                        </div>

                        <div className="arp-modal-footer">
                            <button
                                className="arp-modal-cancel"
                                onClick={() => setShowEditModal(false)}
                                disabled={savingEdit}
                            >
                                {t("cancel")}
                            </button>
                            <button
                                className="arp-modal-save"
                                onClick={saveEdit}
                                disabled={savingEdit}
                            >
                                {savingEdit
                                    ? <span className="arp-spinner" />
                                    : <span className="arp-btn-icon">{icons.save}</span>}
                                {t("save")}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default AttendanceReport;