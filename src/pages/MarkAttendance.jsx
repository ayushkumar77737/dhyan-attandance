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
    users: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    save: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
        </svg>
    ),
    chevron: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    ),
    info: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
};

/* Decorative dotted grid used in the page corners */
const Dots = ({ className }) => (
    <svg className={`mkat-dots ${className}`} viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {[...Array(6)].map((_, r) =>
            [...Array(6)].map((_, c) => (
                <circle key={`${r}-${c}`} cx={7 + c * 15} cy={7 + r * 15} r="3" fill="currentColor" />
            ))
        )}
    </svg>
);

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
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");
    const today = new Date().toISOString().split("T")[0];

    useEffect(() => {
        const today = new Date().toISOString().split("T")[0];
        setDate(today);
    }, []);

    const getInitials = (name) =>
        name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

    const loadUsers = async () => {
        const today = new Date().toISOString().split("T")[0];

        if (date > today) {
            setMessage(t("futureAttendanceNotAllowed"));
            setUsers([]);
            setAttendance({});
            setTimeout(() => setMessage(""), 3000);
            return;
        }
        if (date < today) {
            setMessage(t("pastAttendanceNotAllowed"));
            setUsers([]);
            setAttendance({});
            setTimeout(() => setMessage(""), 3000);
            return;
        }

        if (!date) {
            setMessage(t("selectDateFirst"));
            setTimeout(() => setMessage(""), 3000);
            return;
        }

        try {
            setLoadingUsers(true);

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

            /* Profile photos live in `profiles/{ID}.profileImage` — that's the
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
                console.warn("MarkAttendance: could not load profile images —", e);
            }

            const querySnapshot = await getDocs(collection(db, "users"));
            const userList = [];

            querySnapshot.forEach((docItem) => {
                const data = docItem.data();
                if (
                    data.deleted !== true &&
                    data.role !== "admin"
                ) {
                    const uid = docItem.id;
                    userList.push({
                        id: uid,
                        ...data,
                        image: imageMap[String(uid).toUpperCase()] || data.profileImage || "",
                    });
                }
            });

            userList.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

            setUsers(userList);

        } catch (error) {
            console.log(error);
            setMessage(t("errorLoadingUsers"));
            setTimeout(() => setMessage(""), 3000);
        } finally {
            setLoadingUsers(false);
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

    /* Two-tone heading. Rather than hard-coding a "Mark" + "Attendance" split
       (which breaks the moment a language reorders the words), take the
       translated string and tint its final word. */
    const titleFull = (t("markAttendance") || "Mark Attendance").trim();
    const titleWords = titleFull.split(/\s+/);
    const titleAccent = titleWords.length > 1 ? titleWords.pop() : titleFull;
    const titleLead = titleWords.length ? titleWords.join(" ") : "";

    const markedCount = users.filter((u) => attendance[u.id]).length;

    return (
        <div className="markattendance-container" data-theme={theme}>

            <Dots className="mkat-dots--tr" />
            <Dots className="mkat-dots--bl" />

            {/* ---------------------------- HEADER ---------------------------- */}
            <div className="mkat-header">
                <button
                    className="mkat-back"
                    onClick={() => navigate("/admin-dashboard")}
                >
                    <span className="mkat-back-icon">{icons.back}</span>
                    {t("back")}
                </button>

                <div className="mkat-head-text">
                    <h1 className="mkat-title">
                        {titleLead && <span className="mkat-title-lead">{titleLead} </span>}
                        <span className="mkat-title-accent">{titleAccent}</span>
                    </h1>
                    <p className="mkat-subtitle">
                        {t("markAttendanceSubtitle") ||
                            "Select users and mark their attendance for the selected date."}
                    </p>
                </div>
            </div>

            {message && (
                <div className="mkat-message">
                    <span className="mkat-message-icon">{icons.info}</span>
                    {message}
                </div>
            )}

            {/* --------------------------- CONTROLS --------------------------- */}
            <div className="mkat-controls">
                <div className="mkat-date-wrap">
                    <span className="mkat-date-icon">{icons.calendar}</span>
                    <input
                        type="date"
                        value={date}
                        min={today}
                        onChange={(e) => {
                            setDate(e.target.value);
                            setUsers([]);
                            setAttendance({});
                        }}
                    />
                </div>

                <button className="mkat-load" onClick={loadUsers} disabled={loadingUsers}>
                    {loadingUsers
                        ? <span className="mkat-spinner" />
                        : <span className="mkat-btn-icon">{icons.users}</span>}
                    {loadingUsers ? (t("loading") || "Loading…") : t("loadUsers")}
                </button>
            </div>

            {/* --------------------------- USER TABLE -------------------------- */}
            {users.length > 0 && (
                <div className="mkat-panel">

                    <div className="mkat-panel-head">
                        <span className="mkat-panel-icon">{icons.users}</span>
                        <div className="mkat-panel-text">
                            <h2 className="mkat-panel-title">{t("usersList") || "Users List"}</h2>
                            <p className="mkat-panel-sub">
                                {t("totalUsers")}: {users.length}
                                <span className="mkat-progress-sep" aria-hidden="true">•</span>
                                <span className="mkat-progress">{markedCount}/{users.length}</span>
                            </p>
                        </div>
                    </div>

                    <div className="mkat-table">
                        <div className="mkat-thead">
                            <span>{t("columnUser") || t("user") || "User"}</span>
                            <span>{t("columnId") || "ID"}</span>
                            <span>{t("attendanceStatus") || "Attendance Status"}</span>
                        </div>

                        {users.map((user) => {
                            const value = attendance[user.id] || "";
                            return (
                                <div key={user.id} className="mkat-row">

                                    <div className="mkat-cell mkat-cell--user">
                                        <span className="mkat-avatar">
                                            {getInitials(user.name)}
                                            {user.image ? (
                                                <img
                                                    className="mkat-avatar-img"
                                                    src={user.image}
                                                    alt={user.name}
                                                    loading="lazy"
                                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                                />
                                            ) : null}
                                        </span>
                                        <span className="mkat-user-text">
                                            <span className="mkat-user-name">{user.name}</span>
                                            <span className="mkat-user-id">ID: {user.id}</span>
                                        </span>
                                    </div>

                                    <div className="mkat-cell mkat-cell--id">
                                        <span className="mkat-id-chip">{user.id}</span>
                                    </div>

                                    <div className="mkat-cell mkat-cell--status">
                                        <div className="mkat-select-wrap" data-status={value || "none"}>
                                            <span className="mkat-status-dot" aria-hidden="true" />
                                            <select
                                                value={value}
                                                onChange={(e) =>
                                                    handleAttendanceChange(user.id, e.target.value)
                                                }
                                                aria-label={`${t("attendanceStatus") || "Attendance Status"} — ${user.name}`}
                                            >
                                                <option value="">{t("select")}</option>
                                                <option value="Present">{t("present")}</option>
                                                <option value="Absent">{t("absent")}</option>
                                            </select>
                                            <span className="mkat-select-chevron" aria-hidden="true">
                                                {icons.chevron}
                                            </span>
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {users.length > 0 && (
                <button
                    className="mkat-save"
                    onClick={saveAttendance}
                    disabled={loading}
                >
                    {loading
                        ? <span className="mkat-spinner" />
                        : <span className="mkat-btn-icon">{icons.save}</span>}
                    {loading ? t("savingAttendance") : t("saveAttendance")}
                </button>
            )}

        </div>
    );
}

export default MarkAttendance;