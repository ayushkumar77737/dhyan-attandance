import React, { useEffect, useState } from "react";
import "./UserDashboard.css";

import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
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

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      if (!user) return;

      const email = user.email;
      const userId = email.split("@")[0].toUpperCase();

      const snapshot = await getDocs(collection(db, "attendance"));

      let list = [];

      snapshot.forEach((docItem) => {

        const data = docItem.data();

        if (data.userId === userId) {

          list.push({
            date: data.date,
            status: data.status
          });

        }

      });

      list.sort((a, b) => new Date(a.date) - new Date(b.date));

      setAttendance(list);

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

      {/* Logout Button */}
      <button className="logout-btn" onClick={handleLogout}>
        Logout
      </button>

      {/* Page Title */}
      <h1 className="dashboard-title">User Dashboard</h1>

      {/* Card */}
      <div className="dashboard-card">

        <h2>Your Attendance</h2>

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