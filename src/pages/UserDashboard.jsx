import React, { useEffect, useState } from "react";
import "./UserDashboard.css";
import { logLogout } from "../utils/logActivity";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import useAutoLogout from "../hooks/useAutoLogout";
import { useTranslation } from "react-i18next";
import logo from "../assets/logo2.png";
import favicon from "../assets/favicon.png";

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
      if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
    };
    document.addEventListener("contextmenu", disableRightClick);
    document.addEventListener("keydown", disableInspectKeys);
    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableInspectKeys);
    };
  }, []);

  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [todayStatus, setTodayStatus] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [notifCount, setNotifCount] = useState(null);
  const [pendingCount, setPendingCount] = useState(null);
  const [ticketCount, setTicketCount] = useState(null);
  const [resolvedCount, setResolvedCount] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.email) { navigate("/"); return; }
      const email = user.email;
      const id = email.split("@")[0].toUpperCase();
      setUserId(id);

      const userRef = doc(db, "users", id);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) { navigate("/"); return; }
      const userData = userSnap.data();
      if (userData.role === "admin") { navigate("/admin-dashboard"); return; }
      setUserName(userSnap.data().name || id);

      const snapshot = await getDocs(collection(db, "attendance"));
      let list = [], present = 0, absent = 0;
      snapshot.forEach((docItem) => {
        const data = docItem.data();
        if (data.userId === id) {
          list.push({ date: data.date, status: data.status });
          if (data.status?.trim() === "Present") present++;
          if (data.status?.trim() === "Absent") absent++;
        }
      });
      list.sort((a, b) => new Date(a.date) - new Date(b.date));
      const total = present + absent;
      const percent = total > 0 ? Math.min(100, ((present / total) * 100).toFixed(2)) : 0;
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
        setTodayStatus(sorted[0] ? sorted[0].status : "none");
      }

      const notifSnap = await getDocs(collection(db, "notifications"));
      let notifTotal = 0;
      notifSnap.forEach((docItem) => {
        const data = docItem.data();
        const docUserId = data.userId?.toUpperCase();
        if (!docUserId || docUserId === "ALL" || docUserId === id) notifTotal++;
      });
      setNotifCount(notifTotal);

      const absenceSnap = await getDocs(collection(db, "absenceRequests"));
      let pendingTotal = 0;
      absenceSnap.forEach((docItem) => {
        const data = docItem.data();
        if (data.userId === id && data.status?.toLowerCase() === "pending") pendingTotal++;
      });
      setPendingCount(pendingTotal);

      const ticketsSnap = await getDocs(collection(db, "tickets"));
      let ticketTotal = 0, resolvedTotal = 0;
      ticketsSnap.forEach((docItem) => {
        const data = docItem.data();
        if (data.idNo && data.idNo.toUpperCase() === id) {
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
      if (userId?.trim()) await logLogout(userId.trim());
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.log("Logout Error:", error);
    }
  };

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 3) : "?";

  const q = search.trim().toLowerCase();

  const quickActions = [
    {
      path: "/show-qr", cls: "ud-action-teal", name: t("showQR"), sub: t("markAttendance") || "Mark attendance",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3z" /><path d="M17 17h4" /><path d="M17 21v-4" /></svg>)
    },
    {
      path: "/my-profile", cls: "ud-action-teal", name: t("myProfile"), sub: t("viewDetails") || "View details",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>)
    },
    {
      path: "/submit-reason", cls: "ud-action-amber", name: t("submitAbsenceReason"), sub: t("requestLeave") || "Request leave",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>)
    },
    {
      path: "/my-requests", cls: "ud-action-blue", name: t("myRequests"), sub: t("trackStatus") || "Track status",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>)
    },
    {
      path: "/ticketing-support", cls: "ud-action-purple", name: t("ticketingSupport"), sub: t("raiseIssue") || "Raise an issue",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>)
    },
    {
      path: "/my-notifications", cls: "ud-action-rose", name: t("myNotifications"),
      sub: notifCount !== null && notifCount > 0 ? `${notifCount} unread` : (t("allClear") || "All clear"),
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>)
    },
    {
      path: "/share-experience", cls: "ud-action-slate", name: t("shareExperience"), sub: t("giveFeedback") || "Give feedback",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>)
    },
    {
      path: "/help-support", cls: "ud-action-slate", name: t("helpAndSupport"), sub: t("documentation") || "Documentation",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>)
    },
    {
      path: "/directory", cls: "ud-action-green", name: t("directory") || "Directory", sub: t("viewDetails") || "View details",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>)
    },
    {
      path: "/my-activity", cls: "ud-action-blue", name: t("myActivity") || "My Activity", sub: t("viewDetails") || "View details",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>)
    },
  ];

  const actionsFiltered = quickActions.filter(
    (a) => !q || a.name.toLowerCase().includes(q) || (a.sub || "").toLowerCase().includes(q)
  );

  return (
    <div className="ud-container">

      <div className="ud-topbar">
        <div className="ud-topbar-left">
          <img src={logo} alt="Logo" className="ud-logo" />
          <span className="ud-portal-label">{t("attendancePortal") || "Attendance Portal"}</span>
        </div>
        <div className="ud-topbar-right">
          <img src={favicon} alt="" className="ud-favicon" />
          <button className="ud-logout-btn" onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t("logout")}
          </button>
        </div>
      </div>

      <div className="ud-body">

        <div className="ud-hero-card">
          <div className="ud-hero-top">
            <div className="ud-avatar-row">
              <div className="ud-avatar">{getInitials(userName)}</div>
              <div className="ud-user-info">
                <div className="ud-user-name">{userName || "—"}</div>
                <div className="ud-user-id">ID: {userId}</div>
              </div>
            </div>

            {todayStatus === null ? (
              <div className="ud-status-pill ud-status-loading">
                <span className="ud-dot ud-dot-loading" /> {t("loading")}
              </div>
            ) : todayStatus === "none" ? (
              <div className="ud-status-pill ud-status-none">
                <span className="ud-dot ud-dot-none" /> {t("notMarked")}
              </div>
            ) : todayStatus === "Present" ? (
              <div className="ud-status-pill ud-status-present">
                <span className="ud-dot ud-dot-present" /> ✓ {t("present")}
              </div>
            ) : (
              <div className="ud-status-pill ud-status-absent">
                <span className="ud-dot ud-dot-absent" /> ✗ {t("absent")}
              </div>
            )}
          </div>

          <div className="ud-stats-row">
            <div className="ud-stat">
              <span className="ud-stat-val ud-stat-green">{percentage}%</span>
              <span className="ud-stat-label">{t("attendance")}</span>
            </div>
            <div className="ud-stat-divider" />
            <div className="ud-stat">
              <span className="ud-stat-val ud-stat-white">{presentCount}</span>
              <span className="ud-stat-label">{t("presentDays")}</span>
            </div>
            <div className="ud-stat-divider" />
            <div className="ud-stat">
              <span className="ud-stat-val ud-stat-red">{absentCount}</span>
              <span className="ud-stat-label">{t("absentDays")}</span>
            </div>
          </div>
        </div>

        <div className="ud-search-wrap">
          <svg className="ud-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="ud-search"
            type="text"
            placeholder={t("dashSearchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="ud-search-clear" onClick={() => setSearch("")}>✕</button>}
        </div>

        <div className="ud-section">
          <div className="ud-section-header">
            <span className="ud-section-title">{t("activity") || "Activity"}</span>
          </div>
          <div className="ud-activity-grid">

            <div className="ud-act-card ud-act-amber" onClick={() => navigate("/my-notifications")}>
              <div className="ud-act-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div className="ud-act-info">
                <span className="ud-act-val">{notifCount === null ? <span className="ud-spinner" /> : notifCount}</span>
                <span className="ud-act-label">{t("notifications")}</span>
              </div>
            </div>

            <div className="ud-act-card ud-act-blue" onClick={() => navigate("/my-requests")}>
              <div className="ud-act-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="ud-act-info">
                <span className="ud-act-val">{pendingCount === null ? <span className="ud-spinner" /> : pendingCount}</span>
                <span className="ud-act-label">{t("pendingRequests")}</span>
              </div>
            </div>

            <div className="ud-act-card ud-act-purple" onClick={() => navigate("/ticketing-support")}>
              <div className="ud-act-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
                </svg>
              </div>
              <div className="ud-act-info">
                <span className="ud-act-val">{ticketCount === null ? <span className="ud-spinner" /> : ticketCount}</span>
                <span className="ud-act-label">{t("myTickets")}</span>
                {resolvedCount !== null && resolvedCount > 0 && (
                  <span className="ud-act-sub">{resolvedCount} {t("resolved")}</span>
                )}
              </div>
            </div>

          </div>
        </div>

        <div className="ud-section">
          <div className="ud-section-header">
            <span className="ud-section-title">{t("quickActions") || "Quick Actions"}</span>
          </div>
          {actionsFiltered.length === 0 ? (
            <div className="ud-no-results">🔍 {t("dashNoResults")}</div>
          ) : (
            <div className="ud-action-grid">
              {actionsFiltered.map((a) => (
                <button className={`ud-action-btn ${a.cls}`} key={a.path} onClick={() => navigate(a.path)}>
                  <div className="ud-action-icon">{a.icon}</div>
                  <div className="ud-action-text">
                    <span className="ud-action-name">{a.name}</span>
                    <span className="ud-action-sub">{a.sub}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ud-section">
          <div className="ud-section-header">
            <span className="ud-section-title">{t("attendanceLog") || "Attendance Log"}</span>
          </div>
          <div className="ud-table-wrap">
            <table className="ud-table">
              <thead>
                <tr>
                  <th>{t("date")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="ud-no-data">{t("noAttendanceFound")}</td>
                  </tr>
                ) : (
                  attendance.map((item, index) => (
                    <tr key={index}>
                      <td>{item.date}</td>
                      <td>
                        <span className={item.status === "Present" ? "ud-badge ud-badge-present" : "ud-badge ud-badge-absent"}>
                          {item.status === "Present" ? `✓ ${t("present")}` : `✗ ${t("absent")}`}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ud-section">
          <div className="ud-section-header">
            <span className="ud-section-title">
              {calendarMonth.toLocaleString("default", { month: "long", year: "numeric" })}
            </span>
            <div className="ud-cal-nav-row">
              <button className="ud-cal-nav" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>‹</button>
              <button className="ud-cal-nav" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>›</button>
            </div>
          </div>

          <div className="ud-cal-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="ud-cal-dow">{d}</div>
            ))}
            {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() }).map((_, i) => (
              <div key={`e-${i}`} className="ud-cal-cell ud-cal-empty" />
            ))}
            {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const record = attendance.find((a) => a.date === dateStr);
              const isToday = dateStr === new Date().toISOString().split("T")[0];
              return (
                <div key={day} className={`ud-cal-cell ${record?.status === "Present" ? "ud-cal-present" : record?.status === "Absent" ? "ud-cal-absent" : "ud-cal-unmarked"} ${isToday ? "ud-cal-today" : ""}`}>
                  {day}
                </div>
              );
            })}
          </div>

          <div className="ud-cal-legend">
            <span><span className="ud-leg-dot ud-leg-present" />{t("present")}</span>
            <span><span className="ud-leg-dot ud-leg-absent" />{t("absent")}</span>
            <span><span className="ud-leg-dot ud-leg-unmarked" />{t("notMarked")}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default UserDashboard;