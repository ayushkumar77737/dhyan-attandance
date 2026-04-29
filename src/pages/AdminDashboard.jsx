import React, { useEffect, useState } from "react";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";

import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";

import { collection, getDocs } from "firebase/firestore";

import { useTranslation } from "react-i18next"; // ← ADD

function AdminDashboard() {

  const { t } = useTranslation(); // ← ADD

  const navigate = useNavigate();

  const [totalUsers, setTotalUsers] = useState(0);
  const [deletedUsers, setDeletedUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);

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

      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">{t("adminDashboard")}</h1> {/* ← CHANGED */}
        <button className="logout-btn" onClick={handleLogout}>
          {t("logout")} {/* ← CHANGED */}
        </button>
      </div>

      {/* Stats Section */}
      <div className="stats-container">

        <div className="stat-card">
          <h3>{t("totalUsers")}</h3>  {/* ← CHANGED */}
          <p>{totalUsers}</p>
        </div>

        <div className="stat-card">
          <h3>{t("deletedUsers")}</h3> {/* ← CHANGED */}
          <p>{deletedUsers}</p>
        </div>

        <div className="stat-card">
          <h3>{t("activeUsers")}</h3>  {/* ← CHANGED */}
          <p>{activeUsers}</p>
        </div>

      </div>

      {/* Dashboard Cards */}
      <div className="dashboard-body">

        {/* Add User Card */}
        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="admin" />
            <h3>{t("addUser")}</h3> {/* ← CHANGED */}
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/add-user")}>
            {t("addUser")} {/* ← CHANGED */}
          </button>
        </div>

        {/* Mark Attendance Card */}
        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="attendance" />
            <h3>{t("attendance")}</h3> {/* ← CHANGED */}
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/mark-attendance")}>
            {t("markAttendance")} {/* ← CHANGED */}
          </button>
        </div>

        {/* All Users Card */}
        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="edit users" />
            <h3>{t("allUsers")}</h3> {/* ← CHANGED */}
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/all-users")}>
            {t("allUsers")} {/* ← CHANGED */}
          </button>
        </div>

        {/* Attendance Report Card */}
        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="report" />
            <h3>{t("attendanceReport")}</h3> {/* ← CHANGED */}
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/attendance-report")}>
            {t("viewReport")} {/* ← CHANGED */}
          </button>
        </div>

        {/* Percentage Report Card */}
        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="percentage" />
            <h3>{t("percentageReport")}</h3> {/* ← CHANGED */}
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/user-percentage")}>
            {t("viewReport")} {/* ← CHANGED */}
          </button>
        </div>

        {/* Deleted Users Card */}
        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="deleted users" />
            <h3>{t("deletedUsers")}</h3> {/* ← CHANGED */}
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/deleted-users")}>
            {t("viewUsers")} {/* ← CHANGED */}
          </button>
        </div>

        {/* Absence Management Card */}
        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="absence" />
            <h3>{t("absenceManagement")}</h3> {/* ← CHANGED */}
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/absence-management")}>
            {t("viewRequests")} {/* ← CHANGED */}
          </button>
        </div>

        {/* Notifications Card */}
        <div className="dashboard-card">
          <div className="admin-profile">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="notifications" />
            <h3>{t("notifications")}</h3> {/* ← CHANGED */}
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/notifications")}>
            {t("postNotification")} {/* ← CHANGED */}
          </button>
        </div>

      </div>

    </div>
  );
}

export default AdminDashboard;