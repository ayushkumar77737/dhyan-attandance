import React, { useEffect, useState } from "react";
import "./TrackTicket.css";
import { logAdminAction } from "../utils/logAdminAction";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    getDoc
} from "firebase/firestore";
import { useTranslation } from "react-i18next";

function TrackTicket() {

    const { t } = useTranslation();
    const navigate = useNavigate();

    const [selectedDate, setSelectedDate] = useState("");
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
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

        } catch (error) {
            console.error(error);
            navigate("/");
        }
    };

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
    useEffect(() => {
        checkAdmin();
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
                    const ticketDate =
                        ticket.createdAt
                            ? new Date(ticket.createdAt)
                                .toISOString()
                                .split("T")[0]
                            : "";
                    return ticketDate === selectedDate;
                });
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setTickets(list);
        } catch (error) {
            console.error(error);
            showMsg(t("errorFetchingTickets"));
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, newStatus) => {
        if (
            newStatus !== "Pending" &&
            newStatus !== "In Progress" &&
            newStatus !== "Resolved"
        ) {
            return;
        }
        try {
            if (!id) {
                return;
            }
            await updateDoc(
                doc(db, "tickets", id),
                {
                    status: newStatus,
                    updatedBy: localStorage.getItem("userId"),
                    updatedAt: new Date().toISOString()
                }
            );
            await logAdminAction("update_ticket", {
                targetId: id,
                details: t("logUpdatedTicket", { status: newStatus }),
            });
            setTickets(tickets.map(tk => tk.id === id ? { ...tk, status: newStatus } : tk));
            showMsg(`${t("statusUpdated")} ${newStatus}`, "success");
        } catch (error) {
            console.error(error);
            showMsg(t("errorUpdatingStatus"));
        }
    };

    const deleteTicket = async (id) => {
        try {
            if (!id) {
                return;
            }
            await deleteDoc(doc(db, "tickets", id));
            await logAdminAction("delete_ticket", {
                targetId: id,
                details: t("logDeletedTicket"),
            });
            setTickets(tickets.filter(tk => tk.id !== id));
            showMsg(t("ticketDeleted"), "success");
        } catch (error) {
            console.error(error);
            showMsg(t("errorDeletingTicket"));
        }
    };

    const exportCSV = () => {
        if (tickets.length === 0) {
            showMsg(t("nothingToExport") || "Nothing to export");
            return;
        }

        const headers = ["Ticket ID", "Name", "Email", "Issue", "Status", "Created At"];
        const escape = (val) => `"${(val ?? "").toString().replace(/"/g, '""')}"`;

        const rows = tickets.map((tk) =>
            [
                tk.idNo,
                tk.name,
                tk.email,
                tk.issue,
                tk.status,
                tk.createdAt ? new Date(tk.createdAt).toLocaleString() : "",
            ].map(escape).join(",")
        );

        const csv = [headers.map(escape).join(","), ...rows].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `tickets-${selectedDate || new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        logAdminAction("export_tickets", {
            details:
                t("logExportedTickets", { count: tickets.length, date: selectedDate }) ||
                `Exported ${tickets.length} tickets for ${selectedDate}`,
        });
        showMsg(t("ticketsExported") || "Exported", "success");
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

    const getStatusLabel = (status) => {
        if (status === "Pending") return t("pending");
        if (status === "In Progress") return t("inProgress");
        if (status === "Resolved") return t("resolved");
        return status;
    };

    return (
        <div className="trkt__page">

            <div className="trkt__orb trkt__orb--1" />
            <div className="trkt__orb trkt__orb--2" />
            <div className="trkt__orb trkt__orb--3" />

            <div className="trkt__grid" />

            <button className="trkt__back-btn" onClick={() => navigate("/admin-dashboard")}>
                <span>←</span> {t("back")}
            </button>

            <div className="trkt__hero">
                <div className="trkt__hero-badge">
                    <span className="trkt__badge-dot" />
                    {t("adminPanel")}
                </div>
                <h1 className="trkt__hero-title">
                    {t("trackTicket")}
                </h1>
                <p className="trkt__hero-sub">{t("selectDateToView")}</p>
            </div>

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
                    {loading ? t("loading") : t("searchTickets")}
                </button>
                <button
                    className="trkt__export-btn"
                    onClick={exportCSV}
                    disabled={tickets.length === 0}
                >
                    <span>⬇</span> {t("export") || "Export"}
                </button>
            </div>

            {message.text && (
                <div className={`trkt__msg trkt__msg--${message.type}`}>
                    {message.text}
                </div>
            )}

            {searched && (
                <div className="trkt__stats">
                    <div className="trkt__stat-card">
                        <span className="trkt__stat-icon">🎫</span>
                        <span className="trkt__stat-num">{tickets.length}</span>
                        <span className="trkt__stat-lbl">{t("total")}</span>
                    </div>
                    <div className="trkt__stat-card trkt__stat-card--pending">
                        <span className="trkt__stat-icon">⏳</span>
                        <span className="trkt__stat-num trkt__num--pending">
                            {tickets.filter(tk => tk.status === "Pending").length}
                        </span>
                        <span className="trkt__stat-lbl">{t("pending")}</span>
                    </div>
                    <div className="trkt__stat-card trkt__stat-card--inprogress">
                        <span className="trkt__stat-icon">🔄</span>
                        <span className="trkt__stat-num trkt__num--inprogress">
                            {tickets.filter(tk => tk.status === "In Progress").length}
                        </span>
                        <span className="trkt__stat-lbl">{t("inProgress")}</span>
                    </div>
                    <div className="trkt__stat-card trkt__stat-card--resolved">
                        <span className="trkt__stat-icon">✅</span>
                        <span className="trkt__stat-num trkt__num--resolved">
                            {tickets.filter(tk => tk.status === "Resolved").length}
                        </span>
                        <span className="trkt__stat-lbl">{t("resolved")}</span>
                    </div>
                </div>
            )}

            <div className="trkt__list">

                {searched && tickets.length === 0 && !loading && (
                    <div className="trkt__empty">
                        <div className="trkt__empty-icon-wrap">
                            <span>🎫</span>
                        </div>
                        <h3 className="trkt__empty-title">{t("noTicketsFound")}</h3>
                        <p className="trkt__empty-sub">{t("noTicketsOnDate")}</p>
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

                            <div className="trkt__card-header">
                                <div className="trkt__card-meta">
                                    <span className="trkt__id-chip">{ticket.idNo}</span>
                                    <span className="trkt__name">{ticket.name}</span>
                                </div>
                                <span className={`trkt__status-badge ${getStatusClass(ticket.status)}`}>
                                    {getStatusIcon(ticket.status)} {getStatusLabel(ticket.status)}
                                </span>
                            </div>

                            <div className="trkt__contact-row">
                                <span className="trkt__email">📧 {ticket.email}</span>
                                <span className="trkt__date-chip">
                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="trkt__issue-box">
                                <span className="trkt__issue-label">🔖 {t("issue")}</span>
                                <p className="trkt__issue-text">{ticket.issue}</p>
                            </div>

                            <div className="trkt__actions">
                                {ticket.status !== "In Progress" && ticket.status !== "Resolved" && (
                                    <button
                                        className="trkt__action-btn trkt__action-btn--progress"
                                        onClick={() => updateStatus(ticket.id, "In Progress")}
                                    >
                                        🔄 {t("inProgress")}
                                    </button>
                                )}
                                {ticket.status !== "Resolved" && (
                                    <button
                                        className="trkt__action-btn trkt__action-btn--resolve"
                                        onClick={() => updateStatus(ticket.id, "Resolved")}
                                    >
                                        ✅ {t("markResolved")}
                                    </button>
                                )}
                                {ticket.status === "Resolved" && (
                                    <button
                                        className="trkt__action-btn trkt__action-btn--delete"
                                        onClick={() => deleteTicket(ticket.id)}
                                    >
                                        🗑 {t("deleteTicket")}
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