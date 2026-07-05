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
                newStatus === "approved" ? `✅ ${t("requestApproved")}` :
                    newStatus === "rejected" ? `❌ ${t("requestRejected")}` : `⏳ ${t("markedAsPending")}`,
                newStatus
            );
        } catch (err) {
            console.error(err);
            showToast(`❌ ${t("errorUpdatingStatus")}`, "error");
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
            showToast(`🗑️ ${t("requestDeleted")}`, "error");
        } catch (err) {
            console.error(err);
            showToast(`❌ ${t("errorDeletingRequest")}`, "error");
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
            showToast(`❌ ${t("nothingToExport") || "Nothing to export"}`, "error");
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
            details:
                t("logExportedIdRequests", { count: filtered.length, filter: filterStatus }) ||
                `Exported ${filtered.length} ${filterStatus} ID requests`,
        });
        showToast(`✅ ${t("requestsExported") || "Exported"}`, "approved");
    };

    const pendingCount = requests.filter((r) => r.status === "pending").length;
    const approvedCount = requests.filter((r) => r.status === "approved").length;
    const rejectedCount = requests.filter((r) => r.status === "rejected").length;

    return (
        <div className="idreq__page" data-theme={theme}>
            <div className="idreq__orb idreq__orb--1" />
            <div className="idreq__orb idreq__orb--2" />
            <div className="idreq__orb idreq__orb--3" />
            <div className="idreq__grid-overlay" />

            {toast && (
                <div className={`idreq__toast idreq__toast--${toast.type}`}>
                    <span className="idreq__toast-dot" />
                    {toast.msg}
                </div>
            )}

            {deleteModal.show && (
                <div className="idreq__modal-overlay">
                    <div className="idreq__modal">
                        <div className="idreq__modal-icon">🗑️</div>
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
                                {t("yesDelete")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button className="idreq__back-btn" onClick={() => navigate("/admin-dashboard")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("back")}
            </button>

            <div className="idreq__header">
                <div className="idreq__eyebrow">
                    <span className="idreq__eyebrow-dot" />
                    <span>{t("adminPanel")}</span>
                </div>
                <h1 className="idreq__title">
                    {t("idRequests")}
                </h1>
                <p className="idreq__subtitle">{t("idRequestsSubtitle")}</p>
            </div>

            <div className="idreq__stats">
                <div className="idreq__stat idreq__stat--total">
                    <div className="idreq__stat-icon-wrap">📋</div>
                    <div className="idreq__stat-body">
                        <span className="idreq__stat-num">{requests.length}</span>
                        <span className="idreq__stat-label">{t("total")}</span>
                    </div>
                    <div className="idreq__stat-glow idreq__stat-glow--blue" />
                </div>
                <div className="idreq__stat idreq__stat--pending">
                    <div className="idreq__stat-icon-wrap">⏳</div>
                    <div className="idreq__stat-body">
                        <span className="idreq__stat-num">{pendingCount}</span>
                        <span className="idreq__stat-label">{t("pending")}</span>
                    </div>
                    <div className="idreq__stat-glow idreq__stat-glow--yellow" />
                </div>
                <div className="idreq__stat idreq__stat--approved">
                    <div className="idreq__stat-icon-wrap">✅</div>
                    <div className="idreq__stat-body">
                        <span className="idreq__stat-num">{approvedCount}</span>
                        <span className="idreq__stat-label">{t("approved")}</span>
                    </div>
                    <div className="idreq__stat-glow idreq__stat-glow--green" />
                </div>
                <div className="idreq__stat idreq__stat--rejected">
                    <div className="idreq__stat-icon-wrap">❌</div>
                    <div className="idreq__stat-body">
                        <span className="idreq__stat-num">{rejectedCount}</span>
                        <span className="idreq__stat-label">{t("rejected")}</span>
                    </div>
                    <div className="idreq__stat-glow idreq__stat-glow--red" />
                </div>
            </div>

            <div className="idreq__controls">
                <div className="idreq__search-wrap">
                    <svg className="idreq__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="idreq__search"
                        type="text"
                        placeholder={t("searchPlaceholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value.slice(0, 50))}
                    />
                    {search && <button className="idreq__search-clear" onClick={() => setSearch("")}>✕</button>}
                </div>
                <div className="idreq__filters">
                    {["all", "pending", "approved", "rejected"].map((f) => (
                        <button
                            key={f}
                            className={`idreq__filter-btn ${filterStatus === f ? `idreq__filter-btn--${f === "all" ? "active" : f}` : ""}`}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {t("export") || "Export"}
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
                    <span className="idreq__empty-icon">📭</span>
                    <p>{t("noRequestsFound")}</p>
                </div>
            )}

            {!loading && filtered.length > 0 && (
                <div className="idreq__table-wrap">
                    <table className="idreq__table">
                        <thead>
                            <tr className="idreq__thead-row">
                                <th>#</th>
                                <th>📱 {t("mobileNumberCol")}</th>
                                <th>🧾 {t("transactionIdCol")}</th>
                                <th>📅 {t("submittedAt")}</th>
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
                                        <span className="idreq__mobile">+91 {req.mobileNumber}</span>
                                    </td>
                                    <td>
                                        <span className="idreq__txn">{req.transactionId}</span>
                                    </td>
                                    <td>
                                        <span className="idreq__date">{formatDate(req.submittedAt)}</span>
                                    </td>
                                    <td>
                                        <span className={`idreq__status-badge idreq__status-badge--${req.status}`}>
                                            {req.status === "pending" ? `⏳ ${t("pending")}` :
                                                req.status === "approved" ? `✅ ${t("approved")}` : `❌ ${t("rejected")}`}
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
                                                    {updatingId === req.docId ? <span className="idreq__act-spinner" /> : t("approve")}
                                                </button>
                                            )}
                                            {req.status !== "rejected" && (
                                                <button
                                                    className="idreq__act-btn idreq__act-btn--reject"
                                                    onClick={() => updateStatus(req.docId, "rejected")}
                                                    disabled={updatingId === req.docId}
                                                >
                                                    {updatingId === req.docId ? <span className="idreq__act-spinner" /> : t("reject")}
                                                </button>
                                            )}
                                            {req.status !== "pending" && (
                                                <button
                                                    className="idreq__act-btn idreq__act-btn--reset"
                                                    onClick={() => updateStatus(req.docId, "pending")}
                                                    disabled={updatingId === req.docId}
                                                >
                                                    {updatingId === req.docId ? <span className="idreq__act-spinner" /> : t("pending")}
                                                </button>
                                            )}
                                            <button
                                                className="idreq__act-btn idreq__act-btn--delete"
                                                onClick={() => setDeleteModal({ show: true, docId: req.docId })}
                                                disabled={updatingId === req.docId}
                                            >
                                                {updatingId === req.docId ? <span className="idreq__act-spinner" /> : t("delete")}
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
    );
}

export default IdRequests;