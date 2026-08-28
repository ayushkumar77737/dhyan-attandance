import React, { useEffect, useMemo, useState } from "react";
import "./AllAdmins.css";
import { useNavigate } from "react-router-dom";

import { db, auth } from "../firebase/firebase";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";

import { useTranslation } from "react-i18next";
import useAutoLogout from "../hooks/useAutoLogout";

import logo from "../assets/logo2.png";

/* ------------------------------------------------------------------ */
/* Inline icons (presentational only)                                 */
/* ------------------------------------------------------------------ */
const icons = {
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
    ),
    search: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7.5" /><line x1="21" y1="21" x2="16.8" y2="16.8" />
        </svg>
    ),
    download: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    ),
    mail: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
            <polyline points="3 7 12 13.5 21 7" />
        </svg>
    ),
    phone: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.6 2.8a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.8 2z" />
        </svg>
    ),
    inbox: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
    ),
};

/* Decorative dotted grid, bottom-left of the page */
const Dots = () => (
    <svg className="alad-dots" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {[...Array(8)].map((_, r) =>
            [...Array(8)].map((_, c) => (
                <circle key={`${r}-${c}`} cx={7 + c * 15} cy={7 + r * 15} r="3" fill="currentColor" />
            ))
        )}
    </svg>
);

function AllAdmins() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    useAutoLogout();

    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const checkAdmin = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) { navigate("/"); return; }
        try {
            const userRef = doc(db, "users", localStorage.getItem("userId"));
            const userSnap = await getDoc(userRef);
            if (
                !userSnap.exists() ||
                userSnap.data().role !== "admin" ||
                userSnap.data().uid !== auth.currentUser.uid
            ) {
                navigate("/");
                return;
            }
        } catch (err) { console.error(err); navigate("/"); }
    };

    const fetchAdmins = async () => {
        try {
            setLoading(true);

            /* Profile photos live in `profiles/{ID}.profileImage` — the
               Cloudinary secure_url written by uploadProfileImage(). Build a
               lookup first, then attach each URL to its admin below. */
            const imageMap = {};
            try {
                const profileSnap = await getDocs(collection(db, "profiles"));
                profileSnap.forEach((p) => {
                    const pd = p.data();
                    const key = String(p.id || "").toUpperCase();
                    if (pd.profileImage) imageMap[key] = pd.profileImage;
                });
            } catch (e) {
                // Photos are optional — fall back to initials rather than failing.
                console.warn("AllAdmins: could not load profile images —", e);
            }

            const snap = await getDocs(collection(db, "users"));
            const list = [];
            snap.forEach((docItem) => {
                const data = docItem.data();
                if (data.role === "admin" && data.deleted !== true) {
                    const id = String(data.id || docItem.id).toUpperCase();
                    list.push({
                        docId: docItem.id,
                        id,
                        name: String(data.name || "—").substring(0, 50),
                        email: data.email || "—",
                        phone: data.phone || data.mobile || "—",
                        disabled: data.disabled === true,
                        image: imageMap[id] || data.profileImage || "",
                    });
                }
            });
            list.sort((a, b) => a.name.localeCompare(b.name));
            setAdmins(list);
        } catch (err) {
            console.error(err);
            setAdmins([]);
        } finally {
            setLoading(false);
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
        fetchAdmins();
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    const filtered = useMemo(() => {
        const q = String(search || "").trim().toLowerCase();
        if (!q) return admins;
        return admins.filter((a) =>
            a.name.toLowerCase().includes(q) ||
            a.email.toLowerCase().includes(q) ||
            String(a.id).toLowerCase().includes(q)
        );
    }, [admins, search]);

    const getInitials = (name) =>
        name && name !== "—"
            ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
            : "A";

    const exportCSV = () => {
        if (filtered.length === 0) return;

        const headers = ["ID", "Name", "Email", "Phone", "Status"];
        const escape = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;

        const rows = filtered.map((a) =>
            [a.id, a.name, a.email, a.phone, a.disabled ? "Inactive" : "Active"]
                .map(escape)
                .join(",")
        );

        const csv = "\uFEFF" + [headers.map(escape).join(","), ...rows].join("\r\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `admins_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    /* Two-tone heading. Rather than hard-coding an "All" + "Admins" split
       (which breaks the moment a language reorders the words), take the
       translated string and tint its final word. */
    const titleFull = (t("allAdmins") || "All Admins").trim();
    const titleWords = titleFull.split(/\s+/);
    const titleAccent = titleWords.length > 1 ? titleWords.pop() : titleFull;
    const titleLead = titleWords.length ? titleWords.join(" ") : "";

    return (
        <div className="alladm-container" data-theme={theme}>

            <Dots />

            {/* ============================ HEADER ============================ */}
            <div className="alad-header">
                <div className="alad-header-left">
                    <img src={logo} alt="" className="alad-logo" />
                    <div className="alad-header-text">
                        <p className="alad-eyebrow">{t("appTitle")}</p>
                        <h1 className="alad-title">
                            {titleLead && <span className="alad-title-lead">{titleLead} </span>}
                            <span className="alad-title-accent">{titleAccent}</span>
                        </h1>
                    </div>
                </div>

                <button className="alad-back" onClick={() => navigate("/admin-dashboard")}>
                    <span className="alad-back-icon">{icons.back}</span>
                    {t("back")}
                </button>
            </div>

            {/* =========================== TOOLBAR ============================ */}
            <div className="alad-toolbar">
                <div className="alad-count">
                    {t("totalAdmins")}:
                    <span className="alad-count-chip">{admins.length}</span>
                </div>

                <div className="alad-toolbar-actions">
                    <div className="alad-search">
                        <span className="alad-search-icon">{icons.search}</span>
                        <input
                            type="text"
                            placeholder={t("searchAdmins")}
                            value={search}
                            onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                if (/^[A-Z0-9@]*$/.test(value)) setSearch(value);
                            }}
                        />
                        {search && (
                            <button
                                type="button"
                                className="alad-search-clear"
                                onClick={() => setSearch("")}
                                aria-label={t("cancel")}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <button
                        className="alad-export"
                        onClick={exportCSV}
                        disabled={filtered.length === 0}
                    >
                        <span className="alad-btn-icon">{icons.download}</span>
                        {t("exportCSV")}
                    </button>
                </div>
            </div>

            {/* ============================ CONTENT =========================== */}
            {loading ? (
                <div className="alad-state">
                    <span className="alad-spinner" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="alad-state">
                    <span className="alad-state-icon">{icons.inbox}</span>
                    <p className="alad-state-title">{t("noAdminsFound")}</p>
                </div>
            ) : (
                <div className="alad-grid">
                    {filtered.map((a, i) => (
                        <div
                            className={`alad-card alad-accent-${(i % 4) + 1}`}
                            key={a.docId}
                            onClick={() => navigate(`/edit-admin/${a.docId}`)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    navigate(`/edit-admin/${a.docId}`);
                                }
                            }}
                        >
                            <span className="alad-card-bar" aria-hidden="true" />
                            <span className="alad-badge">{t("adminLabel")}</span>

                            <span className="alad-avatar">
                                {getInitials(a.name)}
                                {a.image ? (
                                    <img
                                        className="alad-avatar-img"
                                        src={a.image}
                                        alt={a.name}
                                        loading="lazy"
                                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                                    />
                                ) : null}
                            </span>

                            <div className="alad-body">
                                <p className="alad-name">{a.name}</p>
                                <p className="alad-id">ID: {a.id}</p>

                                <p className="alad-meta">
                                    <span className="alad-meta-icon">{icons.mail}</span>
                                    <span className="alad-meta-text">{a.email}</span>
                                </p>

                                <span className={`alad-status ${a.disabled ? "alad-status--off" : ""}`}>
                                    <span className="alad-status-dot" />
                                    {a.disabled ? t("inactive") : t("active")}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AllAdmins;