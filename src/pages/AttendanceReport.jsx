import React, { useEffect, useState } from "react";
import "./AttendanceReport.css";

import { db } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";

import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

import { useTranslation } from "react-i18next"; // ← ADD

function AttendanceReport() {

    const { t } = useTranslation(); // ← ADD

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
                const hasJoined = attendanceSnap.docs.some(doc => {
                    const data = doc.data();
                    return data.userId === user.id && data.date <= selectedDate;
                });
                return hasJoined;
            })
            .map((user) => ({
                ...user,
                status: presentUsers.includes(user.id) ? "Present" : "Absent"
            }));

        setReportUsers(updated);
        setPresentCount(updated.filter(u => u.status === "Present").length);
        setAbsentCount(updated.filter(u => u.status === "Absent").length);
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
                <span>←</span> {t("back")} {/* ← CHANGED */}
            </button>

            {/* Title Block */}
            <div className="ar-title-block">
                <span className="ar-eyebrow">{t("adminPanel")}</span> {/* ← CHANGED */}
                <h1 className="report-title">
                    {t("attendanceReport")} {/* ← CHANGED */}
                </h1>
                <p className="ar-subtitle">{t("reportSubtitle")}</p> {/* ← CHANGED */}
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
                    <span className="btn-icon">⚡</span> {t("generateReport")} {/* ← CHANGED */}
                </button>
            </div>

            {/* No Attendance Message */}
            {reportGenerated && noAttendance && (
                <div className="no-attendance">
                    <span className="no-att-icon">📭</span>
                    {t("attendanceNotMarked")} {/* ← CHANGED */}
                </div>
            )}

            {/* Report Content */}
            {reportGenerated && !noAttendance && reportUsers.length > 0 && (
                <>
                    {/* Summary Cards */}
                    <div className="report-cards">

                        <div className="report-card">
                            <div className="card-icon">👥</div>
                            <h3>{t("totalUsers")}</h3> {/* ← CHANGED */}
                            <p>{reportUsers.length}</p>
                        </div>

                        <div className="report-card present">
                            <div className="card-icon">✅</div>
                            <h3>{t("present")}</h3> {/* ← CHANGED */}
                            <p>{presentCount}</p>
                        </div>

                        <div className="report-card absent">
                            <div className="card-icon">❌</div>
                            <h3>{t("absent")}</h3> {/* ← CHANGED */}
                            <p>{absentCount}</p>
                        </div>

                    </div>

                    {/* Export */}
                    <div className="export-section">
                        <button className="export-btn" onClick={exportToExcel}>
                            <span>⬇</span> {t("exportExcel")} {/* ← CHANGED */}
                        </button>
                    </div>

                    {/* Table */}
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>{t("name")}</th>   {/* ← CHANGED */}
                                <th>{t("id")}</th>     {/* ← CHANGED */}
                                <th>{t("status")}</th> {/* ← CHANGED */}
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
                                            {user.status === "Present" ? `● ${t("present")}` : `● ${t("absent")}`} {/* ← CHANGED */}
                                        </span>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

        </div>
    );
}

export default AttendanceReport;