import React, { useEffect, useState } from "react";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";

import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";

import { collection, getDocs, getDoc, doc } from "firebase/firestore";

import { createPortal } from "react-dom";

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

import { SUPER_ADMIN_ID, fetchAccessConfig, canAccessPath } from "../utils/accessControl";

ChartJS.register(
  ArcElement, Tooltip, Legend,
  LineElement, BarElement, PointElement,
  CategoryScale, LinearScale, Filler
);

/* ------------------------------------------------------------------ */
/* Icons                                                              */
/* ------------------------------------------------------------------ */
const icons = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  arrowUp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
    </svg>
  ),
  arrowUpRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
    </svg>
  ),
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
  leaveRequest: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15l2 2 4-4" />
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
  accessControl: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><circle cx="12" cy="16" r="1" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,12 2,6" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/* Tiny SVG sparkline used in the stat cards                          */
/* ------------------------------------------------------------------ */
function Sparkline({ data = [], color = "#3b82f6" }) {
  if (!data || data.length < 2) return null;
  const w = 90, h = 30, pad = 3;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={color} opacity="0.13" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Empty-state illustration for "Today's Attendance"                  */
/* ------------------------------------------------------------------ */
function AttendanceEmptyArt() {
  return (
    <svg className="empty-art" viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="110" cy="132" rx="78" ry="10" fill="var(--ad-blue)" opacity="0.08" />
      <rect x="70" y="34" width="80" height="92" rx="10" fill="var(--ad-blue)" opacity="0.14" />
      <rect x="78" y="44" width="64" height="76" rx="6" fill="var(--ad-blue)" opacity="0.22" />
      <rect x="92" y="26" width="36" height="16" rx="5" fill="var(--ad-blue)" />
      <circle cx="110" cy="78" r="20" fill="var(--ad-blue)" opacity="0.85" />
      <path d="M101 78l6 6 12-13" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="56" cy="108" r="10" fill="var(--ad-blue)" opacity="0.45" />
      <path d="M46 126c0-6 4.5-10 10-10s10 4 10 10" fill="var(--ad-blue)" opacity="0.45" />
      <circle cx="164" cy="108" r="10" fill="var(--ad-blue)" opacity="0.45" />
      <path d="M154 126c0-6 4.5-10 10-10s10 4 10 10" fill="var(--ad-blue)" opacity="0.45" />
    </svg>
  );
}

function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showGreeting, setShowGreeting] = useState(
    () => !sessionStorage.getItem("greetingShown")
  );
  useAutoLogout();

  const [search, setSearch] = useState("");
  const [accessConfig, setAccessConfig] = useState({});
  const currentUserId = localStorage.getItem("userId") || "";
  const isSuperAdmin = currentUserId.toUpperCase() === SUPER_ADMIN_ID;
  const [showAccount, setShowAccount] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const [copied, setCopied] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);
  const [deletedUsers, setDeletedUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [openTickets, setOpenTickets] = useState(null);
  const [presentToday, setPresentToday] = useState(null);
  const [absentToday, setAbsentToday] = useState(null);
  const [notifCount, setNotifCount] = useState(0);

  // shell UI state
  const [theme, setTheme] = useState(() => localStorage.getItem("dashTheme") || "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  useEffect(() => {
    localStorage.setItem("dashTheme", theme);
  }, [theme]);

  const checkAdmin = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) { navigate("/"); return; }
    try {
      const userRef = doc(db, "users", localStorage.getItem("userId"));
      const userSnap = await getDoc(userRef);
      if (
        !userSnap.exists() ||
        userSnap.data().role !== "admin" ||
        userSnap.data().uid !== auth.currentUser.uid
      ) {
        navigate("/");
        return;
      }
    } catch (error) { console.error(error); navigate("/"); }
  };

  const fetchAdminInfo = async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) return;
      const snap = await getDoc(doc(db, "users", userId));
      if (snap.exists()) setAdminInfo({ id: userId, ...snap.data() });
    } catch (err) { console.log(err); }
  };

  const copyValue = (val, key) => {
    navigator.clipboard?.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
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
    fetchAdminInfo();
    fetchUserStats();
    fetchChartData(chartDate);
    fetchTicketData();
    fetchAbsenceData();
    fetchOpenTickets();
    fetchNotifCount();
    fetchTrendData(7);
    fetchMonthlyData(selectedMonth);
    fetchAccessConfig().then(setAccessConfig).catch(() => { });
    sessionStorage.setItem("greetingShown", "true");
    const greetingTimer = setTimeout(() => setShowGreeting(false), 4000);
    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableInspectKeys);
      clearTimeout(greetingTimer);
    };
  }, []);

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

  const fetchNotifCount = async () => {
    try {
      const snap = await getDocs(collection(db, "notifications"));
      setNotifCount(snap.size);
    } catch (err) { console.log(err); setNotifCount(0); }
  };

  const fetchChartData = async (dateParam) => {
    try {
      setChartLoading(true);
      const targetDate = dateParam || new Date().toISOString().split("T")[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        setChartData([]);
        return;
      }
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
      if (userId && auth.currentUser) await logLogout(userId.toUpperCase());
      sessionStorage.removeItem("greetingShown");

      localStorage.removeItem("userId");
      localStorage.removeItem("adminAuth");
      localStorage.removeItem("userAuth");

      await signOut(auth);
      navigate("/");
    } catch (err) { console.log(err); }
  };

  /* ---------- theme-aware chart palette ---------- */
  const cT = theme === "light"
    ? { text: "#1e293b", sub: "#64748b", grid: "rgba(15,23,42,0.07)", border: "rgba(15,23,42,0.10)", tipBg: "#ffffff", tipText: "#1e293b" }
    : { text: "#e8edf5", sub: "#64748b", grid: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.06)", tipBg: "#0d1b2a", tipText: "#e8edf5" };

  const sharedTooltip = {
    backgroundColor: cT.tipBg,
    borderColor: cT.border,
    borderWidth: 1,
    titleColor: cT.tipText,
    bodyColor: cT.tipText,
    padding: 12,
    titleFont: { family: "Outfit, sans-serif", size: 13 },
    bodyFont: { family: "Outfit, sans-serif", size: 13 },
  };

  const makeCircleLegend = () => ({
    position: "bottom",
    labels: {
      color: cT.text,
      font: { family: "Outfit, sans-serif", size: 12 },
      padding: 24,
      usePointStyle: true,
      pointStyle: "circle",
      pointStyleWidth: 8,
      boxHeight: 8,
    },
  });

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
    datasets: [{ data: ticketData.map((d) => d.value), backgroundColor: ["#f59e0b", "#3b82f6", "#2dce89"], borderColor: ["#d97706", "#2563eb", "#22a86e"], borderWidth: 2, hoverOffset: 12 }],
  };
  const ticketDonutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: "68%",
    plugins: { legend: { display: false }, tooltip: { ...sharedTooltip, callbacks: { label: (ctx) => `  ${ctx.label}: ${ctx.parsed}` } } },
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
      x: { ticks: { color: cT.text, font: { family: "Outfit, sans-serif", size: 12, weight: "600" }, maxRotation: 35, autoSkip: false }, grid: { display: false }, border: { color: cT.border } },
      y: { beginAtZero: true, ticks: { color: cT.sub, font: { family: "Outfit, sans-serif", size: 11 }, maxTicksLimit: 8, precision: 0 }, grid: { color: cT.grid }, border: { color: cT.border } },
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
      x: { ticks: { color: cT.sub, font: { family: "Outfit, sans-serif", size: 11 }, maxRotation: 0 }, grid: { color: cT.grid } },
      y: { beginAtZero: true, suggestedMax: 5, ticks: { color: cT.sub, font: { family: "Outfit, sans-serif", size: 11 }, stepSize: 1, precision: 0 }, grid: { color: cT.grid } },
    },
  };

  const monthlyBarData = {
    labels: monthlyData.map((d) => d.name),
    datasets: [{ label: t("present"), data: monthlyData.map((d) => d.count), backgroundColor: "rgba(59,130,246,0.7)", borderColor: "#3b82f6", borderWidth: 2, borderRadius: 8, borderSkipped: false, maxBarThickness: 56, minBarLength: 4 }],
  };
  const monthlyBarOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...sharedTooltip, callbacks: { label: (ctx) => `  ${t("present")}: ${ctx.parsed.y} ${t("days")}` } } },
    scales: {
      x: { ticks: { color: cT.text, font: { family: "Outfit, sans-serif", size: 12, weight: "600" }, maxRotation: 35, autoSkip: false }, grid: { display: false }, border: { color: cT.border } },
      y: { beginAtZero: true, ticks: { color: cT.sub, font: { family: "Outfit, sans-serif", size: 11 }, precision: 0, stepSize: 1 }, grid: { color: cT.grid }, border: { color: cT.border } },
    },
  };

  /* ---------- ticket legend + resolution progress ---------- */
  const totalTickets = ticketData.reduce((s, d) => s + d.value, 0);
  const resolvedCount = ticketData.find((d) => d.name === t("resolved"))?.value || 0;
  const resolutionPct = totalTickets ? Math.round((resolvedCount / totalTickets) * 100) : 0;
  const ticketLegend = [
    { label: t("pending"), value: ticketData.find((d) => d.name === t("pending"))?.value || 0, color: "#f59e0b" },
    { label: t("inProgress"), value: ticketData.find((d) => d.name === t("inProgress"))?.value || 0, color: "#3b82f6" },
    { label: t("resolved"), value: resolvedCount, color: "#2dce89" },
  ];

  const q = String(search || "").trim().toLowerCase();

  const coreItems = [
    { path: "/add-user", icon: icons.userPlus, cls: "icon-blue", title: t("addUser"), sub: t("addUserSub") },
    { path: "/add-admin", icon: icons.shield, cls: "icon-red", title: t("addAdmin"), sub: t("addAdminSub") },
    { path: "/mark-attendance", icon: icons.calendarCheck, cls: "icon-teal", title: t("markAttendance"), sub: t("markAttendanceSub") },
    { path: "/smart-attendance", icon: icons.qrCode, cls: "icon-purple", title: t("smartAttendance"), sub: t("smartAttendanceSub") },
    { path: "/all-users", icon: icons.users, cls: "icon-blue", title: t("allUsers"), sub: t("allUsersSub") },
    { path: "/all-admins", icon: icons.shield, cls: "icon-red", title: t("allAdmins"), sub: t("allAdminsSub") },
    { path: "/attendance-report", icon: icons.fileText, cls: "icon-green", title: t("attendanceReport"), sub: t("attendanceReportSub") },
    { path: "/user-percentage", icon: icons.pieChart, cls: "icon-amber", title: t("percentageReport"), sub: t("percentageReportSub") },
  ];

  const toolItems = [
    { path: "/absence-management", icon: icons.calendarX, cls: "icon-teal", label: t("absenceManagement") },
    { path: "/leaves-request", icon: icons.leaveRequest, cls: "icon-coral", label: t("leavesRequest") },
    { path: "/notifications", icon: icons.bell, cls: "icon-amber", label: t("notifications") },
    { path: "/track-ticket", icon: icons.ticket, cls: "icon-coral", label: t("trackTicket") },
    { path: "/profile-registration", icon: icons.userCog, cls: "icon-blue", label: t("profileRegistration") },
    { path: "/toggle-status", icon: icons.toggleLeft, cls: "icon-green", label: t("toggleStatus") },
    { path: "/session-feedbacks", icon: icons.star, cls: "icon-pink", label: t("sessionFeedbacks") },
    { path: "/all-profiles", icon: icons.userList, cls: "icon-indigo", label: t("allProfiles") },
    { path: "/activity-logs", icon: icons.activity, cls: "icon-cyan", label: t("activityLogs") },
    { path: "/user-activities", icon: icons.activity, cls: "icon-cyan", label: t("userActivities") },
    { path: "/admin-logs", icon: icons.adminLog, cls: "icon-purple", label: t("adminLogs") },
    { path: "/id-requests", icon: icons.idCard, cls: "icon-lime", label: t("idRequests") },
    { path: "/contact-settings", icon: icons.settings, cls: "icon-gray", label: t("contactSettings") },
    { path: "myaccount", icon: icons.userCog, cls: "icon-blue", label: t("myAccount"), action: async () => { if (!adminInfo) await fetchAdminInfo(); setShowAccount(true); }, skipAccess: true },
    ...(isSuperAdmin
      ? [{ path: "/access-control", icon: icons.accessControl, cls: "icon-gray", label: t("accessControl") }]
      : []),
    { path: "/contact-messages", icon: icons.mail, cls: "icon-indigo", label: t("contactMessages") || "Contact Messages" },
    { path: "/blocked-accounts", icon: icons.shield, cls: "icon-red", label: t("blockedAccounts.label") },
    { path: "/deleted-users", icon: icons.trash, cls: "icon-red", label: t("deletedUsers") },
  ];

  const coreFiltered = coreItems
    .filter((c) => canAccessPath(accessConfig, c.path, currentUserId))
    .filter((c) => !q || c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q));
  const toolsFiltered = toolItems
    .filter((c) => c.skipAccess || canAccessPath(accessConfig, c.path, currentUserId))
    .filter((c) => !q || c.label.toLowerCase().includes(q));
  const hasResults = coreFiltered.length > 0 || toolsFiltered.length > 0;

  /* ---------- sidebar primary nav (access-filtered) ---------- */
  const sidebarItems = [
    { path: null, icon: icons.grid, label: t("navDashboard") },
    { path: "/all-users", icon: icons.users, label: t("navUsers") },
    { path: "/mark-attendance", icon: icons.calendarCheck, label: t("navAttendance") },
    { path: "/track-ticket", icon: icons.ticket, label: t("navTickets") },
    { path: "/attendance-report", icon: icons.fileText, label: t("navReports") },
    { path: "/all-admins", icon: icons.shield, label: t("navAdmins") },
    { path: "/contact-settings", icon: icons.settings, label: t("navSettings") },
  ];
  const sidebarFiltered = sidebarItems.filter((s) => !s.path || canAccessPath(accessConfig, s.path, currentUserId));

  /* ---------- stat cards config ---------- */
  // NOTE: `delta` values + non-derived `spark` arrays below are decorative
  // placeholders mirroring the reference design. Wire real month-over-month
  // numbers when you have them.
  const statCards = [
    { key: "total", label: t("totalUsers"), value: totalUsers, icon: icons.userPlus, accent: "blue", delta: "+12%", up: true, spark: [3, 4, 4, 5, 5, 6, 6] },
    { key: "active", label: t("activeUsers"), value: activeUsers, icon: icons.users, accent: "purple", delta: "+8%", up: true, spark: [2, 3, 3, 4, 4, 5, 5] },
    { key: "deleted", label: t("deletedUsers"), value: deletedUsers, icon: icons.trash, accent: "green", delta: t("noChange"), up: null, spark: [0, 1, 0, 0, 1, 0, 0] },
    { key: "tickets", label: t("openTickets"), value: openTickets, icon: icons.ticket, accent: "amber", delta: "+100%", up: true, loading: openTickets === null, spark: [1, 2, 1, 3, 2, 2, 2] },
    { key: "present", label: t("presentToday"), value: presentToday, icon: icons.calendarCheck, accent: "teal", delta: t("noChange"), up: null, loading: presentToday === null, spark: trendData.length ? trendData.map((d) => d.count) : [2, 3, 1, 4, 2, 5, 3] },
    { key: "absent", label: t("absentToday"), value: absentToday, icon: icons.calendarX, accent: "red", delta: t("noChange"), up: null, loading: absentToday === null, spark: [1, 0, 1, 0, 1, 0, 0] },
  ];
  const accentHex = { blue: "#3b82f6", purple: "#8b5cf6", green: "#2dce89", amber: "#f59e0b", teal: "#14b8a6", red: "#ef4444" };

  const headerDate = new Date().toLocaleDateString(i18n.language || undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const adminInitial = (adminInfo?.name || "A").charAt(0).toUpperCase();

  const openMyAccount = async () => {
    if (!adminInfo) await fetchAdminInfo();
    setShowAccount(true);
  };

  return (
    <div className={`dash-shell ${sidebarOpen ? "sidebar-open" : ""}`} data-theme={theme}>
      {showGreeting && (
        <div className="dashboard-greeting" onClick={() => setShowGreeting(false)}>
          <span className="dashboard-greeting-icon">🙏</span>
          {t("greetingMessage")}
        </div>
      )}

      {/* backdrop for mobile sidebar */}
      <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />

      {/* ============================= SIDEBAR ============================ */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="Logo" className="sidebar-logo" />
        </div>

        <nav className="sidebar-nav">
          {sidebarFiltered.map((s, idx) => (
            <button
              key={s.path || "dashboard"}
              className={`side-link ${idx === 0 ? "active" : ""}`}
              onClick={() => { if (s.path) navigate(s.path); setSidebarOpen(false); }}
            >
              <span className="side-link-icon">{s.icon}</span>
              <span className="side-link-label">{s.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-profile">
          <button className="sidebar-profile-card" onClick={openMyAccount}>
            <div className="sidebar-avatar">{adminInitial}</div>
            <div className="sidebar-profile-text">
              <p className="sidebar-profile-name">{adminInfo?.name || t("adminLabel")}</p>
              <span className="sidebar-profile-role">{isSuperAdmin ? "Super Admin" : (adminInfo?.role || "Admin")}</span>
            </div>
          </button>
          <button className="sidebar-signout" onClick={handleLogout}>
            {icons.logout}
            {t("signOut")}
          </button>
        </div>
      </aside>

      {/* =============================== MAIN ============================= */}
      <div className="dash-main">
        {/* ---------------------------- TOPBAR ---------------------------- */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setSidebarOpen((v) => !v)} aria-label="Menu">
              {icons.menu}
            </button>
            <div className="topbar-titles">
              <p className="topbar-portal-label">{t("appTitle")}</p>
              <h1 className="topbar-title">{t("adminDashboard")}</h1>
            </div>
          </div>

          <div className="topbar-search">
            <span className="topbar-search-icon">{icons.search}</span>
            <input
              type="text"
              placeholder={t("dashSearchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className="topbar-search-clear" onClick={() => setSearch("")}>✕</button>}
          </div>

          <div className="topbar-right">
            <button className="topbar-icon-btn" onClick={() => navigate("/notifications")} aria-label="Notifications">
              {icons.bell}
              {notifCount > 0 && <span className="topbar-badge">{notifCount}</span>}
            </button>
            <button
              className="topbar-icon-btn"
              onClick={() => setTheme((v) => (v === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? icons.sun : icons.moon}
            </button>
            <button className="topbar-avatar" onClick={openMyAccount} aria-label={t("myAccount")}>
              {adminInitial}
              <span className="topbar-avatar-dot" />
            </button>
          </div>
        </header>

        {/* --------------------------- CONTENT ---------------------------- */}
        <div className="dash-content">
          <div className="content-toprow">
            <div className="date-pill">
              <span className="date-pill-icon">{icons.calendar}</span>
              <span>{headerDate}</span>
              <span className="date-pill-chevron">{icons.chevronDown}</span>
            </div>
          </div>

          {/* ----- STAT CARDS ----- */}
          <div className="stats-container">
            {statCards.map((s) => (
              <div className={`stat-card stat-${s.accent}`} key={s.key}>
                <div className="stat-card-top">
                  <div className={`stat-icon icon-${s.accent}`}>{s.icon}</div>
                  <Sparkline data={s.spark} color={accentHex[s.accent]} />
                </div>
                <h3>{s.label}</h3>
                {s.loading ? (
                  <div className="stat-spinner" />
                ) : (
                  <p className="stat-value">{s.value}</p>
                )}
                <div className={`stat-delta ${s.up === true ? "up" : s.up === false ? "down" : "flat"}`}>
                  {s.up === true && icons.arrowUp}
                  <span>{s.delta}{s.up !== null ? ` ${t("fromLastMonth")}` : ""}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ----- CHARTS ROW ----- */}
          <div className="charts-row">
            {/* Today's attendance */}
            <div className="chart-section">
              <h2 className="chart-title">{t("todayAttendance")}</h2>
              <div className="chart-date-picker">
                <input type="date" value={chartDate} onChange={(e) => { setChartDate(e.target.value); fetchChartData(e.target.value); }} />
              </div>
              {chartLoading ? (
                <div className="chart-spinner-wrap"><div className="chart-spinner" /></div>
              ) : chartData.length === 0 ? (
                <div className="chart-empty chart-empty--art">
                  <AttendanceEmptyArt />
                  <p className="chart-empty-title">{t("noDataAvailable")}</p>
                  <p className="chart-empty-sub">{t("checkBackLater")}</p>
                </div>
              ) : (
                <div className="chart-wrapper">
                  <Pie data={attendancePieData} options={attendancePieOptions} />
                </div>
              )}
            </div>

            {/* Ticket status overview */}
            <div className="chart-section">
              <h2 className="chart-title">{t("ticketStatusOverview")}</h2>
              {ticketLoading ? (
                <div className="chart-spinner-wrap"><div className="chart-spinner" /></div>
              ) : ticketData.length === 0 ? (
                <div className="chart-empty"><span>📭</span>{t("noDataAvailable")}</div>
              ) : (
                <div className="ticket-overview">
                  <div className="ticket-donut">
                    <Pie data={ticketDonutData} options={ticketDonutOptions} />
                    <div className="ticket-donut-center">
                      <span className="ticket-donut-total">{totalTickets}</span>
                      <span className="ticket-donut-label">{t("totalTickets")}</span>
                    </div>
                  </div>
                  <div className="ticket-side">
                    <ul className="ticket-legend">
                      {ticketLegend.map((l) => (
                        <li key={l.label}>
                          <span className="ticket-legend-dot" style={{ background: l.color }} />
                          <span className="ticket-legend-label">{l.label}</span>
                          <span className="ticket-legend-val">
                            {l.value} ({totalTickets ? Math.round((l.value / totalTickets) * 100) : 0}%)
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="resolution-chip">
                      <div className="resolution-chip-text">
                        <span className="resolution-pct">{resolutionPct}%</span>
                        <span className="resolution-label">{t("resolutionProgress")}</span>
                      </div>
                      <span className="resolution-arrow">{icons.arrowUpRight}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Absence requests */}
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

          {/* ----- TREND ROW ----- */}
          <div className="trend-row">
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
                  <div style={{ width: `${Math.max(monthlyData.length * 100, 100)}px`, height: "280px", minWidth: "100%" }}>
                    <Bar data={monthlyBarData} options={monthlyBarOptions} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ----- QUICK ACTIONS (core items) ----- */}
          {coreFiltered.length > 0 && (
            <>
              <p className="section-label">{t("quickActions")}</p>
              <div className="quick-actions">
                {coreFiltered.map((c) => (
                  <button className="quick-action" key={c.path} onClick={() => navigate(c.path)}>
                    <div className={`quick-action-icon ${c.cls}`}>{c.icon}</div>
                    <div className="quick-action-text">
                      <p className="quick-action-title">{c.title}</p>
                      <p className="quick-action-sub">{c.sub}</p>
                    </div>
                    <span className="quick-action-chevron">›</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ----- TOOLS & SETTINGS (tool items) ----- */}
          {toolsFiltered.length > 0 && <p className="section-label">{t("toolsAndSettings")}</p>}
          {toolsFiltered.length > 0 && (
            <div className="tools-grid">
              {toolsFiltered.map((c) => (
                <div className="tool-card" key={c.path} onClick={() => (c.action ? c.action() : navigate(c.path))}>
                  <div className={`tool-card-icon ${c.cls}`}>{c.icon}</div>
                  <p className="tool-card-label">{c.label}</p>
                </div>
              ))}
            </div>
          )}

          {!hasResults && q && <div className="dash-no-results">🔍 {t("dashNoResults")}</div>}
        </div>
      </div>

      {/* ============================ MY ACCOUNT ========================= */}
      {showAccount && createPortal(
        <div className="myacc__overlay dash-shell" data-theme={theme} onClick={() => setShowAccount(false)}>
          <div className="myacc__modal" onClick={(e) => e.stopPropagation()}>
            <button className="myacc__close" onClick={() => setShowAccount(false)}>✕</button>
            {!adminInfo ? (
              <div className="chart-spinner-wrap"><div className="chart-spinner" /></div>
            ) : (
              <>
                <div className="myacc__head">
                  <div className="myacc__avatar">{(adminInfo.name || "?").charAt(0).toUpperCase()}</div>
                  <div className="myacc__head-text">
                    <p className="myacc__name">{adminInfo.name || "—"}</p>
                    <span className="myacc__role-tag">{adminInfo.role || "—"}</span>
                  </div>
                </div>
                <div className="myacc__fields">
                  {[
                    { key: "id", label: t("accAdminId"), value: adminInfo.id },
                    { key: "email", label: t("accEmail"), value: adminInfo.email },
                    { key: "role", label: t("accRole"), value: adminInfo.role },
                    { key: "uid", label: t("accUid"), value: adminInfo.uid },
                  ].map((f) => (
                    <div className="myacc__field" key={f.key}>
                      <span className="myacc__label">{f.label}</span>
                      <div className="myacc__valrow">
                        <span className="myacc__value">{f.value || "—"}</span>
                        {f.value && (
                          <button className="myacc__copy" onClick={() => copyValue(f.value, f.key)}>
                            {copied === f.key ? "✓" : t("copy")}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default AdminDashboard;