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

  /* 🔐 Get User */
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

  /* 📥 Fetch Requests */
  const fetchRequests = async (id) => {
    try {
      const q = query(
        collection(db, "absenceRequests"),
        where("userId", "==", id)
      );

      const snapshot = await getDocs(q);

      let list = [];

      snapshot.forEach((doc) => {
        list.push({
          id: doc.id,
          ...doc.data()
        });
      });

      /* Sort latest first */
      list.sort((a, b) => new Date(b.date) - new Date(a.date));

      setRequests(list);

    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="my-requests-page">

      {/* 🔙 Back */}
      <button 
        className="myreq-back-btn"
        onClick={() => navigate("/user-dashboard")}
      >
        ← Back
      </button>

      <div className="myreq-card">

        <h2>My Requests</h2>

        {requests.length === 0 ? (
          <p className="no-data">No requests found</p>
        ) : (

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
                  <td>{item.date}</td>
                  <td>{item.reason}</td>
                  <td>
                    <span className={`status ${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}

            </tbody>

          </table>

        )}

      </div>

    </div>
  );
}

export default MyRequests;