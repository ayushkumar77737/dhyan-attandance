import React, { useEffect, useMemo, useState } from "react";
import "./LeavesRequest.css";
import { db, auth } from "../firebase/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { logAdminAction } from "../utils/logAdminAction";

import logo from "../assets/logo2.png";

/* ------------------------------------------------------------------ */
/* Inline icons (presentational only)                                 */
/* ------------------------------------------------------------------ */
const icons = {
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  hourglass: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h12" /><path d="M6 22h12" />
      <path d="M7 2v4.5c0 1.5 1.2 2.6 2.6 3.6L12 12l2.4-1.9C15.8 9.1 17 8 17 6.5V2" />
      <path d="M7 22v-4.5c0-1.5 1.2-2.6 2.6-3.6L12 12l2.4 1.9c1.4 1 2.6 2.1 2.6 3.6V22" />
    </svg>
  ),
  checkCircle: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.1 14.6-4-4 1.5-1.5 2.5 2.5 5.2-5.2 1.5 1.5-6.7 6.7z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  xMark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2.5" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  note: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="15" y1="13" x2="9" y2="13" /><line x1="15" y1="17" x2="9" y2="17" />
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

/* Decorative dotted grid, bottom-left of the page */
const Dots = () => (
  <svg className="lvr-dots" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {[...Array(10)].map((_, r) =>
      [...Array(10)].map((_, c) => (
        <circle key={`${r}-${c}`} cx={6 + c * 16} cy={6 + r * 16} r="3" fill="currentColor" />
      ))
    )}
  </svg>
);

function LeavesRequest() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [working, setWorking] = useState(false);
  const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

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
      fetchLeaves();
    } catch (err) {
      console.error(err);
      navigate("/");
    }
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);

      /* Profile photos live in `profiles/{ID}.profileImage` — the
         Cloudinary secure_url written by uploadProfileImage(). Build a
         lookup first, then attach each URL to its request below. */
      const imageMap = {};
      try {
        const profileSnap = await getDocs(collection(db, "profiles"));
        profileSnap.forEach((p) => {
          const pd = p.data();
          const key = String(p.id || "").toUpperCase();
          if (pd.profileImage) imageMap[key] = pd.profileImage;
        });
      } catch (e) {
        // Photos are optional — fall back to initials rather than failing.
        console.warn("LeavesRequest: could not load profile images —", e);
      }

      /* Names may not be stored on the request, so build a lookup too. */
      const nameMap = {};
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.forEach((u) => {
          const ud = u.data();
          const key = String(ud.id || u.id).toUpperCase();
          if (ud.name) nameMap[key] = ud.name;
        });
      } catch (e) {
        console.warn("LeavesRequest: could not load user names —", e);
      }

      const snap = await getDocs(collection(db, "leaveRequests"));
      const list = [];
      snap.forEach((docItem) => {
        const data = docItem.data();
        const uid = String(data.userId || "").toUpperCase();
        list.push({
          docId: docItem.id,
          userId: uid,
          name: data.name || nameMap[uid] || uid || "—",
          leaveType: data.leaveType || "—",
          date: data.date || "—",
          reason: data.reason || "—",
          status: data.status || "Pending",
          image: imageMap[uid] || "",
        });
      });

      /* Pending first — those need action — then date descending. */
      const rank = { pending: 0, approved: 1, rejected: 2 };
      list.sort((a, b) => {
        const ra = rank[String(a.status).toLowerCase()] ?? 3;
        const rb = rank[String(b.status).toLowerCase()] ?? 3;
        if (ra !== rb) return ra - rb;
        return String(b.date).localeCompare(String(a.date));
      });

      setLeaves(list);
    } catch (err) {
      console.error(err);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const statusKey = (s) => {
    const v = String(s || "").toLowerCase();
    return v === "approved" ? "approved" : v === "rejected" ? "rejected" : "pending";
  };

  const statusLabel = (s) => {
    const k = statusKey(s);
    return k === "approved" ? t("approved") : k === "rejected" ? t("rejected") : t("pending");
  };

  const counts = useMemo(() => ({
    all: leaves.length,
    pending: leaves.filter((l) => statusKey(l.status) === "pending").length,
    approved: leaves.filter((l) => statusKey(l.status) === "approved").length,
    rejected: leaves.filter((l) => statusKey(l.status) === "rejected").length,
  }), [leaves]);

  const filtered = useMemo(() => {
    if (filter === "all") return leaves;
    return leaves.filter((l) => statusKey(l.status) === filter);
  }, [leaves, filter]);

  const updateStatus = async (row, newStatus) => {
    try {
      setBusyId(row.docId);
      await updateDoc(doc(db, "leaveRequests", row.docId), {
        status: newStatus,
        reviewedBy: localStorage.getItem("userId"),
        reviewedAt: new Date().toISOString(),
      });
      await logAdminAction("update_leave_request", {
        targetId: row.userId,
        details: t("logUpdatedLeave", { name: row.name, status: newStatus }),
      });
      setLeaves((prev) =>
        prev.map((l) => (l.docId === row.docId ? { ...l, status: newStatus } : l))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  const doDeleteOne = async (row) => {
    try {
      setWorking(true);
      await deleteDoc(doc(db, "leaveRequests", row.docId));
      await logAdminAction("delete_leave_request", {
        targetId: row.userId,
        details: t("logDeletedLeave", { name: row.name }),
      });
      setLeaves((prev) => prev.filter((l) => l.docId !== row.docId));
    } catch (err) {
      console.error(err);
    } finally {
      setWorking(false);
      setConfirm(null);
    }
  };

  const doDeleteAll = async () => {
    try {
      setWorking(true);
      /* Delete what's on screen, not the whole collection — if a filter
         is active the admin means "these", not "everything". */
      await Promise.all(
        filtered.map((l) => deleteDoc(doc(db, "leaveRequests", l.docId)))
      );
      await logAdminAction("delete_leave_request", {
        targetId: "ALL",
        details: t("logDeletedAllLeaves", { count: filtered.length }),
      });
      const removed = new Set(filtered.map((l) => l.docId));
      setLeaves((prev) => prev.filter((l) => !removed.has(l.docId)));
    } catch (err) {
      console.error(err);
    } finally {
      setWorking(false);
      setConfirm(null);
    }
  };

  const getInitials = (name) =>
    name && name !== "—"
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "?";

  const exportCSV = () => {
    if (filtered.length === 0) return;

    const headers = ["ID", "Name", "Leave Type", "Date", "Reason", "Status"];
    const escape = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((l) =>
      [l.userId, l.name, l.leaveType, l.date, l.reason, l.status].map(escape).join(",")
    );

    const csv = "\uFEFF" + [headers.map(escape).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leave_requests_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { key: "all", label: t("all"), icon: icons.users, count: counts.all },
    { key: "pending", label: t("pending"), icon: icons.hourglass, count: counts.pending },
    { key: "approved", label: t("approved"), icon: icons.checkCircle, count: counts.approved },
    { key: "rejected", label: t("rejected"), icon: icons.xMark, count: counts.rejected },
  ];

  return (
    <div className="leaves-container" data-theme={theme}>

      <div className="lvr-blob" />
      <Dots />

      {/* ============================ HEADER ============================ */}
      <div className="lvr-header">
        <button className="lvr-back" onClick={() => navigate("/admin-dashboard")}>
          <span className="lvr-back-icon">{icons.back}</span>
          {t("back")}
        </button>

        <div className="lvr-head-text">
          <img src={logo} alt="" className="lvr-logo" />
          <div className="lvr-head-copy">
            <p className="lvr-eyebrow">{t("appTitle")}</p>
            <h1 className="lvr-title">{t("leavesRequest")}</h1>
          </div>
        </div>
      </div>

      {/* =========================== TOOLBAR ============================ */}
      <div className="lvr-toolbar">
        <div className="lvr-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`lvr-tab lvr-tab--${tab.key} ${filter === tab.key ? "lvr-tab--active" : ""}`}
              onClick={() => setFilter(tab.key)}
            >
              <span className="lvr-tab-icon">{tab.icon}</span>
              {tab.label}
              <span className="lvr-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="lvr-toolbar-actions">
          <button
            className="lvr-tool lvr-tool--export"
            onClick={exportCSV}
            disabled={filtered.length === 0}
          >
            <span className="lvr-btn-icon">{icons.download}</span>
            {t("exportCSV")}
          </button>
          <button
            className="lvr-tool lvr-tool--danger"
            onClick={() => setConfirm({ mode: "all" })}
            disabled={filtered.length === 0}
          >
            <span className="lvr-btn-icon">{icons.trash}</span>
            {t("deleteAll")}
          </button>
        </div>
      </div>

      {/* ============================= LIST ============================= */}
      {loading ? (
        <div className="lvr-state">
          <span className="lvr-spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="lvr-state">
          <span className="lvr-state-icon">{icons.inbox}</span>
          <p className="lvr-state-title">{t("noLeaveRequests")}</p>
        </div>
      ) : (
        <div className="lvr-list">
          {filtered.map((l, index) => {
            const key = statusKey(l.status);
            const busy = busyId === l.docId;
            return (
              <div
                className={`lvr-card lvr-card--${key}`}
                key={l.docId}
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <span className="lvr-card-bar" aria-hidden="true" />

                <span className="lvr-avatar">
                  {getInitials(l.name)}
                  {l.image ? (
                    <img
                      className="lvr-avatar-img"
                      src={l.image}
                      alt={l.name}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : null}
                </span>

                <div className="lvr-card-body">
                  <div className="lvr-card-top">
                    <span className="lvr-name">{l.name}</span>
                    <span className="lvr-type-chip">{l.leaveType}</span>
                    <span className="lvr-date">
                      <span className="lvr-date-icon">{icons.calendar}</span>
                      {l.date}
                    </span>
                  </div>

                  <p className="lvr-id">ID: {l.userId}</p>

                  <div className="lvr-reason-block">
                    <span className="lvr-reason-label">
                      <span className="lvr-reason-icon">{icons.note}</span>
                      {t("reason")}
                    </span>
                    <p className="lvr-reason">{l.reason}</p>
                  </div>
                </div>

                <div className="lvr-card-side">
                  <span className={`lvr-status lvr-status--${key}`}>
                    <span className="lvr-status-icon">
                      {key === "approved" ? icons.check
                        : key === "rejected" ? icons.xMark
                          : icons.hourglass}
                    </span>
                    {statusLabel(l.status)}
                  </span>

                  <div className="lvr-actions">
                    {key === "pending" && (
                      <>
                        <button
                          className="lvr-act lvr-act--approve"
                          onClick={() => updateStatus(l, "Approved")}
                          disabled={busy}
                        >
                          <span className="lvr-btn-icon">{icons.check}</span>
                          {t("approve")}
                        </button>
                        <button
                          className="lvr-act lvr-act--reject"
                          onClick={() => updateStatus(l, "Rejected")}
                          disabled={busy}
                        >
                          <span className="lvr-btn-icon">{icons.xMark}</span>
                          {t("reject")}
                        </button>
                      </>
                    )}
                    <button
                      className="lvr-act lvr-act--delete"
                      onClick={() => setConfirm({ mode: "one", row: l })}
                      disabled={busy}
                      aria-label={t("delete")}
                    >
                      <span className="lvr-btn-icon">{icons.trash}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================== CONFIRM ============================ */}
      {confirm && (
        <div className="lvr-modal-overlay" onClick={() => !working && setConfirm(null)}>
          <div className="lvr-modal" onClick={(e) => e.stopPropagation()}>
            <span className="lvr-modal-icon">{icons.alert}</span>

            <h3>{confirm.mode === "all" ? t("deleteAll") : t("delete")}</h3>
            <p>
              {confirm.mode === "all"
                ? t("deleteAllLeavesConfirm", { count: filtered.length })
                : t("deleteLeaveConfirm", { name: confirm.row?.name })}
            </p>

            <div className="lvr-modal-footer">
              <button
                className="lvr-modal-cancel"
                onClick={() => setConfirm(null)}
                disabled={working}
              >
                {t("cancel")}
              </button>
              <button
                className="lvr-modal-confirm"
                onClick={() => confirm.mode === "all" ? doDeleteAll() : doDeleteOne(confirm.row)}
                disabled={working}
              >
                {working
                  ? <span className="lvr-spinner lvr-spinner--sm" />
                  : <span className="lvr-btn-icon">{icons.trash}</span>}
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeavesRequest;