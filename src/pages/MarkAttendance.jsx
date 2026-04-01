import React, { useState, useEffect } from "react";
import "./MarkAttendance.css";
import { useNavigate } from "react-router-dom";

import { db } from "../firebase/firebase";
import { collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";

import { useTranslation } from "react-i18next"; // ← ADD

function MarkAttendance() {

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
            setMessage(t("selectDateFirst")); // ← CHANGED
            setTimeout(() => setMessage(""), 3000);
            return;
        }

        try {
            const q = query(collection(db, "attendance"), where("date", "==", date));
            const attendanceCheck = await getDocs(q);

            if (!attendanceCheck.empty) {
                setMessage(t("attendanceAlreadyMarked")); // ← CHANGED
                setUsers([]);
                const today = new Date().toISOString().split("T")[0];
                setDate(today);
                setTimeout(() => setMessage(""), 3000);
                return;
            }

            const querySnapshot = await getDocs(collection(db, "users"));
            const userList = [];

            querySnapshot.forEach((docItem) => {
                userList.push({ id: docItem.id, ...docItem.data() });
            });

            userList.sort((a, b) => {
                const numA = parseInt(a.id.replace(/\D/g, ""), 10);
                const numB = parseInt(b.id.replace(/\D/g, ""), 10);
                return numA - numB;
            });

            setUsers(userList);

        } catch (error) {
            console.log(error);
            setMessage(t("errorLoadingUsers")); // ← CHANGED
            setTimeout(() => setMessage(""), 3000);
        }
    };

    const handleAttendanceChange = (userId, value) => {
        setAttendance({ ...attendance, [userId]: value });
    };

    const saveAttendance = async () => {

        if (!date) {
            setMessage(t("selectDateFirst"));
            setTimeout(() => setMessage(""), 3000);
            return;
        }

        // ← FIX: Check count AND that no value is empty
        const attendedKeys = Object.keys(attendance);
        const hasEmptySelection = attendedKeys.some(
            (userId) => attendance[userId] === "" || attendance[userId] === undefined
        );

        if (attendedKeys.length !== users.length || hasEmptySelection) {
            setMessage(t("markAllUsers"));
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

            setMessage(t("attendanceSavedSuccess"));
            setUsers([]);
            setAttendance({});
            const today = new Date().toISOString().split("T")[0];
            setDate(today);
            setTimeout(() => setMessage(""), 3000);

        } catch (error) {
            console.log(error);
            setMessage(t("errorSavingAttendance"));
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
                    ← {t("back")} {/* ← CHANGED */}
                </button>

                <h1 className="markattendance-title">{t("markAttendance")}</h1> {/* ← CHANGED */}
            </div>

            {message && (
                <div className="markattendance-message-box">{message}</div>
            )}

            <div className="markattendance-date-box">
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />
                <button onClick={loadUsers}>
                    {t("loadUsers")} {/* ← CHANGED */}
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
                                <option value="">{t("select")}</option>        {/* ← CHANGED */}
                                <option value="Present">{t("present")}</option> {/* ← CHANGED */}
                                <option value="Absent">{t("absent")}</option>   {/* ← CHANGED */}
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
                    {loading ? t("savingAttendance") : t("saveAttendance")} {/* ← CHANGED */}
                </button>
            )}

        </div>
    );
}

export default MarkAttendance;