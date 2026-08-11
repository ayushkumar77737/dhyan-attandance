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

/* ----------------------------------------------------------------
   Cloudinary
   Mirrors the public_id formula used in utils/cloudinaryUpload.js:
   `${employeeId}_${name with spaces -> underscores}`
   If that formula ever changes there, change it here too.
   ---------------------------------------------------------------- */

const CLOUD_NAME = "dgvjq9bhl";

const getProfileImageUrl = (employeeId, name = "", size = 200) => {
    if (!employeeId || !name) return "";

    const publicId = `${employeeId}_${name.replace(/\s+/g, "_")}`;

    const transforms = [
        "c_fill",
        "g_face",
        `w_${size}`,
        `h_${size}`,
        "r_max",
        "q_auto",
        "f_auto"
    ].join(",");

    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
};

/* ---------------------------------------------------------------- */
/* Inline icons (stroke = currentColor, so they inherit theme color) */
/* ---------------------------------------------------------------- */

const IcoArrow = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="trkt__ico">
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
);

const IcoCalendar = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="trkt__ico">
        <rect x="3" y="4.5" width="18" height="17" rx="3" />
        <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </svg>
);

const IcoSearch = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="trkt__ico">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.6-3.6" />
    </svg>
);

const IcoDownload = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" className="trkt__ico">
        <path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M4 20h16" />
    </svg>
);

const IcoTicket = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="trkt__ico">
        <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-5Z" />
        <path d="M14 5v14" strokeDasharray="2 3" />
    </svg>
);

const IcoHourglass = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="trkt__ico">
        <path d="M7 3h10M7 21h10M8 3v3.5c0 2 4 3.6 4 5.5s-4 3.5-4 5.5V21M16 3v3.5c0 2-4 3.6-4 5.5s4 3.5 4 5.5V21" />
    </svg>
);

const IcoProgress = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="trkt__ico">
        <path d="M20 12a8 8 0 1 1-2.8-6.1" />
        <path d="M20 4v4.5h-4.5" />
    </svg>
);

const IcoShieldCheck = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="trkt__ico">
        <path d="M12 3l7 3v5.5c0 4.3-2.9 8.2-7 9.5-4.1-1.3-7-5.2-7-9.5V6l7-3Z" />
        <path d="M9 12l2 2 4-4" />
    </svg>
);

const IcoMail = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="trkt__ico">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M4 7.5l7.1 5a1.6 1.6 0 0 0 1.8 0l7.1-5" />
    </svg>
);

const IcoTag = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" className="trkt__ico">
        <path d="M4 12.5V5a1 1 0 0 1 1-1h7.5l7 7-8.5 8.5-7-7Z" />
        <circle cx="8.5" cy="8.5" r="1.4" />
    </svg>
);

const IcoTrash = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="trkt__ico">
        <path d="M4 7h16M9.5 7V4.8A.8.8 0 0 1 10.3 4h3.4a.8.8 0 0 1 .8.8V7" />
        <path d="M6.5 7l.8 12.2a1.8 1.8 0 0 0 1.8 1.8h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
    </svg>
);

/* Sparkline used in the stat cards */
const Spark = () => (
    <svg className="trkt__spark" viewBox="0 0 120 28" preserveAspectRatio="none"
        fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 20c10 0 12-11 21-11s11 9 20 9 13-13 22-13 12 12 21 12 12-6 32-6" />
    </svg>
);

/* ---------------------------------------------------------------- */
/* Avatar — Cloudinary photo, falls back to initials if it fails     */
/* ---------------------------------------------------------------- */

const getInitials = (name = "") =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w.charAt(0))
        .join("")
        .toUpperCase() || "?";

const getAvatarTone = (name = "") => {
    const tones = ["a", "b", "c", "d", "e"];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return tones[sum % tones.length];
};

function TicketAvatar({ src, name }) {

    const [showImage, setShowImage] = useState(Boolean(src));
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setShowImage(Boolean(src));
        setLoaded(false);
    }, [src]);

    return (
        <div className="trkt__avatar" data-tone={getAvatarTone(name)}>
            {showImage ? (
                <img
                    src={src}
                    alt={name}
                    className={`trkt__avatar-img${loaded ? " is-loaded" : ""}`}
                    loading="lazy"
                    onLoad={() => setLoaded(true)}
                    onError={() => setShowImage(false)}
                />
            ) : (
                <span className="trkt__avatar-initials">{getInitials(name)}</span>
            )}
        </div>
    );
}

function TrackTicket() {

    const { t } = useTranslation();
    const navigate = useNavigate();

    const [selectedDate, setSelectedDate] = useState("");
    const [tickets, setTickets] = useState([]);
    const [avatars, setAvatars] = useState({});
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
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

    /* --------------------------------------------------------------
       Profile photo resolution, in order of trust:
       1. secure_url already saved on the user doc by uploadProfileImage
       2. Cloudinary URL rebuilt from employeeId + name
       3. initials — handled inside TicketAvatar via onError
       -------------------------------------------------------------- */
    const loadAvatars = async (list) => {

        const ids = [...new Set(list.map(tk => tk.idNo).filter(Boolean))];

        const entries = await Promise.all(
            ids.map(async (employeeId) => {

                const ticket = list.find(tk => tk.idNo === employeeId);
                const fallbackName = ticket?.name || "";

                try {
                    const userSnap = await getDoc(doc(db, "users", employeeId));

                    if (userSnap.exists()) {
                        const user = userSnap.data();

                        const stored =
                            user.photoURL ||
                            user.profileImage ||
                            user.profileImageUrl ||
                            user.imageUrl;

                        if (stored) return [employeeId, stored];

                        return [
                            employeeId,
                            getProfileImageUrl(employeeId, user.name || fallbackName)
                        ];
                    }
                } catch (error) {
                    console.error(error);
                }

                return [employeeId, getProfileImageUrl(employeeId, fallbackName)];
            })
        );

        setAvatars(Object.fromEntries(entries));
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
            loadAvatars(list);
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
            showMsg(t("nothingToExport"));
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
            details: t("logExportedTickets", { count: tickets.length, date: selectedDate }),
        });
        showMsg(t("ticketsExported"), "success");
    };

    /* ---------------- helpers ---------------- */

    const getStatusIcon = (status) => {
        if (status === "In Progress") return <IcoProgress />;
        if (status === "Resolved") return <IcoShieldCheck />;
        return <IcoHourglass />;
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

    const countBy = (status) => tickets.filter(tk => tk.status === status).length;

    return (
        <div className="trkt__page" data-theme={theme}>

            <div className="trkt__blob trkt__blob--1" />
            <div className="trkt__blob trkt__blob--2" />
            <div className="trkt__dots trkt__dots--1" />
            <div className="trkt__dots trkt__dots--2" />

            <button
                className="trkt__back-btn"
                onClick={() => navigate("/admin-dashboard")}
            >
                <IcoArrow /> {t("back")}
            </button>

            <div className="trkt__shell">

                <div className="trkt__hero">
                    <span className="trkt__hero-badge">{t("adminPanel")}</span>
                    <h1 className="trkt__hero-title">{t("trackTicket")}</h1>
                    <p className="trkt__hero-sub">{t("selectDateToView")}</p>
                </div>

                <div className="trkt__date-bar">
                    <label className="trkt__date-wrapper">
                        <span className="trkt__date-icon"><IcoCalendar /></span>
                        <input
                            type="date"
                            className="trkt__date-input"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setSearched(false);
                                setTickets([]);
                                setAvatars({});
                            }}
                        />
                    </label>

                    <button
                        className="trkt__search-btn"
                        onClick={fetchTickets}
                        disabled={loading}
                    >
                        <IcoSearch />
                        {loading ? t("loading") : t("searchTickets")}
                    </button>

                    <button
                        className="trkt__export-btn"
                        onClick={exportCSV}
                        disabled={tickets.length === 0}
                    >
                        <IcoDownload /> {t("exportCsv")}
                    </button>
                </div>

                {message.text && (
                    <div className={`trkt__msg trkt__msg--${message.type}`}>
                        {message.text}
                    </div>
                )}

                {searched && (
                    <div className="trkt__stats">

                        <div className="trkt__stat-card trkt__stat-card--total">
                            <span className="trkt__stat-icon"><IcoTicket /></span>
                            <span className="trkt__stat-text">
                                <span className="trkt__stat-lbl">{t("total")}</span>
                                <span className="trkt__stat-num">{tickets.length}</span>
                            </span>
                            <Spark />
                        </div>

                        <div className="trkt__stat-card trkt__stat-card--pending">
                            <span className="trkt__stat-icon"><IcoHourglass /></span>
                            <span className="trkt__stat-text">
                                <span className="trkt__stat-lbl">{t("pending")}</span>
                                <span className="trkt__stat-num">{countBy("Pending")}</span>
                            </span>
                            <Spark />
                        </div>

                        <div className="trkt__stat-card trkt__stat-card--inprogress">
                            <span className="trkt__stat-icon"><IcoProgress /></span>
                            <span className="trkt__stat-text">
                                <span className="trkt__stat-lbl">{t("inProgress")}</span>
                                <span className="trkt__stat-num">{countBy("In Progress")}</span>
                            </span>
                            <Spark />
                        </div>

                        <div className="trkt__stat-card trkt__stat-card--resolved">
                            <span className="trkt__stat-icon"><IcoShieldCheck /></span>
                            <span className="trkt__stat-text">
                                <span className="trkt__stat-lbl">{t("resolved")}</span>
                                <span className="trkt__stat-num">{countBy("Resolved")}</span>
                            </span>
                            <Spark />
                        </div>

                    </div>
                )}

                <div className="trkt__list">

                    {searched && tickets.length === 0 && !loading && (
                        <div className="trkt__empty">
                            <div className="trkt__empty-icon-wrap"><IcoTicket /></div>
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

                                <TicketAvatar
                                    src={ticket.photoURL || avatars[ticket.idNo]}
                                    name={ticket.name || ""}
                                />

                                <div className="trkt__card-content">

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
                                        <span className="trkt__email">
                                            <IcoMail /> {ticket.email}
                                        </span>
                                        <span className="trkt__date-chip">
                                            <IcoCalendar />
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="trkt__issue-box">
                                        <span className="trkt__issue-label">
                                            <IcoTag /> {t("issue")}
                                        </span>
                                        <p className="trkt__issue-text">{ticket.issue}</p>
                                    </div>

                                    <div className="trkt__actions">
                                        {ticket.status !== "In Progress" && ticket.status !== "Resolved" && (
                                            <button
                                                className="trkt__action-btn trkt__action-btn--progress"
                                                onClick={() => updateStatus(ticket.id, "In Progress")}
                                            >
                                                <IcoProgress /> {t("inProgress")}
                                            </button>
                                        )}
                                        {ticket.status !== "Resolved" && (
                                            <button
                                                className="trkt__action-btn trkt__action-btn--resolve"
                                                onClick={() => updateStatus(ticket.id, "Resolved")}
                                            >
                                                <IcoShieldCheck /> {t("markResolved")}
                                            </button>
                                        )}
                                        {ticket.status === "Resolved" && (
                                            <>
                                                <span className="trkt__action-btn trkt__action-btn--done">
                                                    <IcoShieldCheck /> {t("resolved")}
                                                </span>
                                                <button
                                                    className="trkt__action-btn trkt__action-btn--delete"
                                                    onClick={() => deleteTicket(ticket.id)}
                                                >
                                                    <IcoTrash /> {t("deleteTicket")}
                                                </button>
                                            </>
                                        )}
                                    </div>

                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}

export default TrackTicket;