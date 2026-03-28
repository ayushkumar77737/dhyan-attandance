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
  const [status, setStatus] = useState({ text: "", type: "" });
  const [notifications, setNotifications] = useState([]);
  const [charCount, setCharCount] = useState(0);

  const navigate = useNavigate();
  const MAX_CHARS = 300;

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
      if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
    };
    document.addEventListener("contextmenu", disableRightClick);
    document.addEventListener("keydown", disableInspectKeys);
    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableInspectKeys);
    };
  }, []);

  useEffect(() => {
    if (status.text) {
      const timer = setTimeout(() => setStatus({ text: "", type: "" }), 3500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleMessageChange = (e) => {
    const val = e.target.value;
    if (val.length <= MAX_CHARS) {
      setMessage(val);
      setCharCount(val.length);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setStatus({ text: "Please enter a notification message.", type: "error" });
      return;
    }
    try {
      setLoading(true);
      await addDoc(collection(db, "notifications"), {
        message: message.trim(),
        createdAt: serverTimestamp()
      });
      setStatus({ text: "Notification posted successfully!", type: "success" });
      setMessage("");
      setCharCount(0);
    } catch (error) {
      console.error(error);
      setStatus({ text: "Failed to post notification. Try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (item) => {
    if (!item.createdAt?.seconds) return "Just now";
    const d = new Date(item.createdAt.seconds * 1000);
    return d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="notif-root">

      {/* Decorative background blobs */}
      <div className="notif-blob notif-blob--1" />
      <div className="notif-blob notif-blob--2" />
      <div className="notif-blob notif-blob--3" />

      <div className="notif-container">

        {/* Header */}
        <header className="notif-header">
          <button className="notif-back-btn" onClick={() => navigate(-1)}>
            <span className="notif-back-arrow">←</span>
            <span>Back</span>
          </button>

          <div className="notif-title-group">
            <div className="notif-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div>
              <h1 className="notif-title">Notifications</h1>
              <p className="notif-subtitle">Broadcast a message to all users</p>
            </div>
          </div>
        </header>

        {/* Compose Card */}
        <div className="notif-compose-card">
          <div className="notif-compose-header">
            <span className="notif-compose-label">New Notification</span>
            <span className="notif-char-count">
              <span className={charCount >= MAX_CHARS * 0.9 ? "count-warn" : ""}>{charCount}</span>
              /{MAX_CHARS}
            </span>
          </div>

          {status.text && (
            <div className={`notif-status notif-status--${status.type}`}>
              <span className="notif-status-icon">
                {status.type === "success" ? "✓" : "✕"}
              </span>
              {status.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="notif-form">
            <div className="notif-textarea-wrap">
              <textarea
                placeholder="Write your notification message here..."
                value={message}
                onChange={handleMessageChange}
                className="notif-textarea"
              />
              <div className="notif-textarea-glow" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`notif-submit-btn ${loading ? "notif-submit-btn--loading" : ""}`}
            >
              {loading ? (
                <>
                  <span className="notif-spinner" />
                  Posting...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="notif-send-icon">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Post Notification
                </>
              )}
            </button>
          </form>
        </div>

        {/* Notifications List */}
        <div className="notif-list-section">
          <div className="notif-list-header">
            <h2 className="notif-list-title">Recent Notifications</h2>
            <span className="notif-count-badge">
              {notifications.length}
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="notif-empty">
              <div className="notif-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <p>No notifications yet</p>
              <span>Post your first notification above</span>
            </div>
          ) : (
            <div className="notif-cards-list">
              {notifications.map((item, index) => (
                <div
                  className="notif-item-card"
                  key={item.id}
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  <div className="notif-item-dot" />
                  <div className="notif-item-body">
                    <p className="notif-item-message">{item.message}</p>
                    <span className="notif-item-time">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="notif-clock-icon">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {formatDate(item)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Notifications;