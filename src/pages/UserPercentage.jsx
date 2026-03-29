import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./UserPercentage.css";

const UserPercentage = () => {
  const [data, setData] = useState([]);
  const navigate = useNavigate();

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

    fetchAttendanceData();

    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableInspectKeys);
    };

  }, []);

  const fetchAttendanceData = async () => {
    try {

      const usersSnapshot = await getDocs(collection(db, "users"));
      const attendanceSnapshot = await getDocs(collection(db, "attendance"));

      const users = usersSnapshot.docs.map((doc) => ({
        id: doc.data().id,
        name: doc.data().name,
      }));

      const attendance = attendanceSnapshot.docs.map((doc) => doc.data());

      const result = users.map((user) => {

        const userAttendance = attendance.filter(
          (a) => a.userId === user.id
        );

        if (userAttendance.length === 0) {
          return {
            "User ID": user.id,
            Name: user.name,
            "Attendance %": "0.00%",
          };
        }

        const sortedAttendance = userAttendance.sort((a, b) =>
          a.date.localeCompare(b.date)
        );

        const firstDate = sortedAttendance[0].date;

        const validAttendance = attendance.filter(
          (a) => a.userId === user.id && a.date >= firstDate
        );

        const totalDays = validAttendance.length;

        const presentDays = validAttendance.filter(
          (a) => a.status?.toLowerCase() === "present"
        ).length;

        const percentage =
          totalDays > 0
            ? ((presentDays / totalDays) * 100).toFixed(2)
            : "0.00";

        return {
          "User ID": user.id,
          Name: user.name,
          "Attendance %": percentage + "%",
        };

      });

      setData(result);

    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  const exportToExcel = () => {

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob([excelBuffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(fileData, "User_Attendance_Report.xlsx");
  };

  const getPercentageColor = (percentStr) => {
    const val = parseFloat(percentStr);
    if (val >= 85) return "badge-high";
    if (val >= 60) return "badge-mid";
    return "badge-low";
  };

  return (
    <div className="user-percentage-page">

      {/* Decorative orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Header */}
      <div className="user-percentage-header">
        <button
          className="user-back-btn"
          onClick={() => navigate("/admin-dashboard")}
        >
          <span className="back-arrow">←</span> Back
        </button>
      </div>

      {/* Title */}
      <div className="title-block">
        <span className="title-eyebrow">Admin Panel</span>
        <h2 className="user-percentage-title">
          Attendance <span className="title-accent">Overview</span>
        </h2>
        <p className="title-sub">Track and export user attendance records</p>
      </div>

      {/* Stats strip */}
      <div className="stats-strip">
        <div className="stat-pill">
          <span className="stat-icon">👥</span>
          <span className="stat-label">Total Users</span>
          <span className="stat-value">{data.length}</span>
        </div>
        <div className="stat-pill">
          <span className="stat-icon">✅</span>
          <span className="stat-label">Above 85%</span>
          <span className="stat-value">
            {data.filter(d => parseFloat(d["Attendance %"]) >= 85).length}
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-icon">⚠️</span>
          <span className="stat-label">Below 60%</span>
          <span className="stat-value">
            {data.filter(d => parseFloat(d["Attendance %"]) < 60).length}
          </span>
        </div>
      </div>

      {/* Export Button */}
      <div className="user-export-wrapper">
        <button
          className="user-export-btn"
          onClick={exportToExcel}
        >
          <span className="export-icon">⬇</span> Export Excel
        </button>
      </div>

      {/* Card */}
      <div className="user-percentage-card">

        <table className="user-percentage-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Attendance %</th>
            </tr>
          </thead>

          <tbody>
            {data.map((user, index) => (
              <tr key={index} style={{ animationDelay: `${index * 0.04}s` }}>
                <td>
                  <span className="uid-chip">{user["User ID"]}</span>
                </td>
                <td>
                  <span className="user-name-cell">
                    <span className="avatar-dot">{user.Name?.charAt(0).toUpperCase()}</span>
                    {user.Name}
                  </span>
                </td>
                <td>
                  <span className={`attendance-badge ${getPercentageColor(user["Attendance %"])}`}>
                    {user["Attendance %"]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>

    </div>
  );
};

export default UserPercentage;