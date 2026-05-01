import React, { useEffect, useState } from "react";
import "./AttendanceReport.css";

import { db } from "../firebase/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"; // ← ADD doc, updateDoc

import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

import { useTranslation } from "react-i18next";

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

    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [reportUsers, setReportUsers] = useState([]);
    const [presentCount, setPresentCount] = useState(0);
    const [absentCount, setAbsentCount] = useState(0);
    const [selectedDate, setSelectedDate] = useState("");
    const [reportGenerated, setReportGenerated] = useState(false);
    const [noAttendance, setNoAttendance] = useState(false);

    // ← ADD: edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [editStatus, setEditStatus] = useState("");

    useEffect(() => {
        const today = new Date().toISOString().split("T")[0];
        setSelectedDate(today);
    }, []);

    useEffect(() => {
        const fetchUsers = async () => {
            const snap = await getDocs(collection(db, "users"));
            let list = [];
            snap.forEach((doc) => list.push(doc.data()));
            setUsers(list);
        };
        fetchUsers();
    }, []);

    const fetchReport = async () => {
        if (!selectedDate) return;

        setReportGenerated(true);
        setNoAttendance(false);

        const attendanceSnap = await getDocs(collection(db, "attendance"));

        let attendanceForDate = [];
        let presentUsers = [];

        attendanceSnap.forEach((doc) => {
            const data = doc.data();
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
            .filter(user => {
                return attendanceForDate.some(record => record.userId === user.id);
            })
            .map((user) => ({
                ...user,
                status: presentUsers.includes(user.id) ? "Present" : "Absent"
            }));

        setReportUsers(updated);
        setPresentCount(updated.filter(u => u.status === "Present").length);
        setAbsentCount(updated.filter(u => u.status === "Absent").length);
    };

    // ← ADD: open edit modal
    const openEditModal = (user) => {
        setEditUser(user);
        setEditStatus(user.status);
        setShowEditModal(true);
    };

    // ← ADD: save edited attendance
    const saveEdit = async () => {
        if (!editUser || !editStatus) return;
        try {
            const docId = `${editUser.id}_${selectedDate}`;
            await updateDoc(doc(db, "attendance", docId), {
                status: editStatus
            });

            // Update local state
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
        <div className="report-container">

            {/* Decorative orbs */}
            <div className="ar-orb ar-orb-1" />
            <div className="ar-orb ar-orb-2" />
            <div className="ar-orb ar-orb-3" />

            {/* Back Button */}
            <button className="back-btn" onClick={() => navigate("/admin-dashboard")}>
                <span>←</span> {t("back")}
            </button>

            {/* Title Block */}
            <div className="ar-title-block">
                <span className="ar-eyebrow">{t("adminPanel")}</span>
                <h1 className="report-title">{t("attendanceReport")}</h1>
                <p className="ar-subtitle">{t("reportSubtitle")}</p>
            </div>

            {/* Date Section */}
            <div className="date-section">
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setReportGenerated(false);
                        setNoAttendance(false);
                        setReportUsers([]);
                    }}
                />
                <button onClick={fetchReport}>
                    <span className="btn-icon">⚡</span> {t("generateReport")}
                </button>
            </div>

            {/* No Attendance Message */}
            {reportGenerated && noAttendance && (
                <div className="no-attendance">
                    <span className="no-att-icon">📭</span>
                    {t("attendanceNotMarked")}
                </div>
            )}

            {/* Report Content */}
            {reportGenerated && !noAttendance && reportUsers.length > 0 && (
                <>
                    {/* Summary Cards */}
                    <div className="report-cards">
                        <div className="report-card">
                            <div className="card-icon">👥</div>
                            <h3>{t("totalUsers")}</h3>
                            <p>{reportUsers.length}</p>
                        </div>
                        <div className="report-card present">
                            <div className="card-icon">✅</div>
                            <h3>{t("present")}</h3>
                            <p>{presentCount}</p>
                        </div>
                        <div className="report-card absent">
                            <div className="card-icon">❌</div>
                            <h3>{t("absent")}</h3>
                            <p>{absentCount}</p>
                        </div>
                    </div>

                    {/* Export */}
                    <div className="export-section">
                        <button className="export-btn" onClick={exportToExcel}>
                            <span>⬇</span> {t("exportExcel")}
                        </button>
                    </div>

                    {/* Table */}
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>{t("name")}</th>
                                <th>{t("id")}</th>
                                <th>{t("status")}</th>
                                <th>{t("actions")}</th> {/* ← ADD */}
                            </tr>
                        </thead>
                        <tbody>
                            {reportUsers.map((user, index) => (
                                <tr key={user.id} style={{ animationDelay: `${index * 0.04}s` }}>

                                    <td>
                                        <span className="ar-name-cell">
                                            <span className="ar-avatar">{user.name?.charAt(0).toUpperCase()}</span>
                                            {user.name}
                                        </span>
                                    </td>

                                    <td>
                                        <span className="ar-id-chip">{user.id}</span>
                                    </td>

                                    <td>
                                        <span className={user.status === "Present" ? "present-text" : "absent-text"}>
                                            {user.status === "Present" ? `● ${t("present")}` : `● ${t("absent")}`}
                                        </span>
                                    </td>

                                    {/* ← ADD edit button */}
                                    <td>
                                        <button
                                            className="ar-edit-btn"
                                            onClick={() => openEditModal(user)}
                                        >
                                            ✎ {t("edit")}
                                        </button>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {/* ← EDIT MODAL */}
            {showEditModal && editUser && (
                <div className="ar-modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="ar-modal" onClick={(e) => e.stopPropagation()}>

                        <div className="ar-modal-header">
                            <h3>✎ {t("edit")} Attendance</h3>
                            <button className="ar-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
                        </div>

                        <div className="ar-modal-info">
                            <p>👤 {editUser.name} ({editUser.id})</p>
                            <p>📅 {selectedDate}</p>
                        </div>

                        <p className="ar-modal-label">{t("status")}:</p>

                        <div className="ar-modal-options">
                            <button
                                className={`ar-modal-opt present ${editStatus === "Present" ? "active" : ""}`}
                                onClick={() => setEditStatus("Present")}
                            >
                                ✅ {t("present")}
                            </button>
                            <button
                                className={`ar-modal-opt absent ${editStatus === "Absent" ? "active" : ""}`}
                                onClick={() => setEditStatus("Absent")}
                            >
                                ❌ {t("absent")}
                            </button>
                        </div>

                        <div className="ar-modal-footer">
                            <button className="ar-modal-cancel" onClick={() => setShowEditModal(false)}>
                                {t("cancel")}
                            </button>
                            <button className="ar-modal-save" onClick={saveEdit}>
                                💾 {t("save")}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default AttendanceReport;