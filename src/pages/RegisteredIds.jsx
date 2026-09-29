import React, { useEffect, useMemo, useState } from "react";
import "./RegisteredIds.css";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { collection, getDocs, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

import useAutoLogout from "../hooks/useAutoLogout";

/* ------------------------------------------------------------------ */
/* Icons                                                              */
/* ------------------------------------------------------------------ */
const svgProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
};

const icons = {
    trash: (<svg {...svgProps}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>),
    barChart: (<svg {...svgProps}><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="15" /></svg>),
    shieldCheck: (<svg {...svgProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>),
    coins: (<svg {...svgProps}><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></svg>),
    tag: (<svg {...svgProps}><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>),
    phone: (<svg {...svgProps}><rect x="6" y="2" width="12" height="20" rx="2.5" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>),
    link: (<svg {...svgProps}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>),
    pulse: (<svg {...svgProps}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>),
    calendar: (<svg {...svgProps}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>),
    gear: (<svg {...svgProps}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>),
    eye: (<svg {...svgProps}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>),
    chevronRight: (<svg {...svgProps}><polyline points="9 18 15 12 9 6" /></svg>),
    chevronDown: (<svg {...svgProps}><polyline points="6 9 12 15 18 9" /></svg>),
    wifi: (<svg {...svgProps}><path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M1.5 9a15 15 0 0 1 21 0" /><path d="M8.5 16a5 5 0 0 1 7 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>),
    xCircle: (<svg {...svgProps}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>),
    checkCircle: (<svg {...svgProps}><circle cx="12" cy="12" r="10" /><polyline points="8 12 11 15 16 9" /></svg>),
    grid: (<svg {...svgProps}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>),
    funnel: (<svg {...svgProps}><polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3" /></svg>),
    sort: (<svg {...svgProps}><path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" /></svg>),
    back: (
        <svg {...svgProps}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
    ),
    search: (
        <svg {...svgProps}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
    ),
    refresh: (
        <svg {...svgProps}><polyline points="23 4 23 10 17 10" /><path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10" /></svg>
    ),
    copy: (
        <svg {...svgProps}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
    ),
    check: (
        <svg {...svgProps} strokeWidth="2.6"><polyline points="20 6 9 17 4 12" /></svg>
    ),
    close: (
        <svg {...svgProps} strokeWidth="2.4"><path d="M6 6l12 12M18 6L6 18" /></svg>
    ),
    list: (
        <svg {...svgProps}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
    ),
    users: (
        <svg {...svgProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
    idCard: (
        <svg {...svgProps}><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M13 12h5" /><path d="M13 16h3" /></svg>
    ),
    clock: (
        <svg {...svgProps}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
    ),
    cash: (
        <svg {...svgProps}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><line x1="6" y1="12" x2="6.01" y2="12" /><line x1="18" y1="12" x2="18.01" y2="12" /></svg>
    ),
    inbox: (
        <svg {...svgProps}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>
    ),
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const toDate = (ts) => {
    if (!ts) return null;
    if (typeof ts.toDate === "function") return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
};

// Created  -> the ID has been generated
// Verified -> verified by an admin, ID not created yet
// Pending  -> registered, not verified yet
const getStatus = (r) => {
    if (r.idCreated === true) return "created";
    if (r.verifiedAt) return "verified";
    return "pending";
};

function CountUp({ value }) {
    const [n, setN] = useState(0);
    useEffect(() => {
        const end = Number(value) || 0;
        let raf, start;
        const step = (ts) => {
            start = start ?? ts;
            const p = Math.min((ts - start) / 700, 1);
            setN(Math.round(end * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [value]);
    return <>{n}</>;
}

function Select({ icon, value, onChange, label, children }) {
    return (
        <label className="rid-select">
            <span className="rid-select-icon">{icon}</span>
            <select value={value} onChange={onChange} aria-label={label}>{children}</select>
            <span className="rid-select-chev">{icons.chevronDown}</span>
        </label>
    );
}

function RegisteredIds() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    useAutoLogout();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [search, setSearch] = useState("");
    const [modeFilter, setModeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortDir, setSortDir] = useState("desc");

    const [selected, setSelected] = useState(null);
    const [copied, setCopied] = useState("");
    const [removing, setRemoving] = useState([]);
    const [confirm, setConfirm] = useState(null); // { type: "one", row } | { type: "all" }
    const [confirmText, setConfirmText] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState(null);

    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const fetchRegistrations = async () => {
        try {
            setLoading(true);
            setError(false);
            const snap = await getDocs(collection(db, "idRegistrations"));
            const list = snap.docs.map((d) => {
                const data = d.data();
                return { docId: d.id, ...data, _created: toDate(data.createdAt) };
            });
            setRows(list);
        } catch (err) {
            console.log(err);
            setError(true);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!auth.currentUser) {
            navigate("/");
            return;
        }
        fetchRegistrations();
    }, []);

    const showToast = (kind, msg) => {
        setToast({ kind, msg });
        setTimeout(() => setToast(null), 3200);
    };

    const closeConfirm = () => {
        if (deleting) return;
        setConfirm(null);
        setConfirmText("");
    };

    const wordOk =
        confirm?.type !== "all" || confirmText.trim().toUpperCase() === t("ridDeleteWord").toUpperCase();

    const handleDelete = async () => {
        if (!confirm || !wordOk) return;
        try {
            setDeleting(true);
            if (confirm.type === "one") {
                const id = confirm.row.docId;
                await deleteDoc(doc(db, "idRegistrations", id));
                setConfirm(null);
                setSelected(null);
                setRemoving((p) => [...p, id]);
                setTimeout(() => {
                    setRows((p) => p.filter((r) => r.docId !== id));
                    setRemoving((p) => p.filter((x) => x !== id));
                }, 380);
                showToast("ok", t("ridDeleted"));
            } else {
                for (let i = 0; i < rows.length; i += 400) {
                    const batch = writeBatch(db);
                    rows.slice(i, i + 400).forEach((r) => batch.delete(doc(db, "idRegistrations", r.docId)));
                    await batch.commit();
                }
                setConfirm(null);
                setSelected(null);
                setRows([]);
                showToast("ok", t("ridDeletedAll"));
            }
        } catch (err) {
            console.log(err);
            setConfirm(null);
            showToast("err", t("ridDeleteFailed"));
            if (confirm.type === "all") fetchRegistrations();
        } finally {
            setDeleting(false);
            setConfirmText("");
        }
    };

    const fmtDateTime = (d) =>
        d
            ? d.toLocaleString(i18n.language || undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
            })
            : "—";

    const copyValue = (val, key) => {
        navigator.clipboard?.writeText(String(val));
        setCopied(key);
        setTimeout(() => setCopied(""), 1500);
    };

    /* ---------- summary numbers (across all registrations) ---------- */
    const stats = useMemo(() => {
        let people = 0, created = 0, pending = 0, cash = 0;
        rows.forEach((r) => {
            people += Number(r.numberOfPeople) || 0;
            const s = getStatus(r);
            if (s === "created") created++;
            else pending++;
            if (r.cashCollected === true) cash++;
        });
        return { total: rows.length, people, created, pending, cash };
    }, [rows]);

    /* ---------- search + filters + sort ---------- */
    const q = search.trim().toLowerCase();
    const visible = useMemo(() => {
        const list = rows.filter((r) => {
            if (modeFilter !== "all" && (r.mode || "").toLowerCase() !== modeFilter) return false;
            if (statusFilter !== "all" && getStatus(r) !== statusFilter) return false;
            if (!q) return true;
            return [r.token, r.mobileNumber, r.createdBy, r.docId]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q));
        });
        list.sort((a, b) => {
            const ta = a._created ? a._created.getTime() : 0;
            const tb = b._created ? b._created.getTime() : 0;
            return sortDir === "desc" ? tb - ta : ta - tb;
        });
        return list;
    }, [rows, q, modeFilter, statusFilter, sortDir]);

    const filtersActive = q || modeFilter !== "all" || statusFilter !== "all";
    const clearFilters = () => {
        setSearch("");
        setModeFilter("all");
        setStatusFilter("all");
    };

    const titleWords = t("registeredIds").split(" ");
    const decoMap = { total: icons.barChart, people: icons.users, created: icons.shieldCheck, pending: icons.clock, cash: icons.coins };

    const statCards = [
        { key: "total", label: t("ridTotalRegistrations"), value: stats.total, icon: icons.list, accent: "blue" },
        { key: "people", label: t("ridTotalPeople"), value: stats.people, icon: icons.users, accent: "purple" },
        { key: "created", label: t("ridIdsCreated"), value: stats.created, icon: icons.idCard, accent: "green" },
        { key: "pending", label: t("ridPendingIds"), value: stats.pending, icon: icons.clock, accent: "amber" },
        { key: "cash", label: t("ridCashCollected"), value: stats.cash, icon: icons.cash, accent: "teal" },
    ];

    const StatusPill = ({ row }) => {
        const s = getStatus(row);
        const label =
            s === "created" ? t("ridStatusCreated") : s === "verified" ? t("ridStatusVerified") : t("ridStatusPending");
        return <span className={`rid-pill rid-pill--${s}`}>{s === "pending" ? icons.clock : icons.checkCircle}{label}</span>;
    };

    const ModePill = ({ mode }) => {
        const m = (mode || "").toLowerCase();
        if (!m) return <span className="rid-muted">—</span>;
        return (
            <span className={`rid-pill rid-pill--${m === "online" ? "online" : "offline"}`}>
                {icons.wifi}{m === "online" ? t("ridModeOnline") : t("ridModeOffline")}
            </span>
        );
    };

    const yesNo = (v) => (
        <span className={`rid-flag ${v === true ? "is-yes" : "is-no"}`}>
            {v === true ? t("ridYes") : t("ridNo")}
        </span>
    );

    const cashPill = (v) => (
        <span className={`rid-pill ${v === true ? "rid-pill--yes" : "rid-pill--no"}`}>
            {v === true ? icons.cash : icons.xCircle}
            {v === true ? t("ridYes") : t("ridNo")}
        </span>
    );

    const detailFields = selected
        ? [
            { label: t("ridToken"), value: selected.token, copy: "token" },
            { label: t("ridMobile"), value: selected.mobileNumber, copy: "mobile" },
            { label: t("ridMode"), node: <ModePill mode={selected.mode} /> },
            { label: t("ridPeople"), value: selected.numberOfPeople },
            { label: t("ridCash"), node: yesNo(selected.cashCollected) },
            { label: t("ridCreateIdStatus"), node: yesNo(selected.createIdStatus) },
            { label: t("ridIdCreated"), node: yesNo(selected.idCreated) },
            { label: t("ridCreatedBy"), value: selected.createdBy },
            { label: t("ridCreatedAt"), value: fmtDateTime(selected._created) },
            { label: t("ridVerifiedBy"), value: selected.verifiedBy },
            { label: t("ridVerifiedAt"), value: fmtDateTime(toDate(selected.verifiedAt)) },
            { label: t("ridIdCreatedBy"), value: selected.idCreatedBy },
            { label: t("ridIdCreatedAt"), value: fmtDateTime(toDate(selected.idCreatedAt)) },
            { label: t("ridDocId"), value: selected.docId, copy: "docId" },
        ]
        : [];

    return (
        <div className="rid-shell" data-theme={theme}>
            <button className="rid-back" onClick={() => navigate(-1)} aria-label={t("ridBack")}>
                {icons.back}
                <span>{t("ridBack")}</span>
            </button>
            <div className="rid-container">
                {/* ------------------------------ HEADER ------------------------------ */}
                <header className="rid-header">
                    <div className="rid-heading">
                        <h1 className="rid-title">
                            {titleWords.slice(0, -1).join(" ")}{titleWords.length > 1 ? " " : ""}
                            <span className="rid-title-accent">{titleWords[titleWords.length - 1]}</span>
                            <span className="rid-title-badge">{icons.shieldCheck}</span>
                        </h1>
                        <p className="rid-subtitle">{t("ridSubtitle")}</p>
                    </div>
                    <div className="rid-actions">
                        <button className="rid-refresh" onClick={fetchRegistrations} disabled={loading}>
                            <span className={loading ? "rid-spin" : ""}>{icons.refresh}</span>
                            {t("ridRefresh")}
                        </button>
                        <button className="rid-delall" onClick={() => setConfirm({ type: "all" })} disabled={loading || rows.length === 0}>
                            {icons.trash}
                            <span>{t("ridDeleteAll")}</span>
                        </button>
                    </div>
                </header>

                {/* ------------------------------ STATS ------------------------------- */}
                <section className="rid-stats">
                    {statCards.map((s, i) => (
                        <div className={`rid-stat rid-stat--${s.accent}`} key={s.key} style={{ "--i": i }}>
                            <span className="rid-stat-deco" aria-hidden="true">{decoMap[s.key]}</span>
                            <span className="rid-stat-icon">{s.icon}</span>
                            <div className="rid-stat-body">
                                <span className="rid-stat-label">{s.label}</span>
                                {loading ? <span className="rid-stat-skeleton" /> : <span className="rid-stat-value"><CountUp value={s.value} /></span>}
                            </div>
                        </div>
                    ))}
                </section>

                {/* ----------------------------- TOOLBAR ------------------------------ */}
                <section className="rid-toolbar">
                    <div className="rid-search">
                        <span className="rid-search-icon">{icons.search}</span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("ridSearchPlaceholder")}
                        />
                        {search && (
                            <button className="rid-search-clear" onClick={() => setSearch("")} aria-label={t("ridClear")}>
                                {icons.close}
                            </button>
                        )}
                    </div>

                    <div className="rid-filters">
                        <Select icon={icons.grid} value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} label={t("ridMode")}>
                            <option value="all">{t("ridAllModes")}</option>
                            <option value="online">{t("ridModeOnline")}</option>
                            <option value="offline">{t("ridModeOffline")}</option>
                        </Select>
                        <Select icon={icons.funnel} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label={t("ridStatus")}>
                            <option value="all">{t("ridAllStatuses")}</option>
                            <option value="created">{t("ridStatusCreated")}</option>
                            <option value="verified">{t("ridStatusVerified")}</option>
                            <option value="pending">{t("ridStatusPending")}</option>
                        </Select>
                        <Select icon={icons.sort} value={sortDir} onChange={(e) => setSortDir(e.target.value)} label={t("ridSort")}>
                            <option value="desc">{t("ridSortNewest")}</option>
                            <option value="asc">{t("ridSortOldest")}</option>
                        </Select>
                    </div>
                </section>

                {!loading && !error && rows.length > 0 && (
                    <p className="rid-count">
                        {t("ridShowing")} <strong>{visible.length}</strong> {t("ridOf")} <strong>{rows.length}</strong>
                        {filtersActive && (
                            <button className="rid-link" onClick={clearFilters}>{t("ridClearFilters")}</button>
                        )}
                    </p>
                )}

                {/* ------------------------------ TABLE ------------------------------- */}
                <section className="rid-card">
                    {loading ? (
                        <div className="rid-state"><div className="rid-loader" /></div>
                    ) : error ? (
                        <div className="rid-state">
                            <p className="rid-state-title">{t("ridLoadError")}</p>
                            <button className="rid-btn" onClick={fetchRegistrations}>{t("ridTryAgain")}</button>
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="rid-state">
                            <span className="rid-state-icon">{icons.inbox}</span>
                            <p className="rid-state-title">{t("ridNoData")}</p>
                            <p className="rid-state-sub">{t("ridNoDataSub")}</p>
                        </div>
                    ) : visible.length === 0 ? (
                        <div className="rid-state">
                            <span className="rid-state-icon">{icons.search}</span>
                            <p className="rid-state-title">{t("ridNoResults")}</p>
                            <button className="rid-btn" onClick={clearFilters}>{t("ridClearFilters")}</button>
                        </div>
                    ) : (
                        <div className="rid-table-wrap">
                            <table className="rid-table">
                                <thead>
                                    <tr>
                                        <th><span className="rid-th">{icons.tag}{t("ridToken")}</span></th>
                                        <th><span className="rid-th">{icons.phone}{t("ridMobile")}</span></th>
                                        <th><span className="rid-th">{icons.link}{t("ridMode")}</span></th>
                                        <th className="rid-num"><span className="rid-th">{icons.users}{t("ridPeople")}</span></th>
                                        <th><span className="rid-th">{icons.cash}{t("ridCash")}</span></th>
                                        <th><span className="rid-th">{icons.pulse}{t("ridStatus")}</span></th>
                                        <th><span className="rid-th">{icons.calendar}{t("ridRegisteredOn")}</span></th>
                                        <th><span className="rid-th">{icons.gear}{t("ridAction")}</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((r, idx) => (
                                        <tr key={r.docId} className={removing.includes(r.docId) ? "is-removing" : ""} style={{ "--i": Math.min(idx, 12) }} onClick={() => setSelected(r)}>
                                            <td data-label={t("ridToken")}>
                                                <span className="rid-token">{r.token || "—"}</span>
                                            </td>
                                            <td data-label={t("ridMobile")}>{r.mobileNumber || "—"}</td>
                                            <td data-label={t("ridMode")}><ModePill mode={r.mode} /></td>
                                            <td data-label={t("ridPeople")} className="rid-num">{r.numberOfPeople ?? "—"}</td>
                                            <td data-label={t("ridCash")}>{cashPill(r.cashCollected)}</td>
                                            <td data-label={t("ridStatus")}><StatusPill row={r} /></td>
                                            <td data-label={t("ridRegisteredOn")}><span className="rid-date-in">{icons.calendar}{fmtDateTime(r._created)}</span></td>
                                            <td className="rid-row-action"><div className="rid-btns">
                                                <button
                                                    className="rid-view"
                                                    onClick={(e) => { e.stopPropagation(); setSelected(r); }}
                                                >
                                                    {icons.eye}{t("ridView")}{icons.chevronRight}
                                                </button>
                                                <button
                                                    className="rid-del"
                                                    aria-label={t("ridDelete")}
                                                    onClick={(e) => { e.stopPropagation(); setConfirm({ type: "one", row: r }); }}
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
                </section>
            </div>

            {/* ---------------------------- DETAILS MODAL ---------------------------- */}
            {selected && createPortal(
                <div className="rid-overlay" data-theme={theme} onClick={() => setSelected(null)}>
                    <div className="rid-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <button className="rid-modal-close" onClick={() => setSelected(null)} aria-label={t("ridClose")}>
                            {icons.close}
                        </button>

                        <div className="rid-modal-head">
                            <span className="rid-modal-token">{selected.token || "—"}</span>
                            <StatusPill row={selected} />
                        </div>
                        <p className="rid-modal-sub">{t("ridDetails")}</p>

                        <div className="rid-detail-list">
                            {detailFields.map((f) => (
                                <div className="rid-detail" key={f.label}>
                                    <span className="rid-detail-label">{f.label}</span>
                                    <span className="rid-detail-value">
                                        {f.node ? f.node : (f.value ?? "") === "" ? "—" : f.value}
                                    </span>
                                    {f.copy && f.value && (
                                        <button
                                            className={`rid-copy${copied === f.copy ? " is-copied" : ""}`}
                                            onClick={() => copyValue(f.value, f.copy)}
                                            aria-label={t("ridCopy")}
                                        >
                                            {copied === f.copy ? icons.check : icons.copy}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button className="rid-modal-delete" onClick={() => setConfirm({ type: "one", row: selected })}>
                            {icons.trash}
                            {t("ridDelete")}
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* ---------------------------- CONFIRM DELETE ---------------------------- */}
            {confirm && createPortal(
                <div className="rid-overlay rid-overlay--top" data-theme={theme} onClick={closeConfirm}>
                    <div className="rid-modal rid-confirm" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
                        <span className="rid-confirm-icon">{icons.trash}</span>
                        <h3 className="rid-confirm-title">
                            {confirm.type === "all" ? t("ridDeleteAllTitle") : t("ridDeleteTitle")}
                        </h3>
                        <p className="rid-confirm-text">
                            {confirm.type === "all"
                                ? t("ridDeleteAllText", { count: rows.length })
                                : t("ridDeleteText", { token: confirm.row.token || confirm.row.docId })}
                        </p>
                        <p className="rid-confirm-note">{t("ridDeleteNote")}</p>
                        {confirm.type === "all" && (
                            <input
                                className="rid-confirm-input"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder={t("ridTypeToConfirm", { word: t("ridDeleteWord") })}
                                autoFocus
                            />
                        )}
                        <div className="rid-confirm-actions">
                            <button className="rid-btn-ghost" onClick={closeConfirm} disabled={deleting}>{t("ridCancel")}</button>
                            <button className="rid-btn-danger" onClick={handleDelete} disabled={deleting || !wordOk}>
                                {deleting ? t("ridDeleting") : confirm.type === "all" ? t("ridDeleteAll") : t("ridDelete")}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {toast && (
                <div className={`rid-toast rid-toast--${toast.kind}`} role="status">
                    {toast.kind === "ok" ? icons.checkCircle : icons.xCircle}
                    {toast.msg}
                </div>
            )}
        </div>
    );
}

export default RegisteredIds;