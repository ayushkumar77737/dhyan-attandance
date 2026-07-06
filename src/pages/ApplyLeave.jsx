import React, { useEffect, useState } from "react";
import "./ApplyLeave.css";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    query,
    where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAutoLogout from "../hooks/useAutoLogout";
import logo from "../assets/logo2.png";
import favicon from "../assets/favicon.png";

const LEAVE_TYPES = [
    { code: "CL", key: "casualLeave", fallback: "Casual Leave" },
    { code: "SL", key: "sickLeave", fallback: "Sick Leave" },
    { code: "PL", key: "privilegeLeave", fallback: "Privilege Leave" },
];

function ApplyLeave() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    useAutoLogout();

    const [userId, setUserId] = useState("");
    const [userName, setUserName] = useState("");

    const [leaveType, setLeaveType] = useState("");
    const [leaveDate, setLeaveDate] = useState("");
    const [reason, setReason] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null); // { type: "success" | "error", msg }

    const [requests, setRequests] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const today = new Date().toISOString().split("T")[0];

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
            if (!user || !user.email) {
                navigate("/");
                return;
            }
            const id = String(user.email.split("@")[0] || "").toUpperCase();

            try {
                const userSnap = await getDoc(doc(db, "users", id));
                if (!userSnap.exists()) {
                    navigate("/");
                    return;
                }
                const userData = userSnap.data();

                // Admins shouldn't access user pages — bounce to admin dashboard
                if (userData.role === "admin" && userData.uid === auth.currentUser.uid) {
                    navigate("/admin-dashboard");
                    return;
                }

                setUserId(id);
                setUserName(userData.name || id);
                fetchRequests(id);
            } catch (err) {
                console.log(err);
                navigate("/");
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchRequests = async (id) => {
        try {
            setLoadingList(true);
            const qy = query(collection(db, "leaveRequests"), where("userId", "==", id));
            const snap = await getDocs(qy);
            const list = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
            // newest first (sorted client-side to avoid composite index)
            list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setRequests(list);
        } catch (err) {
            console.log("Fetch leave requests error:", err);
            setRequests([]);
        } finally {
            setLoadingList(false);
        }
    };

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSubmit = async () => {
        if (!leaveType) {
            showToast("error", t("selectLeaveTypeError") || "Please select a leave type");
            return;
        }
        if (!leaveDate) {
            showToast("error", t("selectDateError") || "Please select a date");
            return;
        }
        if (!reason.trim()) {
            showToast("error", t("enterReasonError") || "Please enter a reason");
            return;
        }
        if (reason.trim().length < 5) {
            showToast("error", t("reasonTooShort"));
            return;
        }

        try {
            setSubmitting(true);

            const checkQuery = query(
                collection(db, "leaveRequests"),
                where("userId", "==", userId),
                where("date", "==", leaveDate)
            );

            const checkSnap = await getDocs(checkQuery);

            if (!checkSnap.empty) {
                showToast("error", t("leaveAlreadyApplied"));
                setSubmitting(false);
                return;
            }

            await addDoc(collection(db, "leaveRequests"), {
                userId,
                userName,
                leaveType,
                date: leaveDate,
                reason: reason.trim(),
                status: "Pending",
                createdAt: new Date().toISOString(),
            });

            showToast("success", t("leaveSubmitted") || "Leave request submitted");
            setLeaveType("");
            setLeaveDate("");
            setReason("");
            fetchRequests(userId);
        } catch (err) {
            console.log("Submit leave error:", err);
            showToast("error", t("submitFailed") || "Submission failed. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const typeLabel = (code) => {
        const lt = LEAVE_TYPES.find((x) => x.code === code);
        return lt ? `${t(lt.key) || lt.fallback} (${lt.code})` : code;
    };

    const statusClass = (status) => {
        const s = (status || "").toLowerCase();
        if (s === "approved") return "aplv-badge aplv-badge-approved";
        if (s === "rejected") return "aplv-badge aplv-badge-rejected";
        return "aplv-badge aplv-badge-pending";
    };

    const statusLabel = (status) => {
        const s = (status || "").toLowerCase();
        if (s === "approved") return `✓ ${t("approved") || "Approved"}`;
        if (s === "rejected") return `✗ ${t("rejected") || "Rejected"}`;
        return `⏳ ${t("pending") || "Pending"}`;
    };

    return (
        <div className="aplv-container" data-theme={theme}>
            {toast && (
                <div className={`aplv-toast aplv-toast-${toast.type}`}>{toast.msg}</div>
            )}

            <div className="aplv-topbar">
                <div className="aplv-topbar-left">
                    <button className="aplv-back-btn" onClick={() => navigate(-1)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                        {t("back") || "Back"}
                    </button>
                    <img src={logo} alt="Logo" className="aplv-logo" />
                </div>
                <img src={favicon} alt="" className="aplv-favicon" />
            </div>

            <div className="aplv-body">
                <div className="aplv-head">
                    <h1 className="aplv-title">{t("applyLeave") || "Apply Leave"}</h1>
                    <p className="aplv-subtitle">
                        {t("applyLeaveSub") || "Submit a leave request for approval"}
                    </p>
                </div>

                {/* ===== FORM ===== */}
                <div className="aplv-card">
                    {/* Leave Type */}
                    <div className="aplv-field">
                        <label className="aplv-label">{t("leaveType") || "Leave Type"}</label>
                        <div className="aplv-type-grid">
                            {LEAVE_TYPES.map((lt) => (
                                <button
                                    key={lt.code}
                                    type="button"
                                    className={`aplv-type-btn ${leaveType === lt.code ? "aplv-type-active" : ""}`}
                                    onClick={() => setLeaveType(lt.code)}
                                >
                                    <span className="aplv-type-code">{lt.code}</span>
                                    <span className="aplv-type-name">{t(lt.key) || lt.fallback}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date */}
                    <div className="aplv-field">
                        <label className="aplv-label">{t("selectDate") || "Select Date"}</label>
                        <input
                            type="date"
                            className="aplv-date"
                            value={leaveDate}
                            min={today}
                            onChange={(e) => setLeaveDate(e.target.value)}
                        />
                    </div>

                    {/* Reason */}
                    <div className="aplv-field">
                        <label className="aplv-label">{t("reason") || "Reason"}</label>
                        <textarea
                            className="aplv-textarea"
                            rows={4}
                            placeholder={t("reasonPlaceholder") || "Briefly describe the reason for your leave..."}
                            value={reason}
                            onChange={(e) => setReason(e.target.value.replace(/[<>]/g, ""))}
                            maxLength={500}
                        />
                        <span className="aplv-char-count">{reason.length}/500</span>
                    </div>

                    <button
                        className="aplv-submit"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <span className="aplv-spinner" />
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                                {t("submitRequest") || "Submit Request"}
                            </>
                        )}
                    </button>
                </div>

                {/* ===== STATUS / SUBMITTED LIST ===== */}
                <div className="aplv-section">
                    <div className="aplv-section-header">
                        <span className="aplv-section-title">
                            {t("myLeaveRequests") || "My Leave Requests"}
                        </span>
                    </div>

                    {loadingList ? (
                        <div className="aplv-list-loading">
                            <span className="aplv-spinner aplv-spinner-teal" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="aplv-empty">
                            <span>📭</span>
                            {t("noLeaveRequests") || "No leave requests yet"}
                        </div>
                    ) : (
                        <div className="aplv-list">
                            {requests.map((r) => (
                                <div className="aplv-req-card" key={r.id}>
                                    <div className="aplv-req-left">
                                        <span className="aplv-req-type">{typeLabel(r.leaveType)}</span>
                                        <span className="aplv-req-date">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                <line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                            {r.date}
                                        </span>
                                        {r.reason && <span className="aplv-req-reason">{r.reason}</span>}
                                    </div>
                                    <span className={statusClass(r.status)}>
                                        {statusLabel(r.status)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ApplyLeave;