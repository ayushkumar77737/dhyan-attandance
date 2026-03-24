import React, { useState, useEffect } from "react";
import "./Notifications.css";

import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Notifications() {

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const navigate = useNavigate();

  // ✅ Auto-hide message after 3 seconds (BEST WAY)
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => {
        setStatus("");
      }, 3000);

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
    <div className="notification-page">

      {/* Back Button */}
      <button
        className="back-btn"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div className="notification-card">

        <div className="profile-icon">
          <img
            src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            alt="user"
          />
        </div>

        <h2>Post Notification</h2>

        {/* ✅ Status Message */}
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

    </div>
  );
}

export default Notifications;