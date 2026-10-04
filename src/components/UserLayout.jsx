import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { auth, db } from "../firebase/firebase";
import { logLogout } from "../utils/logActivity";
import logo from "../assets/logo2.png";
import logo3 from "../assets/logo3.png";
import "../pages/UserDashboard.css";

const BANNER_DIR = "/banners";
const bannerFor = (lang) => `${BANNER_DIR}/sidebar-${lang}.png`;

const toMs = (v) => {
  if (!v) return 0;
  if (typeof v === "object" && typeof v.toDate === "function") return v.toDate().getTime();
  if (typeof v === "object" && v.seconds) return v.seconds * 1000;
  const p = new Date(v).getTime();
  return Number.isNaN(p) ? 0 : p;
};

const S = (children) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const ic = {
  home: S(<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>),
  attendance: S(<><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><polyline points="9 16 11 18 15 14" /></>),
  qr: S(<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3z" /><path d="M17 17h4" /><path d="M17 21v-4" /></>),
  requests: S(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>),
  leave: S(<><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="12" y1="14" x2="12" y2="18" /><line x1="10" y1="16" x2="14" y2="16" /></>),
  ticket: S(<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />),
  concern: S(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="15" x2="12.01" y2="15" /></>),
  bell: S(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>),
  user: S(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  book: S(<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>),
  activity: S(<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />),
  share: S(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></>),
  help: S(<><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>),
  menu: S(<><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>),
  logout: S(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>),
};

function UserLayout({ children }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");
  const [sidebarOpen, setSidebarOpen] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth > 1080 : true)
  );
  const [userId, setUserId] = useState("");
  const [notifCount, setNotifCount] = useState(0);

  const langKey = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0].toLowerCase();

  /* look up the user once, then count unread notifications for the badge */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const res = await getDocs(
          query(collection(db, "users"), where("uid", "==", user.uid), limit(1))
        );
        if (res.empty) return;
        const id = res.docs[0].id;
        const data = res.docs[0].data();
        setUserId(id);

        const readAt = Math.max(
          toMs(data.notificationsReadAt),
          Number(localStorage.getItem(`notifReadAt_${id}`) || 0)
        );
        const snap = await getDocs(collection(db, "notifications"));
        let unread = 0;
        snap.forEach((d) => {
          const n = d.data();
          const target = n.userId ? String(n.userId).toUpperCase() : "ALL";
          if (target === "ALL" || target === id) {
            if (toMs(n.createdAt || n.date || n.timestamp) > readAt) unread++;
          }
        });
        setNotifCount(unread);
      } catch (err) {
        console.log(err);
      }
    });
    return () => unsub();
  }, []);

  const go = (path) => {
    navigate(path);
    if (window.innerWidth <= 1080) setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      if (userId?.trim()) await logLogout(userId.trim());
      sessionStorage.removeItem("udGreetingShown");
      localStorage.removeItem("userId");
      localStorage.removeItem("userAuth");
      localStorage.removeItem("adminAuth");
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.log(err);
    }
  };

  const navItems = [
    { path: "/user-dashboard", icon: ic.home, name: t("dashboard") || "Dashboard" },
    { path: "/my-attendance", icon: ic.attendance, name: t("myAttendance") || "My Attendance" },
    { path: "/show-qr", icon: ic.qr, name: t("showQR") || "Show QR" },
    { path: "/my-requests", icon: ic.requests, name: t("myRequests") || "My Requests" },
    { path: "/apply-leave", icon: ic.leave, name: t("applyLeave") || "Apply Leave" },
    { path: "/ticketing-support", icon: ic.ticket, name: t("myTickets") || "My Tickets" },
    { path: "/raise-concern", icon: ic.concern, name: t("raiseConcern") || "Raise a Concern" },
    { path: "/my-notifications", icon: ic.bell, name: t("notifications") || "Notifications", badge: notifCount },
    { path: "/my-profile", icon: ic.user, name: t("myProfile") || "My Profile" },
    { path: "/directory", icon: ic.book, name: t("directory") || "Directory" },
    { path: "/my-activity", icon: ic.activity, name: t("myActivity") || "My Activity" },
    { path: "/share-experience", icon: ic.share, name: t("shareExperience") || "Share Experience" },
    { path: "/help-support", icon: ic.help, name: t("helpAndSupport") || "Help & Support" },
  ];

  const currentTitle =
    navItems.find((n) => n.path === location.pathname)?.name || t("appTitle") || "";

  return (
    <div className="ud-container" data-theme={theme}>
      <div className={`ud-shell ${sidebarOpen ? "ud-shell--sidebar-open" : "ud-shell--sidebar-closed"}`}>
        <div className="ud-backdrop" onClick={() => setSidebarOpen(false)} />

        <aside className="ud-sidebar">
          <div className="ud-sidebar-header ud-sidebar-header--brand">
            <button className="ud-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">✕</button>
            <img src={logo} alt="Logo" className="ud-brand-logo-top" />
            <div className="ud-brand-wordmark">
              <span className="ud-brand-top-line">{t("sidebarTitleTop") || "Param Sant"}</span>
              <h2 className="ud-brand-name">{t("sidebarTitleName") || "Swami Jai Gurubande Ji Maharaj"}</h2>
              <span className="ud-brand-rule" aria-hidden="true" />
              <p className="ud-brand-tagline">{t("sidebarTagline") || "Jai Gurubande • Meditation & Spirituality"}</p>
            </div>
            <img src={logo3} alt="Badge" className="ud-brand-logo-badge" />
          </div>

          <nav className="ud-nav">
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`ud-nav-item ${location.pathname === item.path ? "ud-nav-item--active" : ""}`}
                onClick={() => go(item.path)}
              >
                <span className="ud-nav-icon">{item.icon}</span>
                <span className="ud-nav-label">{item.name}</span>
                {item.badge > 0 ? <span className="ud-nav-badge">{item.badge}</span> : null}
              </button>
            ))}
          </nav>

          <div className="ud-sidebar-footer">
            <button className="ud-signout" onClick={handleLogout}>
              {ic.logout}
              {t("logout") || "Logout"}
            </button>

            <div className="ud-sidebar-cta">
              <img
                key={langKey}
                src={bannerFor(langKey)}
                alt={t("sidebarBannerAlt") || "Announcement"}
                className="ud-sidebar-cta-art"
                onError={(e) => {
                  if (!e.currentTarget.dataset.fellBack) {
                    e.currentTarget.dataset.fellBack = "1";
                    e.currentTarget.src = bannerFor("en");
                  } else {
                    e.currentTarget.closest(".ud-sidebar-cta")?.style.setProperty("display", "none");
                  }
                }}
              />
            </div>
          </div>
        </aside>

        <div className="ud-main ud-layout-main">
          <div className="ud-mobile-bar">
            <button className="ud-theme-btn" onClick={() => setSidebarOpen((v) => !v)} aria-label="Menu">
              {ic.menu}
            </button>
            <span className="ud-mobile-title">{currentTitle}</span>
            <button className="ud-theme-btn ud-bell" onClick={() => go("/my-notifications")} aria-label="Notifications">
              {ic.bell}
              {notifCount > 0 ? <span className="ud-bell-badge">{notifCount}</span> : null}
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default UserLayout;