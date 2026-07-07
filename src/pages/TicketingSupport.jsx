import React, { useEffect, useState } from "react";
import "./TicketingSupport.css";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    doc,
    updateDoc,
    getDoc
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { logUserAction } from "../utils/logUserAction";

function TicketingSupport() {

    const { t } = useTranslation();
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState(null);
    const [loggedInId, setLoggedInId] = useState("");
    const [tickets, setTickets] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const [form, setForm] = useState({
        name: "",
        idNo: "",
        email: "",
        issue: ""
    });

    const [errors, setErrors] = useState({});

    const [showEditModal, setShowEditModal] = useState(false);
    const [editTicket, setEditTicket] = useState(null);
    const [editIssue, setEditIssue] = useState("");

    const fetchTickets = async (userId) => {
        try {
            if (!auth.currentUser?.uid) {
                return;
            }
            const q = query(
                collection(db, "tickets"),
                where("userId", "==", auth.currentUser.uid)
            );
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString()
            }));
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setTickets(list);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && user.email) {

                setCurrentUser(user);

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

                setLoggedInId(id);

                fetchTickets(id);

            } else {
                navigate("/");
            }
        });
        return () => unsubscribe();
    }, []);

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

    const showMsg = (text, type = "error") => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!form.name.trim()) {
            newErrors.name = t("nameRequired");
        } else if (!/^[a-zA-Z\s]+$/.test(form.name)) {
            newErrors.name = t("nameLettersOnly");
        }

        if (!form.idNo.trim()) {
            newErrors.idNo = t("idRequired");
        } else if (!/^[a-zA-Z]\d{3}$/.test(form.idNo)) {
            newErrors.idNo = t("idFormat");
        } else if (form.idNo.trim().toUpperCase() !== loggedInId) {
            newErrors.idNo = t("idMismatch");
        }

        if (!form.email.trim()) {
            newErrors.email = t("emailRequired");
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
        ) {
            newErrors.email = t("emailInvalid");
        }

        if (!form.issue.trim()) {
            newErrors.issue = t("issueRequired");
        }
        else if (form.issue.trim().length > 1000) {
            newErrors.issue = t("issueTooLong");
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
        if (errors[name]) setErrors({ ...errors, [name]: "" });
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const ticketData = {
                name: form.name.trim(),
                idNo: form.idNo.trim().toUpperCase(),
                email: form.email.trim(),
                issue: form.issue.trim(),
                userId: auth.currentUser.uid,
                status: "Pending",
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "tickets"), ticketData);
            await logUserAction("raise_ticket", { details: t("uaRaiseTicketDetail", { issue: form.issue.trim() }) });
            const id = form.idNo.trim().toUpperCase();
            setForm({ name: "", idNo: "", email: "", issue: "" });
            setShowModal(false);
            showMsg(t("ticketSubmitted"), "success");

            setTimeout(() => fetchTickets(id), 1000);

        } catch (error) {
            console.error(error);
            showMsg(t("errorSubmittingTicket"));
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (ticket) => {
        setEditTicket(ticket);
        setEditIssue(ticket.issue);
        setShowEditModal(true);
    };

    const saveEditTicket = async () => {
        if (
            !editTicket ||
            !editTicket.id ||
            !editIssue.trim()
        ) {
            return;
        }
        try {
            if (editIssue.trim().length > 1000) {
                return;
            }
            await updateDoc(doc(db, "tickets", editTicket.id), {
                issue: editIssue.trim()
            });
            setShowEditModal(false);
            setEditTicket(null);
            fetchTickets(loggedInId);
            showMsg(t("ticketSubmitted"), "success");
        } catch (error) {
            console.error(error);
            showMsg(t("errorSubmittingTicket"));
        }
    };

    return (
        <div className="tsp__page" data-theme={theme}>

            <div className="tsp__orb tsp__orb--1" />
            <div className="tsp__orb tsp__orb--2" />
            <div className="tsp__orb tsp__orb--3" />

            <div className="tsp__grid-overlay" />

            <button className="tsp__back-btn" onClick={() => navigate("/user-dashboard")}>
                <span>←</span> {t("back")}
            </button>

            <div className="tsp__hero">
                <div className="tsp__hero-badge">
                    <span className="tsp__badge-dot" />
                    {t("supportCenter")}
                </div>
                <h1 className="tsp__hero-title">
                    {t("ticketingSupport")}
                </h1>
                <p className="tsp__hero-sub">{t("submitAndTrack")}</p>
            </div>

            <div className="tsp__action-bar">
                <div className="tsp__stats-row">
                    <div className="tsp__stat-item">
                        <span className="tsp__stat-num">{tickets.length}</span>
                        <span className="tsp__stat-label">{t("total")}</span>
                    </div>
                    <div className="tsp__stat-divider" />
                    <div className="tsp__stat-item">
                        <span className="tsp__stat-num tsp__stat--pending">
                            {tickets.filter(tk => tk.status === "Pending").length}
                        </span>
                        <span className="tsp__stat-label">{t("pending")}</span>
                    </div>
                    <div className="tsp__stat-divider" />
                    <div className="tsp__stat-item">
                        <span className="tsp__stat-num tsp__stat--inprogress">
                            {tickets.filter(tk => tk.status === "In Progress").length}
                        </span>
                        <span className="tsp__stat-label">In Progress</span>
                    </div>
                    <div className="tsp__stat-divider" />
                    <div className="tsp__stat-item">
                        <span className="tsp__stat-num tsp__stat--resolved">
                            {tickets.filter(tk => tk.status === "Resolved").length}
                        </span>
                        <span className="tsp__stat-label">{t("resolved")}</span>
                    </div>
                </div>

                <button className="tsp__raise-btn" onClick={() => setShowModal(true)}>
                    <span className="tsp__raise-icon">+</span>
                    {t("raiseTicket")}
                </button>
            </div>

            {message.text && (
                <div className={`tsp__message tsp__message--${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="tsp__list">
                {tickets.length === 0 ? (
                    <div className="tsp__empty">
                        <div className="tsp__empty-icon-wrap">
                            <span className="tsp__empty-icon">🎫</span>
                        </div>
                        <h3 className="tsp__empty-title">{t("noTicketsYet")}</h3>
                        <p className="tsp__empty-sub">{t("noTicketsSub")}</p>
                    </div>
                ) : (
                    tickets.map((ticket, index) => (
                        <div
                            key={ticket.id}
                            className="tsp__ticket-card"
                            style={{ animationDelay: `${index * 0.06}s` }}
                        >
                            <div className="tsp__ticket-left-bar" />

                            <div className="tsp__ticket-body">
                                <div className="tsp__ticket-row">
                                    <div className="tsp__ticket-meta">
                                        <span className="tsp__ticket-id-chip">{ticket.idNo}</span>
                                        <span className="tsp__ticket-name">{ticket.name}</span>
                                    </div>
                                    <span className={`tsp__ticket-status tsp__ticket-status--${ticket.status.toLowerCase().replace(" ", "")}`}>
                                        {ticket.status === "Pending" && "⏳ "}
                                        {ticket.status === "In Progress" && "🔄 "}
                                        {ticket.status === "Resolved" && "✅ "}
                                        {ticket.status === "Pending" && t("pending")}
                                        {ticket.status === "In Progress" && "In Progress"}
                                        {ticket.status === "Resolved" && t("resolved")}
                                    </span>
                                </div>

                                <p className="tsp__ticket-issue">{ticket.issue}</p>

                                <div className="tsp__ticket-footer">
                                    <span className="tsp__ticket-email">📧 {ticket.email}</span>
                                    <span className="tsp__ticket-date">
                                        📅 {new Date(ticket.createdAt).toLocaleDateString()}
                                    </span>
                                    {ticket.status === "Pending" && (
                                        <button
                                            className="tsp__edit-btn"
                                            onClick={() => openEditModal(ticket)}
                                        >
                                            ✎ {t("edit")}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showEditModal && editTicket && (
                <div className="tsp__modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="tsp__modal" onClick={(e) => e.stopPropagation()}>

                        <div className="tsp__modal-top-stripe" />

                        <div className="tsp__modal-header">
                            <div className="tsp__modal-title-wrap">
                                <span className="tsp__modal-emoji">✎</span>
                                <h3 className="tsp__modal-title">{t("edit")} Ticket</h3>
                            </div>
                            <button className="tsp__modal-close" onClick={() => setShowEditModal(false)}>✕</button>
                        </div>

                        <div className="tsp__field">
                            <label className="tsp__field-label">{t("idNo")}</label>
                            <input
                                className="tsp__field-input"
                                type="text"
                                value={editTicket.idNo}
                                disabled
                            />
                        </div>

                        <div className="tsp__field">
                            <label className="tsp__field-label">{t("issue")}</label>
                            <textarea
                                className="tsp__field-textarea"
                                value={editIssue}
                                onChange={(e) => setEditIssue(e.target.value)}
                                placeholder={t("issuePlaceholder")}
                            />
                        </div>

                        <div className="tsp__modal-footer">
                            <button className="tsp__modal-cancel-btn" onClick={() => setShowEditModal(false)}>
                                {t("cancel")}
                            </button>
                            <button className="tsp__modal-submit-btn" onClick={saveEditTicket}>
                                💾 {t("save")}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {showModal && (
                <div className="tsp__modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="tsp__modal" onClick={(e) => e.stopPropagation()}>

                        <div className="tsp__modal-top-stripe" />

                        <div className="tsp__modal-header">
                            <div className="tsp__modal-title-wrap">
                                <span className="tsp__modal-emoji">🎫</span>
                                <h3 className="tsp__modal-title">{t("raiseATicket")}</h3>
                            </div>
                            <button className="tsp__modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className="tsp__field">
                            <label className="tsp__field-label">{t("fullName")}</label>
                            <input
                                className={`tsp__field-input ${errors.name ? "tsp__field-input--error" : ""}`}
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder={t("enterFullName")}
                            />
                            {errors.name && <span className="tsp__field-error">{errors.name}</span>}
                        </div>

                        <div className="tsp__field">
                            <label className="tsp__field-label">{t("idNo")}</label>
                            <input
                                className={`tsp__field-input ${errors.idNo ? "tsp__field-input--error" : ""}`}
                                type="text"
                                name="idNo"
                                value={form.idNo}
                                onChange={handleChange}
                                placeholder={t("enterIdNo")}
                                maxLength={4}
                            />
                            {errors.idNo && <span className="tsp__field-error">{errors.idNo}</span>}
                        </div>

                        <div className="tsp__field">
                            <label className="tsp__field-label">{t("email")}</label>
                            <input
                                className={`tsp__field-input ${errors.email ? "tsp__field-input--error" : ""}`}
                                type="text"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder={t("enterEmail")}
                            />
                            {errors.email && <span className="tsp__field-error">{errors.email}</span>}
                        </div>

                        <div className="tsp__field">
                            <label className="tsp__field-label">{t("issue")}</label>
                            <textarea
                                className={`tsp__field-textarea ${errors.issue ? "tsp__field-input--error" : ""}`}
                                name="issue"
                                value={form.issue}
                                onChange={handleChange}
                                placeholder={t("issuePlaceholder")}
                            />
                            {errors.issue && <span className="tsp__field-error">{errors.issue}</span>}
                        </div>

                        <div className="tsp__modal-footer">
                            <button className="tsp__modal-cancel-btn" onClick={() => setShowModal(false)}>
                                {t("cancel")}
                            </button>
                            <button
                                className="tsp__modal-submit-btn"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? `⏳ ${t("submitting")}` : `🚀 ${t("submitTicket")}`}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default TicketingSupport;