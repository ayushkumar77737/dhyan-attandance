import React, { useEffect, useState } from "react";
import "./UserDashboard.css";

import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function UserDashboard() {

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
    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableInspectKeys);
    };
  }, []);

  const [attendance, setAttendance] = useState([]);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const email = user.email;
      const id = email.split("@")[0].toUpperCase();
      setUserId(id);

      const userRef = doc(db, "users", id);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserName(userData.name);
      }

      const snapshot = await getDocs(collection(db, "attendance"));
      let list = [];
      let present = 0;
      let absent = 0;

      snapshot.forEach((docItem) => {
        const data = docItem.data();
        if (data.userId === id) {
          list.push({ date: data.date, status: data.status });
          if (data.status === "Present") present++;
          if (data.status === "Absent") absent++;
        }
      });

      list.sort((a, b) => new Date(a.date) - new Date(b.date));
      const total = present + absent;
      const percent = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

      setAttendance(list);
      setPresentCount(present);
      setAbsentCount(absent);
      setPercentage(percent);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.log("Logout Error:", error);
    }
  };

  return (
    <div className="dashboard-container">

      <button className="logout-btn" onClick={handleLogout}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Logout
      </button>

      <div className="dashboard-header">
        <h1 className="dashboard-title">User Dashboard</h1>
      </div>

      <div className="dashboard-card">

        <h2>Your Attendance</h2>

        {/* User Summary */}
        <div className="user-summary">

          <div className="summary-item">
            <span className="summary-label">Name</span>
            <span className="summary-value">{userName}</span>
          </div>

          <div className="summary-item">
            <span className="summary-label">User ID</span>
            <span className="summary-value">{userId}</span>
          </div>

          <div className="summary-item present-stat">
            <span className="summary-label">Present Days</span>
            <span className="summary-value stat-present">{presentCount}</span>
          </div>

          <div className="summary-item absent-stat">
            <span className="summary-label">Absent Days</span>
            <span className="summary-value stat-absent">{absentCount}</span>
          </div>

          <div className="summary-item percentage-stat">
            <span className="summary-label">Attendance</span>
            <span className="summary-value stat-percent">{percentage}%</span>
          </div>

        </div>

        <div className="reason-btn-container">
          <button className="reason-btn" onClick={() => navigate("/submit-reason")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Submit Absence Reason
          </button>
          <button className="reason-btn" onClick={() => navigate("/my-requests")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            My Requests
          </button>
          <button className="reason-btn" onClick={() => navigate("/my-notifications")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            My Notifications
          </button>
        </div>

        <table className="attendance-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendance.length === 0 ? (
              <tr>
                <td colSpan="2" className="no-data">No attendance found</td>
              </tr>
            ) : (
              attendance.map((item, index) => (
                <tr key={index}>
                  <td>{item.date}</td>
                  <td>
                    <span className={item.status === "Present" ? "present" : "absent"}>
                      {item.status === "Present" ? "✓" : "✗"} {item.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

      </div>
    </div>
  );
}

export default UserDashboard;