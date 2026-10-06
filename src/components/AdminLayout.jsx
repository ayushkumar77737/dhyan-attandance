import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { logLogout } from "../utils/logActivity";
import { SUPER_ADMIN_ID, fetchAccessConfig, canAccessPath } from "../utils/accessControl";
import useSidebarScroll, { clearSidebarScroll } from "../hooks/useSidebarScroll";
import logo from "../assets/logo2.png";
import logo3 from "../assets/logo3.png";
import "../pages/AdminDashboard.css";

/* ------------------------------------------------------------------ */
/* Icons                                                              */
/* ------------------------------------------------------------------ */
const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const icons = {
  grid: (
    <svg {...svgProps}>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  menu: (
    <svg {...svgProps}>
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  userPlus: (
    <svg {...svgProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  users: (
    <svg {...svgProps}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  shield: (
    <svg {...svgProps}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  calendarCheck: (
    <svg {...svgProps}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      <polyline points="9 16 11 18 15 14" />
    </svg>
  ),
  calendar: (
    <svg {...svgProps}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  calendarX: (
    <svg {...svgProps}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      <line x1="10" y1="15" x2="14" y2="19" /><line x1="14" y1="15" x2="10" y2="19" />
    </svg>
  ),
  qrCode: (
    <svg {...svgProps}>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="4" height="4" />
      <line x1="21" y1="19" x2="21" y2="21" /><line x1="19" y1="21" x2="21" y2="21" />
    </svg>
  ),
  fileText: (
    <svg {...svgProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  pieChart: (
    <svg {...svgProps}>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  ),
  leaveRequest: (
    <svg {...svgProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" />
    </svg>
  ),
  bell: (
    <svg {...svgProps}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  ticket: (
    <svg {...svgProps}>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <line x1="9" y1="9" x2="9" y2="9.01" /><line x1="15" y1="9" x2="15" y2="9.01" />
      <line x1="9" y1="15" x2="9" y2="15.01" /><line x1="15" y1="15" x2="15" y2="15.01" />
    </svg>
  ),
  bug: (
    <svg {...svgProps}>
      <path d="M8 2l1.9 2M16 2l-1.9 2" /><rect x="7" y="7" width="10" height="13" rx="5" />
      <path d="M12 7v13M3 13h4M17 13h4M4 19l3.5-2M20 19l-3.5-2M4 8l3.5 2M20 8l-3.5 2" />
    </svg>
  ),
  flag: (
    <svg {...svgProps}>
      <path d="M4 22V4a1 1 0 0 1 1-1h11.5l-1.5 4 1.5 4H5" /><path d="M4 15h12" />
    </svg>
  ),
  userCog: (
    <svg {...svgProps}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      <circle cx="19" cy="19" r="2" /><path d="M19 15v2" />
    </svg>
  ),
  toggleLeft: (
    <svg {...svgProps}>
      <rect x="1" y="5" width="22" height="14" rx="7" ry="7" /><circle cx="8" cy="12" r="3" />
    </svg>
  ),
  star: (
    <svg {...svgProps}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  userList: (
    <svg {...svgProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="23" y2="8" /><line x1="19" y1="12" x2="23" y2="12" /><line x1="19" y1="16" x2="23" y2="16" />
    </svg>
  ),
  activity: (
    <svg {...svgProps}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  adminLog: (
    <svg {...svgProps}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="9" y1="10" x2="15" y2="10" /><line x1="9" y1="13" x2="13" y2="13" />
    </svg>
  ),
  idCard: (
    <svg {...svgProps}>
      <rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" />
      <path d="M13 12h5" /><path d="M13 16h3" />
    </svg>
  ),
  settings: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  accessControl: (
    <svg {...svgProps}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><circle cx="12" cy="16" r="1" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  lock: (
    <svg {...svgProps}>
      <rect x="3" y="11" width="18" height="11" rx="2.5" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  mail: (
    <svg {...svgProps}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,12 2,6" />
    </svg>
  ),
  trash: (
    <svg {...svgProps}>
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  ),
  logout: (
    <svg {...svgProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

/* same unified avatar component AdminDashboard.jsx uses */
function AvatarImage({ src, name, size = "medium", className = "" }) {
  const [showImage, setShowImage] = useState(Boolean(src));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setShowImage(Boolean(src));
    setLoaded(false);
  }, [src]);

  return (
    <div className={`avatar-wrapper avatar-${size} ${className}`}>
      {showImage && src ? (
        <img
          src={src}
          alt={name || "Avatar"}
          className={`avatar-img${loaded ? " loaded" : ""}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setShowImage(false)}
          crossOrigin="anonymous"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span className="avatar-initials">{(name || "?").charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

const MYACC_CLOUD_NAME = "dgvjq9bhl";
const getAdminAvatarUrl = (employeeId, name = "", size = 200) => {
  if (!employeeId || !name) return "";
  const publicId = `${employeeId}_${name.replace(/\s+/g, "_")}`;
  const transforms = ["c_fill", "g_face", `w_${size}`, `h_${size}`, "r_max", "q_auto", "f_auto"].join(",");
  return `https://res.cloudinary.com/${MYACC_CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
};

function AdminLayout({ children }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(() => localStorage.getItem("dashTheme") || "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accessConfig, setAccessConfig] = useState({});
  const [adminInfo, setAdminInfo] = useState(null);
  const navRef = useSidebarScroll(location.pathname, accessConfig);

  const currentUserId = localStorage.getItem("userId") || "";
  const isSuperAdmin = currentUserId.toUpperCase() === SUPER_ADMIN_ID;

  useEffect(() => {
    localStorage.setItem("dashTheme", theme);
  }, [theme]);

  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) return;
        const snap = await getDoc(doc(db, "users", userId));
        if (snap.exists()) setAdminInfo({ id: userId, ...snap.data() });
      } catch (err) { console.log(err); }
    };
    fetchAdminInfo();
    fetchAccessConfig().then(setAccessConfig).catch(() => { });
  }, []);

  const handleLogout = async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (userId && auth.currentUser) await logLogout(userId.toUpperCase());
      sessionStorage.removeItem("greetingShown");
      localStorage.removeItem("userId");
      localStorage.removeItem("adminAuth");
      localStorage.removeItem("userAuth");
      clearSidebarScroll();
      await signOut(auth);
      navigate("/");
    } catch (err) { console.log(err); }
  };

  /* ---------- sidebar: grouped, access-filtered ---------- */
  const navGroups = [
    {
      key: "main",
      title: null,
      items: [
        { path: "/admin-dashboard", icon: icons.grid, label: t("navDashboard") },
      ],
    },
    {
      key: "quick",
      title: t("quickActions"),
      items: [
        { path: "/add-user", icon: icons.userPlus, label: t("addUser") },
        { path: "/add-admin", icon: icons.shield, label: t("addAdmin") },
        { path: "/mark-attendance", icon: icons.calendarCheck, label: t("markAttendance") },
        { path: "/admin-attendance", icon: icons.calendarCheck, label: t("adminAttendance", "Admin Attendance") },
        { path: "/smart-attendance", icon: icons.qrCode, label: t("smartAttendance") },
        { path: "/all-users", icon: icons.users, label: t("allUsers") },
        { path: "/all-admins", icon: icons.shield, label: t("allAdmins") },
        { path: "/attendance-report", icon: icons.fileText, label: t("attendanceReport") },
        { path: "/attendance-calendar", icon: icons.calendar, label: t("attendanceCalendar", "Attendance Calendar") },
        { path: "/user-percentage", icon: icons.pieChart, label: t("percentageReport") },
      ],
    },
    {
      key: "tools",
      title: t("toolsAndSettings"),
      items: [
        { path: "/absence-management", icon: icons.calendarX, label: t("absenceManagement") },
        { path: "/leaves-request", icon: icons.leaveRequest, label: t("leavesRequest") },
        { path: "/notifications", icon: icons.bell, label: t("notifications") },
        { path: "/track-ticket", icon: icons.ticket, label: t("trackTicket") },
        { path: "/user-issues", icon: icons.bug, label: t("userIssuesBugs") || "User Issues and Bugs" },
        { path: "/admin-issues", icon: icons.bug, label: t("adminIssuesBugs") || "Admin Issues and Bugs" },
        { path: "/report-issue", icon: icons.flag, label: t("reportIssue") || "Report an Issue" },
        { path: "/profile-registration", icon: icons.userCog, label: t("profileRegistration") },
        { path: "/toggle-status", icon: icons.toggleLeft, label: t("toggleStatus") },
        { path: "/session-feedbacks", icon: icons.star, label: t("sessionFeedbacks") },
        { path: "/all-profiles", icon: icons.userList, label: t("allProfiles") },
        { path: "/activity-logs", icon: icons.activity, label: t("activityLogs") },
        { path: "/user-activities", icon: icons.activity, label: t("userActivities") },
        { path: "/admin-logs", icon: icons.adminLog, label: t("adminLogs") },
        { path: "/id-registration", icon: icons.idCard, label: t("idRegistration") || "ID Registration" },
        { path: "/id-verification", icon: icons.shield, label: t("idVerification") || "ID Verification" },
        { path: "/id-creation-status", icon: icons.idCard, label: t("idCreationStatus") || "ID Creation Status" },
        { path: "/id-management", icon: icons.idCard, label: t("idManagement") || "ID Management" },
        { path: "/registered-ids", icon: icons.idCard, label: t("registeredIds") || "Registered IDs" },
        { path: "/contact-settings", icon: icons.settings, label: t("contactSettings") },
        ...(isSuperAdmin
          ? [{ path: "/access-control", icon: icons.accessControl, label: t("accessControl") }]
          : []),
        { path: "/contact-messages", icon: icons.mail, label: t("contactMessages") || "Contact Messages" },
        { path: "/account-recovery-requests", icon: icons.lock, label: t("accountRecoveryRequests") || "Account Recovery Requests" },
        { path: "/blocked-accounts", icon: icons.shield, label: t("blockedAccounts.label") },
        { path: "/account-lock", icon: icons.lock, label: t("accountLock") || "Account Lock" },
        { path: "/deleted-users", icon: icons.trash, label: t("deletedUsers") },
      ],
    },
  ]
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (s) => s.path === "/admin-dashboard" || canAccessPath(accessConfig, s.path, currentUserId)
      ),
    }))
    .filter((g) => g.items.length > 0);

  const allNavItems = navGroups.flatMap((g) => g.items);

  const adminRoleLabel = isSuperAdmin
    ? (t("superAdmin") || "Super Admin")
    : (adminInfo?.role || t("adminLabel"));

  return (
    <div className={`dash-shell ${sidebarOpen ? "sidebar-open" : ""}`} data-theme={theme}>
      <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />

      <aside className="sidebar">
        <div className="sidebar-brand sidebar-brand--stacked">
          <img src={logo} alt="Logo" className="brand-logo-top" />
          <div className="brand-wordmark">
            <span className="brand-top-line">{t("sidebarTitleTop") || "Param Sant"}</span>
            <h2 className="brand-name">{t("sidebarTitleName") || "Swami Jai Gurubande Ji Maharaj"}</h2>
            <span className="brand-rule" aria-hidden="true" />
            <p className="brand-tagline">{t("sidebarTagline") || "Jai Gurubande • Meditation & Spirituality"}</p>
          </div>
          <img src={logo3} alt="Badge" className="brand-logo-badge" />
        </div>

        <nav className="sidebar-nav" ref={navRef}>
          {navGroups.map((g) => (
            <React.Fragment key={g.key}>
              {g.title && <p className="side-section">{g.title}</p>}
              {g.items.map((s) => (
                <button
                  key={s.path}
                  className={`side-link ${location.pathname === s.path ? "active" : ""}`}
                  onClick={() => { navigate(s.path); setSidebarOpen(false); }}
                >
                  <span className="side-link-icon">{s.icon}</span>
                  <span className="side-link-label">{s.label}</span>
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-profile">
          <button className="sidebar-profile-card" onClick={() => navigate("/admin-dashboard")}>
            <AvatarImage
              src={
                adminInfo?.profileImage ||
                adminInfo?.photoURL ||
                adminInfo?.profileImageUrl ||
                adminInfo?.imageUrl ||
                (adminInfo?.id && adminInfo?.name ? getAdminAvatarUrl(adminInfo.id, adminInfo.name) : "")
              }
              name={adminInfo?.name}
              size="medium"
              className="sidebar-avatar"
            />
            <div className="sidebar-profile-text">
              <p className="sidebar-profile-name">{adminInfo?.name || t("adminLabel")}</p>
              <span className="sidebar-profile-role">{adminRoleLabel}</span>
            </div>
          </button>
          <button className="sidebar-signout" onClick={handleLogout}>
            {icons.logout}
            {t("signOut")}
          </button>
        </div>
      </aside>

      <div className="dash-main admlo-main">
        <div className="admlo-mobile-bar">
          <button className="hamburger" onClick={() => setSidebarOpen((v) => !v)} aria-label="Menu">
            {icons.menu}
          </button>

          <span className="admlo-mobile-title">
            {allNavItems.find((s) => s.path === location.pathname)?.label || t("appTitle")}
          </span>

          <div className="admlo-mobile-actions">
            <button className="topbar-icon-btn" onClick={() => navigate("/notifications")} aria-label="Notifications">
              {icons.bell}
            </button>
            <button className="admlo-mobile-avatar" onClick={() => navigate("/admin-dashboard")} aria-label="Dashboard">
              <AvatarImage
                src={
                  adminInfo?.profileImage ||
                  adminInfo?.photoURL ||
                  (adminInfo?.id && adminInfo?.name ? getAdminAvatarUrl(adminInfo.id, adminInfo.name) : "")
                }
                name={adminInfo?.name}
                size="small"
              />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export default AdminLayout;