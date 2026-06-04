import React, { useEffect, useState } from "react";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";

import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";

import { collection, getDocs, getDoc, doc } from "firebase/firestore";

import { useTranslation } from "react-i18next";

import useAutoLogout from "../hooks/useAutoLogout";

import { logLogout } from "../utils/logActivity";

import logo from "../assets/logo2.png";
import favicon from "../assets/favicon.png";

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
  ArcElement, Tooltip, Legend,
  LineElement, BarElement, PointElement,
  CategoryScale, LinearScale, Filler
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

/* ─── SVG Icons ─────────────────────────────────────────────── */

const icons = {
  userPlus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  calendarCheck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      <polyline points="9 16 11 18 15 14" />
    </svg>
  ),
  qrCode: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="4" height="4" />
      <line x1="21" y1="14" x2="21" y2="14" /><line x1="21" y1="19" x2="21" y2="21" />
      <line x1="19" y1="21" x2="21" y2="21" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  fileText: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  pieChart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  ),
  calendarX: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      <line x1="10" y1="15" x2="14" y2="19" /><line x1="14" y1="15" x2="10" y2="19" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  ticket: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <line x1="9" y1="9" x2="9" y2="9.01" /><line x1="15" y1="9" x2="15" y2="9.01" />
      <line x1="9" y1="15" x2="9" y2="15.01" /><line x1="15" y1="15" x2="15" y2="15.01" />
    </svg>
  ),
  userCog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      <circle cx="19" cy="19" r="2" /><path d="M19 15v2" />
    </svg>
  ),
  toggleLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="5" width="22" height="14" rx="7" ry="7" />
      <circle cx="8" cy="12" r="3" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  userList: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="23" y2="8" /><line x1="19" y1="12" x2="23" y2="12" />
      <line x1="19" y1="16" x2="23" y2="16" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  adminLog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="9" y1="10" x2="15" y2="10" /><line x1="9" y1="13" x2="13" y2="13" />
    </svg>
  ),
  idCard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" />
      <path d="M13 12h5" /><path d="M13 16h3" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

/* ─── Component ─────────────────────────────────────────────── */

function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showGreeting, setShowGreeting] = useState(
    () => !sessionStorage.getItem("greetingShown")
  );
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

  const [monthlyData, setMonthlyData] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const checkAdmin = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) { navigate("/"); return; }
    try {
      const userRef = doc(db, "users", localStorage.getItem("userId"));
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists() || userSnap.data().role !== "admin") { navigate("/"); return; }
    } catch (error) { console.error(error); navigate("/"); }
  };

  useEffect(() => {
    const disableRightClick = (e) => e.preventDefault();
    const disableInspectKeys = (e) => {
      if (e.key === "F12") e.preventDefault();
      if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) e.preventDefault();
      if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
    };
    document.addEventListener("contextmenu", disableRightClick);
    document.addEventListener("keydown", disableInspectKeys);
    checkAdmin();
    fetchUserStats();
    fetchChartData(chartDate);
    fetchTicketData();
    fetchAbsenceData();
    fetchOpenTickets();
    fetchTrendData(7);
    fetchMonthlyData(selectedMonth);
    sessionStorage.setItem("greetingShown", "true");
    const greetingTimer = setTimeout(() => setShowGreeting(false), 4000);
    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableInspectKeys);
      clearTimeout(greetingTimer);
    };
  }, []);

  /* ── Firestore fetchers ── */

  const fetchUserStats = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      let total = 0, deleted = 0;
      snap.forEach((docItem) => {
        const data = docItem.data();
        if (data.role === "admin") return;
        total++;
        if (data.deleted === true) deleted++;
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
      snap.forEach((d) => {
        const s = d.data().status;
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
      snap.forEach((d) => {
        const data = d.data();
        if (data.date === targetDate) {
          if (data.status === "Present") present++;
          else if (data.status === "Absent") absent++;
        }
      });
      setPresentToday(present);
      setAbsentToday(absent);
      setChartData(
        present === 0 && absent === 0 ? [] :
          [{ name: t("present"), value: present }, { name: t("absent"), value: absent }]
      );
    } catch (err) { console.log(err); setChartData([]); }
    finally { setChartLoading(false); }
  };

  const fetchTicketData = async () => {
    try {
      setTicketLoading(true);
      const snap = await getDocs(collection(db, "tickets"));
      let pending = 0, inProgress = 0, resolved = 0;
      snap.forEach((d) => {
        const { status } = d.data();
        if (status === "Pending") pending++;
        else if (status === "In Progress") inProgress++;
        else if (status === "Resolved") resolved++;
      });
      setTicketData(
        pending === 0 && inProgress === 0 && resolved === 0 ? [] :
          [
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
      snap.forEach((d) => {
        const s = d.data().status?.toLowerCase();
        if (s === "pending") pending++;
        else if (s === "approved") approved++;
        else if (s === "rejected") rejected++;
      });
      setAbsenceData(
        pending === 0 && approved === 0 && rejected === 0 ? [] :
          [
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
      snap.forEach((d) => {
        const data = d.data();
        if (data.status === "Present" && countMap[data.date] !== undefined) countMap[data.date]++;
      });
      const hasData = Object.values(countMap).some((v) => v > 0);
      setTrendData(
        !hasData ? [] :
          dateList.map((date) => ({ date: date.slice(5), count: countMap[date] }))
      );
    } catch (err) { console.log(err); setTrendData([]); }
    finally { setTrendLoading(false); }
  };

  const fetchMonthlyData = async (month) => {
    try {
      setMonthlyLoading(true);
      const usersSnap = await getDocs(collection(db, "users"));
      const attendanceSnap = await getDocs(collection(db, "attendance"));
      const userMap = {};
      usersSnap.forEach((docItem) => {
        const d = docItem.data();
        if (d.deleted !== true && d.role !== "admin") userMap[d.id] = d.name;
      });
      const countMap = {};
      Object.keys(userMap).forEach((id) => (countMap[id] = 0));
      attendanceSnap.forEach((d) => {
        const data = d.data();
        if (data.date?.startsWith(month) && data.status === "Present" && countMap[data.userId] !== undefined)
          countMap[data.userId]++;
      });
      const result = Object.entries(countMap).map(([id, count]) => ({ name: userMap[id] || id, count }));
      setMonthlyData(result.every((r) => r.count === 0) ? [] : result);
    } catch (err) { console.log(err); setMonthlyData([]); }
    finally { setMonthlyLoading(false); }
  };

  const handleLogout = async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (userId) await logLogout(userId.toUpperCase());
      sessionStorage.removeItem("greetingShown");
      await signOut(auth);
      navigate("/");
    } catch (err) { console.log(err); }
  };

  /* ── Chart configs ── */

  const attendancePieData = {
    labels: [t("present"), t("absent")],
    datasets: [{ data: chartData.map((d) => d.value), backgroundColor: ["#2563EB", "#ef4444"], borderColor: ["#1d4ed8", "#dc2626"], borderWidth: 2, hoverOffset: 14 }],
  };
  const attendancePieOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: makeCircleLegend(), tooltip: { ...sharedTooltip, callbacks: { label: (ctx) => `  ${ctx.label}: ${ctx.parsed}` } } },
  };

  const ticketDonutData = {
    labels: [t("pending"), t("inProgress"), t("resolved")],
    datasets: [{ data: ticketData.map((d) => d.value), backgroundColor: ["#f59e0b", "#3b82f6", "#2dce89"], borderColor: ["#d97706", "#2563eb", "#22a86e"], borderWidth: 2, hoverOffset: 14 }],
  };
  const ticketDonutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: "58%",
    plugins: { legend: makeCircleLegend(), tooltip: { ...sharedTooltip, callbacks: { label: (ctx) => `  ${ctx.label}: ${ctx.parsed}` } } },
  };

  const absenceBarData = {
    labels: absenceData.map((d) => d.label),
    datasets: [{ label: t("absenceRequests"), data: absenceData.map((d) => d.value), backgroundColor: absenceData.map((d) => d.color + "bb"), borderColor: absenceData.map((d) => d.color), borderWidth: 2, borderRadius: 8, borderSkipped: false, maxBarThickness: 64, minBarLength: 4 }],
  };
  const absenceBarOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...sharedTooltip, callbacks: { label: (ctx) => `  ${ctx.label}: ${ctx.parsed.y}` } } },
    layout: { padding: { left: 8, right: 8 } },
    scales: {
      x: { ticks: { color: "#e8edf5", font: { family: "Outfit, sans-serif", size: 12, weight: "600" }, maxRotation: 35, autoSkip: false }, grid: { display: false }, border: { color: "rgba(255,255,255,0.06)" } },
      y: { beginAtZero: true, ticks: { color: "#64748b", font: { family: "Outfit, sans-serif", size: 11 }, maxTicksLimit: 8, precision: 0 }, grid: { color: "rgba(255,255,255,0.04)" }, border: { color: "rgba(255,255,255,0.06)" } },
    },
  };

  const trendLineData = {
    labels: trendData.map((d) => d.date),
    datasets: [{ label: t("present"), data: trendData.map((d) => d.count), borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.12)", borderWidth: 2.5, pointBackgroundColor: "#3b82f6", pointBorderColor: "#1d4ed8", pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 8, tension: 0.4, fill: true }],
  };
  const trendLineOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...sharedTooltip, callbacks: { label: (ctx) => `  ${t("present")}: ${ctx.parsed.y}` } } },
    scales: {
      x: { ticks: { color: "#64748b", font: { family: "Outfit, sans-serif", size: 11 }, maxRotation: 0 }, grid: { color: "rgba(255,255,255,0.04)" } },
      y: { beginAtZero: true, suggestedMax: 5, ticks: { color: "#64748b", font: { family: "Outfit, sans-serif", size: 11 }, stepSize: 1, precision: 0 }, grid: { color: "rgba(255,255,255,0.04)" } },
    },
  };

  const monthlyBarData = {
    labels: monthlyData.map((d) => d.name),
    datasets: [{ label: t("present"), data: monthlyData.map((d) => d.count), backgroundColor: "rgba(59,130,246,0.7)", borderColor: "#3b82f6", borderWidth: 2, borderRadius: 8, borderSkipped: false, maxBarThickness: 56, minBarLength: 4 }],
  };
  const monthlyBarOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...sharedTooltip, callbacks: { label: (ctx) => `  ${t("present")}: ${ctx.parsed.y} days` } } },
    scales: {
      x: { ticks: { color: "#e8edf5", font: { family: "Outfit, sans-serif", size: 12, weight: "600" }, maxRotation: 35, autoSkip: false }, grid: { display: false }, border: { color: "rgba(255,255,255,0.06)" } },
      y: { beginAtZero: true, ticks: { color: "#64748b", font: { family: "Outfit, sans-serif", size: 11 }, precision: 0, stepSize: 1 }, grid: { color: "rgba(255,255,255,0.04)" }, border: { color: "rgba(255,255,255,0.06)" } },
    },
  };

  /* ── Render ── */

  return (
    <div className="admin-container">
      {showGreeting && (
        <div className="dashboard-greeting" onClick={() => setShowGreeting(false)}>
          <span className="dashboard-greeting-icon">🙏</span>
          {t("greetingMessage")}
        </div>
      )}
      {/* ── Header ── */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <img src={logo} alt="Logo" className="dashboard-logo" />
          <div className="dashboard-header-text">
            <p className="dashboard-portal-label">{t("appTitle")}</p>
            <h1 className="dashboard-title">{t("adminDashboard")}</h1>
          </div>
        </div>
        <div className="dashboard-header-right">
          <img src={favicon} alt="" className="dashboard-favicon" />
          <div className="admin-badge">
            <span className="admin-badge-dot">A</span>
            {t("adminLabel")}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            {icons.logout}
            {t("signOut")}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-container">
        <div className="stat-card">
          <h3>{t("totalUsers")}</h3>
          <p>{totalUsers}</p>
        </div>
        <div className="stat-card">
          <h3>{t("activeUsers")}</h3>
          <p>{activeUsers}</p>
        </div>
        <div className="stat-card">
          <h3>{t("deletedUsers")}</h3>
          <p>{deletedUsers}</p>
        </div>
        <div className="stat-card stat-card--tickets">
          <h3>{t("openTickets")}</h3>
          {openTickets === null ? <div className="stat-spinner" /> : (
            <p className={openTickets > 0 ? "stat-tickets-warn" : ""}>{openTickets}</p>
          )}
        </div>
        <div className="stat-card stat-card--present">
          <h3>{t("presentToday")}</h3>
          {presentToday === null ? <div className="stat-spinner stat-spinner--present" /> : (
            <p className="stat-present-num">{presentToday}</p>
          )}
        </div>
        <div className="stat-card stat-card--absent">
          <h3>{t("absentToday")}</h3>
          {absentToday === null ? <div className="stat-spinner stat-spinner--absent" /> : (
            <p className="stat-absent-num">{absentToday}</p>
          )}
        </div>
      </div>

      {/* ── Three Charts ── */}
      <div className="charts-row">

        <div className="chart-section">
          <h2 className="chart-title">{t("todayAttendance")}</h2>
          <div className="chart-date-picker">
            <input type="date" value={chartDate} onChange={(e) => { setChartDate(e.target.value); fetchChartData(e.target.value); }} />
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

      {/* ── Attendance Trend ── */}
      <div className="chart-section chart-section-trend">
        <div className="trend-header">
          <h2 className="chart-title">{t("attendanceTrend")}</h2>
          <div className="trend-toggle">
            <button className={`trend-btn ${trendDays === 7 ? "active" : ""}`} onClick={() => { setTrendDays(7); fetchTrendData(7); }}>
              7 {t("days")}
            </button>
            <button className={`trend-btn ${trendDays === 30 ? "active" : ""}`} onClick={() => { setTrendDays(30); fetchTrendData(30); }}>
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

      {/* ── Monthly Attendance ── */}
      <div className="chart-section chart-section-trend">
        <div className="trend-header">
          <h2 className="chart-title">{t("monthlyAttendance")}</h2>
          <div className="chart-date-picker">
            <input type="month" value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); fetchMonthlyData(e.target.value); }} />
          </div>
        </div>
        {monthlyLoading ? (
          <div className="chart-spinner-wrap"><div className="chart-spinner" /></div>
        ) : monthlyData.length === 0 ? (
          <div className="chart-empty"><span>📭</span>{t("noDataAvailable")}</div>
        ) : (
          <div className="trend-wrapper--monthly">
            <div style={{ width: `${Math.max(monthlyData.length * 100, 100 + "%")}px`, height: "280px", minWidth: "100%" }}>
              <Bar data={monthlyBarData} options={monthlyBarOptions} />
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          CORE MANAGEMENT SECTION
      ══════════════════════════════════════ */}
      <p className="section-label">{t("coreManagement")}</p>

      <div className="core-grid">

        <div className="core-card" onClick={() => navigate("/add-user")}>
          <div className="core-card-icon icon-blue">{icons.userPlus}</div>
          <div className="core-card-text">
            <p className="core-card-title">{t("addUser")}</p>
            <p className="core-card-sub">{t("addUserSub")}</p>
          </div>
        </div>

        <div className="core-card" onClick={() => navigate("/add-admin")}>
          <div className="core-card-icon icon-red">{icons.shield}</div>
          <div className="core-card-text">
            <p className="core-card-title">{t("addAdmin")}</p>
            <p className="core-card-sub">{t("addAdminSub")}</p>
          </div>
        </div>

        <div className="core-card" onClick={() => navigate("/mark-attendance")}>
          <div className="core-card-icon icon-teal">{icons.calendarCheck}</div>
          <div className="core-card-text">
            <p className="core-card-title">{t("markAttendance")}</p>
            <p className="core-card-sub">{t("markAttendanceSub")}</p>
          </div>
        </div>

        <div className="core-card" onClick={() => navigate("/smart-attendance")}>
          <div className="core-card-icon icon-purple">{icons.qrCode}</div>
          <div className="core-card-text">
            <p className="core-card-title">{t("smartAttendance")}</p>
            <p className="core-card-sub">{t("smartAttendanceSub")}</p>
          </div>
        </div>

        <div className="core-card" onClick={() => navigate("/all-users")}>
          <div className="core-card-icon icon-blue">{icons.users}</div>
          <div className="core-card-text">
            <p className="core-card-title">{t("allUsers")}</p>
            <p className="core-card-sub">{t("allUsersSub")}</p>
          </div>
        </div>

        <div className="core-card" onClick={() => navigate("/all-admins")}>
          <div className="core-card-icon icon-red">{icons.shield}</div>
          <div className="core-card-text">
            <p className="core-card-title">{t("allAdmins")}</p>
            <p className="core-card-sub">{t("allAdminsSub")}</p>
          </div>
        </div>

        <div className="core-card" onClick={() => navigate("/attendance-report")}>
          <div className="core-card-icon icon-green">{icons.fileText}</div>
          <div className="core-card-text">
            <p className="core-card-title">{t("attendanceReport")}</p>
            <p className="core-card-sub">{t("attendanceReportSub")}</p>
          </div>
        </div>

        <div className="core-card" onClick={() => navigate("/user-percentage")}>
          <div className="core-card-icon icon-amber">{icons.pieChart}</div>
          <div className="core-card-text">
            <p className="core-card-title">{t("percentageReport")}</p>
            <p className="core-card-sub">{t("percentageReportSub")}</p>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════
          TOOLS & SETTINGS SECTION
      ══════════════════════════════════════ */}
      <p className="section-label">{t("toolsAndSettings")}</p>

      <div className="tools-grid">

        <div className="tool-card" onClick={() => navigate("/absence-management")}>
          <div className="tool-card-icon icon-teal">{icons.calendarX}</div>
          <p className="tool-card-label">{t("absenceManagement")}</p>
        </div>

        <div className="tool-card" onClick={() => navigate("/notifications")}>
          <div className="tool-card-icon icon-amber">{icons.bell}</div>
          <p className="tool-card-label">{t("notifications")}</p>
        </div>

        <div className="tool-card" onClick={() => navigate("/track-ticket")}>
          <div className="tool-card-icon icon-coral">{icons.ticket}</div>
          <p className="tool-card-label">{t("trackTicket")}</p>
        </div>

        <div className="tool-card" onClick={() => navigate("/profile-registration")}>
          <div className="tool-card-icon icon-blue">{icons.userCog}</div>
          <p className="tool-card-label">{t("profileRegistration")}</p>
        </div>

        <div className="tool-card" onClick={() => navigate("/toggle-status")}>
          <div className="tool-card-icon icon-green">{icons.toggleLeft}</div>
          <p className="tool-card-label">{t("toggleStatus")}</p>
        </div>

        <div className="tool-card" onClick={() => navigate("/session-feedbacks")}>
          <div className="tool-card-icon icon-pink">{icons.star}</div>
          <p className="tool-card-label">{t("sessionFeedbacks")}</p>
        </div>

        <div className="tool-card" onClick={() => navigate("/all-profiles")}>
          <div className="tool-card-icon icon-indigo">{icons.userList}</div>
          <p className="tool-card-label">{t("allProfiles")}</p>
        </div>

        <div className="tool-card" onClick={() => navigate("/activity-logs")}>
          <div className="tool-card-icon icon-cyan">{icons.activity}</div>
          <p className="tool-card-label">{t("activityLogs")}</p>
        </div>

        <div className="tool-card" onClick={() => navigate("/admin-logs")}>
          <div className="tool-card-icon icon-purple">{icons.adminLog}</div>
          <p className="tool-card-label">{t("adminLogs")}</p>
        </div>

        <div className="tool-card" onClick={() => navigate("/id-requests")}>
          <div className="tool-card-icon icon-lime">{icons.idCard}</div>
          <p className="tool-card-label">{t("idRequests")}</p>
        </div>

        <div className="tool-card" onClick={() => navigate("/contact-settings")}>
          <div className="tool-card-icon icon-gray">{icons.settings}</div>
          <p className="tool-card-label">{t("contactSettings")}</p>
        </div>

        <div className="tool-card" onClick={() => navigate("/blocked-accounts")}>
          <div className="tool-card-icon icon-red">{icons.shield}</div>
          <p className="tool-card-label">{t("blockedAccounts.label")}</p>
        </div>

        <div className="tool-card" onClick={() => navigate("/deleted-users")}>
          <div className="tool-card-icon icon-red">{icons.trash}</div>
          <p className="tool-card-label">{t("deletedUsers")}</p>
        </div>

      </div>

    </div>
  );
}

export default AdminDashboard;