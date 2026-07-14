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

const FILTERS = [
    { key: "all", label: "allTickets", fallback: "All Tickets" },
    { key: "Pending", label: "pending", fallback: "Pending" },
    { key: "In Progress", label: "inProgress", fallback: "In Progress" },
    { key: "Resolved", label: "resolved", fallback: "Resolved" },
];

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

    const [activeFilter, setActiveFilter] = useState("all");
    const [search, setSearch] = useState("");

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

    const searchQuery = search.trim().toLowerCase();
    const filteredTickets = tickets.filter((tk) => {
        const matchStatus = activeFilter === "all" || tk.status === activeFilter;
        const matchSearch =
            !searchQuery ||
            [tk.name, tk.idNo, tk.email, tk.issue].some(
                (v) => (v || "").toLowerCase().includes(searchQuery)
            );
        return matchStatus && matchSearch;
    });

    return (
        <div className="tsp__page" data-theme={theme}>

            <div className="tsp__orb tsp__orb--1" />
            <div className="tsp__orb tsp__orb--2" />
            <div className="tsp__orb tsp__orb--3" />

            <div className="tsp__grid-overlay" />

            <button className="tsp__back-btn" onClick={() => navigate("/user-dashboard")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                {t("back")}
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
                <div className="tsp__hero-art" aria-hidden="true">
                    <svg viewBox="0 0 150 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M28 80V64a47 47 0 0 1 94 0v16" stroke="#0d9488" strokeWidth="7" strokeLinecap="round" fill="none" />
                        <rect className="tsp__ha-cup" x="16" y="74" width="22" height="36" rx="10" fill="#2dd4cf" />
                        <rect className="tsp__ha-cup" x="112" y="74" width="22" height="36" rx="10" fill="#2dd4cf" />
                        <path d="M123 108v8a12 12 0 0 1-12 12H88" stroke="#0d9488" strokeWidth="5" strokeLinecap="round" fill="none" />
                        <circle cx="84" cy="128" r="5" fill="#0d9488" />
                        <rect className="tsp__ha-bubble" x="50" y="30" width="62" height="44" rx="13" fill="#60a5fa" />
                        <path className="tsp__ha-bubble" d="M68 74l-5 12 15-8z" fill="#60a5fa" />
                        <circle cx="69" cy="52" r="4" fill="#ffffff" />
                        <circle cx="81" cy="52" r="4" fill="#ffffff" />
                        <circle cx="93" cy="52" r="4" fill="#ffffff" />
                        <path className="tsp__ha-spark" d="M133 28l1.6 4.4 4.4 1.6-4.4 1.6L133 40l-1.6-4.4-4.4-1.6 4.4-1.6z" fill="#34d399" />
                        <circle className="tsp__ha-bubble" cx="22" cy="42" r="2.5" fill="#60a5fa" />
                        <circle className="tsp__ha-spark" cx="128" cy="58" r="2" fill="#34d399" opacity="0.7" />
                    </svg>
                </div>
            </div>

            <div className="tsp__action-bar">
                <div className="tsp__stats-row">
                    <div className="tsp__stat-item">
                        <span className="tsp__stat-icon tsp__stat-icon--teal">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                        </span>
                        <div className="tsp__stat-info">
                            <span className="tsp__stat-num">{tickets.length}</span>
                            <span className="tsp__stat-label">{t("total")}</span>
                            <span className="tsp__stat-caption">{t("allTickets") || "All Tickets"}</span>
                        </div>
                    </div>
                    <div className="tsp__stat-divider" />
                    <div className="tsp__stat-item">
                        <span className="tsp__stat-icon tsp__stat-icon--amber">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" /><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" /></svg>
                        </span>
                        <div className="tsp__stat-info">
                            <span className="tsp__stat-num tsp__stat--pending">{tickets.filter(tk => tk.status === "Pending").length}</span>
                            <span className="tsp__stat-label">{t("pending")}</span>
                            <span className="tsp__stat-caption">{t("waitingForResponse") || "Waiting for response"}</span>
                        </div>
                    </div>
                    <div className="tsp__stat-divider" />
                    <div className="tsp__stat-item">
                        <span className="tsp__stat-icon tsp__stat-icon--blue">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8" /><path d="M21 3v5h-5" /></svg>
                        </span>
                        <div className="tsp__stat-info">
                            <span className="tsp__stat-num tsp__stat--inprogress">{tickets.filter(tk => tk.status === "In Progress").length}</span>
                            <span className="tsp__stat-label">{t("inProgress") || "In Progress"}</span>
                            <span className="tsp__stat-caption">{t("beingResolved") || "Being resolved"}</span>
                        </div>
                    </div>
                    <div className="tsp__stat-divider" />
                    <div className="tsp__stat-item">
                        <span className="tsp__stat-icon tsp__stat-icon--green">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        </span>
                        <div className="tsp__stat-info">
                            <span className="tsp__stat-num tsp__stat--resolved">{tickets.filter(tk => tk.status === "Resolved").length}</span>
                            <span className="tsp__stat-label">{t("resolved")}</span>
                            <span className="tsp__stat-caption">{t("completed") || "Completed"}</span>
                        </div>
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

            {tickets.length > 0 && (
                <div className="tsp__filter-bar">
                    <div className="tsp__filter-tabs">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                className={`tsp__filter-tab ${activeFilter === f.key ? "tsp__filter-tab--active" : ""}`}
                                onClick={() => setActiveFilter(f.key)}
                            >
                                {t(f.label) || f.fallback}
                            </button>
                        ))}
                    </div>
                    <div className="tsp__search-wrap">
                        <svg className="tsp__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        <input
                            className="tsp__search-input"
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("searchTickets") || "Search tickets..."}
                        />
                    </div>
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
                ) : filteredTickets.length === 0 ? (
                    <div className="tsp__no-results">
                        <span className="tsp__no-results-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </span>
                        {t("noMatchingTickets") || "No tickets match your search"}
                    </div>
                ) : (
                    filteredTickets.map((ticket, index) => (
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
                                        {ticket.status === "Pending" && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>
                                        )}
                                        {ticket.status === "In Progress" && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8" /><path d="M21 3v5h-5" /></svg>
                                        )}
                                        {ticket.status === "Resolved" && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                        )}
                                        {ticket.status === "Pending" && t("pending")}
                                        {ticket.status === "In Progress" && (t("inProgress") || "In Progress")}
                                        {ticket.status === "Resolved" && t("resolved")}
                                    </span>
                                </div>

                                <p className="tsp__ticket-issue">{ticket.issue}</p>

                                <div className="tsp__ticket-footer">
                                    <span className="tsp__ticket-email">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                        {ticket.email}
                                    </span>
                                    <span className="tsp__ticket-date">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                                        {new Date(ticket.createdAt).toLocaleDateString()}
                                    </span>
                                    {ticket.status === "Pending" && (
                                        <button
                                            className="tsp__edit-btn"
                                            onClick={() => openEditModal(ticket)}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                                            {t("edit")}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="tsp__help-footer">
                <span className="tsp__help-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" /><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
                </span>
                <div className="tsp__help-text">
                    <span className="tsp__help-title">{t("needHelp") || "Need help?"}</span>
                    <span className="tsp__help-sub">{t("supportTeamHelp") || "Our support team is here to assist you."}</span>
                </div>
            </div>

            {showEditModal && editTicket && (
                <div className="tsp__modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="tsp__modal" onClick={(e) => e.stopPropagation()}>

                        <div className="tsp__modal-top-stripe" />

                        <div className="tsp__modal-header">
                            <div className="tsp__modal-title-wrap">
                                <span className="tsp__modal-emoji">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                                </span>
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
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                                {t("save")}
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
                                <span className="tsp__modal-emoji">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 11v2" /><path d="M13 17v2" /></svg>
                                </span>
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
                                {loading ? t("submitting") : t("submitTicket")}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default TicketingSupport;