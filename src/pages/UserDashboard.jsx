import React, { useEffect, useState } from "react";
import "./UserDashboard.css";

import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function UserDashboard() {

  const navigate = useNavigate();

  /* Disable Inspect */
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

      /* 🔹 Fetch Name From Users Collection */
      const userRef = doc(db, "users", id);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserName(userData.name);
      }

      /* 🔹 Fetch Attendance */
      const snapshot = await getDocs(collection(db, "attendance"));

      let list = [];
      let present = 0;
      let absent = 0;

      snapshot.forEach((docItem) => {

        const data = docItem.data();

        if (data.userId === id) {

          list.push({
            date: data.date,
            status: data.status
          });

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

  /* Logout Function */
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
        Logout
      </button>

      <h1 className="dashboard-title">User Dashboard</h1>

      <div className="dashboard-card">

        <h2>Your Attendance</h2>

        {/* User Summary */}
        <div className="user-summary">

          <p><strong>Name:</strong> {userName}</p>
          <p><strong>User ID:</strong> {userId}</p>
          <p><strong>Present Days:</strong> {presentCount}</p>
          <p><strong>Absent Days:</strong> {absentCount}</p>
          <p><strong>Attendance %:</strong> {percentage}%</p>

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
                      {item.status}
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