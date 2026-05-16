import React, { useEffect, useState } from "react";
import "./UserDashboard.css";
import { logLogout } from "../utils/logActivity";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import useAutoLogout from "../hooks/useAutoLogout";
import { useTranslation } from "react-i18next";

function UserDashboard() {

  const { t } = useTranslation();
  const navigate = useNavigate();
  useAutoLogout();

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

  const [attendance, setAttendance] = useState([]);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [todayStatus, setTodayStatus] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // ── NEW: quick action counts ──
  const [notifCount, setNotifCount] = useState(null);
  const [pendingCount, setPendingCount] = useState(null);
  const [ticketCount, setTicketCount] = useState(null);
  const [resolvedCount, setResolvedCount] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const email = user.email;
      const id = email.split("@")[0].toUpperCase();
      setUserId(id);

      const userRef = doc(db, "users", id);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserName(userSnap.data().name);
      }

      const snapshot = await getDocs(collection(db, "attendance"));
      let list = [];
      let present = 0;
      let absent = 0;

      snapshot.forEach((docItem) => {
        const data = docItem.data();
        if (data.userId === id) {
          list.push({ date: data.date, status: data.status });
          if (data.status === "Present") present++;
          if (data.status === "Absent") absent++;
        }
      });

      list.sort((a, b) => new Date(a.date) - new Date(b.date));
      const total = present + absent;
      const percent = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

      setAttendance(list);
      setPresentCount(present);
      setAbsentCount(absent);
      setPercentage(percent);

      const today = new Date().toISOString().split("T")[0];
      const todayRecord = list.find((item) => item.date === today);

      if (todayRecord) {
        setTodayStatus(todayRecord.status);
      } else {
        const sorted = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastRecord = sorted[0];
        if (lastRecord) {
          setTodayStatus(lastRecord.status);
        } else {
          setTodayStatus("none");
        }
      }

      // ── NEW: Notifications count ──
      const notifSnap = await getDocs(collection(db, "notifications"));
      let notifTotal = 0;
      notifSnap.forEach((docItem) => {
        const data = docItem.data();
        const docUserId = data.userId?.toUpperCase();
        if (!docUserId || docUserId === "ALL" || docUserId === id) notifTotal++;
      });
      setNotifCount(notifTotal);

      // ── NEW: Pending absence requests count ──
      const absenceSnap = await getDocs(collection(db, "absenceRequests"));
      let pendingTotal = 0;
      absenceSnap.forEach((docItem) => {
        const data = docItem.data();
        if (data.userId === id && data.status?.toLowerCase() === "pending") pendingTotal++;
      });
      setPendingCount(pendingTotal);

      // ── NEW: Tickets count ──
      const ticketsSnap = await getDocs(collection(db, "tickets"));
      let ticketTotal = 0;
      let resolvedTotal = 0;
      ticketsSnap.forEach((docItem) => {
        const data = docItem.data();
        if (data.idNo === id) {
          ticketTotal++;
          if (data.status === "Resolved") resolvedTotal++;
        }
      });
      setTicketCount(ticketTotal);
      setResolvedCount(resolvedTotal);

    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      if (userId) await logLogout(userId);
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.log("Logout Error:", error);
    }
  };

  return (
    <div className="dashboard-container">

      <button className="logout-btn" onClick={handleLogout}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {t("logout")}
      </button>

      <div className="dashboard-header">
        <h1 className="dashboard-title">{t("userDashboard")}</h1>
      </div>

      <div className="dashboard-card">

        <h2>{t("yourAttendance")}</h2>

        {/* ── TODAY STATUS BADGE ── */}
        <div className="today-status-wrap">
          {todayStatus === null ? (
            <div className="today-status-badge today-status-loading">
              <span className="today-status-dot today-dot-loading" />
              {t("loading")}
            </div>
          ) : todayStatus === "none" ? (
            <div className="today-status-badge today-status-none">
              <span className="today-status-dot today-dot-none" />
              {t("notMarked")}
            </div>
          ) : todayStatus === "Present" ? (
            <div className="today-status-badge today-status-present">
              <span className="today-status-dot today-dot-present" />
              ✓ {t("present")}
            </div>
          ) : (
            <div className="today-status-badge today-status-absent">
              <span className="today-status-dot today-dot-absent" />
              ✗ {t("absent")}
            </div>
          )}
        </div>

        {/* ── NEW: QUICK ACTION SHORTCUTS ── */}
        <div className="quick-actions">

          <div className="quick-card quick-card--blue" onClick={() => navigate("/my-notifications")}>
            <div className="quick-card-icon">🔔</div>
            <div className="quick-card-info">
              <span className="quick-card-title">{t("notifications")}</span>
              <span className="quick-card-count">
                {notifCount === null ? <span className="quick-spinner" /> : notifCount}
              </span>
            </div>
          </div>

          <div className="quick-card quick-card--amber" onClick={() => navigate("/my-requests")}>
            <div className="quick-card-icon">📋</div>
            <div className="quick-card-info">
              <span className="quick-card-title">{t("pendingRequests")}</span>
              <span className="quick-card-count">
                {pendingCount === null ? <span className="quick-spinner" /> : pendingCount}
              </span>
            </div>
          </div>

          <div className="quick-card quick-card--green" onClick={() => navigate("/ticketing-support")}>
            <div className="quick-card-icon">🎫</div>
            <div className="quick-card-info">
              <span className="quick-card-title">{t("myTickets")}</span>
              <span className="quick-card-count">
                {ticketCount === null ? <span className="quick-spinner" /> : ticketCount}
              </span>
              <span className="quick-card-sub">
                {resolvedCount === null ? "" : `${resolvedCount} ${t("resolved")}`}
              </span>
            </div>
          </div>

        </div>

        {/* ── USER SUMMARY ── */}
        <div className="user-summary">

          <div className="summary-item">
            <span className="summary-label">{t("name")}</span>
            <span className="summary-value">{userName}</span>
          </div>

          <div className="summary-item">
            <span className="summary-label">{t("userId")}</span>
            <span className="summary-value">{userId}</span>
          </div>

          <div className="summary-item present-stat">
            <span className="summary-label">{t("presentDays")}</span>
            <span className="summary-value stat-present">{presentCount}</span>
          </div>

          <div className="summary-item absent-stat">
            <span className="summary-label">{t("absentDays")}</span>
            <span className="summary-value stat-absent">{absentCount}</span>
          </div>

          <div className="summary-item percentage-stat">
            <span className="summary-label">{t("attendance")}</span>
            <span className="summary-value stat-percent">{percentage}%</span>
          </div>

        </div>

        {/* ── ACTION BUTTONS ── */}
        <div className="reason-btn-container">

          <button className="reason-btn" onClick={() => navigate("/submit-reason")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {t("submitAbsenceReason")}
          </button>

          <button className="reason-btn" onClick={() => navigate("/my-requests")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            {t("myRequests")}
          </button>

          <button className="reason-btn" onClick={() => navigate("/my-notifications")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {t("myNotifications")}
          </button>

          <button className="reason-btn" onClick={() => navigate("/ticketing-support")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {t("ticketingSupport")}
          </button>

          <button className="reason-btn" onClick={() => navigate("/my-profile")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {t("myProfile")}
          </button>

          <button className="reason-btn" onClick={() => navigate("/share-experience")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {t("shareExperience")}
          </button>

          <button className="reason-btn reason-btn--qr" onClick={() => navigate("/show-qr")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              <path d="M14 14h3v3h-3z" /><path d="M17 17h4" /><path d="M17 21v-4" />
            </svg>
            {t("showQR")}
          </button>

        </div>

        {/* ── ATTENDANCE TABLE ── */}
        <table className="attendance-table">
          <thead>
            <tr>
              <th>{t("date")}</th>
              <th>{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {attendance.length === 0 ? (
              <tr>
                <td colSpan="2" className="no-data">
                  {t("noAttendanceFound")}
                </td>
              </tr>
            ) : (
              attendance.map((item, index) => (
                <tr key={index}>
                  <td>{item.date}</td>
                  <td>
                    <span className={item.status === "Present" ? "present" : "absent"}>
                      {item.status === "Present"
                        ? `✓ ${t("present")}`
                        : `✗ ${t("absent")}`}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ── ATTENDANCE CALENDAR ── */}
        <div className="att-calendar">

          <div className="att-cal-header">
            <button
              className="att-cal-nav"
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
            >
              ‹
            </button>
            <span className="att-cal-month">
              {calendarMonth.toLocaleString("default", { month: "long", year: "numeric" })}
            </span>
            <button
              className="att-cal-nav"
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
            >
              ›
            </button>
          </div>

          <div className="att-cal-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="att-cal-day-label">{d}</div>
            ))}

            {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="att-cal-cell att-cal-empty" />
            ))}

            {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const record = attendance.find((a) => a.date === dateStr);
              const isToday = dateStr === new Date().toISOString().split("T")[0];
              return (
                <div
                  key={day}
                  className={`att-cal-cell ${record?.status === "Present" ? "att-cal-present" : record?.status === "Absent" ? "att-cal-absent" : "att-cal-unmarked"} ${isToday ? "att-cal-today" : ""}`}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <div className="att-cal-legend">
            <span className="att-cal-legend-dot att-dot-present" />{t("present")}
            <span className="att-cal-legend-dot att-dot-absent" />{t("absent")}
            <span className="att-cal-legend-dot att-dot-unmarked" />{t("notMarked")}
          </div>

        </div>

      </div>
    </div>
  );
}

export default UserDashboard;