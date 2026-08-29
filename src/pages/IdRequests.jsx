import React, { useEffect, useState } from "react";
import "./IdRequests.css";
import { logAdminAction } from "../utils/logAdminAction";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    orderBy,
    query,
    getDoc
} from "firebase/firestore";
import { useTranslation } from "react-i18next";

/* ---------------------------------------------------------------- */
/* Inline icons (stroke = currentColor, so they inherit theme color) */
/* ---------------------------------------------------------------- */

const icons = {
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
    ),
    clipboard: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="4" width="14" height="17" rx="2.6" />
            <path d="M9 4.2a1.6 1.6 0 0 1 1.6-1.4h2.8A1.6 1.6 0 0 1 15 4.2v1.3H9V4.2Z" />
            <path d="M9 11h6M9 15h4" />
        </svg>
    ),
    hourglass: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 3h10M7 21h10M8 3v3.5c0 2 4 3.6 4 5.5s-4 3.5-4 5.5V21M16 3v3.5c0 2-4 3.6-4 5.5s4 3.5 4 5.5V21" />
        </svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    checkCircle: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <polyline points="8.2 12.3 10.8 14.9 15.8 9.7" />
        </svg>
    ),
    cross: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
        </svg>
    ),
    search: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.6-3.6" />
        </svg>
    ),
    download: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M4 20h16" />
        </svg>
    ),
    trash: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M9.5 7V4.8A.8.8 0 0 1 10.3 4h3.4a.8.8 0 0 1 .8.8V7" />
            <path d="M6.5 7l.8 12.2a1.8 1.8 0 0 0 1.8 1.8h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
        </svg>
    ),
    user: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8.5" r="3.6" />
            <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
        </svg>
    ),
    phone: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round">
            <rect x="6.5" y="2.5" width="11" height="19" rx="2.6" />
            <path d="M10.5 18.5h3" />
        </svg>
    ),
    receipt: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2.8h12v18.4l-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6L6 21.2V2.8Z" />
            <path d="M9.4 8h5.2M9.4 12h5.2" />
        </svg>
    ),
    calendar: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4.5" width="18" height="17" rx="3" />
            <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
        </svg>
    ),
    inbox: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 13.5h4l1.5 2.5h6l1.5-2.5h4" />
            <path d="M5.6 4.5h12.8l2.1 9v4.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2v-4.5l2.1-9Z" />
        </svg>
    ),
    shield: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l8 3.4v5.9c0 4.8-3.3 9.2-8 10.4-4.7-1.2-8-5.6-8-10.4V6.4L12 3Z" />
            <path d="M9 12.2l2.2 2.2 4-4.2" />
        </svg>
    ),
};

/* Status → icon + toast tone, in one place. */
const statusMeta = {
    pending: { icon: icons.hourglass, tone: "pending" },
    approved: { icon: icons.checkCircle, tone: "approved" },
    rejected: { icon: icons.cross, tone: "rejected" },
};

function IdRequests() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [requests, setRequests] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [updatingId, setUpdatingId] = useState(null);
    const [toast, setToast] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, docId: null });
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

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

            if (
                userData.role !== "admin" ||
                userData.uid !== auth.currentUser.uid
            ) {
                navigate("/");
                return;
            }

            fetchRequests();

        } catch (error) {
            console.error(error);
            navigate("/");
        }
    };

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
        checkAdmin();
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    useEffect(() => {
        let result = requests;
        if (filterStatus !== "all") result = result.filter((r) => r.status === filterStatus);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (r) => String(r.mobileNumber || "").includes(q) || r.transactionId?.toLowerCase().includes(q)
            );
        }
        setFiltered(result);
    }, [search, filterStatus, requests]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, "idRequests"), orderBy("submittedAt", "desc"));
            const snap = await getDocs(q);
            const data = [];
            snap.forEach((d) => data.push({ docId: d.id, ...d.data() }));
            setRequests(data);
            setFiltered(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (docId, newStatus) => {
        try {
            setUpdatingId(docId);
            if (
                newStatus !== "pending" &&
                newStatus !== "approved" &&
                newStatus !== "rejected"
            ) {
                return;
            }
            await updateDoc(doc(db, "idRequests", docId), { status: newStatus });
            await logAdminAction("update_id_request", {
                targetId: docId,
                details: t("logUpdatedIdRequest", { status: newStatus }),
            });
            setRequests((prev) =>
                prev.map((r) => r.docId === docId ? { ...r, status: newStatus } : r)
            );
            showToast(
                newStatus === "approved" ? t("requestApproved") :
                    newStatus === "rejected" ? t("requestRejected") : t("markedAsPending"),
                newStatus
            );
        } catch (err) {
            console.error(err);
            showToast(t("errorUpdatingStatus"), "error");
        } finally {
            setUpdatingId(null);
        }
    };

    const deleteRequest = async () => {
        if (!deleteModal.docId) {
            return;
        }
        const docId = deleteModal.docId;
        setDeleteModal({ show: false, docId: null });
        try {
            setUpdatingId(docId);
            await deleteDoc(doc(db, "idRequests", docId));
            await logAdminAction("delete_id_request", {
                targetId: docId,
                details: t("logDeletedIdRequest"),
            });
            setRequests((prev) => prev.filter((r) => r.docId !== docId));
            showToast(t("requestDeleted"), "rejected");
        } catch (err) {
            console.error(err);
            showToast(t("errorDeletingRequest"), "error");
        } finally {
            setUpdatingId(null);
        }
    };

    const showToast = (msg, type) => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const formatDate = (ts) => {
        if (!ts) return "—";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    const exportCSV = () => {
        if (filtered.length === 0) {
            showToast(t("nothingToExport"), "error");
            return;
        }

        const headers = ["Mobile Number", "Transaction ID", "Submitted At", "Status"];
        const escape = (val) => `"${(val ?? "").toString().replace(/"/g, '""')}"`;

        const rows = filtered.map((r) =>
            [
                `+91 ${r.mobileNumber || ""}`,
                r.transactionId,
                formatDate(r.submittedAt),
                r.status,
            ].map(escape).join(",")
        );

        const csv = [headers.map(escape).join(","), ...rows].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `id-requests-${filterStatus}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        logAdminAction("export_id_requests", {
            details: t("logExportedIdRequests", { count: filtered.length, filter: filterStatus }),
        });
        showToast(t("requestsExported"), "approved");
    };

    const pendingCount = requests.filter((r) => r.status === "pending").length;
    const approvedCount = requests.filter((r) => r.status === "approved").length;
    const rejectedCount = requests.filter((r) => r.status === "rejected").length;

    const statusLabel = (s) =>
        s === "pending" ? t("pending") : s === "approved" ? t("approved") : t("rejected");

    return (
        <div className="idreq__page" data-theme={theme}>

            <div className="idreq__blob idreq__blob--1" />
            <div className="idreq__blob idreq__blob--2" />
            <div className="idreq__dots" />
            <div className="idreq__grid-overlay" />

            {toast && (
                <div className={`idreq__toast idreq__toast--${toast.type}`}>
                    <span className="idreq__toast-dot" />
                    {toast.msg}
                </div>
            )}

            {deleteModal.show && (
                <div
                    className="idreq__modal-overlay"
                    onClick={() => setDeleteModal({ show: false, docId: null })}
                >
                    <div className="idreq__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="idreq__modal-icon">{icons.trash}</div>
                        <h3 className="idreq__modal-title">{t("deleteRequestTitle")}</h3>
                        <p className="idreq__modal-msg">{t("deleteRequestMsg")}</p>
                        <div className="idreq__modal-actions">
                            <button
                                className="idreq__modal-btn idreq__modal-btn--cancel"
                                onClick={() => setDeleteModal({ show: false, docId: null })}
                            >
                                {t("cancel")}
                            </button>
                            <button
                                className="idreq__modal-btn idreq__modal-btn--confirm"
                                onClick={deleteRequest}
                            >
                                {icons.trash} {t("yesDelete")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button className="idreq__back-btn" onClick={() => navigate("/admin-dashboard")}>
                {icons.back} {t("back")}
            </button>

            <div className="idreq__shell">

                <div className="idreq__header">
                    <div className="idreq__header-text">
                        <div className="idreq__eyebrow">
                            <span className="idreq__eyebrow-dot" />
                            <span>{t("adminPanel")}</span>
                        </div>
                        <h1 className="idreq__title">{t("idRequests")}</h1>
                        <p className="idreq__subtitle">{t("idRequestsSubtitle")}</p>
                    </div>

                    <div className="idreq__header-art" aria-hidden="true">
                        <span className="idreq__art-halo" />
                        <span className="idreq__art-board">{icons.clipboard}</span>
                        <span className="idreq__art-shield">{icons.shield}</span>
                    </div>
                </div>

                <div className="idreq__stats">
                    <div className="idreq__stat idreq__stat--total">
                        <span className="idreq__stat-icon-wrap">{icons.clipboard}</span>
                        <span className="idreq__stat-body">
                            <span className="idreq__stat-num">{requests.length}</span>
                            <span className="idreq__stat-label">{t("total")}</span>
                        </span>
                    </div>
                    <div className="idreq__stat idreq__stat--pending">
                        <span className="idreq__stat-icon-wrap">{icons.hourglass}</span>
                        <span className="idreq__stat-body">
                            <span className="idreq__stat-num">{pendingCount}</span>
                            <span className="idreq__stat-label">{t("pending")}</span>
                        </span>
                    </div>
                    <div className="idreq__stat idreq__stat--approved">
                        <span className="idreq__stat-icon-wrap">{icons.check}</span>
                        <span className="idreq__stat-body">
                            <span className="idreq__stat-num">{approvedCount}</span>
                            <span className="idreq__stat-label">{t("approved")}</span>
                        </span>
                    </div>
                    <div className="idreq__stat idreq__stat--rejected">
                        <span className="idreq__stat-icon-wrap">{icons.cross}</span>
                        <span className="idreq__stat-body">
                            <span className="idreq__stat-num">{rejectedCount}</span>
                            <span className="idreq__stat-label">{t("rejected")}</span>
                        </span>
                    </div>
                </div>

                <div className="idreq__controls">
                    <div className="idreq__search-wrap">
                        <span className="idreq__search-icon">{icons.search}</span>
                        <input
                            className="idreq__search"
                            type="text"
                            inputMode="numeric"
                            maxLength={12}
                            placeholder={t("searchPlaceholder")}
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value.replace(/\D/g, "").slice(0, 12))
                            }
                            onKeyDown={(e) => {
                                const allowedKeys = [
                                    "Backspace", "Delete", "ArrowLeft", "ArrowRight",
                                    "ArrowUp", "ArrowDown", "Tab", "Home", "End"
                                ];
                                if (
                                    !allowedKeys.includes(e.key) &&
                                    !/^[0-9]$/.test(e.key) &&
                                    !(e.ctrlKey || e.metaKey)
                                ) {
                                    e.preventDefault();
                                }
                            }}
                            onPaste={(e) => {
                                e.preventDefault();
                                const digitsOnly = e.clipboardData.getData("text").replace(/\D/g, "");
                                setSearch((prev) => (prev + digitsOnly).slice(0, 12));
                            }}
                        />
                        {search && (
                            <button
                                className="idreq__search-clear"
                                onClick={() => setSearch("")}
                                aria-label={t("clearSearch")}
                            >
                                {icons.cross}
                            </button>
                        )}
                    </div>

                    <div className="idreq__filters">
                        {["all", "pending", "approved", "rejected"].map((f) => (
                            <button
                                key={f}
                                className={`idreq__filter-btn idreq__filter-btn--${f} ${filterStatus === f ? "is-active" : ""}`}
                                onClick={() => setFilterStatus(f)}
                            >
                                {f === "all" ? t("all") : t(f)}
                            </button>
                        ))}
                    </div>

                    <button
                        className="idreq__export-btn"
                        onClick={exportCSV}
                        disabled={loading || filtered.length === 0}
                    >
                        {icons.download} {t("exportCsv")}
                    </button>
                </div>

                <p className="idreq__count">
                    {t("showingOf")} <span>{filtered.length}</span> {t("of")} <span>{requests.length}</span> {t("requests")}
                </p>

                {loading && (
                    <div className="idreq__loading">
                        <div className="idreq__loader">
                            <div className="idreq__loader-ring" />
                            <div className="idreq__loader-ring idreq__loader-ring--2" />
                            <div className="idreq__loader-core" />
                        </div>
                        <p>{t("loadingRequests")}</p>
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="idreq__empty">
                        <span className="idreq__empty-icon">{icons.inbox}</span>
                        <p>{t("noRequestsFound")}</p>
                    </div>
                )}

                {!loading && filtered.length > 0 && (
                    <div className="idreq__table-wrap">
                        <table className="idreq__table">
                            <thead>
                                <tr className="idreq__thead-row">
                                    <th>{t("alHash")}</th>
                                    <th>
                                        <span className="idreq__th-inner">
                                            {icons.phone} {t("mobileNumberCol")}
                                        </span>
                                    </th>
                                    <th>
                                        <span className="idreq__th-inner">
                                            {icons.receipt} {t("transactionIdCol")}
                                        </span>
                                    </th>
                                    <th>
                                        <span className="idreq__th-inner">
                                            {icons.calendar} {t("submittedAt")}
                                        </span>
                                    </th>
                                    <th>{t("status")}</th>
                                    <th>{t("actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((req, index) => (
                                    <tr
                                        key={req.docId}
                                        className={`idreq__row idreq__row--${req.status}`}
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <td className="idreq__td-num">{index + 1}</td>
                                        <td>
                                            <div className="idreq__mobile-cell">
                                                <span className="idreq__mobile-avatar">{icons.user}</span>
                                                <span className="idreq__mobile">+91 {req.mobileNumber}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="idreq__txn">{req.transactionId}</span>
                                        </td>
                                        <td>
                                            <span className="idreq__date">{formatDate(req.submittedAt)}</span>
                                        </td>
                                        <td>
                                            <span className={`idreq__status-badge idreq__status-badge--${req.status}`}>
                                                <span className="idreq__badge-ico">
                                                    {statusMeta[req.status]?.icon}
                                                </span>
                                                {statusLabel(req.status)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="idreq__action-group">
                                                {req.status !== "approved" && (
                                                    <button
                                                        className="idreq__act-btn idreq__act-btn--approve"
                                                        onClick={() => updateStatus(req.docId, "approved")}
                                                        disabled={updatingId === req.docId}
                                                    >
                                                        {updatingId === req.docId
                                                            ? <span className="idreq__act-spinner" />
                                                            : <>{icons.checkCircle} {t("approve")}</>}
                                                    </button>
                                                )}
                                                {req.status !== "rejected" && (
                                                    <button
                                                        className="idreq__act-btn idreq__act-btn--reject"
                                                        onClick={() => updateStatus(req.docId, "rejected")}
                                                        disabled={updatingId === req.docId}
                                                    >
                                                        {updatingId === req.docId
                                                            ? <span className="idreq__act-spinner" />
                                                            : <>{icons.cross} {t("reject")}</>}
                                                    </button>
                                                )}
                                                {req.status !== "pending" && (
                                                    <button
                                                        className="idreq__act-btn idreq__act-btn--reset"
                                                        onClick={() => updateStatus(req.docId, "pending")}
                                                        disabled={updatingId === req.docId}
                                                    >
                                                        {updatingId === req.docId
                                                            ? <span className="idreq__act-spinner" />
                                                            : <>{icons.hourglass} {t("pending")}</>}
                                                    </button>
                                                )}
                                                <button
                                                    className="idreq__act-btn idreq__act-btn--delete"
                                                    onClick={() => setDeleteModal({ show: true, docId: req.docId })}
                                                    disabled={updatingId === req.docId}
                                                >
                                                    {updatingId === req.docId
                                                        ? <span className="idreq__act-spinner" />
                                                        : <>{icons.trash} {t("delete")}</>}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>
        </div>
    );
}

export default IdRequests;