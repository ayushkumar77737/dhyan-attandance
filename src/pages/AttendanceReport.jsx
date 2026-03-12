import React, { useEffect, useState } from "react";
import "./AttendanceReport.css";

import { db } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";

import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

function AttendanceReport() {

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

    // ✅ Auto set today's date (Fix for mobile blank date)
    useEffect(() => {
        const today = new Date().toISOString().split("T")[0];
        setSelectedDate(today);
    }, []);

    useEffect(() => {

        const fetchUsers = async () => {

            const snap = await getDocs(collection(db, "users"));

            let list = [];

            snap.forEach((doc) => {
                list.push(doc.data());
            });

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

                if (data.status === "Present") {
                    presentUsers.push(data.userId);
                }

            }

        });

        if (attendanceForDate.length === 0) {

            setNoAttendance(true);
            setReportUsers([]);
            setPresentCount(0);
            setAbsentCount(0);

            setTimeout(() => {
                setNoAttendance(false);
            }, 3000);

            return;

        }

        let updated = users.map((user) => {

            if (presentUsers.includes(user.id)) {
                return { ...user, status: "Present" };
            } else {
                return { ...user, status: "Absent" };
            }

        });

        setReportUsers(updated);

        const present = updated.filter(u => u.status === "Present").length;
        const absent = updated.filter(u => u.status === "Absent").length;

        setPresentCount(present);
        setAbsentCount(absent);

    };


    // Export Excel
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

            <button className="back-btn" onClick={() => navigate("/admin-dashboard")}>
                ← Back
            </button>

            <h1 className="report-title">Attendance Report</h1>

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
                    Generate Report
                </button>

            </div>


            {reportGenerated && noAttendance && (
                <p className="no-attendance">
                    Attendance not marked on this day
                </p>
            )}


            {reportGenerated && !noAttendance && reportUsers.length > 0 && (

                <>

                    <div className="report-cards">

                        <div className="report-card">
                            <h3>Total Users</h3>
                            <p>{users.length}</p>
                        </div>

                        <div className="report-card present">
                            <h3>Present</h3>
                            <p>{presentCount}</p>
                        </div>

                        <div className="report-card absent">
                            <h3>Absent</h3>
                            <p>{absentCount}</p>
                        </div>

                    </div>


                    <div className="export-section">

                        <button className="export-btn" onClick={exportToExcel}>
                            Export Excel
                        </button>

                    </div>


                    <table className="report-table">

                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>ID</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>

                            {reportUsers.map((user) => (
                                <tr key={user.id}>

                                    <td>{user.name}</td>
                                    <td>{user.id}</td>

                                    <td className={user.status === "Present" ? "present-text" : "absent-text"}>
                                        {user.status}
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