// src/pages/AdminDashboard.jsx

import React, { useEffect, useState } from "react";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";

import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";

import { collection, getDocs } from "firebase/firestore";

function AdminDashboard() {

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

        if (data.deleted === true) {
          deleted++;
        }
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
        <h1 className="dashboard-title">Admin Dashboard</h1>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Stats Section */}
      <div className="stats-container">

        <div className="stat-card">
          <h3>Total Users</h3>
          <p>{totalUsers}</p>
        </div>

        <div className="stat-card">
          <h3>Deleted Users</h3>
          <p>{deletedUsers}</p>
        </div>

        <div className="stat-card">
          <h3>Active Users</h3>
          <p>{activeUsers}</p>
        </div>

      </div>

      {/* Dashboard Cards */}
      <div className="dashboard-body">

        {/* Add User Card */}
        <div className="dashboard-card">

          <div className="admin-profile">
            <img
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              alt="admin"
            />
            <h3>Add User</h3>
          </div>

          <button
            className="dashboard-btn"
            onClick={() => navigate("/add-user")}
          >
            Add User
          </button>

        </div>

        {/* Mark Attendance Card */}
        <div className="dashboard-card">

          <div className="admin-profile">
            <img
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              alt="attendance"
            />
            <h3>Attendance</h3>
          </div>

          <button
            className="dashboard-btn"
            onClick={() => navigate("/mark-attendance")}
          >
            Mark Attendance
          </button>

        </div>

        {/* All Users Card */}
        <div className="dashboard-card">

          <div className="admin-profile">
            <img
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              alt="edit users"
            />
            <h3>All Users</h3>
          </div>

          <button
            className="dashboard-btn"
            onClick={() => navigate("/all-users")}
          >
            All Users
          </button>

        </div>

        <div className="dashboard-card">

          <div className="admin-profile">
            <img
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              alt="edit users"
            />
            <h3>Attendance Report</h3>
          </div>

          <button
            className="dashboard-btn"
            onClick={() => navigate("/attendance-report")}
          >
            View Report
          </button>

        </div>

        <div className="dashboard-card">

          <div className="admin-profile">
            <img
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              alt="edit users"
            />
            <h3>Percentage User Report</h3>
          </div>

          <button
            className="dashboard-btn"
            onClick={() => navigate("/user-percentage")}
          >
            View Report
          </button>

        </div>

      </div>

    </div>
  );
}

export default AdminDashboard;

