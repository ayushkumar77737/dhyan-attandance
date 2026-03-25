import React, { useState, useEffect } from "react";
import "./Notifications.css";

import { db } from "../firebase/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

function Notifications() {

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [notifications, setNotifications] = useState([]);

  const navigate = useNavigate();

  // ✅ Real-time Firestore data
  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(data);
    });

    return () => unsubscribe();
  }, []);

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

  // ✅ Auto-hide status
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      setStatus("❗ Please enter a notification");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "notifications"), {
        message: message,
        createdAt: serverTimestamp()
      });

      setStatus("✅ Notification posted successfully");
      setMessage("");

    } catch (error) {
      console.error(error);
      setStatus("❌ Error posting notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notifications-page">

      {/* Back Button */}
      <button
        className="notif-back-btn"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div className="notif-card">

        <h2>Post Notification</h2>

        {status && <div className="status-message">{status}</div>}

        <form onSubmit={handleSubmit}>

          <textarea
            placeholder="Enter your notification here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Posting..." : "Submit"}
          </button>

        </form>

      </div>

      {/* ✅ Notifications Table */}
      <div className="notif-list">

        {notifications.length === 0 ? (
          <p className="no-data">No notifications yet</p>
        ) : (
          <table className="notif-table">
            <thead>
              <tr>
                <th>Message</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((item) => (
                <tr key={item.id}>
                  <td>{item.message}</td>
                  <td>
                    {item.createdAt && item.createdAt.seconds
                      ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                      : "Just now"}
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

export default Notifications;