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

import { useTranslation } from "react-i18next"; // ← ADD

function Notifications() {

  const { t } = useTranslation(); // ← ADD

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [notifications, setNotifications] = useState([]);

  const navigate = useNavigate();

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

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      setStatus(t("enterNotification")); // ← CHANGED
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "notifications"), {
        message: message,
        createdAt: serverTimestamp()
      });
      setStatus(t("notificationPosted")); // ← CHANGED
      setMessage("");
    } catch (error) {
      console.error(error);
      setStatus(t("errorPostingNotification")); // ← CHANGED
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notifications-page">

      {/* Decorative orbs */}
      <div className="notif-orb notif-orb-1" />
      <div className="notif-orb notif-orb-2" />
      <div className="notif-orb notif-orb-3" />

      {/* Back Button */}
      <button
        className="notif-back-btn"
        onClick={() => navigate(-1)}
      >
        <span>←</span> {t("back")} {/* ← CHANGED */}
      </button>

      {/* Title Block */}
      <div className="notif-title-block">
        <span className="notif-eyebrow">{t("adminPanel")}</span> {/* ← CHANGED */}
        <h1 className="notif-main-title">
          {t("postNotification")} {/* ← CHANGED */}
        </h1>
        <p className="notif-subtitle">{t("notificationSubtitle")}</p> {/* ← CHANGED */}
      </div>

      {/* Card */}
      <div className="notif-card">

        {status && (
          <div className={`status-message ${status.includes("✅") ? "status-success" :
              status.includes("❌") ? "status-error" : "status-warn"
            }`}>
            {status}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="textarea-wrapper">
            <textarea
              placeholder={t("notificationPlaceholder")} // ← CHANGED
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <span className="textarea-icon">📢</span>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? (
              <><span className="spinner" /> {t("posting")}</> // ← CHANGED
            ) : (
              <><span>🚀</span> {t("submit")}</> // ← CHANGED
            )}
          </button>

        </form>

      </div>

      {/* Notifications List */}
      <div className="notif-list">

        <div className="notif-list-header">
          <span className="notif-list-title">{t("recentNotifications")}</span> {/* ← CHANGED */}
          <span className="notif-count-badge">{notifications.length}</span>
        </div>

        {notifications.length === 0 ? (
          <div className="no-data">
            <span className="no-data-icon">📭</span>
            <p>{t("noNotificationsYet")}</p> {/* ← CHANGED */}
          </div>
        ) : (
          <table className="notif-table">
            <thead>
              <tr>
                <th>{t("notifMessage")}</th> {/* ← CHANGED */}
                <th>{t("date")}</th>         {/* ← CHANGED */}
              </tr>
            </thead>
            <tbody>
              {notifications.map((item, index) => (
                <tr key={item.id} style={{ animationDelay: `${index * 0.04}s` }}>
                  <td>
                    <span className="notif-msg-cell">
                      <span className="notif-dot" />
                      {item.message}
                    </span>
                  </td>
                  <td>
                    <span className="notif-date-chip">
                      {item.createdAt && item.createdAt.seconds
                        ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                        : t("justNow")} {/* ← CHANGED */}
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

export default Notifications;