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

        // ✅ If no attendance, show 0%
        if (userAttendance.length === 0) {
          return {
            "User ID": user.id,
            Name: user.name,
            "Attendance %": "0.00%",
          };
        }

        // ✅ Sort attendance by date
        const sortedAttendance = userAttendance.sort((a, b) =>
          a.date.localeCompare(b.date)
        );

        // ✅ First attendance date (user join in system)
        const firstDate = sortedAttendance[0].date;

        // ✅ Count only from first attendance date
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

  return (
    <div className="user-percentage-page">

      {/* Header */}
      <div className="user-percentage-header">
        <button
          className="user-back-btn"
          onClick={() => navigate("/admin-dashboard")}
        >
          ← Back
        </button>
      </div>

      {/* Title */}
      <h2 className="user-percentage-title">
        User Attendance Percentage
      </h2>

      {/* Export Button */}
      <div className="user-export-wrapper">
        <button
          className="user-export-btn"
          onClick={exportToExcel}
        >
          Export Excel
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
              <tr key={index}>
                <td>{user["User ID"]}</td>
                <td>{user.Name}</td>
                <td>{user["Attendance %"]}</td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>

    </div>
  );
};

export default UserPercentage;