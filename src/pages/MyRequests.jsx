import React, { useEffect, useState } from "react";
import "./MyRequests.css";

import { auth, db } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

function MyRequests() {

  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const [userId, setUserId] = useState("");
  const [requests, setRequests] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editReason, setEditReason] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {

        const id = user.email
          .split("@")[0]
          .toUpperCase();

        const userRef = doc(db, "users", id);

        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          navigate("/");
          return;
        }

        const userData = userSnap.data();

        if (userData.uid !== user.uid) {
          navigate("/");
          return;
        }

        if (userData.role === "admin") {
          navigate("/admin-dashboard");
          return;
        }

        setUserId(id);
        fetchRequests(id);

      } else {
        navigate("/");
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

  const openEditModal = (item) => {
    setEditItem(item);
    setEditReason(item.reason);
    setShowEditModal(true);
  };

  const saveEdit = async () => {

    if (!editItem || !editReason.trim()) return;

    if (editReason.trim().length < 5) {
      return;
    }

    if (editReason.trim().length > 500) {
      return;
    }

    if (editItem.userId !== userId) {
      return;
    }

    try {

      await updateDoc(doc(db, "absenceRequests", editItem.id), {
        reason: editReason.trim()
      });

      setShowEditModal(false);
      setEditItem(null);
      fetchRequests(userId);

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
        ← {t("back")}
      </button>

      <div className="myreq-card">

        <div className="myreq-header">
          <div className="myreq-badge">📋 {t("absenceRequests")}</div>
          <h2>{t("myRequests")}</h2>
          <p className="myreq-subtitle">{t("myRequestsSubtitle")}</p>
        </div>

        {requests.length === 0 ? (
          <div className="no-data">
            <div className="no-data-icon">📭</div>
            <p>{t("noRequestsFound")}</p>
          </div>
        ) : (
          <div className="myreq-table-wrapper">
            <table className="myreq-table">
              <thead>
                <tr>
                  <th>{t("date")}</th>
                  <th>{t("reason")}</th>
                  <th>{t("status")}</th>
                  <th>{t("actions")}</th>
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
                        {item.status.toLowerCase() === "approved" && "✓ "}
                        {item.status.toLowerCase() === "rejected" && "✕ "}
                        {item.status.toLowerCase() === "pending" && "⏳ "}
                        {item.status.toLowerCase() === "approved" && t("approved")}
                        {item.status.toLowerCase() === "rejected" && t("rejected")}
                        {item.status.toLowerCase() === "pending" && t("pending")}
                      </span>
                    </td>

                    <td>
                      {item.status.toLowerCase() === "pending" && (
                        <button
                          className="myreq-edit-btn"
                          onClick={() => openEditModal(item)}
                        >
                          ✎ {t("edit")}
                        </button>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showEditModal && editItem && (
          <div className="myreq-modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="myreq-modal" onClick={(e) => e.stopPropagation()}>

              <div className="myreq-modal-header">
                <h3>✎ {t("edit")} {t("reason")}</h3>
                <button className="myreq-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
              </div>

              <div className="myreq-modal-info">
                <p>📅 {editItem.date}</p>
              </div>

              <div className="myreq-modal-field">
                <label>{t("reason")}</label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder={t("reasonPlaceholder")}
                />
              </div>

              <div className="myreq-modal-footer">
                <button className="myreq-modal-cancel" onClick={() => setShowEditModal(false)}>
                  {t("cancel")}
                </button>
                <button className="myreq-modal-save" onClick={saveEdit}>
                  💾 {t("save")}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default MyRequests;