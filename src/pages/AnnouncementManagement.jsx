import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db } from "../firebase/firebase";
import {
    addDoc, collection, deleteDoc, doc, getDocs,
    serverTimestamp, Timestamp, updateDoc,
} from "firebase/firestore";
import { logAdminAction } from "../utils/logAdminAction";
import "./AnnouncementManagement.css";

/* ==================================================================
   ANNOUNCEMENT MANAGEMENT
   - All text: translation.json -> "announcementMgmt" block
   - Data: Firestore "announcements" (one record shared with the
     user-side Announcements page — no duplicate records)
   - Access: wrapped by <RequireAccess pageId="announcementManagement">

   Stored fields (announcements/{id}):
     title, message, description, priority        normal|important|urgent
     audience                                      all|selected
     targetUserIds[]                               UPPERCASE user ids
     status                                        draft|published|archived
     publishAt, expiresAt                          Firestore Timestamps (absolute time)
     createdAt/createdBy/createdByName, updatedAt/updatedBy

   "Scheduled" and "Expired" are NEVER stored. They are calculated:
     published + publishAt in the future  -> Scheduled
     published + expiresAt in the past    -> Expired
   ================================================================== */

const COL = "announcements";
const PAGE_SIZE = 10;
const TITLE_MAX = 120;
const MESSAGE_MAX = 2000;
const DESC_MAX = 1000;
const USER_LIST_LIMIT = 40;

/* Set to true ONLY after the user-side Announcements page writes one
   document per reader to  announcements/{id}/reads/{USERID}.
   While false, the details view says tracking is not enabled instead of
   showing numbers that would be invented. */
const READ_TRACKING_ENABLED = false;

const PRIORITIES = ["normal", "important", "urgent"];
const STATUSES = ["draft", "scheduled", "published", "expired", "archived"];
const PRIO_KEY = { normal: "prioNormal", important: "prioImportant", urgent: "prioUrgent" };
const STATUS_KEY = {
    draft: "statusDraft", scheduled: "statusScheduled", published: "statusPublished",
    expired: "statusExpired", archived: "statusArchived",
};

/* ---------------- icons ---------------- */
const Svg = ({ children, sw = 1.9 }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);
const I = {
    back: <Svg sw={2.2}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Svg>,
    plus: <Svg sw={2.2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Svg>,
    megaphone: <Svg><path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></Svg>,
    check: <Svg sw={2.4}><polyline points="20 6 9 17 4 12" /></Svg>,
    checkCircle: <Svg><circle cx="12" cy="12" r="9" /><polyline points="8 12.5 11 15.5 16 9.5" /></Svg>,
    file: <Svg><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" /></Svg>,
    clock: <Svg><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></Svg>,
    search: <Svg><circle cx="11" cy="11" r="7.5" /><line x1="21" y1="21" x2="16.8" y2="16.8" /></Svg>,
    eye: <Svg><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>,
    edit: <Svg><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Svg>,
    trash: <Svg><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></Svg>,
    close: <Svg sw={2.2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>,
    more: <Svg sw={2.4}><circle cx="12" cy="5" r=".8" /><circle cx="12" cy="12" r=".8" /><circle cx="12" cy="19" r=".8" /></Svg>,
    send: <Svg><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Svg>,
    pause: <Svg><circle cx="12" cy="12" r="9" /><line x1="10" y1="9" x2="10" y2="15" /><line x1="14" y1="9" x2="14" y2="15" /></Svg>,
    archive: <Svg><rect x="3" y="3" width="18" height="5" rx="1" /><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" /><line x1="10" y1="12" x2="14" y2="12" /></Svg>,
    restore: <Svg><polyline points="1 4 1 10 7 10" /><path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10" /></Svg>,
    alert: <Svg><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Svg>,
    info: <Svg><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12.01" y2="8" /></Svg>,
    users: <Svg><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>,
    left: <Svg sw={2.3}><polyline points="15 18 9 12 15 6" /></Svg>,
    right: <Svg sw={2.3}><polyline points="9 18 15 12 9 6" /></Svg>,
    layers: <Svg><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></Svg>,
    flag: <Svg><path d="M4 22V4" /><path d="M4 4h12l-2 4 2 4H4" /></Svg>,
    calendar: <Svg><rect x="3" y="4" width="18" height="18" rx="2.5" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Svg>,
    user: <Svg><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Svg>,
    chevron: <Svg sw={2.4}><polyline points="6 9 12 15 18 9" /></Svg>,
    checkFill: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" /><polyline points="7.5 12.5 10.5 15.5 16.5 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    lotus: <Svg sw={1.6}><path d="M12 4c1.6 1.9 2.4 3.8 2.4 5.6 0 1.6-.8 3.3-2.4 4.9-1.6-1.6-2.4-3.3-2.4-4.9C9.6 7.8 10.4 5.9 12 4z" /><path d="M3.5 11c2.6.2 4.8 1.3 6.3 3.4M20.5 11c-2.6.2-4.8 1.3-6.3 3.4" /><path d="M3 15.5c2 2.4 5.2 3.7 9 3.7s7-1.3 9-3.7" /></Svg>,
};

/* ---------------- date helpers (all times are absolute; shown in the viewer's local zone) ---------------- */
const pad = (n) => String(n).padStart(2, "0");
const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toHm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toDate = (v) => {
    if (!v) return null;
    if (typeof v.toDate === "function") return v.toDate();
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};
const combine = (date, time) => {
    if (!date) return null;
    const d = new Date(`${date}T${time || "00:00"}`);
    return Number.isNaN(d.getTime()) ? null : d;
};
const nextHour = () => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
};
const minuteOf = (d) => Math.floor(d.getTime() / 60000);
const fmt = (d, locale) =>
    d ? d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
const fmtDay = (d, locale) => (d ? d.toLocaleDateString(locale, { dateStyle: "medium" }) : "");
const fmtTime = (d, locale) => (d ? d.toLocaleTimeString(locale, { timeStyle: "short" }) : "");

/* stored status + dates -> what the admin and the user actually see */
const deriveStatus = (a, nowMs) => {
    if (a.status === "archived") return "archived";
    if (a.status !== "published") return "draft";
    const exp = toDate(a.expiresAt);
    const pub = toDate(a.publishAt);
    if (exp && exp.getTime() <= nowMs) return "expired";
    if (pub && pub.getTime() > nowMs) return "scheduled";
    return "published";
};

/* ---------------- form model ---------------- */
const emptyForm = () => ({
    title: "", message: "", description: "", priority: "normal",
    audience: "all", targetIds: [],
    mode: "now", pubDate: "", pubTime: "", expDate: "", expTime: "",
});

const formFrom = (a) => {
    const pub = toDate(a.publishAt);
    const exp = toDate(a.expiresAt);
    return {
        title: a.title || "",
        message: a.message || "",
        description: a.description || "",
        priority: PRIORITIES.includes(a.priority) ? a.priority : "normal",
        audience: a.audience === "selected" ? "selected" : "all",
        targetIds: Array.isArray(a.targetUserIds) ? a.targetUserIds.map((x) => String(x).toUpperCase()) : [],
        mode: pub ? "later" : "now",
        pubDate: pub ? toYmd(pub) : "",
        pubTime: pub ? toHm(pub) : "",
        expDate: exp ? toYmd(exp) : "",
        expTime: exp ? toHm(exp) : "",
    };
};

/* returns { field: translationKey } — empty object means valid */
function validate(f, intent, editing, nowMs) {
    const e = {};
    const publishing = intent === "publish";

    if (!f.title.trim()) e.title = "errTitle";
    if (!f.message.trim()) e.message = "errMessage";
    if (publishing && f.audience === "selected" && f.targetIds.length === 0) e.targets = "errTargets";

    let pub = null;
    if (f.mode === "later" && (publishing || f.pubDate || f.pubTime)) {
        pub = combine(f.pubDate, f.pubTime);
        if (!f.pubDate || !f.pubTime || !pub) e.pub = "errPubRequired";
    }

    let exp = null;
    if (f.expDate || f.expTime) {
        if (!f.expDate) e.exp = "errExpDate";
        else {
            exp = combine(f.expDate, f.expTime || "23:59");
            if (!exp) e.exp = "errExpDate";
        }
    }

    const start = f.mode === "now" ? new Date(nowMs) : pub;
    if (!e.exp && exp && start && exp.getTime() <= start.getTime()) e.exp = "errExpBeforePub";

    if (publishing && f.mode === "later" && pub && !e.pub) {
        const orig = editing && editing.status === "published" ? toDate(editing.publishAt) : null;
        const unchangedLive = orig && minuteOf(orig) === minuteOf(pub);
        if (pub.getTime() <= nowMs && !unchangedLive) e.pub = "errPubPast";
    }
    return e;
}

function buildPayload(f, intent, editing, nowMs) {
    let publishAt = null;
    if (f.mode === "now") {
        publishAt = intent === "publish" ? Timestamp.fromDate(new Date(nowMs)) : null;
    } else {
        const p = combine(f.pubDate, f.pubTime);
        if (p) {
            const orig = editing ? toDate(editing.publishAt) : null;
            /* keep the exact original timestamp if the admin didn't change it */
            publishAt = orig && minuteOf(orig) === minuteOf(p) ? editing.publishAt : Timestamp.fromDate(p);
        }
    }
    const exp = f.expDate ? combine(f.expDate, f.expTime || "23:59") : null;
    return {
        title: f.title.trim(),
        message: f.message.trim(),
        description: f.description.trim(),
        priority: f.priority,
        audience: f.audience,
        targetUserIds: f.audience === "selected" ? f.targetIds : [],
        status: intent === "publish" ? "published" : "draft",
        publishAt,
        expiresAt: exp ? Timestamp.fromDate(exp) : null,
    };
}

/* ------------------------------------------------------------------ */
/* Small building blocks (outside the page so inputs keep focus)       */
/* ------------------------------------------------------------------ */

/* Escape to close + lock page scroll while a dialog is open */
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

function Field({ id, label, error, hint, optionalText, children, S }) {
    return (
        <div className={`annm__field${error ? " has-error" : ""}`}>
            <label htmlFor={id} className="annm__label">
                {label}{optionalText && <span className="annm__optional"> ({optionalText})</span>}
            </label>
            {children}
            {hint && !error && <p className="annm__hint">{hint}</p>}
            {error && <p className="annm__error" role="alert">{S(error)}</p>}
        </div>
    );
}

function PriorityBadge({ priority, S }) {
    const p = PRIORITIES.includes(priority) ? priority : "normal";
    return <span className={`annm__prio annm__prio--${p}`}><span className="annm__dot" />{S(PRIO_KEY[p])}</span>;
}

function StatusBadge({ status, S }) {
    return (
        <span className={`annm__status annm__status--${status}`}>
            <span className="annm__dot" />{S(STATUS_KEY[status])}
        </span>
    );
}

/* select with a leading icon + chevron (the native <select> still does the work) */
function SelectBox({ icon, value, onChange, label, children }) {
    return (
        <div className="annm__selectbox">
            <span className="annm__selectbox-ico">{icon}</span>
            <select className="annm__select" value={value} onChange={onChange} aria-label={label}>{children}</select>
            <span className="annm__selectbox-chev">{I.chevron}</span>
        </div>
    );
}

/* page numbers with "…" gaps, e.g. 1 … 4 5 6 … 12 */
const pageList = (total, cur) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out = [1];
    const s = Math.max(2, cur - 1);
    const e = Math.min(total - 1, cur + 1);
    if (s > 2) out.push("gapL");
    for (let i = s; i <= e; i++) out.push(i);
    if (e < total - 1) out.push("gapR");
    out.push(total);
    return out;
};

/* decorative header illustration (pure SVG, no image file needed) */
function Hero() {
    return (
        <div className="annm__hero-art" aria-hidden="true">
            <svg viewBox="0 0 460 230" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="annm-gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#60a5fa" /><stop offset="1" stopColor="#4f46e5" /></linearGradient>
                    <linearGradient id="annm-gp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#818cf8" /><stop offset="1" stopColor="#6d28d9" /></linearGradient>
                    <linearGradient id="annm-gw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#ddd6fe" /></linearGradient>
                    <radialGradient id="annm-gg" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#c4b5fd" stopOpacity=".55" /><stop offset="1" stopColor="#c4b5fd" stopOpacity="0" /></radialGradient>
                </defs>
                <ellipse cx="270" cy="120" rx="190" ry="110" fill="url(#annm-gg)" />
                <g transform="rotate(-8 190 170)">
                    <rect x="110" y="140" width="150" height="80" rx="14" fill="#ede9fe" />
                    <rect x="132" y="162" width="86" height="8" rx="4" fill="#c4b5fd" />
                    <rect x="132" y="180" width="62" height="8" rx="4" fill="#ddd6fe" />
                </g>
                <g transform="rotate(-6 90 70)">
                    <path d="M40 30h110a14 14 0 0 1 14 14v52a14 14 0 0 1-14 14h-46l-26 22v-22h-38a14 14 0 0 1-14-14V44a14 14 0 0 1 14-14z" fill="url(#annm-gb)" />
                    <rect x="58" y="52" width="82" height="7" rx="3.5" fill="#fff" opacity=".95" />
                    <rect x="58" y="68" width="62" height="7" rx="3.5" fill="#fff" opacity=".8" />
                    <rect x="58" y="84" width="72" height="7" rx="3.5" fill="#fff" opacity=".65" />
                </g>
                <g transform="rotate(-24 300 120)">
                    <rect x="215" y="100" width="52" height="52" rx="16" fill="url(#annm-gb)" />
                    <path d="M258 96 L352 38 Q372 30 372 54 V186 Q372 210 352 200 L258 146 Z" fill="url(#annm-gw)" />
                    <ellipse cx="362" cy="120" rx="26" ry="78" fill="url(#annm-gp)" />
                    <ellipse cx="362" cy="120" rx="14" ry="52" fill="#3b1d8f" opacity=".55" />
                    <circle cx="362" cy="120" r="9" fill="#f472b6" />
                    <rect x="236" y="148" width="24" height="46" rx="9" fill="url(#annm-gb)" />
                </g>
                <path d="M410 40l22-16 10 22-18 4z" fill="#fbbf24" />
                <path d="M36 150l22 10-14 16z" fill="#f59e0b" />
                <circle cx="418" cy="70" r="9" fill="#f472b6" />
                <path d="M410 150q26 6 30 30-26-4-30-30z" fill="#8b5cf6" />
                <path d="M338 200q16-26 38-12-8 24-38 12z" fill="#2dd4bf" />
            </svg>
        </div>
    );
}

/* soft background waves at the bottom of the page */
function Waves() {
    return (
        <svg className="annm__waves" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
            <path className="annm__wave annm__wave--a" d="M0 220 C 240 120 480 140 720 200 C 960 260 1200 250 1440 160 V320 H0 Z" />
            <path className="annm__wave annm__wave--b" d="M0 270 C 300 200 560 230 820 260 C 1080 290 1260 270 1440 230 V320 H0 Z" />
        </svg>
    );
}

/* the card the user sees on their Announcements page */
function AnnouncementCard({ data, S }) {
    return (
        <article className={`annm__ucard annm__ucard--${data.priority}`}>
            <header className="annm__ucard-head">
                <PriorityBadge priority={data.priority} S={S} />
                <span className="annm__ucard-date">{data.pubText}</span>
            </header>
            <h3 className="annm__ucard-title">{data.title || S("untitled")}</h3>
            <p className="annm__ucard-msg">{data.message || S("noMessage")}</p>
            {data.description && (
                <div className="annm__ucard-note">
                    <span className="annm__ucard-note-label">{S("instructions")}</span>
                    <p>{data.description}</p>
                </div>
            )}
            <footer className="annm__ucard-foot">
                <span>{I.clock}{S("expires")}: {data.expText}</span>
                <span>{I.users}{data.audienceText}</span>
            </footer>
        </article>
    );
}

function ConfirmDialog({ title, text, confirmLabel, busy, onConfirm, onCancel, S }) {
    const cancelRef = useRef(null);
    useDialog(true, onCancel);
    useEffect(() => { cancelRef.current?.focus(); }, []);
    return (
        <div className="annm__overlay annm__overlay--center" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
            <div className="annm__dialog annm__dialog--sm" role="alertdialog" aria-modal="true" aria-labelledby="annm-confirm-title" aria-describedby="annm-confirm-text">
                <span className="annm__confirm-icon">{I.alert}</span>
                <h2 id="annm-confirm-title" className="annm__dialog-title">{title}</h2>
                <p id="annm-confirm-text" className="annm__confirm-text">{text}</p>
                <div className="annm__dialog-actions">
                    <button type="button" ref={cancelRef} className="annm__btn annm__btn--ghost" onClick={onCancel} disabled={busy}>{S("cancel")}</button>
                    <button type="button" className="annm__btn annm__btn--danger" onClick={onConfirm} disabled={busy}>
                        {busy ? S("working") : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* row action menu — positioned with fixed coordinates so the table never clips it */
function ActionMenu({ actions, label, onPick }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState(null);
    const btnRef = useRef(null);
    const menuRef = useRef(null);

    const close = useCallback((refocus) => {
        setOpen(false);
        if (refocus) btnRef.current?.focus();
    }, []);

    const toggle = () => {
        if (open) { close(); return; }
        const r = btnRef.current.getBoundingClientRect();
        const est = actions.length * 40 + 16;
        const up = r.bottom + est > window.innerHeight && r.top > est;
        setPos({
            right: Math.max(8, window.innerWidth - r.right),
            ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
        });
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
            if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        const onKey = (e) => { if (e.key === "Escape") close(true); };
        const onMove = () => setOpen(false);
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        window.addEventListener("resize", onMove);
        window.addEventListener("scroll", onMove, true);
        menuRef.current?.querySelector("button")?.focus({ preventScroll: true });
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", onMove);
            window.removeEventListener("scroll", onMove, true);
        };
    }, [open, close]);

    const onMenuKey = (e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        e.preventDefault();
        const items = Array.from(menuRef.current.querySelectorAll("button"));
        const i = items.indexOf(document.activeElement);
        const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next]?.focus();
    };

    return (
        <>
            <button
                type="button"
                ref={btnRef}
                className="annm__icon-btn"
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={toggle}
            >
                {I.more}
            </button>
            {open && pos && (
                <div className="annm__menu" role="menu" ref={menuRef} style={pos} onKeyDown={onMenuKey}>
                    {actions.map((a) => (
                        <button
                            key={a.key}
                            type="button"
                            role="menuitem"
                            className={`annm__menu-item${a.danger ? " is-danger" : ""}`}
                            onClick={() => { setOpen(false); onPick(a.key); }}
                        >
                            {a.icon}{a.label}
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}

/* searchable multi-select of users */
function UserPicker({ users, selected, onChange, usersError, S }) {
    const [q, setQ] = useState("");
    const selectedSet = useMemo(() => new Set(selected), [selected]);
    const byId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
    const matches = useMemo(() => {
        const s = q.trim().toLowerCase();
        return users.filter(
            (u) => !selectedSet.has(u.id) && (!s || u.id.toLowerCase().includes(s) || u.name.toLowerCase().includes(s))
        );
    }, [users, selectedSet, q]);
    const shown = matches.slice(0, USER_LIST_LIMIT);

    return (
        <div className="annm__picker">
            <label className="annm__search annm__search--sm">
                {I.search}
                <input
                    id="annm-user-search"
                    type="search"
                    value={q}
                    maxLength={60}
                    placeholder={S("userSearchPh")}
                    aria-label={S("userSearchPh")}
                    onChange={(e) => setQ(e.target.value)}
                />
            </label>

            {usersError ? (
                <p className="annm__picker-note">{S("usersLoadError")}</p>
            ) : (
                <>
                    <div className="annm__picker-bar">
                        <span>{S("selectedCount", { n: selected.length })}</span>
                        <span className="annm__picker-bar-actions">
                            {matches.length > 0 && (
                                <button type="button" className="annm__link" onClick={() => onChange([...selected, ...matches.map((m) => m.id)])}>
                                    {S("addAllShown", { n: matches.length })}
                                </button>
                            )}
                            {selected.length > 0 && (
                                <button type="button" className="annm__link annm__link--danger" onClick={() => onChange([])}>{S("clearAll")}</button>
                            )}
                        </span>
                    </div>

                    {selected.length > 0 && (
                        <ul className="annm__chips" aria-label={S("selectedUsers")}>
                            {selected.map((id) => {
                                const u = byId.get(id);
                                return (
                                    <li className="annm__chip" key={id}>
                                        <span>{u?.name ? `${u.name} · ${id}` : id}</span>
                                        <button type="button" aria-label={S("removeUser", { name: u?.name || id })} onClick={() => onChange(selected.filter((x) => x !== id))}>
                                            {I.close}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <ul className="annm__picker-list" aria-label={S("availableUsers")}>
                        {shown.length === 0 ? (
                            <li className="annm__picker-empty">{S("noUsersFound")}</li>
                        ) : shown.map((u) => (
                            <li key={u.id}>
                                <button type="button" className="annm__picker-row" onClick={() => onChange([...selected, u.id])}>
                                    <span className="annm__picker-name">{u.name || u.id}</span>
                                    <span className="annm__picker-id">{u.id}</span>
                                    <span className="annm__picker-add">{I.plus}</span>
                                </button>
                            </li>
                        ))}
                        {matches.length > shown.length && (
                            <li className="annm__picker-empty">{S("moreResults", { n: matches.length - shown.length })}</li>
                        )}
                    </ul>
                </>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Create / edit drawer (keeps its own form state + opens the preview) */
/* ------------------------------------------------------------------ */
const ERR_TARGET_ID = {
    title: "annm-title", message: "annm-message", targets: "annm-user-search",
    pub: "annm-pub-date", exp: "annm-exp-date",
};
const ERR_OF_FIELD = { pubDate: "pub", pubTime: "pub", expDate: "exp", expTime: "exp", targetIds: "targets" };

function AnnouncementDrawer({ editing, users, usersError, saving, onClose, onSubmit, S, locale, tz }) {
    const [f, setF] = useState(() => (editing ? formFrom(editing) : emptyForm()));
    const [errors, setErrors] = useState({});
    const [previewOpen, setPreviewOpen] = useState(false);
    const titleRef = useRef(null);

    useDialog(!previewOpen, onClose);
    useEffect(() => { titleRef.current?.focus(); }, []);

    const set = (k, v) => {
        setF((p) => ({ ...p, [k]: v }));
        const ek = ERR_OF_FIELD[k] || k;
        if (errors[ek]) setErrors((p) => { const n = { ...p }; delete n[ek]; return n; });
    };

    const setMode = (mode) => {
        setF((p) => {
            if (mode === "later" && !p.pubDate) {
                const d = nextHour();
                return { ...p, mode, pubDate: toYmd(d), pubTime: toHm(d) };
            }
            return { ...p, mode };
        });
        setErrors((p) => { const n = { ...p }; delete n.pub; delete n.exp; return n; });
    };

    const submit = (intent) => {
        const e = validate(f, intent, editing, Date.now());
        setErrors(e);
        const first = Object.keys(e)[0];
        if (first) {
            document.getElementById(ERR_TARGET_ID[first])?.focus();
            return;
        }
        onSubmit(f, intent);
    };

    const live = editing && editing.status === "published";
    const publishLabel = live
        ? S("saveChanges")
        : f.mode === "later" ? S("scheduleAnnouncement") : S("publishAnnouncement");

    const previewData = useMemo(() => {
        const pub = f.mode === "later" ? combine(f.pubDate, f.pubTime) : null;
        const exp = f.expDate ? combine(f.expDate, f.expTime || "23:59") : null;
        return {
            title: f.title.trim(),
            message: f.message.trim(),
            description: f.description.trim(),
            priority: f.priority,
            pubText: f.mode === "later" ? (pub ? fmt(pub, locale) : "—") : S("onPublish"),
            expText: exp ? fmt(exp, locale) : S("noExpiry"),
            audienceText: f.audience === "selected" ? S("audSelectedCount", { n: f.targetIds.length }) : S("audAll"),
        };
    }, [f, locale, S]);

    return (
        <div className="annm__overlay annm__overlay--drawer" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
            <aside className="annm__drawer" role="dialog" aria-modal="true" aria-labelledby="annm-drawer-title">
                <header className="annm__drawer-head">
                    <div>
                        <h2 id="annm-drawer-title" className="annm__dialog-title">{editing ? S("editAnnouncement") : S("createAnnouncement")}</h2>
                        <p className="annm__drawer-sub">{editing ? S("editSub") : S("createSub")}</p>
                    </div>
                    <button type="button" className="annm__icon-btn" onClick={onClose} aria-label={S("close")} disabled={saving}>{I.close}</button>
                </header>

                <div className="annm__drawer-body">
                    {/* ---------- basic information ---------- */}
                    <section className="annm__section" aria-labelledby="annm-sec-basic">
                        <h3 id="annm-sec-basic" className="annm__section-title">{S("secBasic")}</h3>

                        <Field id="annm-title" label={S("fTitle")} error={errors.title} S={S}>
                            <input
                                id="annm-title"
                                ref={titleRef}
                                className="annm__input"
                                type="text"
                                value={f.title}
                                maxLength={TITLE_MAX}
                                placeholder={S("fTitlePh")}
                                aria-required="true"
                                aria-invalid={Boolean(errors.title)}
                                onChange={(e) => set("title", e.target.value)}
                            />
                        </Field>

                        <Field id="annm-message" label={S("fMessage")} error={errors.message} S={S}>
                            <textarea
                                id="annm-message"
                                className="annm__input annm__textarea"
                                rows={5}
                                value={f.message}
                                maxLength={MESSAGE_MAX}
                                placeholder={S("fMessagePh")}
                                aria-required="true"
                                aria-invalid={Boolean(errors.message)}
                                onChange={(e) => set("message", e.target.value)}
                            />
                            <span className="annm__counter">{f.message.length}/{MESSAGE_MAX}</span>
                        </Field>

                        <Field id="annm-desc" label={S("fDescription")} optionalText={S("optional")} S={S}>
                            <textarea
                                id="annm-desc"
                                className="annm__input annm__textarea"
                                rows={3}
                                value={f.description}
                                maxLength={DESC_MAX}
                                placeholder={S("fDescriptionPh")}
                                onChange={(e) => set("description", e.target.value)}
                            />
                        </Field>

                        <fieldset className="annm__fieldset">
                            <legend className="annm__label">{S("fPriority")}</legend>
                            <div className="annm__seg annm__seg--3" role="radiogroup" aria-label={S("fPriority")}>
                                {PRIORITIES.map((p) => (
                                    <label key={p} className={`annm__seg-opt annm__seg-opt--${p}${f.priority === p ? " is-on" : ""}`}>
                                        <input type="radio" name="annm-priority" value={p} checked={f.priority === p} onChange={() => set("priority", p)} />
                                        <span className="annm__dot" />{S(PRIO_KEY[p])}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    </section>

                    {/* ---------- target audience ---------- */}
                    <section className="annm__section" aria-labelledby="annm-sec-aud">
                        <h3 id="annm-sec-aud" className="annm__section-title">{S("secAudience")}</h3>
                        <div className="annm__seg annm__seg--2" role="radiogroup" aria-label={S("secAudience")}>
                            {["all", "selected"].map((a) => (
                                <label key={a} className={`annm__seg-opt${f.audience === a ? " is-on" : ""}`}>
                                    <input type="radio" name="annm-audience" value={a} checked={f.audience === a} onChange={() => set("audience", a)} />
                                    {a === "all" ? S("audAll") : S("audSelected")}
                                </label>
                            ))}
                        </div>
                        <p className="annm__hint">{f.audience === "all" ? S("audAllHint") : S("audSelectedHint")}</p>

                        {f.audience === "selected" && (
                            <div className={`annm__field${errors.targets ? " has-error" : ""}`}>
                                <UserPicker users={users} selected={f.targetIds} onChange={(ids) => set("targetIds", ids)} usersError={usersError} S={S} />
                                {errors.targets && <p className="annm__error" role="alert">{S(errors.targets)}</p>}
                            </div>
                        )}
                    </section>

                    {/* ---------- publication settings ---------- */}
                    <section className="annm__section" aria-labelledby="annm-sec-pub">
                        <h3 id="annm-sec-pub" className="annm__section-title">{S("secPublication")}</h3>

                        <div className="annm__seg annm__seg--2" role="radiogroup" aria-label={S("secPublication")}>
                            {["now", "later"].map((m) => (
                                <label key={m} className={`annm__seg-opt${f.mode === m ? " is-on" : ""}`}>
                                    <input type="radio" name="annm-mode" value={m} checked={f.mode === m} onChange={() => setMode(m)} />
                                    {m === "now" ? S("publishNowOpt") : S("scheduleLaterOpt")}
                                </label>
                            ))}
                        </div>

                        {f.mode === "later" && (
                            <div className="annm__row2">
                                <Field id="annm-pub-date" label={S("fPubDate")} error={errors.pub} S={S}>
                                    <input id="annm-pub-date" className="annm__input" type="date" value={f.pubDate} aria-invalid={Boolean(errors.pub)} onChange={(e) => set("pubDate", e.target.value)} />
                                </Field>
                                <Field id="annm-pub-time" label={S("fPubTime")} S={S}>
                                    <input id="annm-pub-time" className="annm__input" type="time" value={f.pubTime} onChange={(e) => set("pubTime", e.target.value)} />
                                </Field>
                            </div>
                        )}

                        <div className="annm__row2">
                            <Field id="annm-exp-date" label={S("fExpDate")} optionalText={S("optional")} error={errors.exp} S={S}>
                                <input id="annm-exp-date" className="annm__input" type="date" value={f.expDate} aria-invalid={Boolean(errors.exp)} onChange={(e) => set("expDate", e.target.value)} />
                            </Field>
                            <Field id="annm-exp-time" label={S("fExpTime")} optionalText={S("optional")} hint={f.expDate && !f.expTime ? S("expTimeDefault") : undefined} S={S}>
                                <input id="annm-exp-time" className="annm__input" type="time" value={f.expTime} onChange={(e) => set("expTime", e.target.value)} />
                            </Field>
                        </div>
                        {(f.expDate || f.expTime) && (
                            <button type="button" className="annm__link" onClick={() => setF((p) => ({ ...p, expDate: "", expTime: "" }))}>{S("clearExpiry")}</button>
                        )}

                        <p className="annm__tz">{I.info}{S("tzNote", { tz })}</p>
                        <p className="annm__tz">{I.info}{S("statusNote")}</p>
                    </section>
                </div>

                <footer className="annm__drawer-foot">
                    <button type="button" className="annm__btn annm__btn--ghost" onClick={onClose} disabled={saving}>{S("cancel")}</button>
                    <span className="annm__foot-spacer" />
                    <button type="button" className="annm__btn annm__btn--ghost" onClick={() => setPreviewOpen(true)} disabled={saving}>{I.eye}{S("preview")}</button>
                    <button type="button" className="annm__btn annm__btn--ghost" onClick={() => submit("draft")} disabled={saving}>{I.file}{S("saveDraft")}</button>
                    <button type="button" className="annm__btn annm__btn--primary" onClick={() => submit("publish")} disabled={saving}>
                        {I.send}{saving ? S("working") : publishLabel}
                    </button>
                </footer>
            </aside>

            {previewOpen && <PreviewDialog data={previewData} onClose={() => setPreviewOpen(false)} S={S} />}
        </div>
    );
}

function PreviewDialog({ data, onClose, S }) {
    const closeRef = useRef(null);
    useDialog(true, onClose);
    useEffect(() => { closeRef.current?.focus(); }, []);
    return (
        <div className="annm__overlay annm__overlay--center annm__overlay--top" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="annm__dialog" role="dialog" aria-modal="true" aria-labelledby="annm-preview-title">
                <header className="annm__dialog-head">
                    <div>
                        <h2 id="annm-preview-title" className="annm__dialog-title">{S("previewTitle")}</h2>
                        <p className="annm__drawer-sub">{S("previewSub")}</p>
                    </div>
                    <button type="button" ref={closeRef} className="annm__icon-btn" onClick={onClose} aria-label={S("close")}>{I.close}</button>
                </header>
                <AnnouncementCard data={data} S={S} />
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Details dialog                                                      */
/* ------------------------------------------------------------------ */
function DetailsDialog({ item, status, users, onClose, onEdit, S, locale }) {
    const [reads, setReads] = useState({ state: READ_TRACKING_ENABLED ? "loading" : "off", ids: null });
    useDialog(true, onClose);

    useEffect(() => {
        if (!READ_TRACKING_ENABLED) return undefined;
        let active = true;
        getDocs(collection(db, COL, item.id, "reads"))
            .then((snap) => { if (active) setReads({ state: "ok", ids: new Set(snap.docs.map((d) => d.id.toUpperCase())) }); })
            .catch(() => { if (active) setReads({ state: "error", ids: null }); });
        return () => { active = false; };
    }, [item.id]);

    const byId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
    const targeted = useMemo(
        () => (item.audience === "selected"
            ? (item.targetUserIds || []).map((x) => String(x).toUpperCase())
            : users.map((u) => u.id)),
        [item, users]
    );

    const pub = toDate(item.publishAt);
    const exp = toDate(item.expiresAt);
    const created = toDate(item.createdAt);
    const updated = toDate(item.updatedAt);

    let readStats = null;
    if (reads.state === "ok") {
        const read = targeted.filter((id) => reads.ids.has(id)).length;
        const total = targeted.length;
        readStats = { total, read, unread: total - read, pct: total ? Math.round((read / total) * 100) : 0 };
    }

    const rows = [
        [S("dStatus"), <StatusBadge status={status} S={S} />],
        [S("dPriority"), <PriorityBadge priority={item.priority} S={S} />],
        [S("dAudience"), item.audience === "selected" ? S("audSelectedCount", { n: targeted.length }) : S("audAll")],
        [S("dCreatedBy"), item.createdByName ? `${item.createdByName}${item.createdBy ? ` (${item.createdBy})` : ""}` : (item.createdBy || "—")],
        [S("dCreated"), created ? fmt(created, locale) : "—"],
        [S("dPublish"), pub ? fmt(pub, locale) : S("notSet")],
        [S("dExpiry"), exp ? fmt(exp, locale) : S("noExpiry")],
        [S("dUpdated"), updated ? fmt(updated, locale) : "—"],
    ];

    return (
        <div className="annm__overlay annm__overlay--center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="annm__dialog annm__dialog--lg" role="dialog" aria-modal="true" aria-labelledby="annm-details-title">
                <header className="annm__dialog-head">
                    <div>
                        <h2 id="annm-details-title" className="annm__dialog-title">{item.title}</h2>
                        <p className="annm__drawer-sub">{S("detailsTitle")}</p>
                    </div>
                    <button type="button" className="annm__icon-btn" onClick={onClose} aria-label={S("close")}>{I.close}</button>
                </header>

                <div className="annm__details-body">
                    <div className="annm__details-msg">
                        <p className="annm__details-label">{S("fMessage")}</p>
                        <p className="annm__details-text">{item.message}</p>
                        {item.description && (
                            <>
                                <p className="annm__details-label">{S("instructions")}</p>
                                <p className="annm__details-text">{item.description}</p>
                            </>
                        )}
                    </div>

                    <dl className="annm__dl">
                        {rows.map(([k, v]) => (
                            <div className="annm__dl-row" key={k}>
                                <dt>{k}</dt>
                                <dd>{v}</dd>
                            </div>
                        ))}
                    </dl>

                    {item.audience === "selected" && (
                        <div>
                            <p className="annm__details-label">{S("recipients")}</p>
                            <ul className="annm__chips">
                                {targeted.slice(0, 30).map((id) => (
                                    <li className="annm__chip annm__chip--static" key={id}>{byId.get(id)?.name ? `${byId.get(id).name} · ${id}` : id}</li>
                                ))}
                                {targeted.length > 30 && <li className="annm__chip annm__chip--static">{S("moreCount", { n: targeted.length - 30 })}</li>}
                            </ul>
                        </div>
                    )}

                    <div className="annm__reads">
                        <p className="annm__details-label">{S("readStats")}</p>
                        {reads.state === "off" && <p className="annm__reads-note">{I.info}{S("readOff")}</p>}
                        {reads.state === "loading" && <div className="annm__skel annm__skel--row" />}
                        {reads.state === "error" && <p className="annm__reads-note">{I.alert}{S("readError")}</p>}
                        {readStats && (
                            <>
                                <div className="annm__reads-grid">
                                    <div><strong>{readStats.total}</strong><span>{S("readTargeted")}</span></div>
                                    <div><strong>{readStats.read}</strong><span>{S("readRead")}</span></div>
                                    <div><strong>{readStats.unread}</strong><span>{S("readUnread")}</span></div>
                                    <div><strong>{readStats.pct}%</strong><span>{S("readPct")}</span></div>
                                </div>
                                <div className="annm__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={readStats.pct} aria-label={S("readPct")}>
                                    <span style={{ width: `${readStats.pct}%` }} />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="annm__dialog-actions">
                    <button type="button" className="annm__btn annm__btn--ghost" onClick={onClose}>{S("close")}</button>
                    <button type="button" className="annm__btn annm__btn--primary" onClick={() => onEdit(item)}>{I.edit}{S("actEdit")}</button>
                </div>
            </div>
        </div>
    );
}

/* ================================================================== */
/* PAGE                                                               */
/* ================================================================== */
function AnnouncementManagement() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const S = useCallback((k, o) => t(`announcementMgmt.${k}`, o), [t]);
    const locale = i18n.resolvedLanguage || i18n.language || undefined;
    const theme = localStorage.getItem("dashTheme") || "dark";
    const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "", []);

    const adminId = String(localStorage.getItem("userId") || "").toUpperCase();
    const adminName = localStorage.getItem("userName") || adminId;

    /* ---------------- data ---------------- */
    const [items, setItems] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [usersError, setUsersError] = useState(false);

    const loadItems = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const snap = await getDocs(collection(db, COL));
            setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("AnnouncementManagement: load", e);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadUsers = useCallback(async () => {
        try {
            const snap = await getDocs(collection(db, "users"));
            const list = snap.docs
                .map((d) => ({ docId: d.id, ...d.data() }))
                .filter((u) => u.deleted !== true && u.role !== "admin")
                .map((u) => ({ id: String(u.id || u.docId).toUpperCase(), name: String(u.name || "") }))
                .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
            setUsers(list);
            setUsersError(false);
        } catch (e) {
            console.error("AnnouncementManagement: users", e);
            setUsersError(true);
        }
    }, []);

    useEffect(() => { loadItems(); loadUsers(); }, [loadItems, loadUsers]);

    /* re-evaluate Scheduled -> Published -> Expired as time passes */
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(id);
    }, []);

    /* ---------------- toast ---------------- */
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);
    const notify = useCallback((type, msg) => {
        clearTimeout(toastTimer.current);
        setToast({ type, msg });
        toastTimer.current = setTimeout(() => setToast(null), 3400);
    }, []);
    useEffect(() => () => clearTimeout(toastTimer.current), []);

    /* ---------------- list controls ---------------- */
    const [search, setSearch] = useState("");
    const [statusF, setStatusF] = useState("all");
    const [priorityF, setPriorityF] = useState("all");
    const [audienceF, setAudienceF] = useState("any");
    const [sort, setSort] = useState("createdDesc");
    const [page, setPage] = useState(1);

    useEffect(() => { setPage(1); }, [search, statusF, priorityF, audienceF, sort]);

    const decorated = useMemo(() => items.map((a) => ({ ...a, _s: deriveStatus(a, now) })), [items, now]);

    const counts = useMemo(() => ({
        total: decorated.length,
        published: decorated.filter((a) => a._s === "published").length,
        drafts: decorated.filter((a) => a._s === "draft").length,
        expired: decorated.filter((a) => a._s === "expired").length,
    }), [decorated]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = decorated.filter((a) => {
            if (statusF !== "all" && a._s !== statusF) return false;
            if (priorityF !== "all" && a.priority !== priorityF) return false;
            if (audienceF !== "any" && (a.audience === "selected" ? "selected" : "everyone") !== audienceF) return false;
            if (q && !(String(a.title || "").toLowerCase().includes(q) || String(a.message || "").toLowerCase().includes(q))) return false;
            return true;
        });
        const field = sort.startsWith("publish") ? "publishAt" : "createdAt";
        const dir = sort.endsWith("Asc") ? 1 : -1;
        return list.sort((a, b) => {
            const av = toDate(a[field])?.getTime();
            const bv = toDate(b[field])?.getTime();
            if (av == null && bv == null) return 0;
            if (av == null) return 1;           /* missing dates always last */
            if (bv == null) return -1;
            return (av - bv) * dir;
        });
    }, [decorated, search, statusF, priorityF, audienceF, sort]);

    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const filtersOn = search.trim() || statusF !== "all" || priorityF !== "all" || audienceF !== "any";
    const clearFilters = () => { setSearch(""); setStatusF("all"); setPriorityF("all"); setAudienceF("any"); };

    /* ---------------- dialogs ---------------- */
    const [drawer, setDrawer] = useState(null);       /* { editing, key } */
    const [details, setDetails] = useState(null);     /* announcement */
    const [confirm, setConfirm] = useState(null);     /* announcement to delete */
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState("");

    const openCreate = () => setDrawer({ editing: null, key: `new-${Date.now()}` });
    const openEdit = (a) => { setDetails(null); setDrawer({ editing: a, key: `${a.id}-${Date.now()}` }); };
    const closeDrawer = useCallback(() => setDrawer(null), []);

    const patchLocal = (id, data) => {
        setNow(Date.now());   /* so a just-published item is not shown as Scheduled until the next tick */
        setItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...data, updatedAt: Timestamp.now(), updatedBy: adminId } : a)));
    };

    /* ---------------- save (create / edit) ---------------- */
    const handleSubmit = async (form, intent) => {
        setSaving(true);
        try {
            const editing = drawer?.editing || null;
            const nowMs = Date.now();
            const payload = buildPayload(form, intent, editing, nowMs);
            const pubMs = toDate(payload.publishAt)?.getTime() ?? 0;
            const scheduled = payload.status === "published" && pubMs > nowMs;

            if (editing) {
                await updateDoc(doc(db, COL, editing.id), { ...payload, updatedAt: serverTimestamp(), updatedBy: adminId });
                patchLocal(editing.id, payload);
                logAdminAction("Updated announcement", { targetId: editing.id, details: payload.title });
                notify("success", S("toastUpdated"));
            } else {
                const ref = await addDoc(collection(db, COL), {
                    ...payload,
                    createdAt: serverTimestamp(),
                    createdBy: adminId,
                    createdByName: adminName,
                    updatedAt: serverTimestamp(),
                    updatedBy: adminId,
                });
                setNow(Date.now());
                setItems((prev) => [
                    { id: ref.id, ...payload, createdAt: Timestamp.now(), createdBy: adminId, createdByName: adminName, updatedAt: Timestamp.now(), updatedBy: adminId },
                    ...prev,
                ]);
                logAdminAction(payload.status === "published" ? "Published announcement" : "Created announcement", { targetId: ref.id, details: payload.title });
                notify("success", payload.status === "draft" ? S("toastDraftSaved") : scheduled ? S("toastScheduled") : S("toastPublished"));
            }
            setDrawer(null);
        } catch (e) {
            console.error("AnnouncementManagement: save", e);
            notify("error", S("toastSaveError"));
        } finally {
            setSaving(false);
        }
    };

    /* ---------------- row actions ---------------- */
    const runAction = async (item, action) => {
        setBusyId(item.id);
        try {
            const nowMs = Date.now();
            let upd;
            let toastMsg;
            let logName;

            if (action === "publish" || action === "publishNow") {
                if (item.audience === "selected" && !(item.targetUserIds || []).length) {
                    notify("error", S("errTargets"));
                    return;
                }
                const orig = toDate(item.publishAt);
                const keepSchedule = action === "publish" && orig && orig.getTime() > nowMs;
                const effective = keepSchedule ? orig : new Date(nowMs);
                const exp = toDate(item.expiresAt);
                if (exp && exp.getTime() <= effective.getTime()) {
                    notify("error", S("errPublishExpired"));
                    return;
                }
                upd = { status: "published", publishAt: keepSchedule ? item.publishAt : Timestamp.fromDate(effective) };
                toastMsg = keepSchedule ? S("toastScheduled") : S("toastPublished");
                logName = "Published announcement";
            } else if (action === "unpublish") {
                upd = { status: "draft" };
                toastMsg = S("toastUnpublished");
                logName = "Unpublished announcement";
            } else if (action === "archive") {
                upd = { status: "archived" };
                toastMsg = S("toastArchived");
                logName = "Archived announcement";
            } else if (action === "restore") {
                upd = { status: "draft" };
                toastMsg = S("toastRestored");
                logName = "Restored announcement";
            } else {
                return;
            }

            await updateDoc(doc(db, COL, item.id), { ...upd, updatedAt: serverTimestamp(), updatedBy: adminId });
            patchLocal(item.id, upd);
            logAdminAction(logName, { targetId: item.id, details: item.title });
            notify("success", toastMsg);
        } catch (e) {
            console.error("AnnouncementManagement: action", e);
            notify("error", S("toastActionError"));
        } finally {
            setBusyId("");
        }
    };

    const confirmDelete = async () => {
        if (!confirm) return;
        setBusyId(confirm.id);
        try {
            await deleteDoc(doc(db, COL, confirm.id));
            setItems((prev) => prev.filter((a) => a.id !== confirm.id));
            logAdminAction("Deleted announcement", { targetId: confirm.id, details: confirm.title });
            notify("success", S("toastDeleted"));
            setConfirm(null);
        } catch (e) {
            console.error("AnnouncementManagement: delete", e);
            notify("error", S("toastActionError"));
        } finally {
            setBusyId("");
        }
    };

    const actionsFor = (a) => {
        const list = [{ key: "view", icon: I.eye, label: S("actView") }, { key: "edit", icon: I.edit, label: S("actEdit") }];
        if (a._s === "draft") list.push({ key: "publish", icon: I.send, label: S("actPublish") });
        if (a._s === "scheduled") list.push({ key: "publishNow", icon: I.send, label: S("actPublishNow") });
        if (a._s === "published" || a._s === "scheduled") list.push({ key: "unpublish", icon: I.pause, label: S("actUnpublish") });
        if (a._s === "archived") list.push({ key: "restore", icon: I.restore, label: S("actRestore") });
        else list.push({ key: "archive", icon: I.archive, label: S("actArchive") });
        list.push({ key: "delete", icon: I.trash, label: S("actDelete"), danger: true });
        return list;
    };

    const onPick = (a, key) => {
        if (key === "view") setDetails(a);
        else if (key === "edit") openEdit(a);
        else if (key === "delete") setConfirm(a);
        else runAction(a, key);
    };

    const audienceLabel = (a) => (a.audience === "selected"
        ? S("audSelectedCount", { n: (a.targetUserIds || []).length })
        : S("audAll"));

    const statCards = [
        { key: "total", tone: "indigo", icon: I.megaphone, label: S("statTotal"), value: counts.total },
        { key: "published", tone: "green", icon: I.checkFill, label: S("statPublished"), value: counts.published },
        { key: "drafts", tone: "orange", icon: I.file, label: S("statDrafts"), value: counts.drafts },
        { key: "expired", tone: "blue", icon: I.clock, label: S("statExpired"), value: counts.expired },
    ];

    const detailsStatus = details ? deriveStatus(details, now) : "draft";

    /* "Announcement Management" -> plain "Announcement" + gradient "Management" */
    const titleWords = S("title").split(" ");
    const titleLast = titleWords.length > 1 ? titleWords.pop() : "";
    const titleFirst = titleWords.join(" ");

    /* ================================================================ */
    return (
        <div className="annm" data-theme={theme}>
            <Waves />

            <button type="button" className="annm__back" onClick={() => navigate("/admin-dashboard")}>
                {I.back}{t("back")}
            </button>

            {/* ============================ HEADER ============================ */}
            <header className="annm__head">
                <div className="annm__head-text">
                    <span className="annm__eyebrow">{I.lotus}{t("adminPanel")}</span>
                    <h1 className="annm__title">
                        {titleFirst}{titleLast && " "}
                        {titleLast ? <span className="annm__title-accent">{titleLast}</span> : null}
                    </h1>
                    <p className="annm__subtitle">{S("subtitle")}</p>
                </div>
                <Hero />
                <div className="annm__head-actions">
                    <button type="button" className="annm__btn annm__btn--primary annm__btn--lg" onClick={openCreate}>
                        {I.plus}{S("createAnnouncement")}
                    </button>
                </div>
            </header>

            {/* ============================ STATS ============================ */}
            <section className="annm__stats" aria-label={S("summary")}>
                {statCards.map((c) => (
                    <div className={`annm__stat annm__stat--${c.tone}`} key={c.key}>
                        <span className="annm__stat-icon">{c.icon}</span>
                        <div className="annm__stat-body">
                            <p className="annm__stat-label">{c.label}</p>
                            <p className="annm__stat-value">{loading ? <span className="annm__skel annm__skel--num" /> : c.value}</p>
                        </div>
                        <span className="annm__bars" aria-hidden="true"><i /><i /><i /><i /></span>
                    </div>
                ))}
            </section>

            {/* ============================ TABLE ============================ */}
            {loadError ? (
                <div className="annm__card annm__state annm__state--error">
                    <span className="annm__state-icon">{I.alert}</span>
                    <h3>{S("loadErrorTitle")}</h3>
                    <p>{S("loadErrorText")}</p>
                    <button type="button" className="annm__btn annm__btn--primary" onClick={loadItems}>{S("retry")}</button>
                </div>
            ) : (
                <section className="annm__card" aria-label={S("tableLabel")}>
                    <div className="annm__toolbar">
                        <label className="annm__search">
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
                        <div className="annm__filters">
                            <SelectBox icon={I.layers} value={statusF} onChange={(e) => setStatusF(e.target.value)} label={S("filterStatus")}>
                                <option value="all">{S("allStatuses")}</option>
                                {STATUSES.map((s) => <option key={s} value={s}>{S(STATUS_KEY[s])}</option>)}
                            </SelectBox>
                            <SelectBox icon={I.flag} value={priorityF} onChange={(e) => setPriorityF(e.target.value)} label={S("filterPriority")}>
                                <option value="all">{S("allPriorities")}</option>
                                {PRIORITIES.map((p) => <option key={p} value={p}>{S(PRIO_KEY[p])}</option>)}
                            </SelectBox>
                            <SelectBox icon={I.users} value={audienceF} onChange={(e) => setAudienceF(e.target.value)} label={S("filterAudience")}>
                                <option value="any">{S("allAudiences")}</option>
                                <option value="everyone">{S("audAll")}</option>
                                <option value="selected">{S("audSelected")}</option>
                            </SelectBox>
                            <SelectBox icon={I.calendar} value={sort} onChange={(e) => setSort(e.target.value)} label={S("sortBy")}>
                                <option value="createdDesc">{S("sortCreatedDesc")}</option>
                                <option value="createdAsc">{S("sortCreatedAsc")}</option>
                                <option value="publishDesc">{S("sortPublishDesc")}</option>
                                <option value="publishAsc">{S("sortPublishAsc")}</option>
                            </SelectBox>
                        </div>
                    </div>

                    {loading ? (
                        <div className="annm__skel-list" aria-label={t("loading")}>
                            {Array.from({ length: 5 }).map((_, i) => <div className="annm__skel annm__skel--row" key={i} />)}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="annm__state">
                            <span className="annm__state-icon">{I.megaphone}</span>
                            <h3>{S("emptyTitle")}</h3>
                            <p>{S("emptyText")}</p>
                            <button type="button" className="annm__btn annm__btn--primary" onClick={openCreate}>{I.plus}{S("createAnnouncement")}</button>
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="annm__state">
                            <span className="annm__state-icon">{I.search}</span>
                            <h3>{S("noMatchTitle")}</h3>
                            <p>{S("noMatchText")}</p>
                            {filtersOn && <button type="button" className="annm__btn annm__btn--ghost" onClick={clearFilters}>{S("clearFilters")}</button>}
                        </div>
                    ) : (
                        <>
                            <div className="annm__table-wrap">
                                <table className="annm__table">
                                    <thead>
                                        <tr>
                                            <th scope="col">{S("colTitle")}</th>
                                            <th scope="col">{S("colPriority")}</th>
                                            <th scope="col">{S("colAudience")}</th>
                                            <th scope="col">{S("colPublish")}</th>
                                            <th scope="col">{S("colExpiry")}</th>
                                            <th scope="col">{S("colStatus")}</th>
                                            <th scope="col">{S("colCreatedBy")}</th>
                                            <th scope="col" className="annm__th-actions">{S("colActions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageRows.map((a, idx) => {
                                            const pub = toDate(a.publishAt);
                                            const exp = toDate(a.expiresAt);
                                            return (
                                                <tr key={a.id} className={busyId === a.id ? "is-busy" : ""} style={{ "--i": idx }}>
                                                    <td data-label={S("colTitle")} className="annm__td-title">
                                                        <button type="button" className="annm__title-btn" onClick={() => setDetails(a)}>
                                                            <span className={`annm__tile annm__tile--${PRIORITIES.includes(a.priority) ? a.priority : "normal"}`}>{I.megaphone}</span>
                                                            <span className="annm__title-text">
                                                                <span className="annm__row-title">{a.title}</span>
                                                                <span className="annm__row-snippet">{a.message}</span>
                                                            </span>
                                                        </button>
                                                    </td>
                                                    <td data-label={S("colPriority")}><PriorityBadge priority={a.priority} S={S} /></td>
                                                    <td data-label={S("colAudience")}>
                                                        <span className="annm__cell"><span className="annm__cell-ico">{I.users}</span><span>{audienceLabel(a)}</span></span>
                                                    </td>
                                                    <td data-label={S("colPublish")}>
                                                        {pub
                                                            ? <span className="annm__cell"><span className="annm__cell-ico">{I.calendar}</span><span><span className="annm__d1">{fmtDay(pub, locale)}</span><span className="annm__d2">{fmtTime(pub, locale)}</span></span></span>
                                                            : <span className="annm__muted">—</span>}
                                                    </td>
                                                    <td data-label={S("colExpiry")}>
                                                        {exp
                                                            ? <span className="annm__cell"><span className="annm__cell-ico">{I.calendar}</span><span><span className="annm__d1">{fmtDay(exp, locale)}</span><span className="annm__d2">{fmtTime(exp, locale)}</span></span></span>
                                                            : <span className="annm__muted">{S("noExpiry")}</span>}
                                                    </td>
                                                    <td data-label={S("colStatus")}><StatusBadge status={a._s} S={S} /></td>
                                                    <td data-label={S("colCreatedBy")}>
                                                        <span className="annm__cell"><span className="annm__cell-ico">{I.user}</span><span className="annm__by">{a.createdByName || a.createdBy || "—"}</span></span>
                                                    </td>
                                                    <td data-label={S("colActions")} className="annm__td-actions">
                                                        <ActionMenu
                                                            actions={actionsFor(a)}
                                                            label={S("rowActions", { title: a.title })}
                                                            onPick={(key) => onPick(a, key)}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="annm__pager">
                                <span className="annm__pager-info">
                                    {S("showing", { from: (safePage - 1) * PAGE_SIZE + 1, to: Math.min(safePage * PAGE_SIZE, rows.length), total: rows.length })}
                                </span>
                                <nav className="annm__pager-ctrl" aria-label={S("tableLabel")}>
                                    <button type="button" className="annm__page" onClick={() => setPage(safePage - 1)} disabled={safePage <= 1} aria-label={S("prevPage")}>{I.left}</button>
                                    {pageList(totalPages, safePage).map((n) => (typeof n === "number" ? (
                                        <button
                                            key={n}
                                            type="button"
                                            className={`annm__page${n === safePage ? " is-on" : ""}`}
                                            aria-current={n === safePage ? "page" : undefined}
                                            aria-label={S("pageOf", { page: n, pages: totalPages })}
                                            onClick={() => setPage(n)}
                                        >
                                            {n}
                                        </button>
                                    ) : (
                                        <span key={n} className="annm__page-gap" aria-hidden="true">…</span>
                                    )))}
                                    <button type="button" className="annm__page" onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages} aria-label={S("nextPage")}>{I.right}</button>
                                </nav>
                            </div>
                        </>
                    )}
                </section>
            )}

            {/* ============================ DIALOGS ============================ */}
            {drawer && (
                <AnnouncementDrawer
                    key={drawer.key}
                    editing={drawer.editing}
                    users={users}
                    usersError={usersError}
                    saving={saving}
                    onClose={closeDrawer}
                    onSubmit={handleSubmit}
                    S={S}
                    locale={locale}
                    tz={tz}
                />
            )}

            {details && (
                <DetailsDialog
                    item={details}
                    status={detailsStatus}
                    users={users}
                    onClose={() => setDetails(null)}
                    onEdit={openEdit}
                    S={S}
                    locale={locale}
                />
            )}

            {confirm && (
                <ConfirmDialog
                    title={S("deleteTitle")}
                    text={S("deleteText", { title: confirm.title })}
                    confirmLabel={S("actDelete")}
                    busy={busyId === confirm.id}
                    onConfirm={confirmDelete}
                    onCancel={() => setConfirm(null)}
                    S={S}
                />
            )}

            <div className="annm__toast-region" role="status" aria-live="polite">
                {toast && (
                    <div className={`annm__toast annm__toast--${toast.type}`}>
                        {toast.type === "success" ? I.check : I.alert}{toast.msg}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AnnouncementManagement;