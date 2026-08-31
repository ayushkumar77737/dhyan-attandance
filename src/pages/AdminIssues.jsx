import React, { useEffect, useMemo, useState } from "react";
import "./AdminIssues.css";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { logAdminAction } from "../utils/logAdminAction";

const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];
const SEVERITIES = ["critical", "high", "medium", "low"];
const SEV_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

/* Cloudinary — same public_id formula as utils/cloudinaryUpload.js */
const CLOUD_NAME = "dgvjq9bhl";
const getProfileImageUrl = (employeeId, name = "", size = 96) => {
    if (!employeeId || !name) return "";
    const publicId = `${employeeId}_${name.replace(/\s+/g, "_")}`;
    const transforms = ["c_fill", "g_face", `w_${size}`, `h_${size}`, "r_max", "q_auto", "f_auto"].join(",");
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
};

/* createdAt may be a Firestore Timestamp, ISO string or Date. */
const toMs = (v) => {
    if (!v) return 0;
    if (typeof v === "object" && typeof v.toDate === "function") return v.toDate().getTime();
    if (typeof v === "object" && v.seconds) return v.seconds * 1000;
    const p = new Date(v).getTime();
    return Number.isNaN(p) ? 0 : p;
};

const statusKey = (s) => String(s || "open").toLowerCase().replace(/\s+/g, "");

const AVATAR_TONES = ["rose", "blue", "violet", "teal", "amber", "green"];
const toneFor = (s = "") => {
    let h = 0;
    for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return AVATAR_TONES[h % AVATAR_TONES.length];
};

/* ---------------------------------------------------------------- */
/* Icons                                                             */
/* ---------------------------------------------------------------- */
const I = {
    back: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>),
    bug: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.9 2M16 2l-1.9 2" /><rect x="7" y="7" width="10" height="13" rx="5" /><path d="M12 7v13M3 13h4M17 13h4M4 19l3.5-2M20 19l-3.5-2M4 8l3.5 2M20 8l-3.5 2" /></svg>),
    search: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" /></svg>),
    close: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>),
    refresh: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>),
    download: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>),
    trash: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>),
    chevron: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>),
    clock: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>),
    inprogress: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8" /><path d="M21 3v5h-5" /></svg>),
    check: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>),
    alert: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13.5" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>),
    inbox: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>),
    image: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>),
    user: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>),
    tag: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" /><circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none" /></svg>),
    calendar: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>),
};

/* Photo if available, coloured initial otherwise. */
function Avatar({ src, name, className = "" }) {
    const [ok, setOk] = useState(Boolean(src));
    useEffect(() => setOk(Boolean(src)), [src]);
    return (
        <span className={`ais__av ais__av--${toneFor(name)} ${className}`} title={name}>
            {ok
                ? <img src={src} alt={name} loading="lazy" onError={() => setOk(false)} />
                : (name || "?").charAt(0).toUpperCase()}
        </span>
    );
}

function AdminIssues() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");
    const currentUserId = (localStorage.getItem("userId") || "").toUpperCase();

    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [expanded, setExpanded] = useState(null);
    const [confirmDel, setConfirmDel] = useState(null);
    const [lightbox, setLightbox] = useState(null);
    const [toast, setToast] = useState({ text: "", type: "" });

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sevFilter, setSevFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");

    /* ---------------- guard ---------------- */
    useEffect(() => {
        const disableRightClick = (e) => e.preventDefault();
        const disableInspectKeys = (e) => {
            if (e.key === "F12") e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) e.preventDefault();
            if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
        };
        document.addEventListener("contextmenu", disableRightClick);
        document.addEventListener("keydown", disableInspectKeys);

        (async () => {
            const currentUser = auth.currentUser;
            if (!currentUser || !currentUserId) { navigate("/"); return; }
            try {
                const snap = await getDoc(doc(db, "users", currentUserId));
                if (
                    !snap.exists() ||
                    snap.data().role !== "admin" ||
                    snap.data().uid !== currentUser.uid
                ) { navigate("/"); return; }
                await fetchIssues();
            } catch (e) {
                console.error(e);
                navigate("/");
            }
        })();

        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    /* ---------------- data ---------------- */
    const fetchIssues = async () => {
        setLoading(true);
        try {
            /* Build id -> photo map from users so reporter and assignees
               show their profile picture (stored URL, else Cloudinary). */
            const photoMap = {};
            try {
                const usersSnap = await getDocs(collection(db, "users"));
                usersSnap.forEach((u) => {
                    const data = u.data();
                    const id = String(data.id || u.id).toUpperCase();
                    const stored = data.profileImage || data.photoURL || data.profileImageUrl || data.imageUrl;
                    photoMap[id] = stored || getProfileImageUrl(id, data.name || "");
                });
            } catch (e) {
                console.warn("Could not load user photos:", e);
            }
            const photoFor = (id) => photoMap[String(id || "").toUpperCase()] || "";

            const snap = await getDocs(collection(db, "issues"));
            const list = [];
            snap.forEach((d) => {
                const x = d.data();
                /* This page is admin-reported issues only. */
                if (x.reporterType !== "admin") return;
                list.push({
                    id: d.id,
                    title: x.title || "—",
                    description: x.description || "",
                    area: x.area || "",
                    severity: SEVERITIES.includes(x.severity) ? x.severity : "medium",
                    status: STATUSES.includes(x.status) ? x.status : "Open",
                    screenshots: Array.isArray(x.screenshots) ? x.screenshots : [],
                    assignedTo: (Array.isArray(x.assignedTo) ? x.assignedTo : []).map((a) => ({
                        ...a,
                        photo: photoFor(a.id),
                    })),
                    reporterId: x.reporterId || "",
                    reporterName: x.reporterName || x.reporterId || "—",
                    reporterPhoto: photoFor(x.reporterId),
                    createdMs: toMs(x.createdAt),
                    updatedMs: toMs(x.updatedAt),
                });
            });
            setIssues(list);
        } catch (e) {
            console.error(e);
            showToast(t("aiLoadError"), "error");
        } finally {
            setLoading(false);
        }
    };

    const showToast = (text, type = "success") => {
        setToast({ text, type });
        setTimeout(() => setToast({ text: "", type: "" }), 3000);
    };

    const changeStatus = async (issue, status) => {
        if (!issue?.id || issue.status === status) return;
        setBusyId(issue.id);
        try {
            await updateDoc(doc(db, "issues", issue.id), {
                status,
                updatedAt: serverTimestamp(),
                updatedBy: currentUserId,
                ...(status === "Resolved" || status === "Closed"
                    ? { resolvedAt: new Date().toISOString(), resolvedBy: currentUserId }
                    : {}),
            });
            await logAdminAction("update_issue_status", {
                targetId: issue.id,
                details: t("logIssueStatus", { title: issue.title, status }),
            });
            setIssues((prev) =>
                prev.map((i) => (i.id === issue.id ? { ...i, status, updatedMs: Date.now() } : i))
            );
            showToast(t("aiStatusUpdated", { status: t(`aiStatus_${statusKey(status)}`) }));
        } catch (e) {
            console.error(e);
            showToast(t("aiUpdateError"), "error");
        } finally {
            setBusyId(null);
        }
    };

    const deleteIssue = async () => {
        const issue = confirmDel;
        if (!issue?.id) return;
        setConfirmDel(null);
        setBusyId(issue.id);
        try {
            await deleteDoc(doc(db, "issues", issue.id));
            await logAdminAction("delete_issue", {
                targetId: issue.id,
                details: t("logIssueDeleted", { title: issue.title }),
            });
            setIssues((prev) => prev.filter((i) => i.id !== issue.id));
            showToast(t("aiDeleted"));
        } catch (e) {
            console.error(e);
            showToast(t("aiDeleteError"), "error");
        } finally {
            setBusyId(null);
        }
    };

    /* ---------------- derived ---------------- */
    const counts = useMemo(() => ({
        total: issues.length,
        open: issues.filter((i) => i.status === "Open").length,
        inProgress: issues.filter((i) => i.status === "In Progress").length,
        resolved: issues.filter((i) => i.status === "Resolved" || i.status === "Closed").length,
        critical: issues.filter((i) => i.severity === "critical" && i.status !== "Resolved" && i.status !== "Closed").length,
    }), [issues]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list = issues.filter((i) => {
            if (statusFilter !== "all" && i.status !== statusFilter) return false;
            if (sevFilter !== "all" && i.severity !== sevFilter) return false;
            if (!q) return true;
            return [i.title, i.description, i.area, i.reporterName, i.reporterId,
            ...i.assignedTo.map((a) => a.name)]
                .some((v) => String(v || "").toLowerCase().includes(q));
        });
        if (sortBy === "newest") list.sort((a, b) => b.createdMs - a.createdMs);
        else if (sortBy === "oldest") list.sort((a, b) => a.createdMs - b.createdMs);
        else if (sortBy === "severity") list.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || b.createdMs - a.createdMs);
        return list;
    }, [issues, search, statusFilter, sevFilter, sortBy]);

    const fmt = (ms) => (ms ? new Date(ms).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }) : "—");

    const exportCSV = () => {
        if (filtered.length === 0) return;
        const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const head = ["Title", "Severity", "Status", "Area", "Reporter", "Reporter ID", "Assigned To", "Screenshots", "Created", "Description"];
        const rows = filtered.map((i) => [
            i.title, i.severity, i.status, i.area, i.reporterName, i.reporterId,
            i.assignedTo.map((a) => a.name).join("; "),
            i.screenshots.join(" "),
            fmt(i.createdMs), i.description,
        ].map(esc).join(","));
        const csv = "\uFEFF" + [head.map(esc).join(","), ...rows].join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `admin-issues-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(t("aiExported"));
    };

    const statusIcon = (s) =>
        s === "Open" ? I.clock : s === "In Progress" ? I.inprogress : I.check;

    return (
        <div className="ais__page" data-theme={theme}>
            <div className="ais__blob ais__blob--1" />
            <div className="ais__blob ais__blob--2" />

            <button className="ais__back" onClick={() => navigate("/admin-dashboard")}>
                {I.back} {t("back")}
            </button>

            {toast.text && (
                <div className={`ais__toast ais__toast--${toast.type}`} role="status">
                    {toast.type === "error" ? I.alert : I.check}<span>{toast.text}</span>
                </div>
            )}

            <div className="ais__shell">

                {/* ---------- hero ---------- */}
                <header className="ais__hero">
                    <div className="ais__hero-text">
                        <span className="ais__eyebrow"><span className="ais__eyebrow-dot" />{t("adminPanel")}</span>
                        <h1 className="ais__title">
                            <span className="ais__title-ico">{I.bug}</span>
                            {t("adminIssuesBugs")}
                        </h1>
                        <p className="ais__sub">{t("aiSubtitle")}</p>
                    </div>
                    <div className="ais__hero-actions">
                        <button className="ais__ghost" onClick={fetchIssues} disabled={loading}>
                            {I.refresh} {t("refresh")}
                        </button>
                        <button className="ais__ghost" onClick={exportCSV} disabled={loading || filtered.length === 0}>
                            {I.download} {t("exportCSV")}
                        </button>
                        <button className="ais__primary" onClick={() => navigate("/report-issue")}>
                            {I.bug} {t("reportIssue")}
                        </button>
                    </div>
                </header>

                {/* ---------- stats ---------- */}
                <div className="ais__stats">
                    {[
                        { k: "total", n: counts.total, l: t("aiStatTotal"), ico: I.bug, tone: "indigo" },
                        { k: "open", n: counts.open, l: t("aiStatus_open"), ico: I.clock, tone: "amber" },
                        { k: "prog", n: counts.inProgress, l: t("aiStatus_inprogress"), ico: I.inprogress, tone: "blue" },
                        { k: "done", n: counts.resolved, l: t("aiStatResolved"), ico: I.check, tone: "green" },
                        { k: "crit", n: counts.critical, l: t("aiStatCritical"), ico: I.alert, tone: "red" },
                    ].map((s) => (
                        <div className={`ais__stat ais__stat--${s.tone}`} key={s.k}>
                            <span className="ais__stat-ico">{s.ico}</span>
                            <span className="ais__stat-body">
                                <span className="ais__stat-num">{loading ? "—" : s.n}</span>
                                <span className="ais__stat-lbl">{s.l}</span>
                            </span>
                        </div>
                    ))}
                </div>

                {/* ---------- toolbar ---------- */}
                <div className="ais__toolbar">
                    <div className="ais__search">
                        <span className="ais__search-ico">{I.search}</span>
                        <input
                            type="text"
                            value={search}
                            maxLength={60}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder={t("aiSearchPh")}
                            onChange={(e) =>
                                setSearch(e.target.value.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 60))
                            }
                            onKeyDown={(e) => {
                                if (
                                    e.key.length === 1 &&
                                    !/^[a-zA-Z0-9 ]$/.test(e.key) &&
                                    !(e.ctrlKey || e.metaKey)
                                ) {
                                    e.preventDefault();
                                }
                            }}
                            onPaste={(e) => {
                                e.preventDefault();
                                const clean = e.clipboardData.getData("text").replace(/[^a-zA-Z0-9 ]/g, "");
                                setSearch((prev) => (prev + clean).slice(0, 60));
                            }}
                        />
                        {search && (
                            <button className="ais__search-clear" onClick={() => setSearch("")} aria-label={t("clearSearch")}>
                                {I.close}
                            </button>
                        )}
                    </div>

                    <div className="ais__tabs">
                        {["all", ...STATUSES].map((s) => (
                            <button
                                key={s}
                                className={`ais__tab ${statusFilter === s ? "is-active" : ""} ais__tab--${statusKey(s)}`}
                                onClick={() => setStatusFilter(s)}
                            >
                                {s === "all" ? t("all") : t(`aiStatus_${statusKey(s)}`)}
                            </button>
                        ))}
                    </div>

                    <div className="ais__selects">
                        <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
                            <option value="all">{t("aiAllSeverities")}</option>
                            {SEVERITIES.map((s) => <option key={s} value={s}>{t(`riSev_${s}`)}</option>)}
                        </select>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="newest">{t("aiSortNewest")}</option>
                            <option value="oldest">{t("aiSortOldest")}</option>
                            <option value="severity">{t("aiSortSeverity")}</option>
                        </select>
                    </div>
                </div>

                <p className="ais__count">
                    {t("showingOf")} <b>{filtered.length}</b> {t("of")} <b>{issues.length}</b> {t("aiIssues")}
                </p>

                {/* ---------- list ---------- */}
                {loading ? (
                    <div className="ais__loading">
                        <div className="ais__loader"><div className="ais__ring" /><div className="ais__ring ais__ring--2" /></div>
                        <p>{t("loading")}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="ais__empty">
                        <span className="ais__empty-ico">{I.inbox}</span>
                        <p className="ais__empty-title">{issues.length === 0 ? t("aiNoIssues") : t("aiNoMatches")}</p>
                        <p className="ais__empty-sub">{issues.length === 0 ? t("aiNoIssuesSub") : t("aiNoMatchesSub")}</p>
                    </div>
                ) : (
                    <div className="ais__list">
                        {filtered.map((issue, idx) => {
                            const open = expanded === issue.id;
                            const busy = busyId === issue.id;
                            const done = issue.status === "Resolved" || issue.status === "Closed";
                            return (
                                <article
                                    key={issue.id}
                                    className={`ais__card ais__card--${issue.severity} ${done ? "is-done" : ""} ${open ? "is-open" : ""}`}
                                    style={{ animationDelay: `${Math.min(idx, 8) * 0.04}s` }}
                                >
                                    <div className="ais__card-rail" />

                                    <div className="ais__card-main">
                                        <div className="ais__card-head">
                                            <div className="ais__card-badges">
                                                <span className={`ais__sev ais__sev--${issue.severity}`}>
                                                    <span className="ais__sev-dot" />{t(`riSev_${issue.severity}`)}
                                                </span>
                                                <span className={`ais__status ais__status--${statusKey(issue.status)}`}>
                                                    {statusIcon(issue.status)}{t(`aiStatus_${statusKey(issue.status)}`)}
                                                </span>
                                                {issue.area && (
                                                    <span className="ais__area">{I.tag}{issue.area}</span>
                                                )}
                                            </div>
                                            <button
                                                className="ais__expand"
                                                onClick={() => setExpanded(open ? null : issue.id)}
                                                aria-expanded={open}
                                                aria-label={open ? t("aiCollapse") : t("aiExpand")}
                                            >
                                                {I.chevron}
                                            </button>
                                        </div>

                                        <h3 className="ais__card-title" onClick={() => setExpanded(open ? null : issue.id)}>
                                            {issue.title}
                                        </h3>

                                        <p className={`ais__desc ${open ? "" : "is-clamped"}`}>{issue.description}</p>

                                        {open && issue.screenshots.length > 0 && (
                                            <div className="ais__shots">
                                                {issue.screenshots.map((u, i) => (
                                                    <button key={u + i} className="ais__shot" onClick={() => setLightbox(u)}>
                                                        <img src={u} alt={`${issue.title} ${i + 1}`} loading="lazy" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div className="ais__meta">
                                            <span className="ais__meta-item ais__reporter">
                                                <Avatar src={issue.reporterPhoto} name={issue.reporterName} className="ais__av--reporter" />
                                                <b>{issue.reporterName}</b>
                                                {issue.reporterId && <code>{issue.reporterId}</code>}
                                            </span>
                                            <span className="ais__meta-item">{I.calendar}{fmt(issue.createdMs)}</span>
                                            {issue.screenshots.length > 0 && !open && (
                                                <span className="ais__meta-item">{I.image}{issue.screenshots.length}</span>
                                            )}
                                            {issue.assignedTo.length > 0 && (
                                                <span className="ais__assignees" title={issue.assignedTo.map((a) => a.name).join(", ")}>
                                                    {issue.assignedTo.slice(0, 4).map((a) => (
                                                        <Avatar key={a.id} src={a.photo} name={a.name} />
                                                    ))}
                                                    {issue.assignedTo.length > 4 && (
                                                        <span className="ais__av ais__av--more">+{issue.assignedTo.length - 4}</span>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="ais__card-actions">
                                        <div className="ais__status-select">
                                            <select
                                                value={issue.status}
                                                disabled={busy}
                                                onChange={(e) => changeStatus(issue, e.target.value)}
                                                aria-label={t("aiChangeStatus")}
                                            >
                                                {STATUSES.map((s) => <option key={s} value={s}>{t(`aiStatus_${statusKey(s)}`)}</option>)}
                                            </select>
                                            {busy && <span className="ais__spin" />}
                                        </div>
                                        <button
                                            className="ais__del"
                                            onClick={() => setConfirmDel(issue)}
                                            disabled={busy}
                                            aria-label={t("delete")}
                                            title={t("delete")}
                                        >
                                            {I.trash}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ---------- delete confirm ---------- */}
            {confirmDel && (
                <div className="ais__overlay" onClick={() => setConfirmDel(null)}>
                    <div className="ais__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ais__modal-ico">{I.trash}</div>
                        <h3 className="ais__modal-title">{t("aiDeleteTitle")}</h3>
                        <p className="ais__modal-msg">{t("aiDeleteMsg")}</p>
                        <p className="ais__modal-name">{confirmDel.title}</p>
                        <div className="ais__modal-actions">
                            <button className="ais__ghost" onClick={() => setConfirmDel(null)}>{t("cancel")}</button>
                            <button className="ais__danger" onClick={deleteIssue}>{I.trash} {t("yesDelete")}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---------- screenshot lightbox ---------- */}
            {lightbox && (
                <div className="ais__overlay ais__overlay--lb" onClick={() => setLightbox(null)}>
                    <button className="ais__lb-close" onClick={() => setLightbox(null)} aria-label={t("close")}>{I.close}</button>
                    <img className="ais__lb-img" src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}

export default AdminIssues;