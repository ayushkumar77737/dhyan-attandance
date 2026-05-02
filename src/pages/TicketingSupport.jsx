import React, { useEffect, useState } from "react";
import "./TicketingSupport.css";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore"; // ← removed orderBy
import { useTranslation } from "react-i18next";

function TicketingSupport() {

    const { t } = useTranslation();
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    const [form, setForm] = useState({
        name: "",
        idNo: "",
        email: "",
        issue: ""
    });

    const [errors, setErrors] = useState({});

    // ← FIXED: removed orderBy, sort locally instead
    const fetchTickets = async (userId) => {
        try {
            const q = query(
                collection(db, "tickets"),
                where("idNo", "==", userId)
            );
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString()
            }));
            // Sort locally newest first
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setTickets(list);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
                const id = user.email.split("@")[0].toUpperCase();
                fetchTickets(id);
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
            newErrors.name = "Name is required";
        } else if (!/^[a-zA-Z\s]+$/.test(form.name)) {
            newErrors.name = "Name must contain only letters";
        }

        if (!form.idNo.trim()) {
            newErrors.idNo = "ID No is required";
        } else if (!/^[a-zA-Z]\d{3}$/.test(form.idNo)) {
            newErrors.idNo = "ID must be 1 letter + 3 numbers (e.g. A101)";
        }

        if (!form.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[a-zA-Z0-9@.]+$/.test(form.email) || !form.email.includes("@")) {
            newErrors.email = "Enter a valid email (no special characters)";
        }

        if (!form.issue.trim()) {
            newErrors.issue = "Issue is required";
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
                status: "Pending",
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "tickets"), ticketData);

            const id = form.idNo.trim().toUpperCase(); // ← save id before clearing form
            setForm({ name: "", idNo: "", email: "", issue: "" });
            setShowModal(false);
            showMsg("✅ Ticket submitted successfully!", "success");

            // ← FIXED: wait 1 second then refresh so serverTimestamp is ready
            setTimeout(() => fetchTickets(id), 1000);

        } catch (error) {
            console.error(error);
            showMsg("❌ Error submitting ticket");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tsp__page">

            {/* Orbs */}
            <div className="tsp__orb tsp__orb--1" />
            <div className="tsp__orb tsp__orb--2" />
            <div className="tsp__orb tsp__orb--3" />

            {/* Grid overlay */}
            <div className="tsp__grid-overlay" />

            {/* Back Button */}
            <button className="tsp__back-btn" onClick={() => navigate("/user-dashboard")}>
                <span>←</span> {t("back")}
            </button>

            {/* Hero Header */}
            <div className="tsp__hero">
                <div className="tsp__hero-badge">
                    <span className="tsp__badge-dot" />
                    Support Center
                </div>
                <h1 className="tsp__hero-title">
                    Ticketing
                    <span className="tsp__hero-accent"> Support</span>
                </h1>
                <p className="tsp__hero-sub">Submit and track your support requests in real time</p>
            </div>

            {/* Stats + Raise Button Bar */}
            <div className="tsp__action-bar">
                <div className="tsp__stats-row">
                    <div className="tsp__stat-item">
                        <span className="tsp__stat-num">{tickets.length}</span>
                        <span className="tsp__stat-label">Total</span>
                    </div>
                    <div className="tsp__stat-divider" />
                    <div className="tsp__stat-item">
                        <span className="tsp__stat-num tsp__stat--pending">
                            {tickets.filter(t => t.status === "Pending").length}
                        </span>
                        <span className="tsp__stat-label">Pending</span>
                    </div>
                    <div className="tsp__stat-divider" />
                    <div className="tsp__stat-item">
                        <span className="tsp__stat-num tsp__stat--resolved">
                            {tickets.filter(t => t.status === "Resolved").length}
                        </span>
                        <span className="tsp__stat-label">Resolved</span>
                    </div>
                </div>

                <button className="tsp__raise-btn" onClick={() => setShowModal(true)}>
                    <span className="tsp__raise-icon">+</span>
                    Raise Ticket
                </button>
            </div>

            {/* Message */}
            {message.text && (
                <div className={`tsp__message tsp__message--${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Tickets List */}
            <div className="tsp__list">
                {tickets.length === 0 ? (
                    <div className="tsp__empty">
                        <div className="tsp__empty-icon-wrap">
                            <span className="tsp__empty-icon">🎫</span>
                        </div>
                        <h3 className="tsp__empty-title">No Tickets Yet</h3>
                        <p className="tsp__empty-sub">Click "Raise Ticket" to submit your first support request</p>
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
                                    <span className={`tsp__ticket-status tsp__ticket-status--${ticket.status.toLowerCase()}`}>
                                        {ticket.status === "Pending" ? "⏳" : "✅"} {ticket.status}
                                    </span>
                                </div>

                                <p className="tsp__ticket-issue">{ticket.issue}</p>

                                <div className="tsp__ticket-footer">
                                    <span className="tsp__ticket-email">📧 {ticket.email}</span>
                                    <span className="tsp__ticket-date">
                                        📅 {new Date(ticket.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Raise Ticket Modal */}
            {showModal && (
                <div className="tsp__modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="tsp__modal" onClick={(e) => e.stopPropagation()}>

                        <div className="tsp__modal-top-stripe" />

                        <div className="tsp__modal-header">
                            <div className="tsp__modal-title-wrap">
                                <span className="tsp__modal-emoji">🎫</span>
                                <h3 className="tsp__modal-title">Raise a Ticket</h3>
                            </div>
                            <button className="tsp__modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        {/* Name */}
                        <div className="tsp__field">
                            <label className="tsp__field-label">Full Name</label>
                            <input
                                className={`tsp__field-input ${errors.name ? "tsp__field-input--error" : ""}`}
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                            />
                            {errors.name && <span className="tsp__field-error">{errors.name}</span>}
                        </div>

                        {/* ID No */}
                        <div className="tsp__field">
                            <label className="tsp__field-label">ID No</label>
                            <input
                                className={`tsp__field-input ${errors.idNo ? "tsp__field-input--error" : ""}`}
                                type="text"
                                name="idNo"
                                value={form.idNo}
                                onChange={handleChange}
                                placeholder="e.g. A101"
                                maxLength={4}
                            />
                            {errors.idNo && <span className="tsp__field-error">{errors.idNo}</span>}
                        </div>

                        {/* Email */}
                        <div className="tsp__field">
                            <label className="tsp__field-label">Email</label>
                            <input
                                className={`tsp__field-input ${errors.email ? "tsp__field-input--error" : ""}`}
                                type="text"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                            />
                            {errors.email && <span className="tsp__field-error">{errors.email}</span>}
                        </div>

                        {/* Issue */}
                        <div className="tsp__field">
                            <label className="tsp__field-label">Issue</label>
                            <textarea
                                className={`tsp__field-textarea ${errors.issue ? "tsp__field-input--error" : ""}`}
                                name="issue"
                                value={form.issue}
                                onChange={handleChange}
                                placeholder="Describe your issue clearly..."
                            />
                            {errors.issue && <span className="tsp__field-error">{errors.issue}</span>}
                        </div>

                        <div className="tsp__modal-footer">
                            <button className="tsp__modal-cancel-btn" onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="tsp__modal-submit-btn"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? "⏳ Submitting..." : "🚀 Submit Ticket"}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default TicketingSupport;