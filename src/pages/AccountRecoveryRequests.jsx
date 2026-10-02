import React, { useEffect, useRef, useState } from "react";
import "./AccountRecoveryRequests.css";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    writeBatch,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import { logAdminAction } from "../utils/logAdminAction";

const COLLECTION = "accountRecoveryRequests";
const EMAIL_LOCKS = "arqEmails";   /* one lock doc per submitted email (doc id = email) */
const PHONE_LOCKS = "arqPhones";   /* one lock doc per submitted phone (doc id = phone) */

/* the only statuses a request can have — new requests start as "pending" */
const STATUSES = ["pending", "in_progress", "solved"];

const normalizeStatus = (s) => {
    const v = String(s || "pending").toLowerCase().trim().replace(/[\s-]+/g, "_");
    return STATUSES.includes(v) ? v : "pending";
};

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */
const sv = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
};

const icons = {
    back: (<svg {...sv} strokeWidth="2.2"><polyline points="15 18 9 12 15 6" /></svg>),
    key: (
        <svg {...sv}>
            <circle cx="8" cy="15" r="4" />
            <path d="M10.85 12.15 19 4" /><path d="m18 5 3 3" /><path d="m15 8 3 3" />
        </svg>
    ),
    list: (
        <svg {...sv}>
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
    ),
    clock: (<svg {...sv}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>),
    progress: (
        <svg {...sv}>
            <path d="M21 12a9 9 0 1 1-6.22-8.56" /><polyline points="21 3 21 9 15 9" />
        </svg>
    ),
    check: (
        <svg {...sv}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    search: (<svg {...sv}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>),
    close: (<svg {...sv}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>),
    trash: (
        <svg {...sv}>
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
        </svg>
    ),
    download: (
        <svg {...sv}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    ),
};

const statusIcon = { pending: icons.clock, in_progress: icons.progress, solved: icons.check };

/* animates a number from its previous value to the new one */
function CountUp({ value }) {
    const [n, setN] = useState(0);
    const prev = useRef(0);

    useEffect(() => {
        const from = prev.current;
        const dur = 700;
        let start = null;
        let raf;
        const step = (ts) => {
            if (start === null) start = ts;
            const p = Math.min((ts - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setN(Math.round(from + (value - from) * eased));
            if (p < 1) raf = requestAnimationFrame(step);
            else prev.current = value;
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [value]);

    return <>{n}</>;
}

function AccountRecoveryRequests() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [selected, setSelected] = useState([]);
    const [deleteTarget, setDeleteTarget] = useState(null); // "all" | "selected" | docId
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [updatingId, setUpdatingId] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const statusLabel = (s) =>
        s === "in_progress"
            ? t("arqInProgress", "In Progress")
            : s === "solved"
                ? t("arqSolved", "Solved")
                : t("arqPending", "Pending");

    /* same protections as the other admin pages */
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

    /* ---------- fetch ---------- */
    const fetchRequests = async () => {
        setLoading(true);
        setErrorMsg("");
        try {
            const snap = await getDocs(collection(db, COLLECTION));
            const list = [];
            snap.forEach((d) => {
                const data = d.data();
                list.push({ id: d.id, ...data, status: normalizeStatus(data.status) });
            });
            list.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
            setRequests(list);
        } catch (err) {
            console.error(err);
            setErrorMsg(t("arqLoadFailed", "Could not load the requests. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ---------- change status ---------- */
    const changeStatus = async (req, newStatus) => {
        if (newStatus === req.status) return;
        setUpdatingId(req.id);
        setErrorMsg("");
        try {
            await updateDoc(doc(db, COLLECTION, req.id), { status: newStatus });
            setRequests((prev) =>
                prev.map((r) => (r.id === req.id ? { ...r, status: newStatus } : r))
            );
            await logAdminAction("UPDATE_ACCOUNT_RECOVERY_STATUS", {
                targetId: req.id,
                details: `Account recovery ${req.id}: ${req.status} -> ${newStatus}`,
            });
        } catch (err) {
            console.error(err);
            setErrorMsg(t("arqUpdateFailed", "Could not update the status. Please try again."));
        } finally {
            setUpdatingId("");
        }
    };

    /* ---------- delete ---------- */
    const deleteIds = async (ids) => {
        // each request removes up to 3 docs (request + email lock + phone lock),
        // and Firestore allows max 500 writes per batch -> 150 requests per batch
        const CHUNK = 150;
        for (let i = 0; i < ids.length; i += CHUNK) {
            const batch = writeBatch(db);
            ids.slice(i, i + CHUNK).forEach((id) => {
                batch.delete(doc(db, COLLECTION, id));
                const req = requests.find((r) => r.id === id);
                const email = (req?.email || "").trim().toLowerCase();
                const phone = (req?.phone || "").replace(/\D/g, "");
                // free the email / phone so the person can submit again
                if (email) batch.delete(doc(db, EMAIL_LOCKS, email));
                if (phone) batch.delete(doc(db, PHONE_LOCKS, phone));
            });
            await batch.commit();
        }
        setRequests((prev) => prev.filter((r) => !ids.includes(r.id)));
        setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    };

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        setErrorMsg("");
        try {
            if (deleteTarget === "all") {
                const ids = filtered.map((r) => r.id);
                await deleteIds(ids);
                await logAdminAction("DELETE_ACCOUNT_RECOVERY_BULK", {
                    details: `Deleted ${ids.length} account recovery requests`,
                });
            } else if (deleteTarget === "selected") {
                const ids = [...selected];
                await deleteIds(ids);
                await logAdminAction("DELETE_ACCOUNT_RECOVERY_BULK", {
                    details: `Deleted ${ids.length} selected account recovery requests`,
                });
            } else if (deleteTarget) {
                await deleteIds([deleteTarget]);
                await logAdminAction("DELETE_ACCOUNT_RECOVERY", {
                    targetId: deleteTarget,
                    details: `Deleted account recovery request ${deleteTarget}`,
                });
            }
        } catch (err) {
            console.error(err);
            setErrorMsg(t("arqDeleteFailed", "Could not delete. Please try again."));
        } finally {
            setDeleting(false);
            setConfirmOpen(false);
            setDeleteTarget(null);
        }
    };

    /* ---------- select ---------- */
    const toggleSelect = (id) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

    /* ---------- filter + search ---------- */
    const q = search.trim().toLowerCase();
    const filtered = requests.filter((r) => {
        const okFilter = filter === "all" || r.status === filter;
        const okSearch =
            !q ||
            (r.idNo || r.id || "").toLowerCase().includes(q) ||
            (r.email || "").toLowerCase().includes(q) ||
            (r.phone || "").toLowerCase().includes(q);
        return okFilter && okSearch;
    });

    const allSelected =
        filtered.length > 0 && filtered.every((r) => selected.includes(r.id));

    const toggleSelectAll = () => {
        if (allSelected) setSelected((prev) => prev.filter((id) => !filtered.some((r) => r.id === id)));
        else setSelected((prev) => [...new Set([...prev, ...filtered.map((r) => r.id)])]);
    };

    const count = (s) => requests.filter((r) => r.status === s).length;

    const formatDate = (ts) => (ts?.seconds ? new Date(ts.seconds * 1000).toLocaleString() : "—");

    /* ---------- export (selected rows if any, otherwise the filtered list) ---------- */
    const exportList = selected.length > 0
        ? requests.filter((r) => selected.includes(r.id))
        : filtered;

    const handleExport = () => {
        if (exportList.length === 0) return;
        const rows = exportList.map((r, i) => ({
            "S.No": i + 1,
            "ID No": r.idNo || r.id,
            "Mail ID": r.email || "",
            "Phone Number": r.phone || "",
            "Status": statusLabel(r.status),
            "Submitted On": formatDate(r.createdAt),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [{ wch: 6 }, { wch: 10 }, { wch: 34 }, { wch: 16 }, { wch: 14 }, { wch: 24 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Account Recovery");
        XLSX.writeFile(wb, `account_recovery_requests_${new Date().toISOString().split("T")[0]}.xlsx`);
        logAdminAction("EXPORT_ACCOUNT_RECOVERY", {
            details: `Exported ${rows.length} account recovery requests`,
        });
    };

    const confirmTitle =
        deleteTarget === "all"
            ? t("arqConfirmDeleteAll", "Delete all these requests?")
            : deleteTarget === "selected"
                ? t("arqConfirmDeleteSelected", "Delete the selected requests?")
                : t("arqConfirmDeleteOne", "Delete this request?");

    const confirmCount =
        deleteTarget === "all" ? filtered.length : deleteTarget === "selected" ? selected.length : 1;

    return (
        <div className="arq-shell" data-theme={theme}>

            {/* ==================== TOPBAR ==================== */}
            <div className="arq-topbar">
                <div className="arq-topbar-left">
                    <button className="arq-back-btn" onClick={() => navigate("/admin-dashboard")}>
                        <span className="arq-back-icon">{icons.back}</span>
                        <span>{t("back", "Back")}</span>
                    </button>
                    <div className="arq-title-group">
                        <div className="arq-title-icon">{icons.key}</div>
                        <div>
                            <p className="arq-title-label">{t("adminDashboard", "Admin Dashboard")}</p>
                            <h1 className="arq-title">{t("accountRecoveryRequests", "Account Recovery Requests")}</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="arq-content">

                {/* ==================== STATS ==================== */}
                <div className="arq-stats">
                    <div className="arq-stat arq-stat-total">
                        <div className="arq-stat-top">
                            <span className="arq-stat-val"><CountUp value={requests.length} /></span>
                            <span className="arq-stat-icon">{icons.list}</span>
                        </div>
                        <span className="arq-stat-label">{t("arqTotal", "Total Requests")}</span>
                    </div>
                    {STATUSES.map((s) => (
                        <div className={`arq-stat arq-stat-${s}`} key={s}>
                            <div className="arq-stat-top">
                                <span className="arq-stat-val"><CountUp value={count(s)} /></span>
                                <span className="arq-stat-icon">{statusIcon[s]}</span>
                            </div>
                            <span className="arq-stat-label">{statusLabel(s)}</span>
                        </div>
                    ))}
                </div>

                {/* ==================== TOOLBAR ==================== */}
                <div className="arq-toolbar">
                    <div className="arq-search-wrap">
                        <span className="arq-search-icon">{icons.search}</span>
                        <input
                            className="arq-search"
                            type="text"
                            placeholder={t("arqSearch", "Search by ID No, Mail ID or Phone…")}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button className="arq-search-clear" onClick={() => setSearch("")}>
                                {icons.close}
                            </button>
                        )}
                    </div>

                    <div className="arq-filters">
                        {["all", ...STATUSES].map((f) => (
                            <button
                                key={f}
                                className={`arq-filter-btn ${filter === f ? "active" : ""}`}
                                onClick={() => setFilter(f)}
                            >
                                {f === "all" ? t("all", "All") : statusLabel(f)}
                            </button>
                        ))}
                    </div>

                    <div className="arq-actions">
                        <button
                            className="arq-btn arq-btn-export"
                            onClick={handleExport}
                            disabled={exportList.length === 0}
                        >
                            {icons.download}
                            {t("arqExport", "Export")} ({exportList.length})
                        </button>
                        {selected.length > 0 && (
                            <button
                                className="arq-btn arq-btn-danger"
                                onClick={() => { setDeleteTarget("selected"); setConfirmOpen(true); }}
                            >
                                {icons.trash}
                                {t("deleteSelected", "Delete Selected")} ({selected.length})
                            </button>
                        )}
                        {filtered.length > 0 && (
                            <button
                                className="arq-btn arq-btn-danger-outline"
                                onClick={() => { setDeleteTarget("all"); setConfirmOpen(true); }}
                            >
                                {icons.trash}
                                {t("deleteAll", "Delete All")}
                            </button>
                        )}
                    </div>
                </div>

                {errorMsg && <div className="arq-error">{errorMsg}</div>}

                {/* ==================== TABLE ==================== */}
                {loading ? (
                    <div className="arq-loading">
                        <div className="arq-spinner" />
                        <p>{t("loading", "Loading…")}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="arq-empty">
                        <div className="arq-empty-icon">{icons.key}</div>
                        <p className="arq-empty-title">{t("arqNone", "No requests found")}</p>
                        <p className="arq-empty-sub">
                            {t("arqNoneSub", "Account recovery requests submitted from the login page will appear here")}
                        </p>
                    </div>
                ) : (
                    <div className="arq-card">
                        <div className="arq-table-wrap">
                            <table className="arq-table">
                                <thead>
                                    <tr>
                                        <th className="arq-th-check">
                                            <input
                                                type="checkbox"
                                                className="arq-checkbox"
                                                checked={allSelected}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th>#</th>
                                        <th>{t("arIdLabel", "ID No")}</th>
                                        <th>{t("arEmailLabel", "Mail ID")}</th>
                                        <th>{t("arPhoneLabel", "Phone Number")}</th>
                                        <th>{t("arqSubmittedOn", "Submitted On")}</th>
                                        <th>{t("status", "Status")}</th>
                                        <th>{t("actions", "Actions")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((r, i) => (
                                        <tr
                                            key={r.id}
                                            className={`arq-row ${selected.includes(r.id) ? "arq-row-selected" : ""}`}
                                            style={{ animationDelay: `${Math.min(i, 12) * 55}ms` }}
                                        >
                                            <td className="arq-td-check">
                                                <input
                                                    type="checkbox"
                                                    className="arq-checkbox"
                                                    checked={selected.includes(r.id)}
                                                    onChange={() => toggleSelect(r.id)}
                                                />
                                            </td>
                                            <td className="arq-muted">{i + 1}</td>
                                            <td><span className="arq-id">{r.idNo || r.id}</span></td>
                                            <td className="arq-email">{r.email || "—"}</td>
                                            <td className="arq-phone">{r.phone || "—"}</td>
                                            <td className="arq-muted">{formatDate(r.createdAt)}</td>
                                            <td>
                                                <select
                                                    className={`arq-status-select arq-status-${r.status}`}
                                                    value={r.status}
                                                    disabled={updatingId === r.id}
                                                    onChange={(e) => changeStatus(r, e.target.value)}
                                                >
                                                    {STATUSES.map((s) => (
                                                        <option key={s} value={s}>{statusLabel(s)}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <button
                                                    className="arq-icon-btn"
                                                    title={t("delete", "Delete")}
                                                    onClick={() => { setDeleteTarget(r.id); setConfirmOpen(true); }}
                                                >
                                                    {icons.trash}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <p className="arq-result-count">
                            {t("showing", "Showing")} {filtered.length} {t("of", "of")} {requests.length}{" "}
                            {t("arqRequests", "requests")}
                            {selected.length > 0 && ` · ${selected.length} ${t("selected", "selected")}`}
                        </p>
                    </div>
                )}
            </div>

            {/* ==================== CONFIRM DELETE ==================== */}
            {confirmOpen && createPortal(
                <div
                    className="arq-overlay arq-shell"
                    data-theme={theme}
                    onClick={() => !deleting && setConfirmOpen(false)}
                >
                    <div className="arq-confirm" onClick={(e) => e.stopPropagation()}>
                        <div className="arq-confirm-icon">{icons.trash}</div>
                        <h3 className="arq-confirm-title">{confirmTitle}</h3>
                        <p className="arq-confirm-sub">
                            {confirmCount} {t("arqRequests", "requests")}.{" "}
                            {t("confirmDeleteSub", "This action cannot be undone.")}
                        </p>
                        <div className="arq-confirm-btns">
                            <button
                                className="arq-btn arq-btn-danger"
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                            >
                                {deleting ? t("pleaseWait", "Please wait...") : t("yesDelete", "Yes, Delete")}
                            </button>
                            <button
                                className="arq-btn arq-btn-secondary"
                                onClick={() => setConfirmOpen(false)}
                                disabled={deleting}
                            >
                                {t("cancel", "Cancel")}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default AccountRecoveryRequests;