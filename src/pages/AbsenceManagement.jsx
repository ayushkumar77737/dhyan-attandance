import React, { useEffect, useMemo, useState } from "react";
import "./AbsenceManagement.css";
import { logAdminAction } from "../utils/logAdminAction";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

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
    checkSquare: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    xMark: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
        </svg>
    ),
    sheet: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9.5" y1="12.5" x2="14.5" y2="17.5" /><line x1="14.5" y1="12.5" x2="9.5" y2="17.5" />
        </svg>
    ),
    calendar: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2.5" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
    pencil: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    ),
    inbox: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
    ),
    close: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    user: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    ),
    save: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
        </svg>
    ),
};

/* Decorative dotted grids used in the page corners */
const Dots = ({ className }) => (
    <svg className={`abm-dots ${className}`} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {[...Array(8)].map((_, r) =>
            [...Array(8)].map((_, c) => (
                <circle key={`${r}-${c}`} cx={7 + c * 15} cy={7 + r * 15} r="3" fill="currentColor" />
            ))
        )}
    </svg>
);

/* Soft rising curve washing the lower-right of each stat card */
const StatWave = () => (
    <svg className="abm-stat-wave" viewBox="0 0 300 90" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M0 76C60 74 104 62 148 48C192 34 232 24 300 20V90H0V76Z" fill="currentColor" />
    </svg>
);

function AbsenceManagement() {

    const { t } = useTranslation();
    const navigate = useNavigate();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const [editRow, setEditRow] = useState(null);
    const [editStatus, setEditStatus] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);

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
            fetchRequests();
        } catch (err) {
            console.error(err);
            navigate("/");
        }
    };

    useEffect(() => {
        checkAdmin();
    }, []);

    const fetchRequests = async () => {
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
                console.warn("AbsenceManagement: could not load profile images —", e);
            }

            /* Names may not be stored on the request itself, so build a
               userId → name lookup from the users collection too. */
            const nameMap = {};
            try {
                const usersSnap = await getDocs(collection(db, "users"));
                usersSnap.forEach((u) => {
                    const ud = u.data();
                    const key = String(ud.id || u.id).toUpperCase();
                    if (ud.name) nameMap[key] = ud.name;
                });
            } catch (e) {
                console.warn("AbsenceManagement: could not load user names —", e);
            }

            const snap = await getDocs(collection(db, "absenceRequests"));
            const list = [];
            snap.forEach((docItem) => {
                const data = docItem.data();
                const uid = String(data.userId || "").toUpperCase();
                list.push({
                    docId: docItem.id,
                    userId: uid,
                    name: data.name || nameMap[uid] || uid || "—",
                    date: data.date || "—",
                    reason: data.reason || "—",
                    status: data.status || "Pending",
                    image: imageMap[uid] || "",
                });
            });

            /* Pending first — those are the ones needing action — then by
               date descending within each group. */
            const rank = { pending: 0, approved: 1, rejected: 2 };
            list.sort((a, b) => {
                const ra = rank[String(a.status).toLowerCase()] ?? 3;
                const rb = rank[String(b.status).toLowerCase()] ?? 3;
                if (ra !== rb) return ra - rb;
                return String(b.date).localeCompare(String(a.date));
            });

            setRequests(list);
        } catch (err) {
            console.error(err);
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const norm = (s) => String(s || "").toLowerCase();
        return {
            total: requests.length,
            pending: requests.filter((r) => norm(r.status) === "pending").length,
            approved: requests.filter((r) => norm(r.status) === "approved").length,
            rejected: requests.filter((r) => norm(r.status) === "rejected").length,
        };
    }, [requests]);

    const updateStatus = async (row, newStatus) => {
        try {
            setBusyId(row.docId);
            await updateDoc(doc(db, "absenceRequests", row.docId), {
                status: newStatus,
                reviewedBy: localStorage.getItem("userId"),
                reviewedAt: new Date().toISOString(),
            });
            await logAdminAction("update_absence_request", {
                targetId: row.userId,
                details: t("logUpdatedAbsence", { name: row.name, status: newStatus }),
            });
            setRequests((prev) =>
                prev.map((r) => (r.docId === row.docId ? { ...r, status: newStatus } : r))
            );
        } catch (err) {
            console.error(err);
        } finally {
            setBusyId(null);
        }
    };

    const openEdit = (row) => {
        setEditRow(row);
        setEditStatus(row.status);
    };

    const saveEdit = async () => {
        if (!editRow || !editStatus) return;
        setSavingEdit(true);
        await updateStatus(editRow, editStatus);
        setSavingEdit(false);
        setEditRow(null);
    };

    const getInitials = (name) =>
        name && name !== "—"
            ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
            : "?";

    const statusKey = (s) => {
        const v = String(s || "").toLowerCase();
        return v === "approved" ? "approved" : v === "rejected" ? "rejected" : "pending";
    };

    const statusLabel = (s) => {
        const k = statusKey(s);
        return k === "approved" ? t("approved") : k === "rejected" ? t("rejected") : t("pending");
    };

    const statusIcon = (s) => {
        const k = statusKey(s);
        return k === "approved" ? icons.checkSquare : k === "rejected" ? icons.xMark : icons.hourglass;
    };

    const exportToExcel = () => {
        if (requests.length === 0) return;
        const data = requests.map((r) => ({
            "ID No": r.userId,
            Name: r.name,
            Date: r.date,
            Reason: r.reason,
            Status: r.status,
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "AbsenceRequests");
        const date = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `absence_requests_${date}.xlsx`);
    };

    return (
        <div className="absence-container" data-theme={theme}>

            <div className="abm-blob abm-blob--1" />
            <div className="abm-blob abm-blob--2" />
            <Dots className="abm-dots--tr" />
            <Dots className="abm-dots--bl" />

            <button className="abm-back" onClick={() => navigate("/admin-dashboard")}>
                <span className="abm-back-icon">{icons.back}</span>
                {t("back")}
            </button>

            {/* ============================ HEADER ============================ */}
            <div className="abm-head">
                <span className="abm-eyebrow">{t("adminPanel")}</span>
                <h1 className="abm-title">{t("absenceManagement")}</h1>
                <p className="abm-subtitle">
                    {t("absenceSubtitle") || "Review and manage all user absence requests"}
                </p>
            </div>

            {/* ============================ STATS ============================= */}
            <div className="abm-stats">
                <div className="abm-stat abm-stat--total">
                    <span className="abm-stat-icon">{icons.users}</span>
                    <div className="abm-stat-body">
                        <span className="abm-stat-label">{t("total") || "Total"}</span>
                        <span className="abm-stat-num">{loading ? "—" : stats.total}</span>
                    </div>
                    <StatWave />
                </div>

                <div className="abm-stat abm-stat--pending">
                    <span className="abm-stat-icon">{icons.hourglass}</span>
                    <div className="abm-stat-body">
                        <span className="abm-stat-label">{t("pending")}</span>
                        <span className="abm-stat-num">{loading ? "—" : stats.pending}</span>
                    </div>
                    <StatWave />
                </div>

                <div className="abm-stat abm-stat--approved">
                    <span className="abm-stat-icon">{icons.checkSquare}</span>
                    <div className="abm-stat-body">
                        <span className="abm-stat-label">{t("approved")}</span>
                        <span className="abm-stat-num">{loading ? "—" : stats.approved}</span>
                    </div>
                    <StatWave />
                </div>

                <div className="abm-stat abm-stat--rejected">
                    <span className="abm-stat-icon">{icons.xMark}</span>
                    <div className="abm-stat-body">
                        <span className="abm-stat-label">{t("rejected")}</span>
                        <span className="abm-stat-num">{loading ? "—" : stats.rejected}</span>
                    </div>
                    <StatWave />
                </div>
            </div>

            {/* ============================ PANEL ============================= */}
            <div className="abm-panel">

                <div className="abm-panel-top">
                    <span className="abm-records">
                        {requests.length} {t("records")}
                    </span>
                    <button
                        className="abm-export"
                        onClick={exportToExcel}
                        disabled={requests.length === 0}
                    >
                        <span className="abm-btn-icon">{icons.sheet}</span>
                        {t("exportExcel")}
                    </button>
                </div>

                <div className="abm-table">
                    <div className="abm-thead">
                        <span>{t("idNo") || "ID No"}</span>
                        <span>{t("name")}</span>
                        <span>{t("date")}</span>
                        <span>{t("reason")}</span>
                        <span>{t("status")}</span>
                        <span>{t("actions")}</span>
                    </div>

                    {loading ? (
                        <div className="abm-state">
                            <span className="abm-spinner" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="abm-state">
                            <span className="abm-state-icon">{icons.inbox}</span>
                            <p className="abm-state-title">
                                {t("noRecordsFound") || "No records found"}
                            </p>
                        </div>
                    ) : (
                        requests.map((r, index) => {
                            const key = statusKey(r.status);
                            const busy = busyId === r.docId;
                            return (
                                <div
                                    className="abm-row"
                                    key={r.docId}
                                    style={{ animationDelay: `${index * 0.04}s` }}
                                >
                                    <div className="abm-cell abm-cell--id">
                                        <span className="abm-id-chip">{r.userId}</span>
                                    </div>

                                    <div className="abm-cell abm-cell--name">
                                        <span className="abm-avatar">
                                            {getInitials(r.name)}
                                            {r.image ? (
                                                <img
                                                    className="abm-avatar-img"
                                                    src={r.image}
                                                    alt={r.name}
                                                    loading="lazy"
                                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                                />
                                            ) : null}
                                        </span>
                                        <span className="abm-name">{r.name}</span>
                                    </div>

                                    <div className="abm-cell abm-cell--date">
                                        <span className="abm-date-chip">
                                            <span className="abm-date-icon">{icons.calendar}</span>
                                            {r.date}
                                        </span>
                                    </div>

                                    <div className="abm-cell abm-cell--reason">
                                        <span className="abm-reason" title={r.reason}>{r.reason}</span>
                                    </div>

                                    <div className="abm-cell abm-cell--status">
                                        <span className={`abm-status abm-status--${key}`}>
                                            <span className="abm-status-icon">{statusIcon(r.status)}</span>
                                            {statusLabel(r.status)}
                                        </span>
                                    </div>

                                    <div className="abm-cell abm-cell--actions">
                                        {key === "pending" ? (
                                            <>
                                                <button
                                                    className="abm-act abm-act--approve"
                                                    onClick={() => updateStatus(r, "Approved")}
                                                    disabled={busy}
                                                >
                                                    <span className="abm-btn-icon">{icons.checkSquare}</span>
                                                    {t("approve")}
                                                </button>
                                                <button
                                                    className="abm-act abm-act--reject"
                                                    onClick={() => updateStatus(r, "Rejected")}
                                                    disabled={busy}
                                                >
                                                    <span className="abm-btn-icon">{icons.xMark}</span>
                                                    {t("reject")}
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                className="abm-act abm-act--edit"
                                                onClick={() => openEdit(r)}
                                                disabled={busy}
                                            >
                                                <span className="abm-btn-icon">{icons.pencil}</span>
                                                {t("edit")}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ============================ MODAL ============================= */}
            {editRow && (
                <div className="abm-modal-overlay" onClick={() => setEditRow(null)}>
                    <div className="abm-modal" onClick={(e) => e.stopPropagation()}>

                        <div className="abm-modal-head">
                            <span className="abm-modal-icon">{icons.pencil}</span>
                            <h3>{t("edit")}</h3>
                            <button
                                className="abm-modal-close"
                                onClick={() => setEditRow(null)}
                                aria-label={t("close")}
                            >
                                {icons.close}
                            </button>
                        </div>

                        <div className="abm-modal-info">
                            <p>
                                <span className="abm-modal-info-icon">{icons.user}</span>
                                {editRow.name} ({editRow.userId})
                            </p>
                            <p>
                                <span className="abm-modal-info-icon">{icons.calendar}</span>
                                {editRow.date}
                            </p>
                        </div>

                        <p className="abm-modal-label">{t("status")}</p>

                        <div className="abm-modal-options">
                            <button
                                className={`abm-opt abm-opt--approve ${editStatus === "Approved" ? "abm-opt--active" : ""}`}
                                onClick={() => setEditStatus("Approved")}
                            >
                                <span className="abm-btn-icon">{icons.checkSquare}</span>
                                {t("approved")}
                            </button>
                            <button
                                className={`abm-opt abm-opt--reject ${editStatus === "Rejected" ? "abm-opt--active" : ""}`}
                                onClick={() => setEditStatus("Rejected")}
                            >
                                <span className="abm-btn-icon">{icons.xMark}</span>
                                {t("rejected")}
                            </button>
                        </div>

                        <div className="abm-modal-footer">
                            <button
                                className="abm-modal-cancel"
                                onClick={() => setEditRow(null)}
                                disabled={savingEdit}
                            >
                                {t("cancel")}
                            </button>
                            <button
                                className="abm-modal-save"
                                onClick={saveEdit}
                                disabled={savingEdit}
                            >
                                {savingEdit
                                    ? <span className="abm-spinner abm-spinner--sm" />
                                    : <span className="abm-btn-icon">{icons.save}</span>}
                                {t("save")}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

export default AbsenceManagement;