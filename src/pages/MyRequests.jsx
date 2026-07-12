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
  const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

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

  const lc = (s) => (s || "").toLowerCase();
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => lc(r.status) === "pending").length;
  const approvedCount = requests.filter((r) => lc(r.status) === "approved").length;
  const rejectedCount = requests.filter((r) => lc(r.status) === "rejected").length;
  const pad2 = (n) => String(n).padStart(2, "0");

  return (
    <div className="my-requests-page" data-theme={theme}>

      <button
        className="myreq-back-btn"
        onClick={() => navigate("/user-dashboard")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        {t("back")}
      </button>

      <div className="myreq-card">

        <div className="myreq-header">
          <div className="myreq-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>
            {t("absenceRequests")}
          </div>
          <h2>{t("myRequests")}</h2>
          <p className="myreq-subtitle">{t("myRequestsSubtitle")}</p>
        </div>

        <div className="myreq-stats">
          <div className="myreq-stat">
            <span className="myreq-stat-icon myreq-stat-icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            </span>
            <div className="myreq-stat-body">
              <span className="myreq-stat-num myreq-stat-num--green">{pad2(totalCount)}</span>
              <span className="myreq-stat-title">{t("totalRequests") || "Total Requests"}</span>
              <span className="myreq-stat-sub">{t("allTime") || "All time"}</span>
            </div>
          </div>

          <div className="myreq-stat">
            <span className="myreq-stat-icon myreq-stat-icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" /><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" /></svg>
            </span>
            <div className="myreq-stat-body">
              <span className="myreq-stat-num myreq-stat-num--blue">{pad2(pendingCount)}</span>
              <span className="myreq-stat-title">{t("pending")}</span>
              <span className="myreq-stat-sub">{t("awaitingApproval") || "Awaiting approval"}</span>
            </div>
          </div>

          <div className="myreq-stat">
            <span className="myreq-stat-icon myreq-stat-icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            </span>
            <div className="myreq-stat-body">
              <span className="myreq-stat-num myreq-stat-num--green">{pad2(approvedCount)}</span>
              <span className="myreq-stat-title">{t("approved")}</span>
              <span className="myreq-stat-sub">{t("requestsApproved") || "Requests approved"}</span>
            </div>
          </div>

          <div className="myreq-stat">
            <span className="myreq-stat-icon myreq-stat-icon--red">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
            </span>
            <div className="myreq-stat-body">
              <span className="myreq-stat-num myreq-stat-num--red">{pad2(rejectedCount)}</span>
              <span className="myreq-stat-title">{t("rejected")}</span>
              <span className="myreq-stat-sub">{t("requestsRejected") || "Requests rejected"}</span>
            </div>
          </div>
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
                      <span className="date-cell">
                        <span className="date-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                        </span>
                        {item.date}
                      </span>
                    </td>

                    <td>
                      <span className="reason-cell">{item.reason}</span>
                    </td>

                    <td>
                      <span className={`status ${item.status.toLowerCase()}`}>
                        {item.status.toLowerCase() === "approved" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        )}
                        {item.status.toLowerCase() === "rejected" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
                        )}
                        {item.status.toLowerCase() === "pending" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>
                        )}
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
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                          {t("edit")}
                        </button>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="myreq-secure">
          <div className="myreq-secure-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
          </div>
          <div className="myreq-secure-text">
            <span className="myreq-secure-title">{t("requestsSafeTitle") || "Your requests are safe with us"}</span>
            <span className="myreq-secure-sub">{t("requestsSafeSub") || "All your leave requests are encrypted and confidential."}</span>
          </div>
          <div className="myreq-secure-art" aria-hidden="true">
            <svg viewBox="0 0 110 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="55" cy="52" rx="30" ry="8" fill="rgba(96,165,250,0.12)" />
              <path className="mr-sh-outline" d="M69 14l-14-5-14 5v15c0 11 14 18 14 18s14-7 14-18z" fill="rgba(45,212,207,0.18)" stroke="#2dd4cf" strokeWidth="2.5" />
              <rect className="mr-sh-lockbody" x="49" y="28" width="12" height="10" rx="2" fill="#2dd4cf" />
              <path className="mr-sh-lockarc" d="M52 28v-3a3 3 0 0 1 6 0v3" stroke="#2dd4cf" strokeWidth="2" fill="none" />
              <path d="M90 18l1.4 3.8 3.8 1.4-3.8 1.4L90 30l-1.4-3.8-3.8-1.4 3.8-1.4z" fill="#60a5fa" />
              <path className="mr-sh-spark" d="M20 24l1 2.7 2.7 1-2.7 1L20 32l-1-2.7-2.7-1 2.7-1z" fill="#2dd4cf" opacity="0.8" />
              <circle cx="86" cy="42" r="2" fill="#60a5fa" opacity="0.7" />
            </svg>
          </div>
        </div>

        {showEditModal && editItem && (
          <div className="myreq-modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="myreq-modal" onClick={(e) => e.stopPropagation()}>

              <div className="myreq-modal-header">
                <h3>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                  {t("edit")} {t("reason")}
                </h3>
                <button className="myreq-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
              </div>

              <div className="myreq-modal-info">
                <p>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                  {editItem.date}
                </p>
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                  {t("save")}
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