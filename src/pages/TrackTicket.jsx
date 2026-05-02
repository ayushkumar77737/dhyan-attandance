import React, { useEffect, useState } from "react";
import "./TrackTicket.css";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

function TrackTicket() {

    const { t } = useTranslation();
    const navigate = useNavigate();

    const [selectedDate, setSelectedDate] = useState("");
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    useEffect(() => {
        const today = new Date().toISOString().split("T")[0];
        setSelectedDate(today);
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

    const fetchTickets = async () => {
        if (!selectedDate) return;
        setLoading(true);
        setSearched(true);
        try {
            const snapshot = await getDocs(collection(db, "tickets"));
            const list = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString()
                }))
                .filter(ticket => {
                    const ticketDate = new Date(ticket.createdAt).toISOString().split("T")[0];
                    return ticketDate === selectedDate;
                });
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setTickets(list);
        } catch (error) {
            console.error(error);
            showMsg("❌ Error fetching tickets");
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            await updateDoc(doc(db, "tickets", id), { status: newStatus });
            setTickets(tickets.map(tk => tk.id === id ? { ...tk, status: newStatus } : tk));
            showMsg(`✅ Status updated to ${newStatus}`, "success");
        } catch (error) {
            console.error(error);
            showMsg("❌ Error updating status");
        }
    };

    const deleteTicket = async (id) => {
        try {
            await deleteDoc(doc(db, "tickets", id));
            setTickets(tickets.filter(tk => tk.id !== id));
            showMsg("✅ Ticket deleted successfully", "success");
        } catch (error) {
            console.error(error);
            showMsg("❌ Error deleting ticket");
        }
    };

    const getStatusIcon = (status) => {
        if (status === "Pending") return "⏳";
        if (status === "In Progress") return "🔄";
        if (status === "Resolved") return "✅";
        return "⏳";
    };

    const getStatusClass = (status) => {
        if (status === "Pending") return "trkt__status--pending";
        if (status === "In Progress") return "trkt__status--inprogress";
        if (status === "Resolved") return "trkt__status--resolved";
        return "trkt__status--pending";
    };

    const getBarClass = (status) => {
        if (status === "Resolved") return "trkt__bar--resolved";
        if (status === "In Progress") return "trkt__bar--inprogress";
        return "trkt__bar--pending";
    };

    return (
        <div className="trkt__page">

            {/* Orbs */}
            <div className="trkt__orb trkt__orb--1" />
            <div className="trkt__orb trkt__orb--2" />
            <div className="trkt__orb trkt__orb--3" />

            {/* Grid */}
            <div className="trkt__grid" />

            {/* Back */}
            <button className="trkt__back-btn" onClick={() => navigate("/admin-dashboard")}>
                <span>←</span> {t("back")}
            </button>

            {/* Hero */}
            <div className="trkt__hero">
                <div className="trkt__hero-badge">
                    <span className="trkt__badge-dot" />
                    Admin Panel
                </div>
                <h1 className="trkt__hero-title">
                    Track<span className="trkt__hero-accent"> Tickets</span>
                </h1>
                <p className="trkt__hero-sub">Select a date to view and manage support tickets</p>
            </div>

            {/* Date Picker */}
            <div className="trkt__date-bar">
                <div className="trkt__date-wrapper">
                    <span className="trkt__date-icon">📅</span>
                    <input
                        type="date"
                        className="trkt__date-input"
                        value={selectedDate}
                        onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setSearched(false);
                            setTickets([]);
                        }}
                    />
                </div>
                <button className="trkt__search-btn" onClick={fetchTickets} disabled={loading}>
                    <span className="trkt__search-icon">🔍</span>
                    {loading ? "Loading..." : "Search Tickets"}
                </button>
            </div>

            {/* Message */}
            {message.text && (
                <div className={`trkt__msg trkt__msg--${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Stats */}
            {searched && (
                <div className="trkt__stats">
                    <div className="trkt__stat-card">
                        <span className="trkt__stat-icon">🎫</span>
                        <span className="trkt__stat-num">{tickets.length}</span>
                        <span className="trkt__stat-lbl">Total</span>
                    </div>
                    <div className="trkt__stat-card trkt__stat-card--pending">
                        <span className="trkt__stat-icon">⏳</span>
                        <span className="trkt__stat-num trkt__num--pending">
                            {tickets.filter(tk => tk.status === "Pending").length}
                        </span>
                        <span className="trkt__stat-lbl">Pending</span>
                    </div>
                    <div className="trkt__stat-card trkt__stat-card--inprogress">
                        <span className="trkt__stat-icon">🔄</span>
                        <span className="trkt__stat-num trkt__num--inprogress">
                            {tickets.filter(tk => tk.status === "In Progress").length}
                        </span>
                        <span className="trkt__stat-lbl">In Progress</span>
                    </div>
                    <div className="trkt__stat-card trkt__stat-card--resolved">
                        <span className="trkt__stat-icon">✅</span>
                        <span className="trkt__stat-num trkt__num--resolved">
                            {tickets.filter(tk => tk.status === "Resolved").length}
                        </span>
                        <span className="trkt__stat-lbl">Resolved</span>
                    </div>
                </div>
            )}

            {/* Ticket List */}
            <div className="trkt__list">

                {searched && tickets.length === 0 && !loading && (
                    <div className="trkt__empty">
                        <div className="trkt__empty-icon-wrap">
                            <span>🎫</span>
                        </div>
                        <h3 className="trkt__empty-title">No Tickets Found</h3>
                        <p className="trkt__empty-sub">No tickets were submitted on {selectedDate}</p>
                    </div>
                )}

                {tickets.map((ticket, index) => (
                    <div
                        key={ticket.id}
                        className="trkt__card"
                        style={{ animationDelay: `${index * 0.06}s` }}
                    >
                        <div className={`trkt__card-bar ${getBarClass(ticket.status)}`} />

                        <div className="trkt__card-body">

                            {/* Header Row */}
                            <div className="trkt__card-header">
                                <div className="trkt__card-meta">
                                    <span className="trkt__id-chip">{ticket.idNo}</span>
                                    <span className="trkt__name">{ticket.name}</span>
                                </div>
                                <span className={`trkt__status-badge ${getStatusClass(ticket.status)}`}>
                                    {getStatusIcon(ticket.status)} {ticket.status}
                                </span>
                            </div>

                            {/* Contact Row */}
                            <div className="trkt__contact-row">
                                <span className="trkt__email">📧 {ticket.email}</span>
                                <span className="trkt__date-chip">
                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                </span>
                            </div>

                            {/* Issue Box */}
                            <div className="trkt__issue-box">
                                <span className="trkt__issue-label">🔖 Issue</span>
                                <p className="trkt__issue-text">{ticket.issue}</p>
                            </div>

                            {/* Actions */}
                            <div className="trkt__actions">
                                {ticket.status !== "In Progress" && ticket.status !== "Resolved" && (
                                    <button
                                        className="trkt__action-btn trkt__action-btn--progress"
                                        onClick={() => updateStatus(ticket.id, "In Progress")}
                                    >
                                        🔄 In Progress
                                    </button>
                                )}
                                {ticket.status !== "Resolved" && (
                                    <button
                                        className="trkt__action-btn trkt__action-btn--resolve"
                                        onClick={() => updateStatus(ticket.id, "Resolved")}
                                    >
                                        ✅ Mark Resolved
                                    </button>
                                )}
                                {ticket.status === "Resolved" && (
                                    <button
                                        className="trkt__action-btn trkt__action-btn--delete"
                                        onClick={() => deleteTicket(ticket.id)}
                                    >
                                        🗑 Delete Ticket
                                    </button>
                                )}
                            </div>

                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}

export default TrackTicket;