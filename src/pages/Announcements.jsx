import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection, doc, getDoc, getDocs, limit, query,
    serverTimestamp, setDoc, where,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import "./Announcements.css";

/* ==================================================================
   ANNOUNCEMENTS  (user side)
   - Reads the SAME "announcements" records the admin manages in
     Announcement Management. Nothing is copied.
   - A user only receives announcements that are
       status == "published"  AND  audience == "all"
       OR  targetUserIds contains their id
     and only while  publishAt <= now  AND  (no expiresAt OR expiresAt > now).
     Drafts, archived, scheduled and expired ones never appear.
   - Read tracking: announcements/{id}/reads/{USERID}  { userId, readAt }
     (one small document per reader; the admin page counts these).
   - All text: translation.json -> "announcementUser" block
   ================================================================== */

const COL = "announcements";
const PAGE = 8;
const REFRESH_MS = 60000;

const PRIORITIES = ["normal", "important", "urgent"];
const PRIO_KEY = { normal: "prioNormal", important: "prioImportant", urgent: "prioUrgent" };

/* ---------------- icons ---------------- */
const Svg = ({ children, sw = 1.9 }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);
const I = {
    back: <Svg sw={2.2}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Svg>,
    megaphone: <Svg><path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></Svg>,
    bell: <Svg><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></Svg>,
    flag: <Svg><path d="M4 22V4" /><path d="M4 4h12l-2 4 2 4H4" /></Svg>,
    alert: <Svg><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Svg>,
    info: <Svg><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12.01" y2="8" /></Svg>,
    search: <Svg><circle cx="11" cy="11" r="7.5" /><line x1="21" y1="21" x2="16.8" y2="16.8" /></Svg>,
    calendar: <Svg><rect x="3" y="4" width="18" height="18" rx="2.5" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Svg>,
    clock: <Svg><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></Svg>,
    close: <Svg sw={2.2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>,
    arrow: <Svg sw={2.2}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Svg>,
    check: <Svg sw={2.4}><polyline points="20 6 9 17 4 12" /></Svg>,
    refresh: <Svg><polyline points="23 4 23 10 17 10" /><path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10" /></Svg>,
    lotus: <Svg sw={1.6}><path d="M12 4c1.6 1.9 2.4 3.8 2.4 5.6 0 1.6-.8 3.3-2.4 4.9-1.6-1.6-2.4-3.3-2.4-4.9C9.6 7.8 10.4 5.9 12 4z" /><path d="M3.5 11c2.6.2 4.8 1.3 6.3 3.4M20.5 11c-2.6.2-4.8 1.3-6.3 3.4" /><path d="M3 15.5c2 2.4 5.2 3.7 9 3.7s7-1.3 9-3.7" /></Svg>,
};
const PRIO_ICON = { normal: I.info, important: I.flag, urgent: I.alert };

/* ---------------- helpers ---------------- */
const toDate = (v) => {
    if (!v) return null;
    if (typeof v.toDate === "function") return v.toDate();
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};
const fmt = (d, locale) => (d ? d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "");
const prioOf = (a) => (PRIORITIES.includes(a.priority) ? a.priority : "normal");

/* the publication rules, applied again on the client as a safety net */
const isActive = (a, nowMs, uid) => {
    if (a.status !== "published") return false;
    const pub = toDate(a.publishAt);
    const exp = toDate(a.expiresAt);
    if (pub && pub.getTime() > nowMs) return false;          /* scheduled */
    if (exp && exp.getTime() <= nowMs) return false;         /* expired   */
    if (a.audience === "selected") {
        return (a.targetUserIds || []).map((x) => String(x).toUpperCase()).includes(uid);
    }
    return true;
};
const sortKey = (a) => (toDate(a.publishAt) || toDate(a.createdAt) || new Date(0)).getTime();

/* Escape to close + lock page scroll while the details dialog is open */
function useDialog(open, onClose) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);
}

function PriorityBadge({ priority, S }) {
    return (
        <span className={`annu__prio annu__prio--${priority}`}>
            {PRIO_ICON[priority]}{S(PRIO_KEY[priority])}
        </span>
    );
}

/* decorative header illustration (pure SVG, no image file needed) */
function Hero() {
    return (
        <div className="annu__hero-art" aria-hidden="true">
            <svg viewBox="0 0 460 230" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="annu-gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5eead4" /><stop offset="1" stopColor="#0ea5a0" /></linearGradient>
                    <linearGradient id="annu-gp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2dd4cf" /><stop offset="1" stopColor="#0f766e" /></linearGradient>
                    <linearGradient id="annu-gw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#ccfbf1" /></linearGradient>
                    <radialGradient id="annu-gg" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#5eead4" stopOpacity=".5" /><stop offset="1" stopColor="#5eead4" stopOpacity="0" /></radialGradient>
                </defs>
                <ellipse cx="270" cy="120" rx="190" ry="110" fill="url(#annu-gg)" />
                <g transform="rotate(-8 190 170)">
                    <rect x="110" y="140" width="150" height="80" rx="14" fill="#d9f7f4" />
                    <rect x="132" y="162" width="86" height="8" rx="4" fill="#99e6df" />
                    <rect x="132" y="180" width="62" height="8" rx="4" fill="#bdeee9" />
                </g>
                <g transform="rotate(-6 90 70)">
                    <path d="M40 30h110a14 14 0 0 1 14 14v52a14 14 0 0 1-14 14h-46l-26 22v-22h-38a14 14 0 0 1-14-14V44a14 14 0 0 1 14-14z" fill="url(#annu-gb)" />
                    <rect x="58" y="52" width="82" height="7" rx="3.5" fill="#fff" opacity=".95" />
                    <rect x="58" y="68" width="62" height="7" rx="3.5" fill="#fff" opacity=".8" />
                    <rect x="58" y="84" width="72" height="7" rx="3.5" fill="#fff" opacity=".65" />
                </g>
                <g transform="rotate(-24 300 120)">
                    <rect x="215" y="100" width="52" height="52" rx="16" fill="url(#annu-gb)" />
                    <path d="M258 96 L352 38 Q372 30 372 54 V186 Q372 210 352 200 L258 146 Z" fill="url(#annu-gw)" />
                    <ellipse cx="362" cy="120" rx="26" ry="78" fill="url(#annu-gp)" />
                    <ellipse cx="362" cy="120" rx="14" ry="52" fill="#0b4f4c" opacity=".55" />
                    <circle cx="362" cy="120" r="9" fill="#f0a64b" />
                    <rect x="236" y="148" width="24" height="46" rx="9" fill="url(#annu-gb)" />
                </g>
                <path d="M410 40l22-16 10 22-18 4z" fill="#fbbf24" />
                <path d="M36 150l22 10-14 16z" fill="#f59e0b" />
                <circle cx="418" cy="70" r="9" fill="#f472b6" />
                <path d="M410 150q26 6 30 30-26-4-30-30z" fill="#14b8a6" />
                <path d="M338 200q16-26 38-12-8 24-38 12z" fill="#60a5fa" />
            </svg>
        </div>
    );
}

function Waves() {
    return (
        <svg className="annu__waves" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
            <path className="annu__wave annu__wave--a" d="M0 220 C 240 120 480 140 720 200 C 960 260 1200 250 1440 160 V320 H0 Z" />
            <path className="annu__wave annu__wave--b" d="M0 270 C 300 200 560 230 820 260 C 1080 290 1260 270 1440 230 V320 H0 Z" />
        </svg>
    );
}

/* ---------------- one announcement card ---------------- */
function AnnouncementCard({ a, unread, onOpen, S, locale, idx }) {
    const p = prioOf(a);
    const pub = toDate(a.publishAt) || toDate(a.createdAt);
    const exp = toDate(a.expiresAt);
    const preview = String(a.message || "").replace(/\s+/g, " ").trim();
    return (
        <article
            className={`annu__card annu__card--${p}${unread ? " is-unread" : ""}`}
            style={{ "--i": idx }}
            onClick={() => onOpen(a.id)}
        >
            <span className={`annu__tile annu__tile--${p}`}>{p === "urgent" ? I.alert : I.megaphone}</span>

            <div className="annu__card-main">
                <div className="annu__card-top">
                    <h3 className="annu__card-title">{a.title}</h3>
                    {unread && <span className="annu__new"><span className="annu__dot" />{S("unread")}</span>}
                </div>
                <p className="annu__card-text">{preview}</p>
                <div className="annu__meta">
                    <PriorityBadge priority={p} S={S} />
                    {pub && <span className="annu__meta-item">{I.calendar}{S("published")}: {fmt(pub, locale)}</span>}
                    {exp && <span className="annu__meta-item">{I.clock}{S("expires")}: {fmt(exp, locale)}</span>}
                </div>
            </div>

            <button type="button" className="annu__btn annu__btn--soft" onClick={(e) => { e.stopPropagation(); onOpen(a.id); }} aria-label={`${S("viewDetails")}: ${a.title}`}>
                {S("viewDetails")}{I.arrow}
            </button>
        </article>
    );
}

/* ---------------- details dialog ---------------- */
function DetailsDialog({ a, unread, onClose, S, locale }) {
    const closeRef = useRef(null);
    useDialog(true, onClose);
    useEffect(() => { closeRef.current?.focus(); }, []);
    const p = prioOf(a);
    const pub = toDate(a.publishAt) || toDate(a.createdAt);
    const exp = toDate(a.expiresAt);
    return (
        <div className="annu__overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={`annu__dialog annu__dialog--${p}`} role="dialog" aria-modal="true" aria-labelledby="annu-dlg-title">
                <header className="annu__dlg-head">
                    <span className={`annu__tile annu__tile--${p}`}>{p === "urgent" ? I.alert : I.megaphone}</span>
                    <div className="annu__dlg-head-text">
                        <p className="annu__dlg-kicker">{S("detailsLabel")}</p>
                        <h2 id="annu-dlg-title" className="annu__dlg-title">{a.title}</h2>
                    </div>
                    <button type="button" ref={closeRef} className="annu__icon-btn" onClick={onClose} aria-label={S("close")}>{I.close}</button>
                </header>

                <div className="annu__dlg-body">
                    <div className="annu__meta">
                        <PriorityBadge priority={p} S={S} />
                        {unread && <span className="annu__new"><span className="annu__dot" />{S("unread")}</span>}
                    </div>

                    <dl className="annu__dl">
                        <div><dt>{I.calendar}{S("published")}</dt><dd>{pub ? fmt(pub, locale) : "—"}</dd></div>
                        <div><dt>{I.clock}{S("expires")}</dt><dd>{exp ? fmt(exp, locale) : S("noExpiry")}</dd></div>
                    </dl>

                    <section>
                        <h3 className="annu__label">{S("message")}</h3>
                        <p className="annu__full-text">{a.message}</p>
                    </section>

                    {a.description && (
                        <section className="annu__note">
                            <h3 className="annu__label">{S("instructions")}</h3>
                            <p className="annu__full-text">{a.description}</p>
                        </section>
                    )}
                </div>

                <footer className="annu__dlg-foot">
                    <button type="button" className="annu__btn annu__btn--primary" onClick={onClose}>{S("close")}</button>
                </footer>
            </div>
        </div>
    );
}

/* ================================================================== */
function Announcements() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const S = useCallback((k, o) => t(`announcementUser.${k}`, o), [t]);
    const locale = i18n.resolvedLanguage || i18n.language || undefined;
    const theme = localStorage.getItem("dashTheme") || "dark";

    const [uid, setUid] = useState("");
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [readIds, setReadIds] = useState(() => new Set());
    const [readsOk, setReadsOk] = useState(true);
    const [now, setNow] = useState(() => Date.now());
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [shown, setShown] = useState(PAGE);
    const [openId, setOpenId] = useState(null);

    const readRef = useRef(new Set());       /* ids this user has read */
    const pendingRef = useRef(new Set());    /* read-writes in flight  */

    /* ---------------- who is this user? (same lookup as My Notifications) ---------------- */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) { navigate("/"); return; }
            try {
                const res = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid), limit(1)));
                if (res.empty) { navigate("/"); return; }
                const d = res.docs[0];
                if (d.data().role === "admin") { navigate("/admin-dashboard"); return; }
                setUid(d.id.toUpperCase());
            } catch (e) {
                console.error("Announcements: user lookup", e);
                setError(true);
                setLoading(false);
            }
        });
        return () => unsub();
    }, [navigate]);

    /* ---------------- load: only what this user may receive ---------------- */
    const load = useCallback(async (silent = false) => {
        if (!uid) return;
        if (!silent) { setLoading(true); setError(false); }
        try {
            const base = collection(db, COL);
            const forEveryone = getDocs(query(base, where("audience", "==", "all"), where("status", "==", "published")));
            const forMe = (async () => {
                try {
                    return await getDocs(query(base, where("targetUserIds", "array-contains", uid), where("status", "==", "published")));
                } catch (e) {
                    /* if Firestore asks for a composite index, fall back to the single-filter query */
                    if (e?.code === "failed-precondition") return getDocs(query(base, where("targetUserIds", "array-contains", uid)));
                    throw e;
                }
            })();
            const [a, b] = await Promise.all([forEveryone, forMe]);

            const map = new Map();
            [...a.docs, ...b.docs].forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
            const list = [...map.values()].filter((x) => x.status === "published");
            setItems(list);
            setError(false);

            /* which of them has this user already read? (only look up ones not known to be read) */
            const need = list.filter((x) => isActive(x, Date.now(), uid) && !readRef.current.has(x.id));
            if (need.length) {
                const res = await Promise.allSettled(need.map((x) => getDoc(doc(db, COL, x.id, "reads", uid))));
                res.forEach((r, i) => { if (r.status === "fulfilled" && r.value.exists()) readRef.current.add(need[i].id); });
                setReadsOk(res.some((r) => r.status === "fulfilled"));
                setReadIds(new Set(readRef.current));
            }
        } catch (e) {
            console.error("Announcements: load", e);
            if (!silent) setError(true);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [uid]);

    useEffect(() => { load(false); }, [load]);

    /* keep fresh: clock for schedule/expiry, quiet refetch for edits/unpublish */
    useEffect(() => {
        const tick = setInterval(() => setNow(Date.now()), 30000);
        const refetch = setInterval(() => load(true), REFRESH_MS);
        const onVisible = () => { if (document.visibilityState === "visible") { setNow(Date.now()); load(true); } };
        document.addEventListener("visibilitychange", onVisible);
        return () => { clearInterval(tick); clearInterval(refetch); document.removeEventListener("visibilitychange", onVisible); };
    }, [load]);

    /* ---------------- derived lists ---------------- */
    const active = useMemo(
        () => items.filter((a) => isActive(a, now, uid)).sort((x, y) => sortKey(y) - sortKey(x)),
        [items, now, uid]
    );
    const isUnread = (id) => readsOk && !readIds.has(id);
    const important = active.filter((a) => prioOf(a) !== "normal");
    const unreadCount = readsOk ? active.filter((a) => !readIds.has(a.id)).length : null;

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return active.filter((a) => {
            if (filter === "unread" && !(readsOk && !readIds.has(a.id))) return false;
            if (filter === "important" && prioOf(a) === "normal") return false;
            if (q && !`${a.title || ""} ${a.message || ""}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [active, filter, search, readsOk, readIds]);

    useEffect(() => { setShown(PAGE); }, [filter, search]);

    const opened = openId ? active.find((a) => a.id === openId) : null;

    /* ---------------- open + mark read (saved per user) ---------------- */
    const markRead = useCallback(async (id) => {
        if (!uid || !readsOk || readRef.current.has(id) || pendingRef.current.has(id)) return;
        pendingRef.current.add(id);
        try {
            await setDoc(doc(db, COL, id, "reads", uid), { userId: uid, readAt: serverTimestamp() });
            readRef.current.add(id);
            setReadIds(new Set(readRef.current));
        } catch (e) {
            console.warn("Announcements: could not save read status", e);
        } finally {
            pendingRef.current.delete(id);
        }
    }, [uid, readsOk]);

    const openAnnouncement = useCallback((id) => { setOpenId(id); markRead(id); }, [markRead]);
    const closeDialog = useCallback(() => setOpenId(null), []);

    /* ---------------- render ---------------- */
    const cards = [
        { key: "total", tone: "indigo", icon: I.megaphone, label: S("statTotal"), value: active.length },
        { key: "unread", tone: "blue", icon: I.bell, label: S("statUnread"), value: unreadCount === null ? "—" : unreadCount, hint: unreadCount === null ? S("unreadUnavailable") : undefined },
        { key: "important", tone: "orange", icon: I.flag, label: S("statImportant"), value: important.length },
    ];
    const filters = [
        { key: "all", label: S("fAll"), n: active.length },
        ...(readsOk ? [{ key: "unread", label: S("fUnread"), n: unreadCount }] : []),
        { key: "important", label: S("fImportant"), n: important.length },
    ];

    let emptyTitle = "";
    let emptyText = "";
    let emptyIcon = I.megaphone;
    if (!loading && !error && visible.length === 0) {
        if (active.length === 0) { emptyTitle = S("emptyAll"); emptyText = S("emptyAllHint"); }
        else if (search.trim()) { emptyTitle = S("emptySearch"); emptyText = S("emptySearchHint"); emptyIcon = I.search; }
        else if (filter === "unread") { emptyTitle = S("emptyUnread"); emptyText = S("emptyUnreadHint"); emptyIcon = I.check; }
        else { emptyTitle = S("emptyImportant"); emptyText = S("emptyImportantHint"); emptyIcon = I.flag; }
    }

    return (
        <div className="annu" data-theme={theme}>
            <Waves />

            <button type="button" className="annu__back" onClick={() => navigate("/user-dashboard")}>
                {I.back}{t("back")}
            </button>

            {/* ============================ HEADER ============================ */}
            <header className="annu__head">
                <div className="annu__head-text">
                    <span className="annu__eyebrow">{I.lotus}{S("eyebrow")}</span>
                    <h1 className="annu__title">
                        <span className="annu__title-accent">{S("title")}</span>
                        {!loading && !error && unreadCount > 0 && <span className="annu__chip" aria-live="polite">{S("unreadChip", { n: unreadCount })}</span>}
                    </h1>
                    <p className="annu__subtitle">{S("subtitle")}</p>
                </div>
                <Hero />
            </header>

            {/* ============================ SUMMARY ============================ */}
            <section className="annu__stats" aria-label={S("summary")}>
                {cards.map((c) => (
                    <div className={`annu__stat annu__stat--${c.tone}`} key={c.key} title={c.hint}>
                        <span className="annu__stat-icon">{c.icon}</span>
                        <div className="annu__stat-body">
                            <p className="annu__stat-label">{c.label}</p>
                            <p className="annu__stat-value">{loading ? <span className="annu__skel annu__skel--num" /> : c.value}</p>
                        </div>
                        <span className="annu__bars" aria-hidden="true"><i /><i /><i /><i /></span>
                    </div>
                ))}
            </section>

            {/* ============================ FILTERS ============================ */}
            <section className="annu__bar" aria-label={S("filtersLabel")}>
                <div className="annu__filters" role="group" aria-label={S("filtersLabel")}>
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            className={`annu__filter${filter === f.key ? " is-on" : ""}`}
                            aria-pressed={filter === f.key}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label}{!loading && f.n !== null && <span className="annu__filter-n">{f.n}</span>}
                        </button>
                    ))}
                </div>
                <label className="annu__search">
                    {I.search}
                    <input
                        type="search"
                        value={search}
                        maxLength={80}
                        placeholder={S("searchPh")}
                        aria-label={S("searchPh")}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </label>
            </section>

            {/* ============================ LIST ============================ */}
            <section className="annu__list" aria-label={S("listLabel")}>
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <div className="annu__skel annu__skel--card" key={i} />)
                ) : error ? (
                    <div className="annu__state annu__state--error" role="alert">
                        <span className="annu__state-icon">{I.alert}</span>
                        <h2>{S("errorTitle")}</h2>
                        <p>{S("errorText")}</p>
                        <button type="button" className="annu__btn annu__btn--primary" onClick={() => load(false)}>{I.refresh}{S("retry")}</button>
                    </div>
                ) : visible.length === 0 ? (
                    <div className="annu__state">
                        <span className="annu__state-icon">{emptyIcon}</span>
                        <h2>{emptyTitle}</h2>
                        <p>{emptyText}</p>
                        {search.trim() && active.length > 0 && (
                            <button type="button" className="annu__btn annu__btn--soft" onClick={() => setSearch("")}>{S("clearSearch")}</button>
                        )}
                    </div>
                ) : (
                    <>
                        {visible.slice(0, shown).map((a, idx) => (
                            <AnnouncementCard key={a.id} a={a} idx={idx} unread={isUnread(a.id)} onOpen={openAnnouncement} S={S} locale={locale} />
                        ))}
                        {visible.length > shown && (
                            <button type="button" className="annu__btn annu__btn--ghost annu__more" onClick={() => setShown((n) => n + PAGE)}>
                                {S("showMore", { n: visible.length - shown })}
                            </button>
                        )}
                    </>
                )}
            </section>

            {opened && <DetailsDialog a={opened} unread={isUnread(opened.id)} onClose={closeDialog} S={S} locale={locale} />}
        </div>
    );
}

export default Announcements;