import React, { useEffect, useState } from "react";
import "./ContactMessages.css";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { collection, getDocs, doc, deleteDoc, writeBatch, updateDoc } from "firebase/firestore";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { logAdminAction } from "../utils/logAdminAction";

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */
const icons = {
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    ),
    mail: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,12 2,6" />
        </svg>
    ),
    trash: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" />
            <path d="M9 6V4h6v2" />
        </svg>
    ),
    eye: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    ),
    search: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    ),
    phone: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.27 6.27l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    ),
    calendar: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
    close: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    id: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" />
            <path d="M13 12h5" /><path d="M13 16h3" />
        </svg>
    ),
};

function ContactMessages() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [selected, setSelected] = useState([]);
    const [viewMsg, setViewMsg] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    /* ---------- fetch ---------- */
    const fetchMessages = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "contactMessages"));
            const list = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
            list.sort((a, b) => {
                const ta = a.createdAt?.seconds || 0;
                const tb = b.createdAt?.seconds || 0;
                return tb - ta;
            });
            setMessages(list);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMessages(); }, []);

    /* ---------- mark as read when modal opens ---------- */
    const openView = async (msg) => {
        setViewMsg(msg);
        if (msg.status === "new") {
            try {
                await updateDoc(doc(db, "contactMessages", msg.id), { status: "read" });
                setMessages((prev) =>
                    prev.map((m) => m.id === msg.id ? { ...m, status: "read" } : m)
                );
            } catch (err) { console.error(err); }
        }
    };

    /* ---------- delete single ---------- */
    const deleteSingle = async (id) => {
        try {
            await deleteDoc(doc(db, "contactMessages", id));
            await logAdminAction("DELETE_CONTACT_MESSAGE", {
                targetId: id,
                details: `Deleted contact message ID: ${id}`,
            });
            setMessages((prev) => prev.filter((m) => m.id !== id));
            setSelected((prev) => prev.filter((s) => s !== id));
            if (viewMsg?.id === id) setViewMsg(null);
        } catch (err) { console.error(err); }
    };

    /* ---------- delete multiple ---------- */
    const deleteMultiple = async (ids) => {
        try {
            const batch = writeBatch(db);
            ids.forEach((id) => batch.delete(doc(db, "contactMessages", id)));
            await batch.commit();
            await logAdminAction("DELETE_CONTACT_MESSAGES_BULK", {
                details: `Deleted ${ids.length} contact messages in bulk`,
            });
            setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
            setSelected([]);
        } catch (err) { console.error(err); }
    };

    const handleDeleteConfirm = async () => {
        setConfirmOpen(false);
        if (deleteTarget === "all") {
            await deleteMultiple(filtered.map((m) => m.id));
        } else if (deleteTarget === "selected") {
            await deleteMultiple(selected);
        } else if (deleteTarget) {
            await deleteSingle(deleteTarget);
        }
        setDeleteTarget(null);
    };

    /* ---------- select helpers ---------- */
    const toggleSelect = (id) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selected.length === filtered.length) setSelected([]);
        else setSelected(filtered.map((m) => m.id));
    };

    /* ---------- filter + search ---------- */
    const q = search.trim().toLowerCase();
    const filtered = messages.filter((m) => {
        const matchFilter = filter === "all" || m.status === filter;
        const matchSearch = !q ||
            (m.name || "").toLowerCase().includes(q) ||
            (m.email || "").toLowerCase().includes(q) ||
            (m.subject || "").toLowerCase().includes(q) ||
            (m.message || "").toLowerCase().includes(q) ||
            (m.memberId || "").toLowerCase().includes(q);
        return matchFilter && matchSearch;
    });

    const newCount = messages.filter((m) => m.status === "new").length;

    const formatDate = (ts) => {
        if (!ts?.seconds) return "—";
        return new Date(ts.seconds * 1000).toLocaleString();
    };

    const getInitial = (name) => (name || "?").charAt(0).toUpperCase();

    const filterLabel = (f) => {
        if (f === "all") return t("all") || "All";
        if (f === "new") return t("new") || "New";
        if (f === "read") return t("read") || "Read";
        return f;
    };

    return (
        <div className="ctmsg-shell" data-theme={theme}>

            {/* ==================== TOPBAR ==================== */}
            <div className="ctmsg-topbar">
                <div className="ctmsg-topbar-left">
                    <button className="ctmsg-back-btn" onClick={() => navigate("/admin-dashboard")}>
                        <span className="ctmsg-back-icon">{icons.back}</span>
                        <span className="ctmsg-back-label">{t("back") || "Back"}</span>
                    </button>
                    <div className="ctmsg-topbar-title-group">
                        <div className="ctmsg-topbar-icon">{icons.mail}</div>
                        <div>
                            <p className="ctmsg-topbar-label">{t("adminDashboard") || "Admin Dashboard"}</p>
                            <h1 className="ctmsg-topbar-title">{t("contactMessages") || "Contact Messages"}</h1>
                        </div>
                    </div>
                </div>
                <div className="ctmsg-topbar-right">
                    {newCount > 0 && (
                        <span className="ctmsg-new-badge">
                            {newCount} {t("new") || "New"}
                        </span>
                    )}
                </div>
            </div>

            {/* ==================== CONTENT ==================== */}
            <div className="ctmsg-content">

                {/* --- stats row --- */}
                <div className="ctmsg-stats-row">
                    <div className="ctmsg-stat ctmsg-stat-total">
                        <span className="ctmsg-stat-val">{messages.length}</span>
                        <span className="ctmsg-stat-label">{t("totalMessages") || "Total Messages"}</span>
                    </div>
                    <div className="ctmsg-stat ctmsg-stat-new">
                        <span className="ctmsg-stat-val">{newCount}</span>
                        <span className="ctmsg-stat-label">{t("newMessages") || "New Messages"}</span>
                    </div>
                    <div className="ctmsg-stat ctmsg-stat-read">
                        <span className="ctmsg-stat-val">{messages.filter((m) => m.status === "read").length}</span>
                        <span className="ctmsg-stat-label">{t("readMessages") || "Read Messages"}</span>
                    </div>
                </div>

                {/* --- toolbar --- */}
                <div className="ctmsg-toolbar">
                    <div className="ctmsg-search-wrap">
                        <span className="ctmsg-search-icon">{icons.search}</span>
                        <input
                            className="ctmsg-search"
                            type="text"
                            placeholder={t("searchMessages") || "Search messages…"}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button className="ctmsg-search-clear" onClick={() => setSearch("")}>✕</button>
                        )}
                    </div>

                    <div className="ctmsg-filter-group">
                        {["all", "new", "read"].map((f) => (
                            <button
                                key={f}
                                className={`ctmsg-filter-btn ${filter === f ? "active" : ""}`}
                                onClick={() => setFilter(f)}
                            >
                                {filterLabel(f)}
                            </button>
                        ))}
                    </div>

                    <div className="ctmsg-action-group">
                        {selected.length > 0 && (
                            <button
                                className="ctmsg-btn ctmsg-btn-danger"
                                onClick={() => { setDeleteTarget("selected"); setConfirmOpen(true); }}
                            >
                                {icons.trash}
                                {t("deleteSelected") || "Delete Selected"} ({selected.length})
                            </button>
                        )}
                        {filtered.length > 0 && (
                            <button
                                className="ctmsg-btn ctmsg-btn-danger-outline"
                                onClick={() => { setDeleteTarget("all"); setConfirmOpen(true); }}
                            >
                                {icons.trash}
                                {t("deleteAll") || "Delete All"}
                            </button>
                        )}
                    </div>
                </div>

                {/* --- table --- */}
                {loading ? (
                    <div className="ctmsg-loading">
                        <div className="ctmsg-spinner" />
                        <p>{t("loading") || "Loading…"}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="ctmsg-empty">
                        <div className="ctmsg-empty-icon">{icons.mail}</div>
                        <p className="ctmsg-empty-title">{t("noMessagesFound") || "No messages found"}</p>
                        <p className="ctmsg-empty-sub">{t("noMessagesFoundSub") || "Contact form submissions will appear here"}</p>
                    </div>
                ) : (
                    <div className="ctmsg-table-wrap">
                        <table className="ctmsg-table">
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            className="ctmsg-checkbox"
                                            checked={selected.length === filtered.length && filtered.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th>{t("sender") || "Sender"}</th>
                                    <th>{t("subject") || "Subject"}</th>
                                    <th>{t("phone") || "Phone"}</th>
                                    <th>{t("memberId") || "Member ID"}</th>
                                    <th>{t("date") || "Date"}</th>
                                    <th>{t("status") || "Status"}</th>
                                    <th>{t("actions") || "Actions"}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((msg) => (
                                    <tr
                                        key={msg.id}
                                        className={`ctmsg-row ${msg.status === "new" ? "ctmsg-row-new" : ""} ${selected.includes(msg.id) ? "ctmsg-row-selected" : ""}`}
                                    >
                                        <td>
                                            <input
                                                type="checkbox"
                                                className="ctmsg-checkbox"
                                                checked={selected.includes(msg.id)}
                                                onChange={() => toggleSelect(msg.id)}
                                            />
                                        </td>
                                        <td>
                                            <div className="ctmsg-sender">
                                                <div className="ctmsg-avatar">{getInitial(msg.name)}</div>
                                                <div className="ctmsg-sender-info">
                                                    <span className="ctmsg-sender-name">{msg.name || "—"}</span>
                                                    <span className="ctmsg-sender-email">{msg.email || "—"}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="ctmsg-subject">{msg.subject || "—"}</span>
                                            <span className="ctmsg-message-preview">
                                                {(msg.message || "").slice(0, 50)}{msg.message?.length > 50 ? "…" : ""}
                                            </span>
                                        </td>
                                        <td className="ctmsg-phone">{msg.phone || "—"}</td>
                                        <td>
                                            {msg.memberId
                                                ? <span className="ctmsg-member-id">{msg.memberId}</span>
                                                : "—"}
                                        </td>
                                        <td className="ctmsg-date">{formatDate(msg.createdAt)}</td>
                                        <td>
                                            <span className={`ctmsg-status-badge ${msg.status === "new" ? "ctmsg-status-new" : "ctmsg-status-read"}`}>
                                                {msg.status === "new" ? (t("new") || "New") : (t("read") || "Read")}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="ctmsg-row-actions">
                                                <button
                                                    className="ctmsg-icon-btn ctmsg-icon-view"
                                                    title={t("viewMessage") || "View Message"}
                                                    onClick={() => openView(msg)}
                                                >
                                                    {icons.eye}
                                                </button>
                                                <button
                                                    className="ctmsg-icon-btn ctmsg-icon-delete"
                                                    title={t("delete") || "Delete"}
                                                    onClick={() => { setDeleteTarget(msg.id); setConfirmOpen(true); }}
                                                >
                                                    {icons.trash}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* --- result count --- */}
                {!loading && filtered.length > 0 && (
                    <p className="ctmsg-result-count">
                        {t("showing") || "Showing"} {filtered.length} {t("of") || "of"} {messages.length} {t("messages") || "messages"}
                        {selected.length > 0 && ` · ${selected.length} ${t("selected") || "selected"}`}
                    </p>
                )}
            </div>

            {/* ==================== VIEW MODAL ==================== */}
            {viewMsg && createPortal(
                <div className="ctmsg-modal-overlay ctmsg-shell" data-theme={theme} onClick={() => setViewMsg(null)}>
                    <div className="ctmsg-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="ctmsg-modal-close" onClick={() => setViewMsg(null)}>{icons.close}</button>

                        <div className="ctmsg-modal-header">
                            <div className="ctmsg-modal-avatar">{getInitial(viewMsg.name)}</div>
                            <div>
                                <h2 className="ctmsg-modal-name">{viewMsg.name || "—"}</h2>
                                <span className={`ctmsg-status-badge ${viewMsg.status === "new" ? "ctmsg-status-new" : "ctmsg-status-read"}`}>
                                    {viewMsg.status === "new" ? (t("new") || "New") : (t("read") || "Read")}
                                </span>
                            </div>
                        </div>

                        <div className="ctmsg-modal-fields">
                            <div className="ctmsg-modal-field">
                                <span className="ctmsg-modal-field-icon">{icons.mail}</span>
                                <div>
                                    <p className="ctmsg-modal-field-label">{t("emailAddress") || "Email Address"}</p>
                                    <p className="ctmsg-modal-field-val">{viewMsg.email || "—"}</p>
                                </div>
                            </div>
                            <div className="ctmsg-modal-field">
                                <span className="ctmsg-modal-field-icon">{icons.phone}</span>
                                <div>
                                    <p className="ctmsg-modal-field-label">{t("phone") || "Phone"}</p>
                                    <p className="ctmsg-modal-field-val">{viewMsg.phone || "—"}</p>
                                </div>
                            </div>
                            <div className="ctmsg-modal-field">
                                <span className="ctmsg-modal-field-icon">{icons.id}</span>
                                <div>
                                    <p className="ctmsg-modal-field-label">{t("memberId") || "Member ID"}</p>
                                    <p className="ctmsg-modal-field-val">{viewMsg.memberId || t("notProvided") || "Not provided"}</p>
                                </div>
                            </div>
                            <div className="ctmsg-modal-field">
                                <span className="ctmsg-modal-field-icon">{icons.calendar}</span>
                                <div>
                                    <p className="ctmsg-modal-field-label">{t("receivedOn") || "Received On"}</p>
                                    <p className="ctmsg-modal-field-val">{formatDate(viewMsg.createdAt)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="ctmsg-modal-subject">
                            <p className="ctmsg-modal-subject-label">{t("subject") || "Subject"}</p>
                            <p className="ctmsg-modal-subject-val">{viewMsg.subject || "—"}</p>
                        </div>

                        <div className="ctmsg-modal-message">
                            <p className="ctmsg-modal-message-label">{t("message") || "Message"}</p>
                            <p className="ctmsg-modal-message-val">{viewMsg.message || "—"}</p>
                        </div>

                        <div className="ctmsg-modal-footer">
                            <button
                                className="ctmsg-btn ctmsg-btn-danger"
                                onClick={() => {
                                    const id = viewMsg.id;
                                    setViewMsg(null);
                                    setDeleteTarget(id);
                                    setConfirmOpen(true);
                                }}
                            >
                                {icons.trash}
                                {t("deleteMessage") || "Delete Message"}
                            </button>
                            <button className="ctmsg-btn ctmsg-btn-secondary" onClick={() => setViewMsg(null)}>
                                {t("close") || "Close"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ==================== CONFIRM DELETE MODAL ==================== */}
            {confirmOpen && createPortal(
                <div className="ctmsg-modal-overlay ctmsg-shell" data-theme={theme} onClick={() => setConfirmOpen(false)}>
                    <div className="ctmsg-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ctmsg-confirm-icon">{icons.trash}</div>
                        <h3 className="ctmsg-confirm-title">
                            {deleteTarget === "all"
                                ? (t("confirmDeleteAll") || "Delete all messages?")
                                : deleteTarget === "selected"
                                    ? (t("confirmDeleteSelected") || "Delete selected messages?")
                                    : (t("confirmDeleteOne") || "Delete this message?")}
                        </h3>
                        <p className="ctmsg-confirm-sub">
                            {t("confirmDeleteSub") || "This action cannot be undone."}
                        </p>
                        <div className="ctmsg-confirm-btns">
                            <button className="ctmsg-btn ctmsg-btn-danger" onClick={handleDeleteConfirm}>
                                {t("yesDelete") || "Yes, Delete"}
                            </button>
                            <button className="ctmsg-btn ctmsg-btn-secondary" onClick={() => setConfirmOpen(false)}>
                                {t("cancel") || "Cancel"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default ContactMessages;