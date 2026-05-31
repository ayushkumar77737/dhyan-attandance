import React, { useState, useEffect } from "react";
import "./Notifications.css";
import { logAdminAction } from "../utils/logAdminAction";
import { db, auth } from "../firebase/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  getDoc
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

function Notifications() {

  const { t } = useTranslation();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [notifications, setNotifications] = useState([]);

  // ← ADD: edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editMessage, setEditMessage] = useState("");

  // ← ADD: delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const navigate = useNavigate();

  const checkAdmin = async () => {

    const currentUser = auth.currentUser;

    if (!currentUser) {
      navigate("/");
      return;
    }

    try {

      const userRef = doc(
        db,
        "users",
        localStorage.getItem("userId")
      );

      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        navigate("/");
        return;
      }

      const userData = userSnap.data();

      if (userData.role !== "admin") {
        navigate("/");
        return;
      }

    } catch (error) {
      console.error(error);
      navigate("/");
    }
  };

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
    checkAdmin();
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
      setStatus(t("enterNotification"));
      return;
    }
    try {
      setLoading(true);
      await addDoc(collection(db, "notifications"), {
        message: message,
        userId: "ALL",
        createdAt: serverTimestamp()
      });
      await logAdminAction("create_notification", {
        details: t("logPostedNotification", { msg: message.slice(0, 40) }),
      });
      setStatus(t("notificationPosted"));
      setMessage("");
    } catch (error) {
      console.error(error);
      setStatus(t("errorPostingNotification"));
    } finally {
      setLoading(false);
    }
  };

  // ← ADD: open edit modal
  const openEditModal = (item) => {
    setEditItem(item);
    setEditMessage(item.message);
    setShowEditModal(true);
  };

  // ← ADD: save edited notification
  const saveEdit = async () => {
    if (!editMessage.trim()) return;
    try {
      await updateDoc(doc(db, "notifications", editItem.id), {
        message: editMessage.trim()
      });
      await logAdminAction("update_notification", {
        targetId: editItem.id,
        details: t("logEditedNotification"),
      });
      setShowEditModal(false);
      setEditItem(null);
      setStatus(t("notificationPosted"));
    } catch (error) {
      console.error(error);
      setStatus(t("errorPostingNotification"));
    }
  };

  // ← ADD: open delete modal
  const openDeleteModal = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  // ← ADD: confirm delete
  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "notifications", deleteId));
      await logAdminAction("delete_notification", {
        targetId: deleteId,
        details: t("logDeletedNotification"),
      });
      setShowDeleteModal(false);
      setDeleteId(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="notifications-page">

      {/* Decorative orbs */}
      <div className="notif-orb notif-orb-1" />
      <div className="notif-orb notif-orb-2" />
      <div className="notif-orb notif-orb-3" />

      {/* Back Button */}
      <button className="notif-back-btn" onClick={() => navigate(-1)}>
        <span>←</span> {t("back")}
      </button>

      {/* Title Block */}
      <div className="notif-title-block">
        <span className="notif-eyebrow">{t("adminPanel")}</span>
        <h1 className="notif-main-title">{t("postNotification")}</h1>
        <p className="notif-subtitle">{t("notificationSubtitle")}</p>
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
              placeholder={t("notificationPlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <span className="textarea-icon">📢</span>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? (
              <><span className="spinner" /> {t("posting")}</>
            ) : (
              <><span>🚀</span> {t("submit")}</>
            )}
          </button>
        </form>

      </div>

      {/* Notifications List */}
      <div className="notif-list">

        <div className="notif-list-header">
          <span className="notif-list-title">{t("recentNotifications")}</span>
          <span className="notif-count-badge">{notifications.length}</span>
        </div>

        {notifications.length === 0 ? (
          <div className="no-data">
            <span className="no-data-icon">📭</span>
            <p>{t("noNotificationsYet")}</p>
          </div>
        ) : (
          <table className="notif-table">
            <thead>
              <tr>
                <th>{t("notifMessage")}</th>
                <th>{t("date")}</th>
                <th>{t("actions")}</th>
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
                        : t("justNow")}
                    </span>
                  </td>

                  {/* ← ADD: edit and delete buttons */}
                  <td>
                    <div className="notif-action-btns">
                      <button
                        className="notif-edit-btn"
                        onClick={() => openEditModal(item)}
                      >
                        ✎ {t("edit")}
                      </button>
                      <button
                        className="notif-delete-btn"
                        onClick={() => openDeleteModal(item.id)}
                      >
                        🗑 {t("delete")}
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>

      {/* ← EDIT MODAL */}
      {showEditModal && editItem && (
        <div className="notif-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="notif-modal" onClick={(e) => e.stopPropagation()}>

            <div className="notif-modal-header">
              <h3>✎ {t("editNotification")}</h3>
              <button className="notif-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <div className="notif-modal-body">
              <textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                placeholder={t("notificationPlaceholder")}
              />
            </div>

            <div className="notif-modal-footer">
              <button className="notif-modal-cancel" onClick={() => setShowEditModal(false)}>
                {t("cancel")}
              </button>
              <button className="notif-modal-save" onClick={saveEdit}>
                💾 {t("save")}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ← DELETE MODAL */}
      {showDeleteModal && (
        <div className="notif-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="notif-modal notif-modal-sm" onClick={(e) => e.stopPropagation()}>

            <div className="notif-modal-header">
              <h3>🗑 {t("deleteNotification")}</h3>
              <button className="notif-modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>

            <p className="notif-modal-confirm-text">{t("deleteNotificationMsg")}</p>

            <div className="notif-modal-footer">
              <button className="notif-modal-cancel" onClick={() => setShowDeleteModal(false)}>
                {t("cancel")}
              </button>
              <button className="notif-modal-delete" onClick={confirmDelete}>
                🗑 {t("delete")}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Notifications;