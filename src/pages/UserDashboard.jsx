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

/* Per-language sidebar banners: public/banners/sidebar-<langCode>.png
   e.g. public/banners/sidebar-en.png, public/banners/sidebar-hi.png

   PUBLIC_BASE guards against `process.env.PUBLIC_URL` being undefined — if it
   is, template-stringing it yields the literal text "undefined" and every
   banner URL 404s silently. Falling back to "" gives a root-absolute path,
   which is correct whenever the app is served from the domain root. */
const PUBLIC_BASE =
  (typeof process !== "undefined" && process.env && process.env.PUBLIC_URL) || "";
const BANNER_DIR = `${PUBLIC_BASE}/banners`; // no trailing slash
const bannerFor = (lang) => `${BANNER_DIR}/sidebar-${lang}.png`;

/* ------------------------------------------------------------------ */
/* Tiny SVG sparkline                                                 */
/* ------------------------------------------------------------------ */
function Sparkline({ data = [], color = "#34d399" }) {
  if (!data || data.length < 2) return null;
  const w = 100, h = 34, pad = 3;
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
    <svg className="ud-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={color} opacity="0.14" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* SVG progress ring for the "This Month Summary" donut               */
/* ------------------------------------------------------------------ */
function Ring({ pct = 0, size = 132, stroke = 13 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (c * Math.min(100, Math.max(0, pct))) / 100;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ud-ring-svg">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ud-ring-track)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#ringGrad)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function UserDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  useAutoLogout();

  /* Active language, normalised: "en-US" -> "en", "HI" -> "hi".
     resolvedLanguage is preferred over .language because it already accounts
     for i18next's fallback chain. Changing language re-renders this component
     (useTranslation subscribes), so the banner swaps automatically. */
  const langKey = (i18n.resolvedLanguage || i18n.language || "en")
    .split("-")[0]
    .toLowerCase();

  const [showGreeting, setShowGreeting] = useState(
    () => !sessionStorage.getItem("udGreetingShown")
  );
  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [userName, setUserName] = useState("");
  const [profileImage, setProfileImage] = useState("");
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
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem("dashTheme") || "dark");

  /* sidebar starts open on desktop, closed (off-canvas) on mobile */
  const [sidebarOpen, setSidebarOpen] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth > 1080 : true)
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => { localStorage.setItem("dashTheme", theme); }, [theme]);

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
    sessionStorage.setItem("udGreetingShown", "true");
    const greetingTimer = setTimeout(() => setShowGreeting(false), 4000);
    return () => {
      clearTimeout(greetingTimer);
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableInspectKeys);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.email) { navigate("/"); return; }
      const id = String(user.email?.split("@")[0] || "").toUpperCase();
      setUserId(id);

      const userRef = doc(db, "users", id);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) { navigate("/"); return; }
      const userData = userSnap.data();
      if (userData.role === "admin" && userData.uid === auth.currentUser.uid) {
        navigate("/admin-dashboard");
        return;
      }
      setUserName(userSnap.data().name || id);
      const profileRef = doc(db, "profiles", id);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        setProfileImage(profileSnap.data().profileImage || "");
      }

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
      const notifList = [];
      notifSnap.forEach((docItem) => {
        const data = docItem.data();
        const docUserId = data.userId?.toUpperCase();
        if (!docUserId || docUserId === "ALL" || docUserId === id) {
          notifTotal++;
          notifList.push({ id: docItem.id, ...data });
        }
      });
      // newest first — assumes a createdAt timestamp; falls back gracefully
      notifList.sort((a, b) => {
        const ta = a.createdAt?.seconds || a.timestamp?.seconds || 0;
        const tb = b.createdAt?.seconds || b.timestamp?.seconds || 0;
        return tb - ta;
      });
      setNotifCount(notifTotal);
      setRecentNotifs(notifList.slice(0, 4));

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
      sessionStorage.removeItem("udGreetingShown");
      localStorage.removeItem("userId");
      localStorage.removeItem("userAuth");
      localStorage.removeItem("adminAuth");
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.log("Logout Error:", error);
    }
  };

  /* navigate + auto-close the drawer on mobile */
  const go = (path) => {
    navigate(path);
    if (typeof window !== "undefined" && window.innerWidth <= 1080) setSidebarOpen(false);
  };

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 3) : "?";

  const q = search.trim().toLowerCase();

  /* ---------------------------------------------------------------- */
  /* CURRENT-MONTH stats (drives hero, summary donut, achievements)   */
  /* Computed from the already-loaded attendance list.                */
  /* ---------------------------------------------------------------- */
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth();
  const elapsed = now.getDate(); // days so far this month
  let mPresent = 0, mAbsent = 0;
  const presentSeries = [], absentSeries = [], pctSeries = [];
  let cumP = 0, cumA = 0;
  for (let d = 1; d <= elapsed; d++) {
    const ds = `${cy}-${String(cm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const rec = attendance.find((a) => a.date === ds);
    if (rec?.status === "Present") { mPresent++; cumP++; }
    else if (rec?.status === "Absent") { mAbsent++; cumA++; }
    presentSeries.push(cumP);
    absentSeries.push(cumA);
    const tot = cumP + cumA;
    pctSeries.push(tot ? (cumP / tot) * 100 : 0);
  }
  const mNotMarked = Math.max(0, elapsed - mPresent - mAbsent);
  const mTotal = mPresent + mAbsent;
  const mPct = mTotal ? Math.round((mPresent / mTotal) * 100) : 0;

  // sparkline fallbacks keep the cards looking alive before/while data loads
  const sparkPct = pctSeries.length > 1 ? pctSeries : [40, 55, 50, 70, 65, 85, 100];
  const sparkPresent = presentSeries.length > 1 ? presentSeries : [0, 1, 1, 2, 2, 3, 3];
  const sparkAbsent = absentSeries.length > 1 ? absentSeries : [0, 0, 1, 1, 1, 1, 1];

  /* ---------------------------------------------------------------- */
  /* Achievements derived from real attendance                        */
  /* ---------------------------------------------------------------- */
  const achievements = [];
  if (mTotal > 0 && mAbsent === 0) {
    achievements.push({
      key: "perfect",
      title: t("perfectAttendance") || "Perfect Attendance",
      desc: t("perfectAttendanceDesc") || "Great job! You have 100% attendance this month.",
    });
  } else if (mPct >= 80 && mTotal > 0) {
    achievements.push({
      key: "consistent",
      title: t("consistentAchiever") || "Consistent Achiever",
      desc: t("consistentAchieverDesc") || "You're above 80% attendance this month. Keep it up!",
    });
  }

  // recent attendance preview for the sidebar log (newest first)
  const recentLog = [...attendance].reverse().slice(0, 6);

  /* ---------------------------------------------------------------- */
  /* LEFT SIDEBAR NAVIGATION                                          */
  /* NOTE: "Dashboard" is hard-marked active because this component   */
  /* IS the dashboard page. If you lift this <aside> into a shared    */
  /* layout, swap `active: true` for a useLocation() check.           */
  /* Adjust any path below to match your actual router routes.        */
  /* ---------------------------------------------------------------- */
  const navItems = [
    {
      path: "/user-dashboard", active: true, name: t("dashboard") || "Dashboard",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>)
    },
    {
      path: "/my-attendance", name: t("myAttendance") || "My Attendance",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><polyline points="9 16 11 18 15 14" /></svg>)
    },
    {
      path: "/my-requests", name: t("myRequests") || "My Requests",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>)
    },
    {
      path: "/apply-leave", name: t("applyLeave") || "Apply Leave",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="12" y1="14" x2="12" y2="18" /><line x1="10" y1="16" x2="14" y2="16" /></svg>)
    },
    {
      path: "/ticketing-support", name: t("myTickets") || "My Tickets",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /></svg>)
    },
    {
      path: "/my-notifications", name: t("notifications") || "Notifications", badge: notifCount,
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>)
    },
    {
      path: "/my-profile", name: t("myProfile") || "My Profile",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>)
    },
    {
      path: "/directory", name: t("directory") || "Directory",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>)
    },
    {
      path: "/my-activity", name: t("myActivity") || "My Activity",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>)
    },
    {
      path: "/share-experience", name: t("shareExperience") || "Share Experience",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>)
    },
    {
      path: "/help-support", name: t("helpAndSupport") || "Help & Support",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>)
    },
  ];

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
      path: "/apply-leave", cls: "ud-action-green", name: t("applyLeave") || "Apply Leave", sub: t("requestTimeOff") || "Request time off",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="12" y1="14" x2="12" y2="18" /><line x1="10" y1="16" x2="14" y2="16" /></svg>),
    },
    {
      path: "/my-requests", cls: "ud-action-blue", name: t("myRequests"), sub: t("trackStatus") || "Track status",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>)
    },
    {
      path: "/ticketing-support", cls: "ud-action-purple", name: t("ticketingSupport"), sub: t("raiseIssue") || "Raise an issue",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /></svg>)
    },
    {
      path: "/my-notifications", cls: "ud-action-rose", name: t("myNotifications"),
      sub: notifCount !== null && notifCount > 0 ? `${notifCount} ${t("unread")}` : (t("allClear") || "All clear"),
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
    {
      path: "/my-attendance", cls: "ud-action-teal", name: t("myAttendance") || "My Attendance", sub: t("viewDetails") || "View details",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><polyline points="9 16 11 18 15 14" /></svg>)
    },
  ];

  const actionsFiltered = quickActions.filter(
    (a) => !q || a.name.toLowerCase().includes(q) || (a.sub || "").toLowerCase().includes(q)
  );

  const StatusPill = () => {
    if (todayStatus === null)
      return <div className="ud-status-pill ud-status-loading"><span className="ud-dot ud-dot-loading" /> {t("loading")}</div>;
    if (todayStatus === "none")
      return <div className="ud-status-pill ud-status-none"><span className="ud-dot ud-dot-none" /> {t("notMarked")}</div>;
    if (todayStatus === "Present")
      return <div className="ud-status-pill ud-status-present"><span className="ud-dot ud-dot-present" /> ✓ {t("presentToday") || "Present Today"}</div>;
    return <div className="ud-status-pill ud-status-absent"><span className="ud-dot ud-dot-absent" /> ✗ {t("absentToday") || "Absent Today"}</div>;
  };

  return (
    <div className="ud-container" data-theme={theme}>
      {showGreeting && (
        <div className="ud-greeting" onClick={() => setShowGreeting(false)}>
          <span className="ud-greeting-icon">🙏</span>
          {t("greetingMessage")}
        </div>
      )}

      <div className={`ud-shell ${sidebarOpen ? "ud-shell--sidebar-open" : "ud-shell--sidebar-closed"}`}>

        {/* backdrop for the mobile drawer */}
        <div className="ud-backdrop" onClick={() => setSidebarOpen(false)} />

        {/* ============================ SIDEBAR ============================ */}
        <aside className="ud-sidebar">
          <div className="ud-sidebar-header">
            <img src={logo} alt="Logo" className="ud-sidebar-logo" />
            <span className="ud-sidebar-title">{t("attendancePortal") || "Attendance Portal"}</span>
            <button className="ud-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">✕</button>
          </div>

          <nav className="ud-nav">
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`ud-nav-item ${item.active ? "ud-nav-item--active" : ""}`}
                onClick={() => go(item.path)}
              >
                <span className="ud-nav-icon">{item.icon}</span>
                <span className="ud-nav-label">{item.name}</span>
                {item.badge > 0 ? <span className="ud-nav-badge">{item.badge}</span> : null}
              </button>
            ))}
          </nav>

          <div className="ud-sidebar-footer">
            <div className="ud-sidebar-cta">
              {/* Per-language banner: public/sidebar-<lang>.png (see BANNER_DIR).
                  `key` remounts the <img> on language change, which resets the
                  fallback flag below so each language gets its own attempt. */}
              <img
                key={langKey}
                src={bannerFor(langKey)}
                alt={t("sidebarBannerAlt") || "Announcement"}
                className="ud-sidebar-cta-art"
                onError={(e) => {
                  const failed = e.currentTarget.src;
                  if (!e.currentTarget.dataset.fellBack) {
                    // No banner for this language yet -> fall back to English once.
                    e.currentTarget.dataset.fellBack = "1";
                    console.warn(
                      `[sidebar banner] not found: ${failed} (lang "${langKey}") — falling back to English.`
                    );
                    e.currentTarget.src = bannerFor("en");
                  } else {
                    // English is missing too -> hide the whole card rather
                    // than leave a broken image or an empty gradient sliver.
                    console.error(
                      `[sidebar banner] English fallback also missing: ${failed}. ` +
                      `Expected the file at public${BANNER_DIR}/sidebar-en.png — check the path and filename.`
                    );
                    e.currentTarget.closest(".ud-sidebar-cta")?.style.setProperty("display", "none");
                  }
                }}
              />
            </div>
          </div>
        </aside>

        {/* ============================ MAIN ============================ */}
        <div className="ud-main">

          {/* ---------------------------- TOPBAR ---------------------------- */}
          <div className="ud-topbar">
            <button className="ud-theme-btn" onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>

            <div className="ud-topbar-search">
              <svg className="ud-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder={t("dashSearchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value.replace(/[<>]/g, ""))}
              />
            </div>

            <div className="ud-topbar-right">
              <button className="ud-theme-btn" onClick={() => setTheme((v) => (v === "dark" ? "light" : "dark"))} aria-label="Toggle theme">
                {theme === "dark" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.07" y2="4.93" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                )}
              </button>

              <button className="ud-theme-btn ud-bell" onClick={() => navigate("/my-notifications")} aria-label="Notifications">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                {notifCount > 0 ? <span className="ud-bell-badge">{notifCount}</span> : null}
              </button>

              <div className="ud-user-menu">
                <button className="ud-user-btn" onClick={() => setUserMenuOpen((v) => !v)} aria-label="Account menu">
                  <span className="ud-user-avatar">
                    {profileImage ? <img src={profileImage} alt={userName} /> : getInitials(userName)}
                    <span className="ud-topbar-avatar-dot" />
                  </span>
                  <span className="ud-user-meta">
                    <span className="ud-user-meta-name">{userName || "—"}</span>
                    <span className="ud-user-meta-id">ID: {userId}</span>
                  </span>
                  <svg className="ud-user-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="ud-menu-overlay" onClick={() => setUserMenuOpen(false)} />
                    <div className="ud-menu-dropdown">
                      <button onClick={() => { setUserMenuOpen(false); navigate("/my-profile"); }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        {t("myProfile")}
                      </button>
                      <button className="ud-menu-logout" onClick={handleLogout}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        {t("logout")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="ud-body">

            {/* ============================ HERO ============================ */}
            <div className="ud-hero-card">
              <div className="ud-hero-head">
                <div className="ud-avatar-row">
                  <div className="ud-avatar">
                    {profileImage ? <img src={profileImage} alt={userName} className="ud-avatar-img" /> : getInitials(userName)}
                    <span className="ud-avatar-dot" />
                  </div>
                  <div className="ud-user-info">
                    <div className="ud-user-name">{userName || "—"}</div>
                    <div className="ud-user-id">ID: {userId}</div>
                  </div>
                </div>
                <StatusPill />
              </div>

              <div className="ud-hero-stats">
                <div className="ud-hero-stat">
                  <div className="ud-hero-stat-icon ud-hsi-green">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  </div>
                  <div className="ud-hero-stat-text">
                    <span className="ud-hero-stat-val ud-stat-green">{mPct}%</span>
                    <span className="ud-hero-stat-label">{t("attendance")}</span>
                    <span className="ud-hero-stat-cap">{t("thisMonth") || "This Month"}</span>
                  </div>
                  <Sparkline data={sparkPct} color="#34d399" />
                </div>

                <div className="ud-hero-stat">
                  <div className="ud-hero-stat-icon ud-hsi-blue">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  </div>
                  <div className="ud-hero-stat-text">
                    <span className="ud-hero-stat-val ud-stat-blue">{mPresent}</span>
                    <span className="ud-hero-stat-label">{t("presentDays")}</span>
                    <span className="ud-hero-stat-cap">{t("thisMonth") || "This Month"}</span>
                  </div>
                  <Sparkline data={sparkPresent} color="#60a5fa" />
                </div>

                <div className="ud-hero-stat">
                  <div className="ud-hero-stat-icon ud-hsi-rose">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="10" y1="15" x2="14" y2="19" /><line x1="14" y1="15" x2="10" y2="19" /></svg>
                  </div>
                  <div className="ud-hero-stat-text">
                    <span className="ud-hero-stat-val ud-stat-red">{mAbsent}</span>
                    <span className="ud-hero-stat-label">{t("absentDays")}</span>
                    <span className="ud-hero-stat-cap">{t("thisMonth") || "This Month"}</span>
                  </div>
                  <Sparkline data={sparkAbsent} color="#fb7185" />
                </div>
              </div>
            </div>

            {/* ====================== TWO-COLUMN LAYOUT ===================== */}
            <div className="ud-layout">

              {/* -------------------- LEFT (MAIN) -------------------- */}
              <div className="ud-col-main">

                <div className="ud-search-wrap">
                  <svg className="ud-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    className="ud-search"
                    type="text"
                    placeholder={t("dashSearchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value.replace(/[<>]/g, ""))}
                  />
                  {search && <button className="ud-search-clear" onClick={() => setSearch("")}>✕</button>}
                </div>

                {/* Activity overview */}
                <div className="ud-section">
                  <div className="ud-section-header">
                    <span className="ud-section-title">{t("activityOverview") || "Activity Overview"}</span>
                  </div>
                  <div className="ud-activity-grid">
                    <div className="ud-act-card ud-act-amber" onClick={() => navigate("/my-notifications")}>
                      <div className="ud-act-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                      </div>
                      <div className="ud-act-info">
                        <span className="ud-act-val">{notifCount === null ? <span className="ud-spinner" /> : notifCount}</span>
                        <span className="ud-act-label">{t("notifications")}</span>
                        <span className="ud-act-foot">{notifCount > 0 ? t("unread") : (t("allClear") || "All clear")}</span>
                      </div>
                    </div>

                    <div className="ud-act-card ud-act-blue" onClick={() => navigate("/my-requests")}>
                      <div className="ud-act-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                      </div>
                      <div className="ud-act-info">
                        <span className="ud-act-val">{pendingCount === null ? <span className="ud-spinner" /> : pendingCount}</span>
                        <span className="ud-act-label">{t("pendingRequests")}</span>
                        <span className="ud-act-foot">{pendingCount > 0 ? (t("pending") || "Pending") : (t("noPendingItems") || "No pending items")}</span>
                      </div>
                    </div>

                    <div className="ud-act-card ud-act-purple" onClick={() => navigate("/ticketing-support")}>
                      <div className="ud-act-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /></svg>
                      </div>
                      <div className="ud-act-info">
                        <span className="ud-act-val">{ticketCount === null ? <span className="ud-spinner" /> : ticketCount}</span>
                        <span className="ud-act-label">{t("myTickets")}</span>
                        {resolvedCount !== null && resolvedCount > 0
                          ? <span className="ud-act-foot ud-act-foot-ok">{resolvedCount} {t("resolved")}</span>
                          : <span className="ud-act-foot">{t("raiseIssue") || "Raise an issue"}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
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

                {/* Calendar */}
                <div className="ud-section">
                  <div className="ud-section-header">
                    <span className="ud-section-title ud-cal-month-title">
                      {calendarMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                    </span>
                    <div className="ud-cal-nav-row">
                      <button className="ud-cal-nav" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>‹</button>
                      <button className="ud-cal-nav" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>›</button>
                    </div>
                  </div>

                  <div className="ud-cal-grid">
                    {[t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")].map((d) => (
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

              {/* -------------------- RIGHT (SIDEBAR) -------------------- */}
              <div className="ud-col-side">

                {/* Attendance log preview */}
                <div className="ud-side-card">
                  <div className="ud-side-head">
                    <span className="ud-side-title">{t("attendanceLog") || "Attendance Log"}</span>
                    <button className="ud-view-all" onClick={() => navigate("/my-attendance")}>{t("viewAll") || "View All"}</button>
                  </div>
                  {recentLog.length === 0 ? (
                    <div className="ud-side-empty">{t("noAttendanceFound")}</div>
                  ) : (
                    <table className="ud-mini-table">
                      <thead>
                        <tr><th>{t("date")}</th><th>{t("status")}</th></tr>
                      </thead>
                      <tbody>
                        {recentLog.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.date}</td>
                            <td>
                              <span className={item.status === "Present" ? "ud-badge ud-badge-present" : "ud-badge ud-badge-absent"}>
                                {item.status === "Present" ? `✓ ${t("present")}` : `✗ ${t("absent")}`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* This month summary donut */}
                <div className="ud-side-card">
                  <div className="ud-side-head">
                    <span className="ud-side-title">{t("thisMonthSummary") || "This Month Summary"}</span>
                  </div>
                  <div className="ud-summary">
                    <div className="ud-ring">
                      <Ring pct={mPct} />
                      <div className="ud-ring-center">
                        <span className="ud-ring-pct">{mPct}%</span>
                        <span className="ud-ring-cap">{t("present")}</span>
                      </div>
                    </div>
                    <ul className="ud-summary-legend">
                      <li>
                        <span className="ud-sl-dot" style={{ background: "#10b981" }} />
                        <span className="ud-sl-val">{mPresent}</span>
                        <span className="ud-sl-label">{t("presentDays")}</span>
                      </li>
                      <li>
                        <span className="ud-sl-dot" style={{ background: "#ef4444" }} />
                        <span className="ud-sl-val">{mAbsent}</span>
                        <span className="ud-sl-label">{t("absentDays")}</span>
                      </li>
                      <li>
                        <span className="ud-sl-dot" style={{ background: "#3b82f6" }} />
                        <span className="ud-sl-val">{mTotal}</span>
                        <span className="ud-sl-label">{t("totalDays") || "Total Days"}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Recent notifications */}
                <div className="ud-side-card">
                  <div className="ud-side-head">
                    <span className="ud-side-title">{t("recentNotifications") || "Recent Notifications"}</span>
                    <button className="ud-view-all" onClick={() => navigate("/my-notifications")}>{t("viewAll") || "View All"}</button>
                  </div>
                  {recentNotifs.length === 0 ? (
                    <div className="ud-side-empty">{t("allClear") || "No notifications"}</div>
                  ) : (
                    recentNotifs.map((n) => (
                      <div className="ud-event" key={n.id} onClick={() => navigate("/my-notifications")} style={{ cursor: "pointer" }}>
                        <div className="ud-event-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                        </div>
                        <div className="ud-event-text">
                          <span className="ud-event-title">{n.title || n.message || t("notifications")}</span>
                          <span className="ud-event-meta">
                            {n.createdAt?.seconds
                              ? new Date(n.createdAt.seconds * 1000).toLocaleDateString()
                              : (n.date || "")}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Recent achievements */}
                <div className="ud-side-card">
                  <div className="ud-side-head">
                    <span className="ud-side-title">{t("recentAchievements") || "Recent Achievements"}</span>
                  </div>
                  {achievements.length === 0 ? (
                    <div className="ud-side-empty">{t("noAchievementsYet") || "Mark your attendance to earn badges"}</div>
                  ) : (
                    achievements.map((a) => (
                      <div className="ud-achievement" key={a.key}>
                        <div className="ud-medal">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /><polygon points="12 5 12.9 7 15 7.2 13.4 8.6 13.9 10.6 12 9.5 10.1 10.6 10.6 8.6 9 7.2 11.1 7" fill="currentColor" stroke="none" /></svg>
                        </div>
                        <div className="ud-achievement-text">
                          <span className="ud-achievement-title">{a.title}</span>
                          <span className="ud-achievement-desc">{a.desc}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Motivational quote */}
                <div className="ud-quote-card">
                  <span className="ud-quote-mark">“</span>
                  <p className="ud-quote-text">{t("dashQuote") || "Discipline is the bridge between goals and accomplishment."}</p>
                  <svg className="ud-quote-art" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M0 60 L26 22 L40 40 L54 14 L80 60 Z" fill="rgba(255,255,255,0.12)" />
                    <path d="M54 14 L58 18 L52 20 Z" fill="#f43f5e" />
                  </svg>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;