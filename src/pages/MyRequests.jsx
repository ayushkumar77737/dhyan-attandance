import React, { useEffect, useState } from "react";
import "./MyRequests.css";

import { auth, db } from "../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function MyRequests() {

  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const id = user.email.split("@")[0].toUpperCase();
        setUserId(id);
        fetchRequests(id);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchRequests = async (id) => {
    try {
      const q = query(
        collection(db, "absenceRequests"),
        where("userId", "==", id)
      );
      const snapshot = await getDocs(q);
      let list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRequests(list);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="my-requests-page">

      <button
        className="myreq-back-btn"
        onClick={() => navigate("/user-dashboard")}
      >
        ← Back
      </button>

      <div className="myreq-card">

        <div className="myreq-header">
          <div className="myreq-badge">📋 Absence Requests</div>
          <h2>My Requests</h2>
          <p className="myreq-subtitle">Track the status of all your submitted absence requests</p>
        </div>

        {requests.length === 0 ? (
          <div className="no-data">
            <div className="no-data-icon">📭</div>
            <p>No requests found</p>
          </div>
        ) : (
          <div className="myreq-table-wrapper">
            <table className="myreq-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="date-cell">📅 {item.date}</span>
                    </td>
                    <td>
                      <span className="reason-cell">{item.reason}</span>
                    </td>
                    <td>
                      <span className={`status ${item.status.toLowerCase()}`}>
                        {item.status === "Approved" && "✓ "}
                        {item.status === "Rejected" && "✕ "}
                        {item.status === "Pending" && "⏳ "}
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}

export default MyRequests;