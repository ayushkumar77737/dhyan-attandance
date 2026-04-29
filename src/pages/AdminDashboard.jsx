import React, { useEffect, useState } from "react";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";

import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";

import { collection, getDocs } from "firebase/firestore";

import { useTranslation } from "react-i18next";

import bg1 from "../assets/bg1.webp";
import bg2 from "../assets/bg2.webp";
import bg3 from "../assets/bg3.webp";

const BG_IMAGES = [bg1, bg2, bg3];

const CARD_ICONS = {
  addUser: "🧑‍🤝‍🧑",  // two people joining
  attendance: "🧘‍♂️",      // meditating person — perfect for ashram
  allUsers: "🫂",        // people embracing
  attendanceReport: "🧑‍💼",      // professional person
  percentageReport: "📈",        // upward chart
  deletedUsers: "🚶",        // person leaving/walking away
  absenceManagement: "🧎",        // person kneeling — prayer/absence feel
  notifications: "📯",
};

function AdminDashboard() {

  const { t } = useTranslation();
  const navigate = useNavigate();

  const [totalUsers, setTotalUsers] = useState(0);
  const [deletedUsers, setDeletedUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [currentBg, setCurrentBg] = useState(0);
  const [fading, setFading] = useState(false);

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
    fetchUserStats();
    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableInspectKeys);
    };
  }, []);

  // Background carousel — crossfade every 5.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrentBg((prev) => (prev + 1) % BG_IMAGES.length);
        setFading(false);
      }, 1000);
    }, 5500);
    return () => clearInterval(interval);
  }, []);

  const fetchUserStats = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      let total = 0;
      let deleted = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        total++;
        if (data.deleted === true) deleted++;
      });
      setTotalUsers(total);
      setDeletedUsers(deleted);
      setActiveUsers(total - deleted);
    } catch (error) {
      console.log(error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="admin-container">

      {/* ── Background Carousel ── */}
      <div className="bg-carousel">
        {BG_IMAGES.map((img, i) => (
          <div
            key={i}
            className={`bg-slide ${i === currentBg ? "bg-slide--active" : ""} ${i === currentBg && fading ? "bg-slide--fading" : ""}`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
        {/* Layered overlays for warm ashram feel */}
        <div className="bg-overlay-dark" />
        <div className="bg-overlay-warm" />
        <div className="bg-overlay-vignette" />
      </div>

      {/* ── Header ── */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">{t("adminDashboard")}</h1>
        <button className="logout-btn" onClick={handleLogout}>
          {t("logout")}
        </button>
      </div>

      {/* ── Stats ── */}
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
      </div>

      {/* ── Dashboard Cards ── */}
      <div className="dashboard-body">

        <div className="dashboard-card">
          <div className="admin-profile">
            <div className="card-icon">{CARD_ICONS.addUser}</div>
            <h3>{t("addUser")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/add-user")}>
            {t("addUser")}
          </button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <div className="card-icon">{CARD_ICONS.attendance}</div>
            <h3>{t("attendance")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/mark-attendance")}>
            {t("markAttendance")}
          </button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <div className="card-icon">{CARD_ICONS.allUsers}</div>
            <h3>{t("allUsers")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/all-users")}>
            {t("allUsers")}
          </button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <div className="card-icon">{CARD_ICONS.attendanceReport}</div>
            <h3>{t("attendanceReport")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/attendance-report")}>
            {t("viewReport")}
          </button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <div className="card-icon">{CARD_ICONS.percentageReport}</div>
            <h3>{t("percentageReport")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/user-percentage")}>
            {t("viewReport")}
          </button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <div className="card-icon">{CARD_ICONS.deletedUsers}</div>
            <h3>{t("deletedUsers")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/deleted-users")}>
            {t("viewUsers")}
          </button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <div className="card-icon">{CARD_ICONS.absenceManagement}</div>
            <h3>{t("absenceManagement")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/absence-management")}>
            {t("viewRequests")}
          </button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <div className="card-icon">{CARD_ICONS.notifications}</div>
            <h3>{t("notifications")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/notifications")}>
            {t("postNotification")}
          </button>
        </div>

      </div>

      {/* ── Carousel Indicator Dots ── */}
      <div className="bg-dots">
        {BG_IMAGES.map((_, i) => (
          <span
            key={i}
            className={`bg-dot ${i === currentBg ? "bg-dot--active" : ""}`}
            onClick={() => setCurrentBg(i)}
          />
        ))}
      </div>

    </div>
  );
}

export default AdminDashboard;