import React, { useState, useEffect } from "react";
import "./MarkAttendance.css";
import { useNavigate } from "react-router-dom";

import { db } from "../firebase/firebase";
import { collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";

function MarkAttendance() {

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

    const [date, setDate] = useState("");
    const [users, setUsers] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const today = new Date().toISOString().split("T")[0];
        setDate(today);
    }, []);

    const loadUsers = async () => {

        if (!date) {
            setMessage("⚠️ Please select a date first");
            setTimeout(() => setMessage(""), 3000);
            return;
        }

        try {

            const q = query(collection(db, "attendance"), where("date", "==", date));
            const attendanceCheck = await getDocs(q);

            if (!attendanceCheck.empty) {
                setMessage("⚠️ Attendance already marked for this date");
                setUsers([]);

                const today = new Date().toISOString().split("T")[0];
                setDate(today);

                setTimeout(() => setMessage(""), 3000);
                return;
            }

            const querySnapshot = await getDocs(collection(db, "users"));

            const userList = [];

            querySnapshot.forEach((docItem) => {
                userList.push({
                    id: docItem.id,
                    ...docItem.data()
                });
            });

            // ✅ SORT BY ID (ASCENDING)
            userList.sort((a, b) => {
                const numA = parseInt(a.id.replace(/\D/g, ""), 10);
                const numB = parseInt(b.id.replace(/\D/g, ""), 10);
                return numA - numB;
            });

            setUsers(userList);

        } catch (error) {
            console.log(error);
            setMessage("❌ Error loading users");
            setTimeout(() => setMessage(""), 3000);
        }
    };

    const handleAttendanceChange = (userId, value) => {
        setAttendance({
            ...attendance,
            [userId]: value
        });
    };

    const saveAttendance = async () => {

        if (!date) {
            setMessage("⚠️ Select date first");
            setTimeout(() => setMessage(""), 3000);
            return;
        }

        if (Object.keys(attendance).length !== users.length) {
            setMessage("⚠️ Please mark attendance for all users");
            setTimeout(() => setMessage(""), 3000);
            return;
        }

        try {

            setLoading(true);

            for (let userId in attendance) {

                const attendanceRef = doc(db, "attendance", `${userId}_${date}`);

                await setDoc(attendanceRef, {
                    userId: userId,
                    date: date,
                    status: attendance[userId]
                });

            }

            setMessage("✅ Attendance Saved Successfully");

            setUsers([]);
            setAttendance({});

            const today = new Date().toISOString().split("T")[0];
            setDate(today);

            setTimeout(() => {
                setMessage("");
            }, 3000);

        } catch (error) {
            console.log(error);
            setMessage("❌ Error saving attendance");
            setTimeout(() => setMessage(""), 3000);
        } finally {
            setLoading(false);
        }

    };

    return (

        <div className="markattendance-container">

            <div className="markattendance-header">

                <button
                    className="markattendance-back-btn"
                    onClick={() => navigate("/admin-dashboard")}
                >
                    ← Back
                </button>

                <h1 className="markattendance-title">Mark Attendance</h1>

            </div>

            {message && (
                <div className="markattendance-message-box">
                    {message}
                </div>
            )}

            <div className="markattendance-date-box">

                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />

                <button onClick={loadUsers}>
                    Load Users
                </button>

            </div>

            {users.length > 0 && (

                <div className="markattendance-user-list">

                    {users.map((user) => (

                        <div key={user.id} className="markattendance-user-row">

                            <span className="markattendance-user-name">
                                {user.name} ({user.id})
                            </span>

                            <select
                                value={attendance[user.id] || ""}
                                onChange={(e) =>
                                    handleAttendanceChange(user.id, e.target.value)
                                }
                            >

                                <option value="">Select</option>
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>

                            </select>

                        </div>

                    ))}

                </div>

            )}

            {users.length > 0 && (
                <button
                    className="markattendance-save-btn"
                    onClick={saveAttendance}
                    disabled={loading}
                >
                    {loading ? "⏳ Saving Attendance..." : "Save Attendance"}
                </button>
            )}

        </div>

    );

}

export default MarkAttendance;