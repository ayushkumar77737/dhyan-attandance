import React, { useEffect, useState } from "react";
import "./AbsenceManagement.css";

import { db } from "../firebase/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function AbsenceManagement() {

  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  /* 📥 Fetch Requests + User Names */
  const fetchRequests = async () => {

    try {
      const snapshot = await getDocs(collection(db, "absenceRequests"));

      let list = [];

      for (let docItem of snapshot.docs) {
        const data = docItem.data();

        const userRef = doc(db, "users", data.userId);
        const userSnap = await getDoc(userRef);

        let name = "Unknown";

        if (userSnap.exists()) {
          name = userSnap.data().name;
        }

        list.push({
          id: docItem.id,
          userId: data.userId,
          name: name,
          date: data.date,
          reason: data.reason,
          status: data.status
        });
      }

      setRequests(list);

    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="absence-management-page">

      {/* 🔙 Back */}
      <button 
        className="absence-management-back-btn"
        onClick={() => navigate("/admin-dashboard")}
      >
        ← Back
      </button>

      <div className="absence-management-card">

        <h2 className="absence-management-title">
          Absence Management
        </h2>

        {requests.length === 0 ? (
          <p className="absence-management-no-data">No requests found</p>
        ) : (

          <table className="absence-management-table">

            <thead>
              <tr>
                <th>ID No</th>
                <th>Name</th>
                <th>Date</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {requests.map((item) => (
                <tr key={item.id}>
                  <td>{item.userId}</td>
                  <td>{item.name}</td>
                  <td>{item.date}</td>
                  <td>{item.reason}</td>
                  <td>
                    <span className={`absence-management-status ${item.status.toLowerCase()}`}>
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

export default AbsenceManagement;