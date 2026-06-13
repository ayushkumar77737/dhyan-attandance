import React, { useState, useEffect } from "react";
import "./MarkAttendance.css";
import { useNavigate } from "react-router-dom";
import { logAdminAction } from "../utils/logAdminAction";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    doc,
    setDoc,
    query,
    where,
    getDoc
} from "firebase/firestore";

import { useTranslation } from "react-i18next";

function MarkAttendance() {

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
        const today = new Date().toISOString().split("T")[0];

        if (date > today) {
            setMessage(t("futureAttendanceNotAllowed"));
            setUsers([]);
            setAttendance({});
            setTimeout(() => setMessage(""), 3000);
            return;
        }

        if (!date) {
            setMessage(t("selectDateFirst")); // ← CHANGED
            setTimeout(() => setMessage(""), 3000);
            return;
        }

        try {
            const q = query(collection(db, "attendance"), where("date", "==", date));
            const attendanceCheck = await getDocs(q);

            if (!attendanceCheck.empty) {
                setMessage(t("attendanceAlreadyMarked"));
                setUsers([]);
                const today = new Date().toISOString().split("T")[0];
                setDate(today);
                setTimeout(() => setMessage(""), 3000);
                return;
            }

            const querySnapshot = await getDocs(collection(db, "users"));
            const userList = [];

            querySnapshot.forEach((docItem) => {
                const data = docItem.data();
                if (
                    data.deleted !== true &&
                    data.role !== "admin"
                ) {
                    userList.push({
                        id: docItem.id,
                        ...data
                    });
                }
            });

            userList.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

            setUsers(userList);

        } catch (error) {
            console.log(error);
            setMessage(t("errorLoadingUsers"));
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
            await logAdminAction("mark_attendance", { targetId: date, details: t("logMarkedAttendance", { count: users.length }) });
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
                    ← {t("back")}
                </button>

                <h1 className="markattendance-title">{t("markAttendance")}</h1>
            </div>

            {message && (
                <div className="markattendance-message-box">{message}</div>
            )}

            <div className="markattendance-date-box">
                <input
                    type="date"
                    value={date}
                    onChange={(e) => {
                        setDate(e.target.value);
                        setUsers([]);
                        setAttendance({});
                    }}
                />
                <button onClick={loadUsers}>
                    {t("loadUsers")}
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
                                <option value="">{t("select")}</option>
                                <option value="Present">{t("present")}</option>
                                <option value="Absent">{t("absent")}</option>
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
                    {loading ? t("savingAttendance") : t("saveAttendance")}
                </button>
            )}

        </div>
    );
}

export default MarkAttendance;