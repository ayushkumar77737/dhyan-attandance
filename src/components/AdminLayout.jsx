import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { logLogout } from "../utils/logActivity";
import { SUPER_ADMIN_ID, fetchAccessConfig, canAccessPath } from "../utils/accessControl";
import logo from "../assets/logo2.png";
import logo3 from "../assets/logo3.png";
import "../pages/AdminDashboard.css";

/* ------------------------------------------------------------------ */
/* Icons — same set AdminDashboard.jsx uses for the sidebar           */
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
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  calendarCheck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      <polyline points="9 16 11 18 15 14" />
    </svg>
  ),
  ticket: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <line x1="9" y1="9" x2="9" y2="9.01" /><line x1="15" y1="9" x2="15" y2="9.01" />
      <line x1="9" y1="15" x2="9" y2="15.01" /><line x1="15" y1="15" x2="15" y2="15.01" />
    </svg>
  ),
  fileText: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    fetchAccessConfig().then(setAccessConfig).catch(() => {});
  }, []);

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

  const sidebarItems = [
    { path: "/admin-dashboard", icon: icons.grid, label: t("navDashboard") },
    { path: "/all-users", icon: icons.users, label: t("navUsers") },
    { path: "/mark-attendance", icon: icons.calendarCheck, label: t("navAttendance") },
    { path: "/track-ticket", icon: icons.ticket, label: t("navTickets") },
    { path: "/attendance-report", icon: icons.fileText, label: t("navReports") },
    { path: "/all-admins", icon: icons.shield, label: t("navAdmins") },
    { path: "/contact-settings", icon: icons.settings, label: t("navSettings") },
  ];
  const sidebarFiltered = sidebarItems.filter((s) => canAccessPath(accessConfig, s.path, currentUserId));

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

        <nav className="sidebar-nav">
          {sidebarFiltered.map((s) => {
            const isActive = location.pathname === s.path;
            return (
              <button
                key={s.path}
                className={`side-link ${isActive ? "active" : ""}`}
                onClick={() => { navigate(s.path); setSidebarOpen(false); }}
              >
                <span className="side-link-icon">{s.icon}</span>
                <span className="side-link-label">{s.label}</span>
              </button>
            );
          })}
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

      <div className="dash-main">
        <div className="admlo-mobile-bar">
          <button className="hamburger" onClick={() => setSidebarOpen((v) => !v)} aria-label="Menu">
            {icons.menu}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default AdminLayout;