import React, { useEffect, useState } from "react";
import "./LeaveRequests.css";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import useAutoLogout from "../hooks/useAutoLogout";
import logo from "../assets/logo2.png";
import favicon from "../assets/favicon.png";
import { logAdminAction } from "../utils/logAdminAction";

const LEAVE_TYPE_NAMES = {
  CL: { key: "casualLeave", fallback: "Casual Leave" },
  SL: { key: "sickLeave", fallback: "Sick Leave" },
  PL: { key: "privilegeLeave", fallback: "Privilege Leave" },
};

const FILTERS = ["All", "Pending", "Approved", "Rejected"];

function LeaveRequests() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useAutoLogout();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState("");
  const [toast, setToast] = useState(null); // { type, msg }
  const [confirmDelete, setConfirmDelete] = useState(null); // request object or null
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

  const adminId = (localStorage.getItem("userId") || "").toUpperCase();

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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/");
        return;
      }
      const id = localStorage.getItem("userId");
      if (!id) {
        navigate("/");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", id));
        if (
          !snap.exists() ||
          snap.data().role !== "admin" ||
          snap.data().uid !== user.uid
        ) {
          navigate("/");
          return;
        }
        fetchRequests();
      } catch (err) {
        console.log(err);
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "leaveRequests"));
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setRequests(list);
    } catch (err) {
      console.log("Fetch leave requests error:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const updateStatus = async (id, status) => {
    try {
      setUpdatingId(id);
      await updateDoc(doc(db, "leaveRequests", id), {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date().toISOString(),
      });
      logAdminAction(t("logLeaveStatus", { status }), {
        targetId: id,
        details: t("logLeaveStatusDetails", { status, id }),
      });
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status, reviewedBy: adminId } : r))
      );
      showToast("success", t("statusUpdated") || "Status updated");
    } catch (err) {
      console.log("Update status error:", err);
      showToast("error", t("updateFailed") || "Update failed. Try again.");
    } finally {
      setUpdatingId("");
    }
  };

  const deleteOne = async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await deleteDoc(doc(db, "leaveRequests", confirmDelete.id));
      logAdminAction(t("logLeaveDeleted"), {
        targetId: confirmDelete.id,
        details: t("logLeaveDeletedDetails", {
          who: confirmDelete.userName || confirmDelete.userId,
        }),
      });
      setRequests((prev) => prev.filter((r) => r.id !== confirmDelete.id));
      showToast("success", t("requestDeleted") || "Request deleted");
    } catch (err) {
      console.log("Delete error:", err);
      showToast("error", t("deleteFailed") || "Delete failed. Try again.");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const deleteAll = async () => {
    try {
      setDeleting(true);
      const snap = await getDocs(collection(db, "leaveRequests"));
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(doc(db, "leaveRequests", d.id)));
      await batch.commit();
      logAdminAction(t("logLeaveDeletedAll"), {
        details: t("logLeaveDeletedAllDetails", { count: requests.length }),
      });
      setRequests([]);
      showToast("success", t("allDeleted") || "All requests deleted");
    } catch (err) {
      console.log("Delete all error:", err);
      showToast("error", t("deleteFailed") || "Delete failed. Try again.");
    } finally {
      setDeleting(false);
      setConfirmDeleteAll(false);
    }
  };

  const exportCSV = () => {
    if (filtered.length === 0) {
      showToast("error", t("nothingToExport") || "Nothing to export");
      return;
    }

    const headers = ["Name", "User ID", "Leave Type", "Date", "Reason", "Status", "Reviewed By"];
    const escape = (val) => `"${(val ?? "").toString().replace(/"/g, '""')}"`;

    const rows = filtered.map((r) =>
      [
        r.userName,
        r.userId,
        typeLabel(r.leaveType),
        r.date,
        r.reason,
        r.status || "Pending",
        r.reviewedBy,
      ].map(escape).join(",")
    );

    const csv = [headers.map(escape).join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leave-requests-${filter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logAdminAction(t("logLeaveExported") || "Exported leave requests", {
      details:
        t("logLeaveExportedDetails", { count: filtered.length, filter }) ||
        `Exported ${filtered.length} ${filter} requests`,
    });
    showToast("success", t("exported") || "Exported");
  };

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  const typeLabel = (code) => {
    const lt = LEAVE_TYPE_NAMES[code];
    return lt ? `${t(lt.key) || lt.fallback} (${code})` : code || "—";
  };

  const statusKey = (status) => (status || "Pending").toLowerCase();

  const statusBadge = (status) => {
    const s = statusKey(status);
    if (s === "approved") return "alvr-badge alvr-badge-approved";
    if (s === "rejected") return "alvr-badge alvr-badge-rejected";
    return "alvr-badge alvr-badge-pending";
  };

  const statusText = (status) => {
    const s = statusKey(status);
    if (s === "approved") return `✓ ${t("approved") || "Approved"}`;
    if (s === "rejected") return `✗ ${t("rejected") || "Rejected"}`;
    return `⏳ ${t("pending") || "Pending"}`;
  };

  const counts = {
    All: requests.length,
    Pending: requests.filter((r) => statusKey(r.status) === "pending").length,
    Approved: requests.filter((r) => statusKey(r.status) === "approved").length,
    Rejected: requests.filter((r) => statusKey(r.status) === "rejected").length,
  };

  const filtered =
    filter === "All"
      ? requests
      : requests.filter((r) => statusKey(r.status) === filter.toLowerCase());

  return (
    <div className="alvr-container" data-theme={theme}>
      {toast && (
        <div className={`alvr-toast alvr-toast-${toast.type}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="alvr-header">
        <div className="alvr-header-left">
          <button className="alvr-back-btn" onClick={() => navigate("/admin-dashboard")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {t("back") || "Back"}
          </button>
          <img src={logo} alt="Logo" className="alvr-logo" />
          <div className="alvr-header-text">
            <p className="alvr-portal-label">{t("appTitle") || "Attendance Portal"}</p>
            <h1 className="alvr-title">{t("leaveRequests") || "Leave Requests"}</h1>
          </div>
        </div>
        <img src={favicon} alt="" className="alvr-favicon" />
      </div>

      {/* Filter bar + Delete All */}
      <div className="alvr-toolbar">
        <div className="alvr-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`alvr-filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {t(`filter${f}`) || f}
              <span className="alvr-filter-count">{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="alvr-toolbar-actions">
          <button
            className="alvr-export-btn"
            onClick={exportCSV}
            disabled={filtered.length === 0}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t("export") || "Export"}
          </button>

          <button
            className="alvr-delete-all-btn"
            onClick={() => setConfirmDeleteAll(true)}
            disabled={requests.length === 0}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
            {t("deleteAll") || "Delete All"}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="alvr-loading"><span className="alvr-spinner alvr-spinner-blue" /></div>
      ) : filtered.length === 0 ? (
        <div className="alvr-empty">
          <span>📭</span>
          {t("noLeaveRequestsAdmin") || "No leave requests to show"}
        </div>
      ) : (
        <div className="alvr-list">
          {filtered.map((r) => (
            <div className="alvr-card" key={r.id}>
              <div className="alvr-card-main">
                <div className="alvr-who">
                  <div className="alvr-avatar">{getInitials(r.userName)}</div>
                  <div className="alvr-who-text">
                    <span className="alvr-name">{r.userName || "—"}</span>
                    <span className="alvr-id">ID: {r.userId || "—"}</span>
                  </div>
                </div>

                <div className="alvr-details">
                  <div className="alvr-detail-row">
                    <span className="alvr-type-chip">{typeLabel(r.leaveType)}</span>
                    <span className="alvr-date">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {r.date || "—"}
                    </span>
                  </div>
                  {r.reason && <p className="alvr-reason">{r.reason}</p>}
                </div>
              </div>

              <div className="alvr-card-side">
                <span className={statusBadge(r.status)}>{statusText(r.status)}</span>

                <div className="alvr-actions">
                  <button
                    className="alvr-act alvr-act-approve"
                    disabled={updatingId === r.id || statusKey(r.status) === "approved"}
                    onClick={() => updateStatus(r.id, "Approved")}
                  >
                    {updatingId === r.id ? <span className="alvr-spinner" /> : (t("approve") || "Approve")}
                  </button>
                  <button
                    className="alvr-act alvr-act-reject"
                    disabled={updatingId === r.id || statusKey(r.status) === "rejected"}
                    onClick={() => updateStatus(r.id, "Rejected")}
                  >
                    {t("reject") || "Reject"}
                  </button>
                  <button
                    className="alvr-act alvr-act-delete"
                    disabled={updatingId === r.id}
                    onClick={() => setConfirmDelete(r)}
                    title={t("delete") || "Delete"}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Individual delete confirm */}
      {confirmDelete && createPortal(
        <div className="alvr-modal-overlay" data-theme={theme} onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="alvr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="alvr-modal-icon alvr-modal-icon-red">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </div>
            <h3 className="alvr-modal-title">{t("deleteRequest") || "Delete this request?"}</h3>
            <p className="alvr-modal-text">
              {(t("deleteRequestText") || "This will permanently delete the leave request from")}{" "}
              <strong>{confirmDelete.userName || confirmDelete.userId}</strong>.
            </p>
            <div className="alvr-modal-actions">
              <button className="alvr-modal-cancel" disabled={deleting} onClick={() => setConfirmDelete(null)}>
                {t("cancel") || "Cancel"}
              </button>
              <button className="alvr-modal-confirm" disabled={deleting} onClick={deleteOne}>
                {deleting ? <span className="alvr-spinner" /> : (t("delete") || "Delete")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete all confirm */}
      {confirmDeleteAll && createPortal(
        <div className="alvr-modal-overlay" data-theme={theme} onClick={() => !deleting && setConfirmDeleteAll(false)}>
          <div className="alvr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="alvr-modal-icon alvr-modal-icon-red">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="alvr-modal-title">{t("deleteAllRequests") || "Delete ALL requests?"}</h3>
            <p className="alvr-modal-text">
              {t("deleteAllText") || "This will permanently delete every leave request. This cannot be undone."}
            </p>
            <div className="alvr-modal-actions">
              <button className="alvr-modal-cancel" disabled={deleting} onClick={() => setConfirmDeleteAll(false)}>
                {t("cancel") || "Cancel"}
              </button>
              <button className="alvr-modal-confirm" disabled={deleting} onClick={deleteAll}>
                {deleting ? <span className="alvr-spinner" /> : (t("deleteAll") || "Delete All")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default LeaveRequests;