import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db } from "../firebase/firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";
import {
    SCHEDULES_COL, HOLIDAYS_COL, SCHEDULE_SETTINGS, WEEK_ORDER,
    todayYmd, addDaysYmd, toMinutes, formatTime, formatDate, weekdayNames,
    weekdayOf, scheduleDays,
} from "../utils/scheduleUtils";
import "./DhyanTimetable.css";

/* ==================================================================
   DHYAN TIMETABLE (member side, read-only)
   - All text: translation.json -> "timetable" block
   - Data: the same Firestore data the admin manages in Schedule
     Management ("schedules", "holidays", settings/scheduleSettings).
     Live listeners, so admin changes appear without a reload.
   - Members can only view. Nothing on this page writes to Firestore.
   ================================================================== */

/* ---------------- icons ---------------- */
const Svg = ({ children, sw = 1.9 }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);
const I = {
    back: <Svg sw={2.2}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Svg>,
    sun: <Svg><path d="M12 3v2M5.6 5.6l1.4 1.4M3 12h2M19 12h2M17 7l1.4-1.4" /><path d="M7 16a5 5 0 0 1 10 0" /><line x1="3" y1="20" x2="21" y2="20" /></Svg>,
    moon: <Svg><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Svg>,
    star: <Svg><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" /></Svg>,
    clock: <Svg><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></Svg>,
    calendar: <Svg><rect x="3" y="4" width="18" height="18" rx="2.5" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Svg>,
    flag: <Svg><path d="M4 22V4" /><path d="M4 4h12l-2 4 2 4H4" /></Svg>,
    pin: <Svg><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></Svg>,
    door: <Svg><path d="M3 21h18" /><path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" /><circle cx="14.5" cy="12" r=".8" fill="currentColor" /></Svg>,
    info: <Svg><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12.01" y2="8" /></Svg>,
    alert: <Svg><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Svg>,
    left: <Svg sw={2.3}><polyline points="15 18 9 12 15 6" /></Svg>,
    right: <Svg sw={2.3}><polyline points="9 18 15 12 9 6" /></Svg>,
    lotus: <Svg sw={1.6}><path d="M12 4c1.6 1.9 2.4 3.8 2.4 5.6 0 1.6-.8 3.3-2.4 4.9-1.6-1.6-2.4-3.3-2.4-4.9C9.6 7.8 10.4 5.9 12 4z" /><path d="M3.5 11c2.6.2 4.8 1.3 6.3 3.4M20.5 11c-2.6.2-4.8 1.3-6.3 3.4" /><path d="M3 15.5c2 2.4 5.2 3.7 9 3.7s7-1.3 9-3.7" /></Svg>,
};
const TYPE_ICON = { morning: I.sun, evening: I.moon, special: I.star };

/* ---------------- date helpers ---------------- */
const mondayOf = (ymd) => {
    const wd = weekdayOf(ymd); // 0 = Sun
    return addDaysYmd(ymd, wd === 0 ? -6 : 1 - wd);
};
const nowMinutes = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
};

/* does an active schedule run on this date? */
const occursOn = (s, ymd) => {
    if (s.status !== "active") return false;
    if (s.repeat === "once") return s.startDate === ymd;
    if (s.startDate && ymd < s.startDate) return false;
    if (s.endDate && ymd > s.endDate) return false;
    return scheduleDays(s).includes(weekdayOf(ymd));
};

/* icons for the four view tabs */
const VIEW_ICON = { today: I.clock, week: I.calendar, upcoming: I.flag, all: I.lotus };

/* "Dhyan Timetable" -> plain "Dhyan" + gradient "Timetable" */
function GradientTitle({ text }) {
    const words = String(text).split(" ");
    const last = words.length > 1 ? words.pop() : "";
    return (
        <h1 className="dtt__title">
            {words.join(" ")}{last && " "}
            {last ? <span className="dtt__title-accent">{last}</span> : null}
        </h1>
    );
}

/* decorative header illustration (pure SVG, no image file needed) */
function Hero() {
    return (
        <div className="dtt__hero-art" aria-hidden="true">
            <svg viewBox="0 0 520 230" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="dtt-gi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5eead4" /><stop offset="1" stopColor="#0ea5a0" /></linearGradient>
                    <linearGradient id="dtt-gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#d7f5f2" /></linearGradient>
                    <linearGradient id="dtt-gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#86efac" /><stop offset="1" stopColor="#14b8a6" /></linearGradient>
                    <linearGradient id="dtt-go" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fed7aa" /><stop offset="1" stopColor="#f0a64b" /></linearGradient>
                    <radialGradient id="dtt-gg" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#5eead4" stopOpacity=".5" /><stop offset="1" stopColor="#5eead4" stopOpacity="0" /></radialGradient>
                </defs>
                <ellipse cx="270" cy="125" rx="230" ry="105" fill="url(#dtt-gg)" />
                <path d="M118 176C84 150 88 108 126 82c14 30 12 62-8 94z" fill="url(#dtt-gl)" opacity=".85" />
                <path d="M150 170c-12-34 0-66 30-84 4 34-6 64-30 84z" fill="url(#dtt-gl)" opacity=".6" />
                <path d="M404 170c34-22 50-58 40-96-34 18-52 56-40 96z" fill="url(#dtt-gl)" opacity=".85" />
                <path d="M384 176c16-30 14-60-2-86 26 22 32 56 2 86z" fill="url(#dtt-gl)" opacity=".6" />
                <g transform="rotate(-4 265 125)">
                    <rect x="170" y="50" width="200" height="150" rx="24" fill="url(#dtt-gc)" />
                    <path d="M170 74a24 24 0 0 1 24-24h152a24 24 0 0 1 24 24v16H170z" fill="url(#dtt-gi)" />
                    {[0, 1, 2, 3].map((i) => <rect key={i} x={198 + i * 42} y="34" width="11" height="34" rx="5.5" fill="url(#dtt-gi)" stroke="#fff" strokeWidth="2.5" />)}
                    {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
                        <rect key={`${r}${c}`} x={190 + c * 42} y={106 + r * 30} width="28" height="22" rx="7" fill="#d9f4f1" />
                    )))}
                    <circle cx="300" cy="136" r="22" fill="url(#dtt-gi)" />
                    <polyline points="290 136 297 143 311 128" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                <circle cx="372" cy="170" r="38" fill="url(#dtt-gi)" />
                <circle cx="372" cy="170" r="29" fill="#fff" />
                <polyline points="372 150 372 172 388 180" fill="none" stroke="#0ea5a0" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="150" cy="176" r="26" fill="url(#dtt-go)" />
                <circle cx="132" cy="168" r="6" fill="#fff" opacity=".55" />
                <circle cx="352" cy="26" r="9" fill="#fdba74" />
                <circle cx="470" cy="46" r="5" fill="#f472b6" />
                <circle cx="486" cy="66" r="4" fill="#60a5fa" />
                <circle cx="500" cy="92" r="9" fill="#99f6e4" opacity=".8" />
                <circle cx="96" cy="46" r="4" fill="#2dd4cf" />
            </svg>
        </div>
    );
}

/* soft background waves at the bottom of the page */
function Waves() {
    return (
        <svg className="dtt__waves" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
            <path className="dtt__wave dtt__wave--a" d="M0 220 C 240 120 480 140 720 200 C 960 260 1200 250 1440 160 V320 H0 Z" />
            <path className="dtt__wave dtt__wave--b" d="M0 270 C 300 200 560 230 820 260 C 1080 290 1260 270 1440 230 V320 H0 Z" />
        </svg>
    );
}

/* ================================================================== */
function DhyanTimetable() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const T = useCallback((k, o) => t(`timetable.${k}`, o), [t]);
    const locale = i18n.resolvedLanguage || i18n.language || undefined;
    const theme = localStorage.getItem("dashTheme") || "dark";

    const dayShort = useMemo(() => weekdayNames(locale, "short"), [locale]);
    const dayLong = useMemo(() => weekdayNames(locale, "long"), [locale]);

    /* ---------------- live data ---------------- */
    const [schedules, setSchedules] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [weeklyOffs, setWeeklyOffs] = useState([]);
    const [loaded, setLoaded] = useState({ s: false, h: false, c: false });
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

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
        sessionStorage.setItem("udGreetingShown", "true");
        const greetingTimer = setTimeout(() => setShowGreeting(false), 4000);
        return () => {
            clearTimeout(greetingTimer);
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    useEffect(() => {
        const fail = (e) => {
            console.error("DhyanTimetable:", e);
            setError(true);
        };
        const unsubs = [
            onSnapshot(collection(db, SCHEDULES_COL), (snap) => {
                setSchedules(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoaded((l) => ({ ...l, s: true }));
            }, fail),
            onSnapshot(collection(db, HOLIDAYS_COL), (snap) => {
                setHolidays(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoaded((l) => ({ ...l, h: true }));
            }, fail),
            onSnapshot(doc(db, ...SCHEDULE_SETTINGS), (snap) => {
                const offs = snap.exists() && Array.isArray(snap.data().weeklyOffs) ? snap.data().weeklyOffs : [];
                setWeeklyOffs(offs);
                setLoaded((l) => ({ ...l, c: true }));
            }, fail),
        ];
        return () => unsubs.forEach((u) => u());
    }, [reloadKey]);
    const loading = !error && !(loaded.s && loaded.h && loaded.c);
    const retry = () => {
        setError(false);
        setLoaded({ s: false, h: false, c: false });
        setReloadKey((k) => k + 1);
    };

    /* clock: re-evaluate "in progress / completed" every minute */
    const [now, setNow] = useState(nowMinutes);
    const [today, setToday] = useState(todayYmd);
    useEffect(() => {
        const id = setInterval(() => {
            setNow(nowMinutes());
            setToday(todayYmd());
        }, 60000);
        return () => clearInterval(id);
    }, []);

    /* ---------------- ui state ---------------- */
    const [view, setView] = useState("today");
    const [weekStart, setWeekStart] = useState(() => mondayOf(todayYmd()));

    /* ---------------- derived ---------------- */
    const active = useMemo(
        () => schedules
            .filter((s) => s.status === "active")
            .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "") || (a.name || "").localeCompare(b.name || "")),
        [schedules]
    );
    const recurring = useMemo(() => active.filter((s) => s.repeat !== "once"), [active]);
    const specials = useMemo(
        () => active
            .filter((s) => s.repeat === "once")
            .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || "") || (a.startTime || "").localeCompare(b.startTime || "")),
        [active]
    );

    /* why a session can't happen on a date: weekly off, or a holiday */
    const blockFor = useCallback((s, ymd) => {
        if (weeklyOffs.includes(weekdayOf(ymd))) return { kind: "off" };
        const h = holidays.find(
            (x) => x.date === ymd && (x.appliesTo !== "selected" || (x.sessionIds || []).includes(s.id))
        );
        return h ? { kind: "holiday", name: h.name } : null;
    }, [weeklyOffs, holidays]);

    const dayInfo = useCallback((ymd) => ({
        isOff: weeklyOffs.includes(weekdayOf(ymd)),
        allHoliday: holidays.find((h) => h.date === ymd && h.appliesTo !== "selected"),
    }), [weeklyOffs, holidays]);

    /* ---- today ---- */
    const todayInfo = dayInfo(today);
    const todaySessions = useMemo(() => {
        const list = active.filter((s) => occursOn(s, today)).map((s) => {
            const block = blockFor(s, today);
            const st = toMinutes(s.startTime), en = toMinutes(s.endTime);
            let state = "scheduled";
            if (block) state = block.kind === "off" ? "off" : "holiday";
            else if (now >= en) state = "completed";
            else if (now >= st) state = "live";
            return { ...s, _block: block, _state: state };
        });
        const next = list.find((s) => s._state === "live") || list.find((s) => s._state === "scheduled");
        return list.map((s) => ({ ...s, _next: !!next && s.id === next.id }));
    }, [active, today, now, blockFor]);
    const runnableToday = todaySessions.filter((s) => s._state !== "off" && s._state !== "holiday");

    let headerStatus = null;
    if (!loading && !error) {
        if (todayInfo.isOff) headerStatus = { tone: "off", text: T("statusWeeklyOff") };
        else if (todayInfo.allHoliday) headerStatus = { tone: "holiday", text: T("statusHoliday") };
        else if (runnableToday.length) headerStatus = { tone: "ok", text: T("statusToday", { count: runnableToday.length }) };
        else headerStatus = { tone: "none", text: T("statusNone") };
    }

    /* ---- week ---- */
    const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysYmd(weekStart, i)), [weekStart]);
    const weekColumns = useMemo(() => recurring.filter((s) => weekDates.some((d) => occursOn(s, d))), [recurring, weekDates]);
    const weekHasSpecials = weekDates.some((d) => specials.some((s) => occursOn(s, d)));
    const isThisWeek = weekStart === mondayOf(today);

    /* ---- upcoming ---- */
    const upcomingHolidays = useMemo(
        () => holidays.filter((h) => h.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8),
        [holidays, today]
    );
    const upcomingSpecials = specials.filter((s) => s.startDate >= today);
    const specialStatus = (s) => (s.startDate > today ? "upcoming" : s.startDate === today ? "today" : "completed");

    /* ---------------- formatting ---------------- */
    const timeRange = (s) => `${formatTime(s.startTime, locale)} – ${formatTime(s.endTime, locale)}`;
    const duration = (s) => {
        const m = toMinutes(s.endTime) - toMinutes(s.startTime);
        if (!(m > 0)) return "";
        const h = Math.floor(m / 60), r = m % 60;
        if (h && r) return T("durHM", { h, m: r });
        if (h) return T("durH", { count: h });
        return T("durM", { count: r });
    };
    const daysLabel = (s) => {
        if (s.repeat === "once") return formatDate(s.startDate, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
        const set = new Set(scheduleDays(s));
        if (set.size === 7) return T("everyDay");
        const runs = [];
        WEEK_ORDER.filter((d) => set.has(d)).forEach((d) => {
            const last = runs[runs.length - 1];
            if (last && WEEK_ORDER.indexOf(last[last.length - 1]) === WEEK_ORDER.indexOf(d) - 1) last.push(d);
            else runs.push([d]);
        });
        return runs
            .map((r) => (r.length >= 3 ? `${dayShort[r[0]]}–${dayShort[r[r.length - 1]]}` : r.map((d) => dayShort[d]).join(", ")))
            .join(", ");
    };
    const holidayScope = (h) => (h.appliesTo === "selected"
        ? (h.sessionIds || []).map((id) => schedules.find((s) => s.id === id)?.name).filter(Boolean).join(", ") || T("someSessions")
        : T("allSessions"));
    const blockBadge = (block) => (
        <span className={`dtt__badge dtt__badge--${block.kind === "off" ? "off" : "holiday"}`} title={block.name || undefined}>
            {T(block.kind === "off" ? "badge_off" : "badge_holiday")}
        </span>
    );

    /* ---------------- small render helpers ---------------- */
    const skeleton = (rows, tall) => (
        <div className="dtt__skel-grid" aria-label={t("loading")}>
            {Array.from({ length: rows }).map((_, i) => <div key={i} className={`dtt__skel${tall ? " dtt__skel--tall" : ""}`} />)}
        </div>
    );
    const empty = (icon, text) => (
        <div className="dtt__empty">
            <span className="dtt__empty-icon">{icon}</span>
            <p>{text}</p>
        </div>
    );
    const sessionCard = (s, status, showDays = true) => {
        const blocked = s._block;
        return (
            <article key={s.id} className={`dtt__session dtt__session--${s.type}${s._next ? " is-next" : ""}${blocked ? " is-blocked" : ""}`}>
                {s._next && <span className="dtt__next-flag">{s._state === "live" ? T("happeningNow") : T("nextSession")}</span>}
                <div className="dtt__session-top">
                    <span className={`dtt__type-icon dtt__type-icon--${s.type}`}>{TYPE_ICON[s.type] || I.lotus}</span>
                    <div className="dtt__session-name">
                        <h3>{s.name}</h3>
                        <span>{T(`type_${s.type}`)}{s.isSample ? ` · ${T("sample")}` : ""}</span>
                    </div>
                    {status && <span className={`dtt__badge dtt__badge--${status}`}>{T(`badge_${status}`)}</span>}
                </div>
                <p className="dtt__time">{timeRange(s)}</p>
                <div className="dtt__meta">
                    {duration(s) && <span>{I.clock}{duration(s)}</span>}
                    {showDays && <span>{I.calendar}{daysLabel(s)}</span>}
                    {s.location && <span>{I.pin}{s.location}</span>}
                </div>
                {s.description && <p className="dtt__desc">{s.description}</p>}
                {blocked && (
                    <p className="dtt__blocked">
                        {blocked.kind === "off" ? T("blockedOff") : T("blockedHoliday", { name: blocked.name })}
                    </p>
                )}
            </article>
        );
    };

    /* ================================================================
       SECTIONS
       ================================================================ */
    const todaySection = (
        <section className="dtt__section" aria-labelledby="dtt-today">
            <div className="dtt__section-head">
                <h2 id="dtt-today">{T("todayTitle")}</h2>
                <span className="dtt__section-sub">{formatDate(today, locale, { weekday: "long", day: "numeric", month: "long" })}</span>
            </div>
            {loading ? skeleton(2, true) : (
                <>
                    {todayInfo.isOff && <div className="dtt__notice dtt__notice--off">{I.info}<span>{T("noticeWeeklyOff")}</span></div>}
                    {!todayInfo.isOff && todayInfo.allHoliday && (
                        <div className="dtt__notice dtt__notice--holiday">{I.flag}<span>{T("noticeHoliday", { name: todayInfo.allHoliday.name })}</span></div>
                    )}
                    {todaySessions.length === 0
                        ? (!todayInfo.isOff && !todayInfo.allHoliday && empty(I.lotus, T("emptyToday")))
                        : <div className="dtt__session-grid">{todaySessions.map((s) => sessionCard(s, s._state))}</div>}
                </>
            )}
        </section>
    );

    const timingSessions = [...recurring, ...upcomingSpecials];
    const timingsSection = (
        <section className="dtt__section dtt__section--card" aria-labelledby="dtt-timings">
            <div className="dtt__section-head">
                <h2 id="dtt-timings">{T("timingsTitle")}</h2>
            </div>
            {loading ? skeleton(2) : timingSessions.length === 0 ? (
                <p className="dtt__muted">{T("emptyTimings")}</p>
            ) : (
                <ul className="dtt__timings">
                    {timingSessions.map((s) => (
                        <li key={s.id}>
                            <span className={`dtt__type-icon dtt__type-icon--${s.type} dtt__type-icon--sm`}>{TYPE_ICON[s.type] || I.lotus}</span>
                            <div>
                                <strong>{s.name}{s.repeat === "once" ? ` · ${formatDate(s.startDate, locale, { day: "numeric", month: "short" })}` : ""}</strong>
                                <p>
                                    {T("checkInLine", { open: formatTime(s.checkInOpen, locale), close: formatTime(s.checkInClose, locale) })}
                                    {s.lateAllowed && <span className="dtt__late">{T("lateAllowed")}</span>}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <div className="dtt__note">{I.door}<span>{T("timingsNote")}</span></div>
        </section>
    );

    const weekSection = (
        <section className="dtt__section" aria-labelledby="dtt-week">
            <div className="dtt__section-head dtt__section-head--wrap">
                <div>
                    <h2 id="dtt-week">{T("weekTitle")}</h2>
                    <span className="dtt__section-sub">
                        {formatDate(weekDates[0], locale, { day: "numeric", month: "short" })} – {formatDate(weekDates[6], locale, { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                </div>
                <div className="dtt__week-nav">
                    <button type="button" className="dtt__icon-btn" onClick={() => setWeekStart(addDaysYmd(weekStart, -7))} aria-label={T("prevWeek")}>{I.left}</button>
                    <button type="button" className="dtt__chip-btn" onClick={() => setWeekStart(mondayOf(today))} disabled={isThisWeek}>{T("thisWeek")}</button>
                    <button type="button" className="dtt__icon-btn" onClick={() => setWeekStart(addDaysYmd(weekStart, 7))} aria-label={T("nextWeek")}>{I.right}</button>
                </div>
            </div>

            {loading ? skeleton(4) : weekColumns.length === 0 && !weekHasSpecials ? (
                empty(I.calendar, T("emptyWeek"))
            ) : (
                <div className="dtt__table-wrap">
                    <table className="dtt__table">
                        <thead>
                            <tr>
                                <th scope="col">{T("colDay")}</th>
                                {weekColumns.map((s) => (
                                    <th scope="col" key={s.id}>
                                        <span className="dtt__th">
                                            <span className={`dtt__type-icon dtt__type-icon--${s.type} dtt__type-icon--xs`}>{TYPE_ICON[s.type] || I.lotus}</span>
                                            {s.name}
                                        </span>
                                    </th>
                                ))}
                                {weekHasSpecials && <th scope="col">{T("colSpecial")}</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {weekDates.map((d) => {
                                const info = dayInfo(d);
                                const daySpecials = specials.filter((s) => occursOn(s, d));
                                const isToday = d === today;
                                return (
                                    <tr key={d} className={`${isToday ? "is-today" : ""}${info.isOff ? " is-off" : ""}`}>
                                        <th scope="row" className="dtt__day">
                                            <span className="dtt__day-name">
                                                <strong>{dayLong[weekdayOf(d)]}</strong>
                                                <small>{formatDate(d, locale, { day: "numeric", month: "short" })}</small>
                                            </span>
                                            {isToday && <span className="dtt__today-tag">{T("todayTag")}</span>}
                                        </th>
                                        {weekColumns.map((s) => {
                                            const runs = occursOn(s, d);
                                            const block = runs ? blockFor(s, d) : info.isOff ? { kind: "off" } : null;
                                            return (
                                                <td key={s.id} data-label={s.name}>
                                                    {block ? blockBadge(block)
                                                        : runs ? <span className="dtt__cell-time">{timeRange(s)}</span>
                                                            : <span className="dtt__dash">—</span>}
                                                </td>
                                            );
                                        })}
                                        {weekHasSpecials && (
                                            <td data-label={T("colSpecial")}>
                                                {daySpecials.length ? daySpecials.map((s) => {
                                                    const block = blockFor(s, d);
                                                    return (
                                                        <span key={s.id} className="dtt__cell-special">
                                                            <strong>{s.name}</strong>
                                                            {block ? blockBadge(block) : <span className="dtt__cell-time">{timeRange(s)}</span>}
                                                        </span>
                                                    );
                                                }) : <span className="dtt__dash">—</span>}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );

    const specialsSection = (list) => (
        <section className="dtt__section" aria-labelledby="dtt-special">
            <div className="dtt__section-head">
                <h2 id="dtt-special">{T("specialTitle")}</h2>
            </div>
            {loading ? skeleton(2, true) : list.length === 0 ? (
                empty(I.star, T("emptySpecial"))
            ) : (
                <div className="dtt__session-grid">
                    {list.map((s) => {
                        const block = s.startDate >= today ? blockFor(s, s.startDate) : null;
                        const status = block ? (block.kind === "off" ? "off" : "holiday") : specialStatus(s);
                        return sessionCard({ ...s, _block: block }, status);
                    })}
                </div>
            )}
        </section>
    );

    const holidaysSection = (
        <section className="dtt__section dtt__section--card" aria-labelledby="dtt-holidays">
            <div className="dtt__section-head">
                <h2 id="dtt-holidays">{T("holidaysTitle")}</h2>
            </div>
            {loading ? skeleton(3) : weeklyOffs.length === 0 && upcomingHolidays.length === 0 ? (
                empty(I.flag, T("emptyHolidays"))
            ) : (
                <ul className="dtt__hol-list">
                    {WEEK_ORDER.filter((d) => weeklyOffs.includes(d)).map((d) => (
                        <li key={`off-${d}`} className="dtt__hol">
                            <span className="dtt__hol-date dtt__hol-date--off"><strong>{dayShort[d]}</strong></span>
                            <div className="dtt__hol-main">
                                <strong>{T("everyWeekday", { day: dayLong[d] })}</strong>
                                <small>{T("weeklyOffText")}</small>
                            </div>
                            <span className="dtt__badge dtt__badge--off">{T("badge_off")}</span>
                        </li>
                    ))}
                    {upcomingHolidays.map((h) => (
                        <li key={h.id} className="dtt__hol">
                            <span className="dtt__hol-date">
                                <strong>{formatDate(h.date, locale, { day: "numeric" })}</strong>
                                <small>{formatDate(h.date, locale, { month: "short" })}</small>
                            </span>
                            <div className="dtt__hol-main">
                                <strong>{h.name}</strong>
                                <small>{formatDate(h.date, locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</small>
                                <small>{holidayScope(h)}{h.description ? ` · ${h.description}` : ""}</small>
                            </div>
                            <span className="dtt__badge dtt__badge--holiday">{h.date === today ? T("todayTag") : T("badge_holiday")}</span>
                        </li>
                    ))}
                    {upcomingHolidays.length === 0 && <li className="dtt__muted dtt__hol-none">{T("noUpcomingHolidays")}</li>}
                </ul>
            )}
        </section>
    );

    const allSection = (
        <section className="dtt__section" aria-labelledby="dtt-all">
            <div className="dtt__section-head">
                <h2 id="dtt-all">{T("allTitle")}</h2>
                <span className="dtt__section-sub">{T("allSub")}</span>
            </div>
            {loading ? skeleton(3, true) : recurring.length === 0 ? (
                empty(I.lotus, T("emptyAll"))
            ) : (
                <div className="dtt__session-grid">
                    {recurring.map((s) => sessionCard(s, s.startDate && s.startDate > today ? "upcoming" : "scheduled"))}
                </div>
            )}
        </section>
    );

    const views = [
        { key: "today", label: T("viewToday") },
        { key: "week", label: T("viewWeek") },
        { key: "upcoming", label: T("viewUpcoming") },
        { key: "all", label: T("viewAll") },
    ];

    /* ================================================================
       RENDER
       ================================================================ */
    return (
        <div className="dtt" data-theme={theme}>
            <Waves />

            <button type="button" className="dtt__back" onClick={() => navigate("/user-dashboard")}>
                {I.back}{t("back")}
            </button>

            <header className="dtt__head">
                <div className="dtt__head-text">
                    <span className="dtt__eyebrow">{I.lotus}{T("eyebrow")}</span>
                    <GradientTitle text={T("title")} />
                    <p className="dtt__subtitle">{T("subtitle")}</p>
                </div>
                <Hero />
                <div className="dtt__today-box">
                    <span className="dtt__today-day">{formatDate(today, locale, { weekday: "long" })}</span>
                    <span className="dtt__today-date">{formatDate(today, locale, { day: "numeric", month: "long", year: "numeric" })}</span>
                    {headerStatus && <span className={`dtt__status dtt__status--${headerStatus.tone}`}>{headerStatus.text}</span>}
                </div>
            </header>

            <div className="dtt__views" role="tablist" aria-label={T("title")}>
                {views.map((v) => (
                    <button
                        key={v.key}
                        type="button"
                        role="tab"
                        aria-selected={view === v.key}
                        className={`dtt__view${view === v.key ? " is-on" : ""}`}
                        onClick={() => setView(v.key)}
                    >
                        {VIEW_ICON[v.key]}{v.label}
                    </button>
                ))}
            </div>

            {error ? (
                <div className="dtt__error" role="alert">
                    <span className="dtt__empty-icon dtt__empty-icon--error">{I.alert}</span>
                    <h3>{T("errorTitle")}</h3>
                    <p>{T("errorText")}</p>
                    <button type="button" className="dtt__btn" onClick={retry}>{T("retry")}</button>
                </div>
            ) : (
                <div className="dtt__content">
                    {view === "today" && (
                        <div className="dtt__grid">
                            <div className="dtt__col-main">{todaySection}</div>
                            <div className="dtt__col-side">{timingsSection}</div>
                        </div>
                    )}
                    {view === "week" && weekSection}
                    {view === "upcoming" && (
                        <div className="dtt__grid">
                            <div className="dtt__col-main">{specialsSection(upcomingSpecials)}</div>
                            <div className="dtt__col-side">{holidaysSection}</div>
                        </div>
                    )}
                    {view === "all" && (
                        <>
                            {allSection}
                            {specialsSection(specials)}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default DhyanTimetable;