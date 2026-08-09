import React, { useEffect, useState } from "react";
import "./Notifications.css";
import { logAdminAction } from "../utils/logAdminAction";
import { db, auth } from "../firebase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

/* ------------------------------------------------------------------ */
/* Inline icons (presentational only)                                 */
/* ------------------------------------------------------------------ */
const icons = {
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  crown: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M3 8l4.2 3.1L12 4l4.8 7.1L21 8l-1.6 10H4.6L3 8z" />
    </svg>
  ),
  megaphone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" />
      <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M18.5 7a7 7 0 0 1 0 10" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  pencil: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <line x1="12" y1="9" x2="12" y2="13.5" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

/* Decorative dotted grids used in the page corners */
const Dots = ({ className }) => (
  <svg className={`ntf-dots ${className}`} viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {[...Array(5)].map((_, r) =>
      [...Array(5)].map((_, c) => (
        <circle key={`${r}-${c}`} cx={8 + c * 19} cy={8 + r * 19} r="3.4" fill="currentColor" />
      ))
    )}
  </svg>
);

function Notifications() {

  const { t } = useTranslation();
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

  const [editRow, setEditRow] = useState(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmRow, setConfirmRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const checkAdmin = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) { navigate("/"); return; }
    try {
      const userRef = doc(db, "users", localStorage.getItem("userId"));
      const userSnap = await getDoc(userRef);
      if (
        !userSnap.exists() ||
        userSnap.data().role !== "admin" ||
        userSnap.data().uid !== auth.currentUser.uid
      ) {
        navigate("/");
        return;
      }
      fetchNotifications();
    } catch (err) {
      console.error(err);
      navigate("/");
    }
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "notifications"));
      const list = [];
      snap.forEach((docItem) => {
        const data = docItem.data();
        list.push({
          docId: docItem.id,
          message: data.message || "—",
          /* Field name has varied over time — accept any of them so
             older records still show a date rather than a dash. */
          createdAt: data.createdAt || data.date || data.timestamp || null,
        });
      });

      /* Newest first. Firestore Timestamps expose .seconds; ISO strings
         and Date objects fall through to Date parsing. */
      const toMs = (v) => {
        if (!v) return 0;
        if (typeof v === "object" && v.seconds) return v.seconds * 1000;
        const parsed = new Date(v).getTime();
        return Number.isNaN(parsed) ? 0 : parsed;
      };
      list.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));

      setNotifications(list);
    } catch (err) {
      console.error(err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (v) => {
    if (!v) return "—";
    const ms = typeof v === "object" && v.seconds
      ? v.seconds * 1000
      : new Date(v).getTime();
    if (Number.isNaN(ms)) return "—";
    return new Date(ms).toLocaleString();
  };

  const postNotification = async () => {
    const text = message.trim();
    if (!text) return;
    try {
      setPosting(true);
      const ref = await addDoc(collection(db, "notifications"), {
        message: text,
        createdAt: new Date().toISOString(),
        postedBy: localStorage.getItem("userId"),
      });
      await logAdminAction("post_notification", {
        targetId: ref.id,
        details: t("logPostedNotification", { message: text }),
      });
      setMessage("");
      fetchNotifications();
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const openEdit = (row) => {
    setEditRow(row);
    setEditText(row.message);
  };

  const saveEdit = async () => {
    const text = editText.trim();
    if (!editRow || !text) return;
    try {
      setSavingEdit(true);
      await updateDoc(doc(db, "notifications", editRow.docId), {
        message: text,
        editedBy: localStorage.getItem("userId"),
        editedAt: new Date().toISOString(),
      });
      await logAdminAction("update_notification", {
        targetId: editRow.docId,
        details: t("logEditedNotification", { message: text }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.docId === editRow.docId ? { ...n, message: text } : n))
      );
      setEditRow(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const doDelete = async () => {
    if (!confirmRow) return;
    try {
      setDeleting(true);
      setBusyId(confirmRow.docId);
      await deleteDoc(doc(db, "notifications", confirmRow.docId));
      await logAdminAction("delete_notification", {
        targetId: confirmRow.docId,
        details: t("logDeletedNotification", { message: confirmRow.message }),
      });
      setNotifications((prev) => prev.filter((n) => n.docId !== confirmRow.docId));
      setConfirmRow(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setBusyId(null);
    }
  };

  const exportCSV = () => {
    if (notifications.length === 0) return;

    const headers = ["Message", "Date"];
    const escape = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const rows = notifications.map((n) =>
      [n.message, formatDate(n.createdAt)].map(escape).join(",")
    );

    const csv = "\uFEFF" + [headers.map(escape).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `notifications_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="notifications-container" data-theme={theme}>

      <div className="ntf-blob ntf-blob--1" />
      <div className="ntf-blob ntf-blob--2" />
      <span className="ntf-ring" aria-hidden="true" />
      <Dots className="ntf-dots--tr" />
      <Dots className="ntf-dots--bl" />

      <button className="ntf-back" onClick={() => navigate("/admin-dashboard")}>
        <span className="ntf-back-icon">{icons.back}</span>
        {t("back")}
      </button>

      {/* ============================ HEADER ============================ */}
      <div className="ntf-head">
        <span className="ntf-eyebrow">
          <span className="ntf-eyebrow-icon">{icons.crown}</span>
          {t("adminPanel")}
        </span>
        <h1 className="ntf-title">{t("postNotification")}</h1>
        <p className="ntf-subtitle">{t("broadcastSubtitle")}</p>
      </div>

      {/* ========================= COMPOSE CARD ========================= */}
      <div className="ntf-compose">
        <div className="ntf-input-wrap">
          <textarea
            className="ntf-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("notificationPlaceholder") || "Enter your notification here…"}
            rows={4}
            maxLength={500}
          />
          <span className="ntf-input-icon" aria-hidden="true">{icons.megaphone}</span>
        </div>

        <button
          className="ntf-submit"
          onClick={postNotification}
          disabled={posting || !message.trim()}
        >
          {posting
            ? <span className="ntf-spinner" />
            : <span className="ntf-btn-icon">{icons.send}</span>}
          {t("submit")}
        </button>
      </div>

      {/* =========================== LIST HEAD ========================== */}
      <div className="ntf-list-head">
        <h2 className="ntf-list-title">
          {t("recentNotifications") || "Recent Notifications"}
          <span className="ntf-count">{notifications.length}</span>
        </h2>

        <button
          className="ntf-export"
          onClick={exportCSV}
          disabled={notifications.length === 0}
        >
          <span className="ntf-btn-icon">{icons.download}</span>
          {t("exportCSV")}
        </button>
      </div>

      {/* ============================ TABLE ============================= */}
      <div className="ntf-table">
        <div className="ntf-thead">
          <span>{t("message")}</span>
          <span>{t("date")}</span>
          <span>{t("actions")}</span>
        </div>

        {loading ? (
          <div className="ntf-state">
            <span className="ntf-spinner ntf-spinner--lg" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="ntf-state">
            <span className="ntf-state-icon">{icons.inbox}</span>
            <p className="ntf-state-title">{t("noNotifications")}</p>
          </div>
        ) : (
          notifications.map((n, index) => (
            <div
              className="ntf-row"
              key={n.docId}
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              <div className="ntf-cell ntf-cell--message">
                <span className="ntf-bullet" aria-hidden="true" />
                <span className="ntf-message">{n.message}</span>
              </div>

              <div className="ntf-cell ntf-cell--date">
                <span className="ntf-date-chip">{formatDate(n.createdAt)}</span>
              </div>

              <div className="ntf-cell ntf-cell--actions">
                <button
                  className="ntf-act ntf-act--edit"
                  onClick={() => openEdit(n)}
                  disabled={busyId === n.docId}
                >
                  <span className="ntf-btn-icon">{icons.pencil}</span>
                  {t("edit")}
                </button>
                <button
                  className="ntf-act ntf-act--delete"
                  onClick={() => setConfirmRow(n)}
                  disabled={busyId === n.docId}
                >
                  <span className="ntf-btn-icon">{icons.trash}</span>
                  {t("delete")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* =========================== EDIT MODAL ========================= */}
      {editRow && (
        <div className="ntf-modal-overlay" onClick={() => !savingEdit && setEditRow(null)}>
          <div className="ntf-modal" onClick={(e) => e.stopPropagation()}>

            <div className="ntf-modal-head">
              <span className="ntf-modal-icon">{icons.pencil}</span>
              <h3>{t("edit")}</h3>
              <button
                className="ntf-modal-close"
                onClick={() => setEditRow(null)}
                disabled={savingEdit}
                aria-label={t("close")}
              >
                {icons.close}
              </button>
            </div>

            <textarea
              className="ntf-modal-input"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              maxLength={500}
            />

            <div className="ntf-modal-footer">
              <button
                className="ntf-modal-cancel"
                onClick={() => setEditRow(null)}
                disabled={savingEdit}
              >
                {t("cancel")}
              </button>
              <button
                className="ntf-modal-save"
                onClick={saveEdit}
                disabled={savingEdit || !editText.trim()}
              >
                {savingEdit
                  ? <span className="ntf-spinner" />
                  : <span className="ntf-btn-icon">{icons.check}</span>}
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================= DELETE CONFIRM ======================= */}
      {confirmRow && (
        <div className="ntf-modal-overlay" onClick={() => !deleting && setConfirmRow(null)}>
          <div className="ntf-modal ntf-modal--confirm" onClick={(e) => e.stopPropagation()}>
            <span className="ntf-confirm-icon">{icons.alert}</span>

            <h3>{t("delete")}</h3>
            <p>{t("deleteNotificationConfirm")}</p>

            <div className="ntf-modal-footer">
              <button
                className="ntf-modal-cancel"
                onClick={() => setConfirmRow(null)}
                disabled={deleting}
              >
                {t("cancel")}
              </button>
              <button
                className="ntf-modal-confirm"
                onClick={doDelete}
                disabled={deleting}
              >
                {deleting
                  ? <span className="ntf-spinner" />
                  : <span className="ntf-btn-icon">{icons.trash}</span>}
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Notifications;