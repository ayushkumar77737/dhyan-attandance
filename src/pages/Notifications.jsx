import React, { useEffect, useMemo, useState } from "react";
import "./Notifications.css";
import { logAdminAction } from "../utils/logAdminAction";
import { db, auth } from "../firebase/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

/* ------------------------------------------------------------------
 * WHERE THIS DATA COMES FROM
 * ------------------------------------------------------------------
 * Every admin page in this app already calls:
 *   logAdminAction(actionType, { targetId, details })
 * whenever something happens (a leave gets approved, a ticket gets
 * resolved, an account gets locked, an ID gets created, etc). This
 * page reads that same trail back out and renders it as the
 * notification/activity list — nothing new needs to be added to
 * those nine pages, they already log everything.
 *
 * Per utils/logAdminAction.js, each call writes one document to the
 * "adminLogs" collection with exactly these fields:
 *   { adminId, adminName, action, targetId, details, timestamp }
 * (timestamp is a Firestore serverTimestamp()).
 * ------------------------------------------------------------------ */
const COLLECTION_NAME = "adminLogs";

/* Which admin page produced a given action, driven off the exact
   action strings each page already passes into logAdminAction(). */
const ACTION_SOURCE = {
  update_absence_request: "absence",

  update_leave_request: "leave",
  delete_leave_request: "leave",

  update_ticket: "ticket",
  delete_ticket: "ticket",
  export_tickets: "ticket",

  concern_status: "userIssues",
  concern_delete: "userIssues",

  update_issue_status: "adminIssues",
  delete_issue: "adminIssues",

  toggle_status: "toggleStatus",

  id_created: "idCreation",
  id_registrations_exported: "idCreation",

  update_blocked_account: "blocked",
  delete_blocked_account: "blocked",
  delete_all_blocked_accounts: "blocked",

  toggle_admin_lock: "accountLock",
};

const sourceOf = (action) => ACTION_SOURCE[action] || "other";

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
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
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
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
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
  hourglass: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h12" /><path d="M6 22h12" />
      <path d="M7 2v4.5c0 1.5 1.2 2.6 2.6 3.6L12 12l2.4-1.9C15.8 9.1 17 8 17 6.5V2" />
      <path d="M7 22v-4.5c0-1.5 1.2-2.6 2.6-3.6L12 12l2.4 1.9c1.4 1 2.6 2.1 2.6 3.6V22" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2.5" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  ticket: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-5Z" />
    </svg>
  ),
  bug: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2l1.9 2M16 2l-1.9 2" /><rect x="7" y="7" width="10" height="13" rx="5" />
      <path d="M12 7v13M3 13h4M17 13h4M4 19l3.5-2M20 19l-3.5-2M4 8l3.5 2M20 8l-3.5 2" />
    </svg>
  ),
  power: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v8" /><path d="M6.3 6.3a9 9 0 1 0 11.4 0" />
    </svg>
  ),
  idcard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" />
      <path d="M13 12h5" /><path d="M13 16h3" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5 4.5 5.4v5.8c0 4.6 3.1 8.6 7.5 9.8 4.4-1.2 7.5-5.2 7.5-9.8V5.4L12 2.5z" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.6" /><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
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

/* Icon for each source page. Add a new entry here (and to
   ACTION_SOURCE above) any time a new page starts calling
   logAdminAction with a new action string. */
const SOURCE_ICON = {
  absence: icons.hourglass,
  leave: icons.calendar,
  ticket: icons.ticket,
  userIssues: icons.bug,
  adminIssues: icons.bug,
  toggleStatus: icons.power,
  idCreation: icons.idcard,
  blocked: icons.shield,
  accountLock: icons.lock,
  other: icons.activity,
};

/* i18n key for each source's display label — resolved with t()
   inside the component so it follows the active language. */
const SOURCE_LABEL_KEY = {
  absence: "sourceAbsence",
  leave: "sourceLeave",
  ticket: "sourceTicket",
  userIssues: "sourceUserIssues",
  adminIssues: "sourceAdminIssues",
  toggleStatus: "sourceToggleStatus",
  idCreation: "sourceIdCreation",
  blocked: "sourceBlocked",
  accountLock: "sourceAccountLock",
  other: "sourceOther",
};

const SOURCE_ORDER = [
  "absence", "leave", "ticket", "userIssues", "adminIssues",
  "toggleStatus", "idCreation", "blocked", "accountLock", "other",
];

/* createdAt may be a Firestore Timestamp, ISO string or Date. */
const toMs = (v) => {
  if (!v) return 0;
  if (typeof v === "object" && typeof v.toDate === "function") return v.toDate().getTime();
  if (typeof v === "object" && v.seconds) return v.seconds * 1000;
  const p = new Date(v).getTime();
  return Number.isNaN(p) ? 0 : p;
};

const relTime = (ms, t) => {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("alJustNow");
  if (m < 60) return t("alMinutesAgo", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("alHoursAgo", { n: h });
  const d = Math.floor(h / 24);
  if (d < 7) return t("alDaysAgo", { n: d });
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const fmtFull = (ms) => (ms ? new Date(ms).toLocaleString() : "—");

function Notifications() {

  const { t } = useTranslation();
  const navigate = useNavigate();

  const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  const [busyId, setBusyId] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* Translated label + icon per source, rebuilt whenever the active
     language changes. */
  const SOURCE_META = useMemo(() => {
    const meta = {};
    SOURCE_ORDER.forEach((key) => {
      meta[key] = { label: t(SOURCE_LABEL_KEY[key]), icon: SOURCE_ICON[key] };
    });
    return meta;
  }, [t]);

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
      fetchLogs();
    } catch (err) {
      console.error(err);
      navigate("/");
    }
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      /* Mark everything up to right now as "seen" — the AdminDashboard
         bell badge counts adminLogs entries created after this stamp. */
      localStorage.setItem("activityFeedLastSeen", String(Date.now()));
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      const list = [];
      snap.forEach((docItem) => {
        const data = docItem.data();
        const action = data.action || "";
        list.push({
          docId: docItem.id,
          action,
          source: sourceOf(action),
          targetId: data.targetId || "",
          details: data.details || "",
          performedBy: data.adminName || data.adminId || "",
          createdAt: data.timestamp || null,
        });
      });
      list.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
      setLogs(list);
    } catch (err) {
      console.error(err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        l.details.toLowerCase().includes(q) ||
        l.targetId.toLowerCase().includes(q) ||
        l.performedBy.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q)
      );
    });
  }, [logs, search, sourceFilter]);

  const todayCount = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return logs.filter((l) => toMs(l.createdAt) > cutoff).length;
  }, [logs]);

  const messageFor = (l) =>
    l.details ||
    `${l.targetId ? l.targetId + " — " : ""}${(l.action || "activity").replace(/_/g, " ")}`;

  const doDeleteOne = async () => {
    if (!confirmRow) return;
    try {
      setDeleting(true);
      setBusyId(confirmRow.docId);
      await deleteDoc(doc(db, COLLECTION_NAME, confirmRow.docId));
      await logAdminAction("delete_activity_log", {
        targetId: confirmRow.docId,
        details: t("logDeletedActivityLog"),
      });
      setLogs((prev) => prev.filter((l) => l.docId !== confirmRow.docId));
      setConfirmRow(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setBusyId(null);
    }
  };

  const doDeleteAll = async () => {
    try {
      setDeleting(true);
      /* Only what's currently visible — a filtered view means "these",
         not "the whole collection". */
      await Promise.all(
        visible.map((l) => deleteDoc(doc(db, COLLECTION_NAME, l.docId)))
      );
      await logAdminAction("delete_all_activity_logs", {
        targetId: "ALL",
        details: t("logDeletedAllActivityLogs", { count: visible.length }),
      });
      const removed = new Set(visible.map((l) => l.docId));
      setLogs((prev) => prev.filter((l) => !removed.has(l.docId)));
      setConfirmAll(false);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const exportCSV = () => {
    if (visible.length === 0) return;

    const headers = ["Source", "Message", "Performed By", "Target", "Date"];
    const escape = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const rows = visible.map((l) =>
      [
        SOURCE_META[l.source]?.label || l.source,
        messageFor(l),
        l.performedBy,
        l.targetId,
        fmtFull(toMs(l.createdAt)),
      ].map(escape).join(",")
    );

    const csv = "\uFEFF" + [headers.map(escape).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity_${new Date().toISOString().split("T")[0]}.csv`;
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
        <h1 className="ntf-title">{t("activityFeed")}</h1>
        <p className="ntf-subtitle">{t("activityFeedSubtitle")}</p>
      </div>

      {/* ============================ STATS ============================= */}
      <div className="ntf-stats">
        <div className="ntf-stat-card">
          <span className="ntf-stat-num">{loading ? "—" : logs.length}</span>
          <span className="ntf-stat-lbl">{t("total")}</span>
        </div>
        <div className="ntf-stat-card">
          <span className="ntf-stat-num">{loading ? "—" : todayCount}</span>
          <span className="ntf-stat-lbl">{t("alTodayActions")}</span>
        </div>
      </div>

      {/* =========================== TOOLBAR ============================= */}
      <div className="ntf-toolbar">
        <div className="ntf-search-wrap">
          <span className="ntf-search-icon">{icons.search}</span>
          <input
            className="ntf-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("alSearchPlaceholder")}
          />
          {search && (
            <button className="ntf-search-clear" onClick={() => setSearch("")} aria-label={t("clearSearch")}>
              {icons.close}
            </button>
          )}
        </div>

        <select
          className="ntf-select"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="all">{t("allSources")}</option>
          {SOURCE_ORDER.map((key) => (
            <option key={key} value={key}>{SOURCE_META[key].label}</option>
          ))}
        </select>

        <button className="ntf-tool" onClick={fetchLogs} disabled={loading}>
          <span className="ntf-btn-icon">{icons.refresh}</span>
          {t("refresh")}
        </button>

        <button className="ntf-tool" onClick={exportCSV} disabled={visible.length === 0}>
          <span className="ntf-btn-icon">{icons.download}</span>
          {t("exportCSV")}
        </button>

        <button
          className="ntf-tool ntf-tool--danger"
          onClick={() => setConfirmAll(true)}
          disabled={visible.length === 0}
        >
          <span className="ntf-btn-icon">{icons.trash}</span>
          {t("deleteAll")}
        </button>
      </div>

      {/* =========================== LIST HEAD ========================== */}
      <div className="ntf-list-head">
        <h2 className="ntf-list-title">
          {t("recentActivity")}
          <span className="ntf-count">{visible.length}</span>
        </h2>
      </div>

      {/* ============================ TABLE ============================= */}
      <div className="ntf-table">
        <div className="ntf-thead">
          <span>{t("message")}</span>
          <span>{t("source")}</span>
          <span>{t("alTime")}</span>
          <span>{t("actions")}</span>
        </div>

        {loading ? (
          <div className="ntf-state">
            <span className="ntf-spinner ntf-spinner--lg" />
          </div>
        ) : visible.length === 0 ? (
          <div className="ntf-state">
            <span className="ntf-state-icon">{icons.inbox}</span>
            <p className="ntf-state-title">
              {logs.length === 0
                ? t("noNotificationsYet")
                : t("aiNoMatches")}
            </p>
          </div>
        ) : (
          visible.map((l, index) => {
            const meta = SOURCE_META[l.source];
            return (
              <div
                className="ntf-row"
                key={l.docId}
                style={{ animationDelay: `${Math.min(index, 12) * 0.04}s` }}
              >
                <div className="ntf-cell ntf-cell--message">
                  <span className="ntf-bullet" aria-hidden="true" />
                  <span className="ntf-message">{messageFor(l)}</span>
                </div>

                <div className="ntf-cell ntf-cell--source">
                  <span className="ntf-cat-chip">
                    <span className="ntf-cat-chip-icon">{meta.icon}</span>
                    {meta.label}
                  </span>
                </div>

                <div className="ntf-cell ntf-cell--date">
                  <span className="ntf-date-chip" title={fmtFull(toMs(l.createdAt))}>
                    {relTime(toMs(l.createdAt), t)}
                  </span>
                </div>

                <div className="ntf-cell ntf-cell--actions">
                  <button
                    className="ntf-act ntf-act--delete"
                    onClick={() => setConfirmRow(l)}
                    disabled={busyId === l.docId}
                  >
                    <span className="ntf-btn-icon">{icons.trash}</span>
                    {t("delete")}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================= DELETE CONFIRM (single) ================ */}
      {confirmRow && (
        <div className="ntf-modal-overlay" onClick={() => !deleting && setConfirmRow(null)}>
          <div className="ntf-modal ntf-modal--confirm" onClick={(e) => e.stopPropagation()}>
            <span className="ntf-confirm-icon">{icons.alert}</span>
            <h3>{t("delete")}</h3>
            <p>{t("alConfirmDeleteOne")}</p>
            <div className="ntf-modal-footer">
              <button className="ntf-modal-cancel" onClick={() => setConfirmRow(null)} disabled={deleting}>
                {t("cancel")}
              </button>
              <button className="ntf-modal-confirm" onClick={doDeleteOne} disabled={deleting}>
                {deleting ? <span className="ntf-spinner" /> : <span className="ntf-btn-icon">{icons.trash}</span>}
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================= DELETE CONFIRM (all) ==================== */}
      {confirmAll && (
        <div className="ntf-modal-overlay" onClick={() => !deleting && setConfirmAll(false)}>
          <div className="ntf-modal ntf-modal--confirm" onClick={(e) => e.stopPropagation()}>
            <span className="ntf-confirm-icon">{icons.alert}</span>
            <h3>{t("deleteAll")}</h3>
            <p>{t("alConfirmDeleteAll", { count: visible.length })}</p>
            <div className="ntf-modal-footer">
              <button className="ntf-modal-cancel" onClick={() => setConfirmAll(false)} disabled={deleting}>
                {t("cancel")}
              </button>
              <button className="ntf-modal-confirm" onClick={doDeleteAll} disabled={deleting}>
                {deleting ? <span className="ntf-spinner" /> : <span className="ntf-btn-icon">{icons.trash}</span>}
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