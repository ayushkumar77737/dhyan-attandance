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
const SLIDE_INTERVAL = 5000; // ms

function AdminDashboard() {

  const { t } = useTranslation();

  const navigate = useNavigate();

  const [totalUsers, setTotalUsers] = useState(0);
  const [deletedUsers, setDeletedUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);

  const [currentSlide, setCurrentSlide] = useState(0);

  /* ── Background carousel ── */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BG_IMAGES.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  /* ── Security + data fetch ── */
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
      <div className="bg-carousel" aria-hidden="true">
        {BG_IMAGES.map((src, idx) => (
          <div
            key={idx}
            className={`bg-slide ${idx === currentSlide ? "bg-slide--active" : ""}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        {/* Dark overlay so content stays readable */}
        <div className="bg-overlay" />
      </div>

      {/* ── Dot indicators ── */}
      <div className="carousel-dots" aria-label="Slide indicators">
        {BG_IMAGES.map((_, idx) => (
          <button
            key={idx}
            className={`carousel-dot ${idx === currentSlide ? "carousel-dot--active" : ""}`}
            onClick={() => setCurrentSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">{t("adminDashboard")}</h1>
        <button className="logout-btn" onClick={handleLogout}>
          {t("logout")}
        </button>
      </div>

      {/* Stats Section */}
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

      {/* Dashboard Cards */}
      <div className="dashboard-body">

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="admin" />
            <h3>{t("addUser")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/add-user")}>
            {t("addUser")}
          </button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="attendance" />
            <h3>{t("attendance")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/mark-attendance")}>
            {t("markAttendance")}
          </button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="edit users" />
            <h3>{t("allUsers")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/all-users")}>
            {t("allUsers")}
          </button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="report" />
            <h3>{t("attendanceReport")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/attendance-report")}>
            {t("viewReport")}
          </button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="percentage" />
            <h3>{t("percentageReport")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/user-percentage")}>
            {t("viewReport")}
          </button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="deleted users" />
            <h3>{t("deletedUsers")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/deleted-users")}>
            {t("viewUsers")}
          </button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="absence" />
            <h3>{t("absenceManagement")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/absence-management")}>
            {t("viewRequests")}
          </button>
        </div>

        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="notifications" />
            <h3>{t("notifications")}</h3>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/notifications")}>
            {t("postNotification")}
          </button>
        </div>

      </div>

    </div>
  );
}

export default AdminDashboard;