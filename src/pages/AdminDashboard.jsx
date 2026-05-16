import React, { useEffect, useState } from "react";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";

import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";

import { collection, getDocs } from "firebase/firestore";

import { useTranslation } from "react-i18next";

import useAutoLogout from "../hooks/useAutoLogout";

import { logLogout } from "../utils/logActivity";
import { Pie, Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler
);

/* ─── Shared tooltip config ─────────────────────────────────── */

const sharedTooltip = {
  backgroundColor: "#0d1b2a",
  borderColor: "rgba(255,255,255,0.1)",
  borderWidth: 1,
  titleColor: "#e8edf5",
  bodyColor: "#e8edf5",
  padding: 12,
  titleFont: { family: "Outfit, sans-serif", size: 13 },
  bodyFont: { family: "Outfit, sans-serif", size: 13 },
};

const makeCircleLegend = () => ({
  position: "bottom",
  labels: {
    color: "#e8edf5",
    font: { family: "Outfit, sans-serif", size: 12 },
    padding: 24,
    usePointStyle: true,
    pointStyle: "circle",
    pointStyleWidth: 8,
    boxHeight: 8,
  },
});

/* ─── Component ─────────────────────────────────────────────── */

function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useAutoLogout();

  const [totalUsers, setTotalUsers] = useState(0);
  const [deletedUsers, setDeletedUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [openTickets, setOpenTickets] = useState(null);
  const [presentToday, setPresentToday] = useState(null);
  const [absentToday, setAbsentToday] = useState(null);

  const [chartDate, setChartDate] = useState(new Date().toISOString().split("T")[0]);

  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);

  const [ticketData, setTicketData] = useState([]);
  const [ticketLoading, setTicketLoading] = useState(true);

  const [absenceData, setAbsenceData] = useState([]);
  const [absenceLoading, setAbsenceLoading] = useState(true);

  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendDays, setTrendDays] = useState(7);

  // ── NEW: monthly chart state ──
  const [monthlyData, setMonthlyData] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

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

    fetchUserStats();
    fetchChartData(chartDate);
    fetchTicketData();
    fetchAbsenceData();
    fetchOpenTickets();
    fetchTrendData(7);
    fetchMonthlyData(selectedMonth); // ── NEW

    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableInspectKeys);
    };
  }, []);

  /* ── Firestore fetchers ── */

  const fetchUserStats = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      let total = 0, deleted = 0;
      snap.forEach((doc) => {
        total++;
        if (doc.data().deleted === true) deleted++;
      });
      setTotalUsers(total);
      setDeletedUsers(deleted);
      setActiveUsers(total - deleted);
    } catch (err) { console.log(err); }
  };

  const fetchOpenTickets = async () => {
    try {
      const snap = await getDocs(collection(db, "tickets"));
      let open = 0;
      snap.forEach((doc) => {
        const s = doc.data().status;
        if (s === "Pending" || s === "In Progress") open++;
      });
      setOpenTickets(open);
    } catch (err) { console.log(err); setOpenTickets(0); }
  };

  const fetchChartData = async (dateParam) => {
    try {
      setChartLoading(true);
      const targetDate = dateParam || new Date().toISOString().split("T")[0];
      const snap = await getDocs(collection(db, "attendance"));
      let present = 0, absent = 0;
      snap.forEach((doc) => {
        const d = doc.data();
        if (d.date === targetDate) {
          if (d.status === "Present") present++;
          else if (d.status === "Absent") absent++;
        }
      });
      setPresentToday(present);
      setAbsentToday(absent);
      setChartData(
        present === 0 && absent === 0
          ? []
          : [{ name: t("present"), value: present }, { name: t("absent"), value: absent }]
      );
    } catch (err) { console.log(err); setChartData([]); }
    finally { setChartLoading(false); }
  };

  const fetchTicketData = async () => {
    try {
      setTicketLoading(true);
      const snap = await getDocs(collection(db, "tickets"));
      let pending = 0, inProgress = 0, resolved = 0;
      snap.forEach((doc) => {
        const { status } = doc.data();
        if (status === "Pending") pending++;
        else if (status === "In Progress") inProgress++;
        else if (status === "Resolved") resolved++;
      });
      setTicketData(
        pending === 0 && inProgress === 0 && resolved === 0
          ? []
          : [
            { name: t("pending"), value: pending },
            { name: t("inProgress"), value: inProgress },
            { name: t("resolved"), value: resolved },
          ]
      );
    } catch (err) { console.log(err); setTicketData([]); }
    finally { setTicketLoading(false); }
  };

  const fetchAbsenceData = async () => {
    try {
      setAbsenceLoading(true);
      const snap = await getDocs(collection(db, "absenceRequests"));
      let pending = 0, approved = 0, rejected = 0;
      snap.forEach((doc) => {
        const s = doc.data().status?.toLowerCase();
        if (s === "pending") pending++;
        else if (s === "approved") approved++;
        else if (s === "rejected") rejected++;
      });
      setAbsenceData(
        pending === 0 && approved === 0 && rejected === 0
          ? []
          : [
            { label: t("pending"), value: pending, color: "#f59e0b" },
            { label: t("approved"), value: approved, color: "#2dce89" },
            { label: t("rejected"), value: rejected, color: "#ef4444" },
          ]
      );
    } catch (err) { console.log(err); setAbsenceData([]); }
    finally { setAbsenceLoading(false); }
  };

  const fetchTrendData = async (days) => {
    try {
      setTrendLoading(true);
      const snap = await getDocs(collection(db, "attendance"));
      const dateList = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dateList.push(d.toISOString().split("T")[0]);
      }
      const countMap = {};
      dateList.forEach((date) => (countMap[date] = 0));
      snap.forEach((doc) => {
        const d = doc.data();
        if (d.status === "Present" && countMap[d.date] !== undefined)
          countMap[d.date]++;
      });
      const hasData = Object.values(countMap).some((v) => v > 0);
      setTrendData(
        !hasData
          ? []
          : dateList.map((date) => ({ date: date.slice(5), count: countMap[date] }))
      );
    } catch (err) { console.log(err); setTrendData([]); }
    finally { setTrendLoading(false); }
  };

  // ── NEW: monthly attendance fetcher ──
  const fetchMonthlyData = async (month) => {
    try {
      setMonthlyLoading(true);
      const usersSnap = await getDocs(collection(db, "users"));
      const attendanceSnap = await getDocs(collection(db, "attendance"));

      const userMap = {};
      usersSnap.forEach((doc) => {
        const d = doc.data();
        if (d.deleted !== true) userMap[d.id] = d.name;
      });

      const countMap = {};
      Object.keys(userMap).forEach((id) => (countMap[id] = 0));

      attendanceSnap.forEach((doc) => {
        const d = doc.data();
        if (
          d.date?.startsWith(month) &&
          d.status === "Present" &&
          countMap[d.userId] !== undefined
        ) {
          countMap[d.userId]++;
        }
      });

      const result = Object.entries(countMap).map(([id, count]) => ({
        name: userMap[id] || id,
        count,
      }));

      setMonthlyData(result.every((r) => r.count === 0) ? [] : result);
    } catch (err) { console.log(err); setMonthlyData([]); }
    finally { setMonthlyLoading(false); }
  };

  const handleLogout = async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (userId) await logLogout(userId.toUpperCase());
      await signOut(auth);
      navigate("/");
    } catch (err) { console.log(err); }
  };

  /* ── Chart configs ── */

  const attendancePieData = {
    labels: [t("present"), t("absent")],
    datasets: [{
      data: chartData.map((d) => d.value),
      backgroundColor: ["#2563EB", "#ef4444"],
      borderColor: ["#1d4ed8", "#dc2626"],
      borderWidth: 2,
      hoverOffset: 14,
    }],
  };

  const attendancePieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: makeCircleLegend(),
      tooltip: {
        ...sharedTooltip,
        callbacks: { label: (ctx) => `  ${ctx.label}: ${ctx.parsed}` },
      },
    },
  };

  const ticketDonutData = {
    labels: [t("pending"), t("inProgress"), t("resolved")],
    datasets: [{
      data: ticketData.map((d) => d.value),
      backgroundColor: ["#f59e0b", "#3b82f6", "#2dce89"],
      borderColor: ["#d97706", "#2563eb", "#22a86e"],
      borderWidth: 2,
      hoverOffset: 14,
    }],
  };

  const ticketDonutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "58%",
    plugins: {
      legend: makeCircleLegend(),
      tooltip: {
        ...sharedTooltip,
        callbacks: { label: (ctx) => `  ${ctx.label}: ${ctx.parsed}` },
      },
    },
  };

  const absenceBarData = {
    labels: absenceData.map((d) => d.label),
    datasets: [{
      label: t("absenceRequests"),
      data: absenceData.map((d) => d.value),
      backgroundColor: absenceData.map((d) => d.color + "bb"),
      borderColor: absenceData.map((d) => d.color),
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false,
      maxBarThickness: 64,
      minBarLength: 4,
    }],
  };

  const absenceBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...sharedTooltip,
        callbacks: { label: (ctx) => `  ${ctx.label}: ${ctx.parsed.y}` },
      },
    },
    layout: { padding: { left: 8, right: 8 } },
    scales: {
      x: {
        ticks: {
          color: "#e8edf5",
          font: { family: "Outfit, sans-serif", size: 12, weight: "600" },
          maxRotation: 35,
          autoSkip: false,
        },
        grid: { display: false },
        border: { color: "rgba(255,255,255,0.06)" },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#64748b",
          font: { family: "Outfit, sans-serif", size: 11 },
          maxTicksLimit: 8,
          precision: 0,
        },
        grid: { color: "rgba(255,255,255,0.04)" },
        border: { color: "rgba(255,255,255,0.06)" },
      },
    },
  };

  const trendLineData = {
    labels: trendData.map((d) => d.date),
    datasets: [{
      label: t("present"),
      data: trendData.map((d) => d.count),
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59, 130, 246, 0.12)",
      borderWidth: 2.5,
      pointBackgroundColor: "#3b82f6",
      pointBorderColor: "#1d4ed8",
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 8,
      tension: 0.4,
      fill: true,
    }],
  };

  const trendLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...sharedTooltip,
        callbacks: { label: (ctx) => `  ${t("present")}: ${ctx.parsed.y}` },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#64748b",
          font: { family: "Outfit, sans-serif", size: 11 },
          maxRotation: 0,
        },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        beginAtZero: true,
        suggestedMax: 5,
        ticks: {
          color: "#64748b",
          font: { family: "Outfit, sans-serif", size: 11 },
          stepSize: 1,
          precision: 0,
        },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
    },
  };

  // ── NEW: monthly bar chart config ──
  const monthlyBarData = {
    labels: monthlyData.map((d) => d.name),
    datasets: [{
      label: t("present"),
      data: monthlyData.map((d) => d.count),
      backgroundColor: "rgba(59, 130, 246, 0.7)",
      borderColor: "#3b82f6",
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false,
      maxBarThickness: 56,
      minBarLength: 4,
    }],
  };

  const monthlyBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...sharedTooltip,
        callbacks: { label: (ctx) => `  ${t("present")}: ${ctx.parsed.y} days` },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#e8edf5",
          font: { family: "Outfit, sans-serif", size: 12, weight: "600" },
          maxRotation: 35,
          autoSkip: false,
        },
        grid: { display: false },
        border: { color: "rgba(255,255,255,0.06)" },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#64748b",
          font: { family: "Outfit, sans-serif", size: 11 },
          precision: 0,
          stepSize: 1,
        },
        grid: { color: "rgba(255,255,255,0.04)" },
        border: { color: "rgba(255,255,255,0.06)" },
      },
    },
  };

  /* ── Render ── */

  return (
    <div className="admin-container">

      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">{t("adminDashboard")}</h1>
        <button className="logout-btn" onClick={handleLogout}>{t("logout")}</button>
      </div>

      {/* ── Stats — ALL 6 cards inside one stats-container ── */}
      <div className="stats-container">

        <div className="stat-card">
          <h3>{t("totalUsers")}</h3>
          <p>{totalUsers}</p>
        </div>

        <div className="stat-card">
          <h3>{t("deletedUsers")}</h3>
          <p>{deletedUsers}</p>
        </div>

        <div className="stat-card">
          <h3>{t("activeUsers")}</h3>
          <p>{activeUsers}</p>
        </div>

        <div className="stat-card stat-card--tickets">
          <h3>{t("openTickets")}</h3>
          {openTickets === null ? (
            <div className="stat-spinner" />
          ) : (
            <p className={openTickets > 0 ? "stat-tickets-warn" : ""}>{openTickets}</p>
          )}
        </div>

        <div className="stat-card stat-card--present">
          <h3>{t("presentToday")}</h3>
          {presentToday === null ? (
            <div className="stat-spinner stat-spinner--present" />
          ) : (
            <p className="stat-present-num">{presentToday}</p>
          )}
        </div>

        <div className="stat-card stat-card--absent">
          <h3>{t("absentToday")}</h3>
          {absentToday === null ? (
            <div className="stat-spinner stat-spinner--absent" />
          ) : (
            <p className="stat-absent-num">{absentToday}</p>
          )}
        </div>

      </div>{/* ── end stats-container ── */}

      {/* ── THREE CHARTS SIDE BY SIDE ── */}
      <div className="charts-row">

        <div className="chart-section">
          <h2 className="chart-title">{t("todayAttendance")}</h2>
          <div className="chart-date-picker">
            <input
              type="date"
              value={chartDate}
              onChange={(e) => {
                setChartDate(e.target.value);
                fetchChartData(e.target.value);
              }}
            />
          </div>
          {chartLoading ? (
            <div className="chart-spinner-wrap"><div className="chart-spinner" /></div>
          ) : chartData.length === 0 ? (
            <div className="chart-empty"><span>📭</span>{t("noDataAvailable")}</div>
          ) : (
            <div className="chart-wrapper">
              <Pie data={attendancePieData} options={attendancePieOptions} />
            </div>
          )}
        </div>

        <div className="chart-section">
          <h2 className="chart-title">{t("ticketStatusOverview")}</h2>
          {ticketLoading ? (
            <div className="chart-spinner-wrap"><div className="chart-spinner" /></div>
          ) : ticketData.length === 0 ? (
            <div className="chart-empty"><span>📭</span>{t("noDataAvailable")}</div>
          ) : (
            <div className="chart-wrapper">
              <Pie data={ticketDonutData} options={ticketDonutOptions} />
            </div>
          )}
        </div>

        <div className="chart-section">
          <h2 className="chart-title">{t("absenceRequests")}</h2>
          {absenceLoading ? (
            <div className="chart-spinner-wrap"><div className="chart-spinner" /></div>
          ) : absenceData.length === 0 ? (
            <div className="chart-empty"><span>📭</span>{t("noDataAvailable")}</div>
          ) : (
            <div className="chart-wrapper">
              <Bar data={absenceBarData} options={absenceBarOptions} />
            </div>
          )}
        </div>

      </div>

      {/* ── ATTENDANCE TREND — FULL WIDTH ── */}
      <div className="chart-section chart-section-trend">
        <div className="trend-header">
          <h2 className="chart-title">{t("attendanceTrend")}</h2>
          <div className="trend-toggle">
            <button
              className={`trend-btn ${trendDays === 7 ? "active" : ""}`}
              onClick={() => { setTrendDays(7); fetchTrendData(7); }}
            >
              7 {t("days")}
            </button>
            <button
              className={`trend-btn ${trendDays === 30 ? "active" : ""}`}
              onClick={() => { setTrendDays(30); fetchTrendData(30); }}
            >
              30 {t("days")}
            </button>
          </div>
        </div>

        {trendLoading ? (
          <div className="chart-spinner-wrap"><div className="chart-spinner" /></div>
        ) : trendData.length === 0 ? (
          <div className="chart-empty"><span>📭</span>{t("noDataAvailable")}</div>
        ) : (
          <div className="trend-wrapper">
            <Line data={trendLineData} options={trendLineOptions} />
          </div>
        )}
      </div>

      {/* ── NEW: MONTHLY ATTENDANCE BAR CHART — FULL WIDTH ── */}
      <div className="chart-section chart-section-trend">
        <div className="trend-header">
          <h2 className="chart-title">{t("monthlyAttendance")}</h2>
          <div className="chart-date-picker">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                fetchMonthlyData(e.target.value);
              }}
            />
          </div>
        </div>

        {monthlyLoading ? (
          <div className="chart-spinner-wrap"><div className="chart-spinner" /></div>
        ) : monthlyData.length === 0 ? (
          <div className="chart-empty"><span>📭</span>{t("noDataAvailable")}</div>
        ) : (
          <div className="trend-wrapper--monthly">
            <div style={{ width: `${Math.max(monthlyData.length * 100, 100 + "%")}px`, height: "300px", minWidth: "100%" }}>
              <Bar data={monthlyBarData} options={monthlyBarOptions} />
            </div>
          </div>
        )}
      </div>

      {/* ── Dashboard Cards ── */}
      <div className="dashboard-body">

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="add user" />
            <h3>{t("addUser")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/add-user")}>{t("addUser")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="attendance" />
            <h3>{t("attendance")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/mark-attendance")}>{t("markAttendance")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="all users" />
            <h3>{t("allUsers")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/all-users")}>{t("allUsers")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="report" />
            <h3>{t("attendanceReport")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/attendance-report")}>{t("viewReport")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="percentage" />
            <h3>{t("percentageReport")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/user-percentage")}>{t("viewReport")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="deleted users" />
            <h3>{t("deletedUsers")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/deleted-users")}>{t("viewUsers")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="absence" />
            <h3>{t("absenceManagement")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/absence-management")}>{t("viewRequests")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="notifications" />
            <h3>{t("notifications")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/notifications")}>{t("postNotification")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="track ticket" />
            <h3>{t("trackTicket")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/track-ticket")}>{t("trackTicket")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="profile registration" />
            <h3>{t("profileRegistration")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/profile-registration")}>{t("profileRegistration")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="toggle status" />
            <h3>{t("toggleStatus")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/toggle-status")}>{t("toggleStatus")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="session feedbacks" />
            <h3>{t("sessionFeedbacks")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/session-feedbacks")}>{t("viewFeedbacks")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="all profiles" />
            <h3>{t("allProfiles")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/all-profiles")}>{t("allProfiles")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="activity logs" />
            <h3>{t("activityLogs")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/activity-logs")}>{t("activityLogs")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="id requests" />
            <h3>{t("idRequests")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/id-requests")}>{t("viewRequests")}</button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="smart attendance" />
            <h3>{t("smartAttendance")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/smart-attendance")}>{t("smartAttendance")}</button>
        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;