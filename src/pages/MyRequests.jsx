import React, { useEffect, useState } from "react";
import "./MyRequests.css";

import { auth, db } from "../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next"; // ← ADD

function MyRequests() {

  const { t } = useTranslation(); // ← ADD
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
        ← {t("back")} {/* ← CHANGED */}
      </button>

      <div className="myreq-card">

        <div className="myreq-header">
          <div className="myreq-badge">📋 {t("absenceRequests")}</div> {/* ← CHANGED */}
          <h2>{t("myRequests")}</h2>                                    {/* ← CHANGED */}
          <p className="myreq-subtitle">{t("myRequestsSubtitle")}</p>  {/* ← CHANGED */}
        </div>

        {requests.length === 0 ? (
          <div className="no-data">
            <div className="no-data-icon">📭</div>
            <p>{t("noRequestsFound")}</p> {/* ← CHANGED */}
          </div>
        ) : (
          <div className="myreq-table-wrapper">
            <table className="myreq-table">
              <thead>
                <tr>
                  <th>{t("date")}</th>    {/* ← CHANGED */}
                  <th>{t("reason")}</th>  {/* ← CHANGED */}
                  <th>{t("status")}</th>  {/* ← CHANGED */}
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
                        {item.status === "Approved" && t("approved")}  {/* ← CHANGED */}
                        {item.status === "Rejected" && t("rejected")}  {/* ← CHANGED */}
                        {item.status === "Pending" && t("pending")}    {/* ← CHANGED */}
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