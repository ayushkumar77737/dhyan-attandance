import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db } from "../firebase/firebase";
import {
    addDoc, collection, deleteDoc, doc, getDoc, getDocs,
    serverTimestamp, setDoc, updateDoc,
} from "firebase/firestore";
import { logAdminAction } from "../utils/logAdminAction";
import {
    SCHEDULES_COL, HOLIDAYS_COL, SCHEDULE_SETTINGS, SESSION_TYPES, WEEK_ORDER,
    todayYmd, addDaysYmd, toMinutes, formatTime, formatDate, weekdayNames,
    scheduleDays, scheduleStatus, findConflict,
} from "../utils/scheduleUtils";
import "./ScheduleManagement.css";

/* ==================================================================
   SCHEDULE MANAGEMENT
   - All text: translation.json -> "schedule" block
   - Data: Firestore "schedules", "holidays", settings/scheduleSettings
   - Access: wrapped by <RequireAccess pageId="scheduleManagement">
   ================================================================== */

const PAGE_SIZE = 8;

const PRESETS = {
    morning: { startTime: "06:00", endTime: "07:00", checkInOpen: "05:45", checkInClose: "06:30", repeat: "selected", days: [1, 2, 3, 4, 5, 6] },
    evening: { startTime: "18:00", endTime: "19:00", checkInOpen: "17:45", checkInClose: "18:30", repeat: "selected", days: [1, 2, 3, 4, 5, 6] },
    special: { startTime: "19:00", endTime: "20:30", checkInOpen: "18:45", checkInClose: "19:30", repeat: "once", days: [] },
};

const emptySchedule = () => ({
    name: "",
    type: "morning",
    description: "",
    startDate: todayYmd(),
    endDate: "",
    lateAllowed: false,
    status: "active",
    ...PRESETS.morning,
});

const emptyHoliday = () => ({ name: "", date: todayYmd(), description: "", appliesTo: "all", sessionIds: [] });

/* ---------------- icons ---------------- */
const Svg = ({ children, sw = 1.9 }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);
const I = {
    back: <Svg sw={2.2}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Svg>,
    plus: <Svg sw={2.2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Svg>,
    calendar: <Svg><rect x="3" y="4" width="18" height="18" rx="2.5" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Svg>,
    schedule: <Svg><path d="M21 10.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><circle cx="17.5" cy="17.5" r="4.5" /><polyline points="17.5 15.5 17.5 17.5 19 18.5" /></Svg>,
    play: <Svg><circle cx="12" cy="12" r="9" /><polygon points="10 8.5 15.5 12 10 15.5 10 8.5" /></Svg>,
    clock: <Svg><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></Svg>,
    sun: <Svg><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>,
    moon: <Svg><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Svg>,
    star: <Svg><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" /></Svg>,
    flag: <Svg><path d="M4 22V4" /><path d="M4 4h12l-2 4 2 4H4" /></Svg>,
    search: <Svg><circle cx="11" cy="11" r="7.5" /><line x1="21" y1="21" x2="16.8" y2="16.8" /></Svg>,
    eye: <Svg><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>,
    edit: <Svg><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Svg>,
    trash: <Svg><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></Svg>,
    close: <Svg sw={2.2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>,
    left: <Svg sw={2.3}><polyline points="15 18 9 12 15 6" /></Svg>,
    right: <Svg sw={2.3}><polyline points="9 18 15 12 9 6" /></Svg>,
    info: <Svg><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12.01" y2="8" /></Svg>,
    alert: <Svg><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Svg>,
    check: <Svg sw={2.4}><polyline points="20 6 9 17 4 12" /></Svg>,
    lotus: <Svg sw={1.6}><path d="M12 4c1.6 1.9 2.4 3.8 2.4 5.6 0 1.6-.8 3.3-2.4 4.9-1.6-1.6-2.4-3.3-2.4-4.9C9.6 7.8 10.4 5.9 12 4z" /><path d="M3.5 11c2.6.2 4.8 1.3 6.3 3.4M20.5 11c-2.6.2-4.8 1.3-6.3 3.4" /><path d="M3 15.5c2 2.4 5.2 3.7 9 3.7s7-1.3 9-3.7" /></Svg>,
};
const TYPE_ICON = { morning: I.sun, evening: I.moon, special: I.star };

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

function Field({ id, label, error, hint, optionalText, children }) {
    return (
        <div className={`schm__field${error ? " has-error" : ""}`}>
            <label htmlFor={id} className="schm__label">
                {label}{optionalText && <span className="schm__optional"> ({optionalText})</span>}
            </label>
            {children}
            {hint && !error && <p className="schm__hint">{hint}</p>}
            {error && <p className="schm__error" role="alert">{error}</p>}
        </div>
    );
}

/* session vs check-in window, drawn on one time axis */
function WindowTimeline({ s, locale, S }) {
    const st = toMinutes(s.startTime), en = toMinutes(s.endTime);
    const op = toMinutes(s.checkInOpen), cl = toMinutes(s.checkInClose);
    if ([st, en, op, cl].some((v) => v === null) || en <= st || cl <= op) {
        return <p className="schm__tl-empty">{S("timelineHint")}</p>;
    }
    const lo = Math.min(st, op) - 15;
    const hi = Math.max(en, cl) + 15;
    const pct = (v) => `${((v - lo) / (hi - lo)) * 100}%`;
    const width = (a, b) => `${((b - a) / (hi - lo)) * 100}%`;
    return (
        <div className="schm__tl" aria-hidden="true">
            <div className="schm__tl-row">
                <span className="schm__tl-label">{S("session")}</span>
                <div className="schm__tl-track">
                    <span className="schm__tl-bar schm__tl-bar--session" style={{ left: pct(st), width: width(st, en) }}>
                        {formatTime(s.startTime, locale)} – {formatTime(s.endTime, locale)}
                    </span>
                </div>
            </div>
            <div className="schm__tl-row">
                <span className="schm__tl-label">{S("checkIn")}</span>
                <div className="schm__tl-track">
                    <span className="schm__tl-bar schm__tl-bar--window" style={{ left: pct(op), width: width(op, cl) }}>
                        {formatTime(s.checkInOpen, locale)} – {formatTime(s.checkInClose, locale)}
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ================================================================== */
function ScheduleManagement() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const S = useCallback((k, o) => t(`schedule.${k}`, o), [t]);
    const locale = i18n.resolvedLanguage || i18n.language || undefined;
    const theme = localStorage.getItem("dashTheme") || "dark";
    const today = todayYmd();

    const dayShort = useMemo(() => weekdayNames(locale, "short"), [locale]);
    const dayLong = useMemo(() => weekdayNames(locale, "long"), [locale]);

    /* ---------------- data ---------------- */
    const [schedules, setSchedules] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [weeklyOffs, setWeeklyOffs] = useState([]);
    const [savedOffs, setSavedOffs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const [sSnap, hSnap, cfg] = await Promise.all([
                getDocs(collection(db, SCHEDULES_COL)),
                getDocs(collection(db, HOLIDAYS_COL)),
                getDoc(doc(db, ...SCHEDULE_SETTINGS)),
            ]);
            setSchedules(sSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setHolidays(hSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
            const offs = cfg.exists() && Array.isArray(cfg.data().weeklyOffs) ? cfg.data().weeklyOffs : [];
            setWeeklyOffs(offs);
            setSavedOffs(offs);
        } catch (e) {
            console.error("ScheduleManagement: load", e);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    /* ---------------- toast ---------------- */
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);
    const notify = (type, msg) => {
        clearTimeout(toastTimer.current);
        setToast({ type, msg });
        toastTimer.current = setTimeout(() => setToast(null), 3200);
    };
    useEffect(() => () => clearTimeout(toastTimer.current), []);

    /* ---------------- ui state ---------------- */
    const [tab, setTab] = useState("schedules");
    const [search, setSearch] = useState("");
    const [typeF, setTypeF] = useState("all");
    const [statusF, setStatusF] = useState("all");
    const [dayF, setDayF] = useState("all");
    const [page, setPage] = useState(1);

    const [drawer, setDrawer] = useState(null);           // { mode, id, form }
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [confirm, setConfirm] = useState(null);         // { kind, item }
    const [holidayForm, setHolidayForm] = useState(null); // { id, form }
    const [hErrors, setHErrors] = useState({});
    const [holidayView, setHolidayView] = useState("upcoming");

    /* ---------------- derived ---------------- */
    const withStatus = useMemo(
        () => schedules
            .map((s) => ({ ...s, _status: scheduleStatus(s, today) }))
            .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "") || (a.name || "").localeCompare(b.name || "")),
        [schedules, today]
    );

    const monthKey = today.slice(0, 7);
    const stats = useMemo(() => ({
        total: withStatus.length,
        active: withStatus.filter((s) => s._status === "active").length,
        upcoming: withStatus.filter((s) => s._status === "upcoming").length,
        holidays: holidays.filter((h) => (h.date || "").startsWith(monthKey)).length,
    }), [withStatus, holidays, monthKey]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return withStatus.filter((s) => {
            if (typeF !== "all" && s.type !== typeF) return false;
            if (statusF !== "all" && s._status !== statusF) return false;
            if (dayF !== "all" && !scheduleDays(s).includes(Number(dayF))) return false;
            if (q && !`${s.name} ${s.description || ""}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [withStatus, search, typeF, statusF, dayF]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const curPage = Math.min(page, pageCount);
    const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);
    useEffect(() => { setPage(1); }, [search, typeF, statusF, dayF]);
    const filtersOn = search || typeF !== "all" || statusF !== "all" || dayF !== "all";
    const clearFilters = () => { setSearch(""); setTypeF("all"); setStatusF("all"); setDayF("all"); };

    /* ---------------- formatting ---------------- */
    const daysLabel = (s) => {
        if (s.repeat === "once") return formatDate(s.startDate, locale);
        if (s.repeat === "daily") return S("everyDay");
        const set = new Set(s.days || []);
        if (set.size === 7) return S("everyDay");
        if (!set.size) return "—";
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
    const statusLabel = (st) => S(`status_${st}`);
    const typeLabel = (ty) => S(`type_${ty}`);
    const sessionName = (id) => schedules.find((s) => s.id === id)?.name || S("deletedSession");

    /* ================================================================
       SCHEDULE: add / edit / activate / delete
       ================================================================ */
    const openAdd = () => { setErrors({}); setDrawer({ mode: "add", id: null, form: emptySchedule() }); };
    const openEdit = (s) => {
        setErrors({});
        setViewing(null);
        const { id, _status, createdAt, updatedAt, createdBy, isSample, ...rest } = s; // eslint-disable-line no-unused-vars
        setDrawer({ mode: "edit", id, form: { ...emptySchedule(), ...rest, days: rest.days || [] } });
    };
    const closeDrawer = useCallback(() => { if (!saving) setDrawer(null); }, [saving]);

    const setField = (k, v) => {
        setDrawer((d) => {
            let form = { ...d.form, [k]: v };
            if (k === "type" && d.mode === "add") form = { ...form, ...PRESETS[v] };
            if (k === "repeat" && v === "once") form.endDate = "";
            if (k === "repeat" && v === "selected" && !form.days.length) form.days = [1, 2, 3, 4, 5, 6];
            return { ...d, form };
        });
        setErrors((e) => ({ ...e, [k]: undefined, form: undefined }));
    };
    const toggleDay = (d) => {
        setDrawer((dr) => {
            const set = new Set(dr.form.days);
            if (set.has(d)) set.delete(d); else set.add(d);
            return { ...dr, form: { ...dr.form, days: [...set].sort() } };
        });
        setErrors((e) => ({ ...e, days: undefined }));
    };

    const validate = (f, id) => {
        const e = {};
        const name = f.name.trim();
        if (!name) e.name = S("errNameRequired");
        else if (name.length < 3 || name.length > 60) e.name = S("errNameLength");
        if (!f.startDate) e.startDate = S("errStartDate");
        if (f.repeat !== "once" && f.endDate && f.endDate < f.startDate) e.endDate = S("errEndDate");
        const st = toMinutes(f.startTime), en = toMinutes(f.endTime);
        const op = toMinutes(f.checkInOpen), cl = toMinutes(f.checkInClose);
        if (st === null) e.startTime = S("errTimeRequired");
        if (en === null) e.endTime = S("errTimeRequired");
        if (st !== null && en !== null && en <= st) e.endTime = S("errEndTime");
        if (f.repeat === "selected" && !f.days.length) e.days = S("errDays");
        if (op === null) e.checkInOpen = S("errTimeRequired");
        if (cl === null) e.checkInClose = S("errTimeRequired");
        if (op !== null && cl !== null) {
            if (cl <= op) e.checkInClose = S("errWindowOrder");
            else if (en !== null && cl > en) e.checkInClose = S("errWindowAfterEnd");
            else if (st !== null && op < st - 120) e.checkInOpen = S("errWindowTooEarly");
        }
        if (!Object.keys(e).length) {
            const c = findConflict({ ...f, name }, schedules, id);
            if (c?.kind === "name") e.name = S("errDuplicateName");
            if (c?.kind === "time") e.form = S("errOverlap", { name: c.other.name });
        }
        return e;
    };

    const saveSchedule = async (ev) => {
        ev.preventDefault();
        const { mode, id, form } = drawer;
        const e = validate(form, id);
        setErrors(e);
        if (Object.keys(e).length) return;

        const payload = {
            name: form.name.trim(),
            type: form.type,
            description: form.description.trim(),
            startDate: form.startDate,
            endDate: form.repeat === "once" ? "" : form.endDate || "",
            startTime: form.startTime,
            endTime: form.endTime,
            repeat: form.repeat,
            days: form.repeat === "selected" ? form.days : [],
            checkInOpen: form.checkInOpen,
            checkInClose: form.checkInClose,
            lateAllowed: !!form.lateAllowed,
            status: form.status,
            updatedAt: serverTimestamp(),
        };
        setSaving(true);
        try {
            if (mode === "add") {
                const ref = await addDoc(collection(db, SCHEDULES_COL), {
                    ...payload,
                    createdAt: serverTimestamp(),
                    createdBy: localStorage.getItem("userId") || "",
                });
                setSchedules((list) => [...list, { id: ref.id, ...payload }]);
                logAdminAction("Created schedule", { targetId: ref.id, details: payload.name });
                notify("success", S("toastCreated"));
            } else {
                await updateDoc(doc(db, SCHEDULES_COL, id), payload);
                setSchedules((list) => list.map((s) => (s.id === id ? { ...s, ...payload } : s)));
                logAdminAction("Updated schedule", { targetId: id, details: payload.name });
                notify("success", S("toastUpdated"));
            }
            setDrawer(null);
        } catch (err) {
            console.error("ScheduleManagement: save", err);
            notify("error", S("toastSaveError"));
        } finally {
            setSaving(false);
        }
    };

    const quickToggle = async (s) => {
        const next = s.status === "active" ? "inactive" : "active";
        setSaving(true);
        try {
            await updateDoc(doc(db, SCHEDULES_COL, s.id), { status: next, updatedAt: serverTimestamp() });
            setSchedules((list) => list.map((x) => (x.id === s.id ? { ...x, status: next } : x)));
            logAdminAction(next === "active" ? "Activated schedule" : "Deactivated schedule", { targetId: s.id, details: s.name });
            notify("success", next === "active" ? S("toastActivated") : S("toastDeactivated"));
            setViewing(null);
        } catch (err) {
            console.error(err);
            notify("error", S("toastSaveError"));
        } finally {
            setSaving(false);
        }
    };

    const seedSamples = async () => {
        const base = { endDate: "", status: "active", isSample: true, createdBy: localStorage.getItem("userId") || "" };
        const samples = [
            { ...base, name: S("sampleMorning"), type: "morning", description: S("sampleMorningDesc"), startDate: today, ...PRESETS.morning, lateAllowed: false },
            { ...base, name: S("sampleEvening"), type: "evening", description: S("sampleEveningDesc"), startDate: today, ...PRESETS.evening, lateAllowed: false },
            { ...base, name: S("sampleSpecial"), type: "special", description: S("sampleSpecialDesc"), startDate: addDaysYmd(today, 7), ...PRESETS.special, lateAllowed: true },
        ];
        setSaving(true);
        try {
            const added = [];
            for (const s of samples) {
                const ref = await addDoc(collection(db, SCHEDULES_COL), { ...s, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
                added.push({ id: ref.id, ...s });
            }
            setSchedules((list) => [...list, ...added]);
            logAdminAction("Added sample schedules", { details: "3 sample schedules" });
            notify("success", S("toastSamples"));
        } catch (err) {
            console.error(err);
            notify("error", S("toastSaveError"));
        } finally {
            setSaving(false);
        }
    };

    /* ================================================================
       HOLIDAYS & WEEKLY OFFS
       ================================================================ */
    const openHoliday = (h) => {
        setHErrors({});
        if (h) {
            const { id, createdAt, updatedAt, ...rest } = h; // eslint-disable-line no-unused-vars
            setHolidayForm({ id, form: { ...emptyHoliday(), ...rest, sessionIds: rest.sessionIds || [] } });
        } else {
            setHolidayForm({ id: null, form: emptyHoliday() });
        }
    };
    const closeHoliday = useCallback(() => { if (!saving) setHolidayForm(null); }, [saving]);
    const setHField = (k, v) => {
        setHolidayForm((h) => ({ ...h, form: { ...h.form, [k]: v } }));
        setHErrors((e) => ({ ...e, [k]: undefined, form: undefined }));
    };
    const toggleHSession = (id) => {
        setHolidayForm((h) => {
            const set = new Set(h.form.sessionIds);
            if (set.has(id)) set.delete(id); else set.add(id);
            return { ...h, form: { ...h.form, sessionIds: [...set] } };
        });
        setHErrors((e) => ({ ...e, sessionIds: undefined }));
    };

    const saveHoliday = async (ev) => {
        ev.preventDefault();
        const { id, form } = holidayForm;
        const e = {};
        const name = form.name.trim();
        if (!name) e.name = S("errHolidayName");
        if (!form.date) e.date = S("errHolidayDate");
        if (form.appliesTo === "selected" && !form.sessionIds.length) e.sessionIds = S("errHolidaySessions");
        if (!Object.keys(e).length && holidays.some((h) => h.id !== id && h.date === form.date && String(h.name).trim().toLowerCase() === name.toLowerCase())) {
            e.form = S("errHolidayDuplicate");
        }
        setHErrors(e);
        if (Object.keys(e).length) return;

        const payload = {
            name,
            date: form.date,
            description: form.description.trim(),
            appliesTo: form.appliesTo,
            sessionIds: form.appliesTo === "selected" ? form.sessionIds : [],
            updatedAt: serverTimestamp(),
        };
        setSaving(true);
        try {
            if (!id) {
                const ref = await addDoc(collection(db, HOLIDAYS_COL), { ...payload, createdAt: serverTimestamp() });
                setHolidays((list) => [...list, { id: ref.id, ...payload }]);
                logAdminAction("Added holiday", { targetId: ref.id, details: `${name} (${form.date})` });
                notify("success", S("toastHolidayAdded"));
            } else {
                await updateDoc(doc(db, HOLIDAYS_COL, id), payload);
                setHolidays((list) => list.map((h) => (h.id === id ? { ...h, ...payload } : h)));
                logAdminAction("Updated holiday", { targetId: id, details: `${name} (${form.date})` });
                notify("success", S("toastHolidayUpdated"));
            }
            setHolidayForm(null);
        } catch (err) {
            console.error(err);
            notify("error", S("toastSaveError"));
        } finally {
            setSaving(false);
        }
    };

    const offsDirty = [...weeklyOffs].sort().join() !== [...savedOffs].sort().join();
    const toggleOff = (d) => setWeeklyOffs((offs) => (offs.includes(d) ? offs.filter((x) => x !== d) : [...offs, d]));
    const saveOffs = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, ...SCHEDULE_SETTINGS), { weeklyOffs, updatedAt: serverTimestamp() }, { merge: true });
            setSavedOffs(weeklyOffs);
            logAdminAction("Updated weekly offs", { details: weeklyOffs.map((d) => dayShort[d]).join(", ") || "none" });
            notify("success", S("toastOffsSaved"));
        } catch (err) {
            console.error(err);
            notify("error", S("toastSaveError"));
        } finally {
            setSaving(false);
        }
    };

    const holidayList = useMemo(() => {
        const list = holidays.filter((h) => (holidayView === "upcoming" ? h.date >= today : h.date < today));
        return list.sort((a, b) => (holidayView === "upcoming" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));
    }, [holidays, holidayView, today]);

    /* ================================================================
       DELETE (shared confirm dialog)
       ================================================================ */
    const closeConfirm = useCallback(() => { if (!saving) setConfirm(null); }, [saving]);
    const doDelete = async () => {
        const { kind, item } = confirm;
        setSaving(true);
        try {
            if (kind === "schedule") {
                await deleteDoc(doc(db, SCHEDULES_COL, item.id));
                setSchedules((list) => list.filter((s) => s.id !== item.id));
                logAdminAction("Deleted schedule", { targetId: item.id, details: item.name });
                notify("success", S("toastDeleted"));
            } else {
                await deleteDoc(doc(db, HOLIDAYS_COL, item.id));
                setHolidays((list) => list.filter((h) => h.id !== item.id));
                logAdminAction("Deleted holiday", { targetId: item.id, details: `${item.name} (${item.date})` });
                notify("success", S("toastHolidayDeleted"));
            }
            setConfirm(null);
        } catch (err) {
            console.error(err);
            notify("error", S("toastDeleteError"));
        } finally {
            setSaving(false);
        }
    };

    const closeView = useCallback(() => setViewing(null), []);
    useDialog(!!drawer, closeDrawer);
    useDialog(!!viewing, closeView);
    useDialog(!!confirm, closeConfirm);
    useDialog(!!holidayForm, closeHoliday);

    /* ================================================================
       RENDER
       ================================================================ */
    const statCards = [
        { key: "total", label: S("statTotal"), value: stats.total, icon: I.schedule, tone: "indigo" },
        { key: "active", label: S("statActive"), value: stats.active, icon: I.play, tone: "green" },
        { key: "upcoming", label: S("statUpcoming"), value: stats.upcoming, icon: I.clock, tone: "blue" },
        { key: "holidays", label: S("statHolidays"), value: stats.holidays, icon: I.flag, tone: "saffron" },
    ];
    const f = drawer?.form;

    return (
        <div className="schm" data-theme={theme}>
            {/* ============================ HEADER ============================ */}
            <button type="button" className="schm__back" onClick={() => navigate("/admin-dashboard")}>
                {I.back}{t("back")}
            </button>

            <header className="schm__head">
                <div className="schm__head-text">
                    <span className="schm__eyebrow">{I.lotus}{t("adminPanel")}</span>
                    <h1 className="schm__title">{S("title")}</h1>
                    <p className="schm__subtitle">{S("subtitle")}</p>
                </div>
                <div className="schm__head-actions">
                    <button type="button" className="schm__btn schm__btn--ghost" onClick={() => setTab("holidays")}>
                        {I.flag}{S("manageHolidays")}
                    </button>
                    <button type="button" className="schm__btn schm__btn--primary" onClick={openAdd}>
                        {I.plus}{S("addSchedule")}
                    </button>
                </div>
            </header>

            {/* ============================ STATS ============================ */}
            <section className="schm__stats" aria-label={S("summary")}>
                {statCards.map((c) => (
                    <div className={`schm__stat schm__stat--${c.tone}`} key={c.key}>
                        <span className="schm__stat-icon">{c.icon}</span>
                        <div>
                            <p className="schm__stat-label">{c.label}</p>
                            <p className="schm__stat-value">{loading ? <span className="schm__skel schm__skel--num" /> : c.value}</p>
                        </div>
                    </div>
                ))}
            </section>

            {/* ============================ TABS ============================ */}
            <div className="schm__tabs" role="tablist" aria-label={S("title")}>
                <button type="button" role="tab" aria-selected={tab === "schedules"} className={`schm__tab${tab === "schedules" ? " is-on" : ""}`} onClick={() => setTab("schedules")}>
                    {I.schedule}{S("tabSchedules")}
                </button>
                <button type="button" role="tab" aria-selected={tab === "holidays"} className={`schm__tab${tab === "holidays" ? " is-on" : ""}`} onClick={() => setTab("holidays")}>
                    {I.flag}{S("tabHolidays")}
                </button>
            </div>

            {loadError ? (
                <div className="schm__card schm__state schm__state--error">
                    <span className="schm__state-icon">{I.alert}</span>
                    <h3>{S("loadErrorTitle")}</h3>
                    <p>{S("loadErrorText")}</p>
                    <button type="button" className="schm__btn schm__btn--primary" onClick={load}>{S("retry")}</button>
                </div>
            ) : tab === "schedules" ? (
                /* ======================== SCHEDULES TAB ======================== */
                <section className="schm__card" aria-label={S("tabSchedules")}>
                    <div className="schm__toolbar">
                        <label className="schm__search">
                            {I.search}
                            <input
                                type="search"
                                value={search}
                                maxLength={60}
                                placeholder={S("searchPh")}
                                aria-label={S("searchPh")}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </label>
                        <div className="schm__filters">
                            <select className="schm__select" value={typeF} onChange={(e) => setTypeF(e.target.value)} aria-label={S("filterType")}>
                                <option value="all">{S("allTypes")}</option>
                                {SESSION_TYPES.map((ty) => <option key={ty} value={ty}>{typeLabel(ty)}</option>)}
                            </select>
                            <select className="schm__select" value={statusF} onChange={(e) => setStatusF(e.target.value)} aria-label={S("filterStatus")}>
                                <option value="all">{S("allStatuses")}</option>
                                {["active", "upcoming", "inactive", "completed"].map((st) => <option key={st} value={st}>{statusLabel(st)}</option>)}
                            </select>
                            <select className="schm__select" value={dayF} onChange={(e) => setDayF(e.target.value)} aria-label={S("filterDay")}>
                                <option value="all">{S("allDays")}</option>
                                {WEEK_ORDER.map((d) => <option key={d} value={d}>{dayLong[d]}</option>)}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="schm__skel-list" aria-label={t("loading")}>
                            {Array.from({ length: 4 }).map((_, i) => <div className="schm__skel schm__skel--row" key={i} />)}
                        </div>
                    ) : withStatus.length === 0 ? (
                        <div className="schm__state">
                            <span className="schm__state-icon">{I.lotus}</span>
                            <h3>{S("emptyTitle")}</h3>
                            <p>{S("emptyText")}</p>
                            <div className="schm__state-actions">
                                <button type="button" className="schm__btn schm__btn--primary" onClick={openAdd}>{I.plus}{S("addSchedule")}</button>
                                <button type="button" className="schm__btn schm__btn--ghost" onClick={seedSamples} disabled={saving}>{S("addSamples")}</button>
                            </div>
                            <p className="schm__state-note">{S("samplesNote")}</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="schm__state">
                            <span className="schm__state-icon">{I.search}</span>
                            <h3>{S("noMatchTitle")}</h3>
                            <p>{S("noMatchText")}</p>
                            {filtersOn && <button type="button" className="schm__btn schm__btn--ghost" onClick={clearFilters}>{S("clearFilters")}</button>}
                        </div>
                    ) : (
                        <>
                            <div className="schm__table-wrap">
                                <table className="schm__table">
                                    <thead>
                                        <tr>
                                            <th scope="col">{S("colName")}</th>
                                            <th scope="col">{S("colType")}</th>
                                            <th scope="col">{S("colStart")}</th>
                                            <th scope="col">{S("colEnd")}</th>
                                            <th scope="col">{S("colDays")}</th>
                                            <th scope="col">{S("colWindow")}</th>
                                            <th scope="col">{S("colStatus")}</th>
                                            <th scope="col" className="schm__th-actions">{S("colActions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageRows.map((s) => (
                                            <tr key={s.id}>
                                                <td data-label={S("colName")} className="schm__td-name">
                                                    <div className="schm__name">
                                                        <span className={`schm__type-dot schm__type-dot--${s.type}`}>{TYPE_ICON[s.type] || I.schedule}</span>
                                                        <span className="schm__name-text">
                                                            <strong>{s.name}{s.isSample && <span className="schm__tag">{S("sample")}</span>}</strong>
                                                            {s.description && <small>{s.description}</small>}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td data-label={S("colType")}><span className={`schm__type schm__type--${s.type}`}>{typeLabel(s.type)}</span></td>
                                                <td data-label={S("colStart")} className="schm__mono">{formatTime(s.startTime, locale)}</td>
                                                <td data-label={S("colEnd")} className="schm__mono">{formatTime(s.endTime, locale)}</td>
                                                <td data-label={S("colDays")}>{daysLabel(s)}</td>
                                                <td data-label={S("colWindow")}>
                                                    <span className="schm__mono">{formatTime(s.checkInOpen, locale)} – {formatTime(s.checkInClose, locale)}</span>
                                                    {s.lateAllowed && <span className="schm__tag schm__tag--late">{S("lateOk")}</span>}
                                                </td>
                                                <td data-label={S("colStatus")}>
                                                    <span className={`schm__badge schm__badge--${s._status}`}>{statusLabel(s._status)}</span>
                                                </td>
                                                <td data-label={S("colActions")}>
                                                    <div className="schm__actions">
                                                        <button type="button" className="schm__icon-btn" onClick={() => setViewing(s)} aria-label={`${S("view")}: ${s.name}`} title={S("view")}>{I.eye}</button>
                                                        <button type="button" className="schm__icon-btn" onClick={() => openEdit(s)} aria-label={`${S("edit")}: ${s.name}`} title={S("edit")}>{I.edit}</button>
                                                        <button type="button" className="schm__icon-btn schm__icon-btn--danger" onClick={() => setConfirm({ kind: "schedule", item: s })} aria-label={`${S("delete")}: ${s.name}`} title={S("delete")}>{I.trash}</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="schm__pager">
                                <span>{S("showing", { from: (curPage - 1) * PAGE_SIZE + 1, to: Math.min(curPage * PAGE_SIZE, filtered.length), total: filtered.length })}</span>
                                {pageCount > 1 && (
                                    <div className="schm__pager-btns">
                                        <button type="button" className="schm__icon-btn" disabled={curPage === 1} onClick={() => setPage(curPage - 1)} aria-label={S("prevPage")}>{I.left}</button>
                                        <span className="schm__pager-num">{curPage} / {pageCount}</span>
                                        <button type="button" className="schm__icon-btn" disabled={curPage === pageCount} onClick={() => setPage(curPage + 1)} aria-label={S("nextPage")}>{I.right}</button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </section>
            ) : (
                /* ======================== HOLIDAYS TAB ======================== */
                <div className="schm__hol-grid">
                    <section className="schm__card schm__offs" aria-labelledby="schm-offs-title">
                        <h2 id="schm-offs-title" className="schm__card-title">{S("weeklyOffsTitle")}</h2>
                        <p className="schm__card-sub">{S("weeklyOffsText")}</p>
                        <div className="schm__chips schm__chips--offs" role="group" aria-label={S("weeklyOffsTitle")}>
                            {WEEK_ORDER.map((d) => (
                                <button
                                    type="button"
                                    key={d}
                                    className={`schm__chip${weeklyOffs.includes(d) ? " is-on is-off-day" : ""}`}
                                    aria-pressed={weeklyOffs.includes(d)}
                                    onClick={() => toggleOff(d)}
                                    disabled={loading}
                                >
                                    {dayShort[d]}
                                </button>
                            ))}
                        </div>
                        <button type="button" className="schm__btn schm__btn--primary schm__btn--block" onClick={saveOffs} disabled={!offsDirty || saving}>
                            {saving && offsDirty ? S("saving") : S("saveWeeklyOffs")}
                        </button>
                        <div className="schm__note">
                            {I.info}
                            <p>{S("absenceNote")}</p>
                        </div>
                    </section>

                    <section className="schm__card" aria-labelledby="schm-hol-title">
                        <div className="schm__card-head">
                            <div>
                                <h2 id="schm-hol-title" className="schm__card-title">{S("holidaysTitle")}</h2>
                                <p className="schm__card-sub">{S("holidaysText")}</p>
                            </div>
                            <button type="button" className="schm__btn schm__btn--primary" onClick={() => openHoliday(null)}>{I.plus}{S("addHoliday")}</button>
                        </div>

                        <div className="schm__seg" role="tablist" aria-label={S("holidaysTitle")}>
                            {["upcoming", "past"].map((v) => (
                                <button type="button" role="tab" key={v} aria-selected={holidayView === v} className={`schm__seg-btn${holidayView === v ? " is-on" : ""}`} onClick={() => setHolidayView(v)}>
                                    {S(v === "upcoming" ? "upcomingHolidays" : "pastHolidays")}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="schm__skel-list">
                                {Array.from({ length: 3 }).map((_, i) => <div className="schm__skel schm__skel--row" key={i} />)}
                            </div>
                        ) : holidayList.length === 0 ? (
                            <div className="schm__state schm__state--compact">
                                <span className="schm__state-icon">{I.calendar}</span>
                                <p>{holidayView === "upcoming" ? S("noUpcomingHolidays") : S("noPastHolidays")}</p>
                            </div>
                        ) : (
                            <ul className="schm__hol-list">
                                {holidayList.map((h) => (
                                    <li className="schm__hol" key={h.id}>
                                        <span className="schm__hol-date">
                                            <strong>{formatDate(h.date, locale, { day: "numeric" })}</strong>
                                            <small>{formatDate(h.date, locale, { month: "short" })}</small>
                                        </span>
                                        <div className="schm__hol-main">
                                            <strong>{h.name}</strong>
                                            <small>{formatDate(h.date, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{h.description ? ` · ${h.description}` : ""}</small>
                                            <span className="schm__hol-tags">
                                                {h.appliesTo === "selected"
                                                    ? (h.sessionIds || []).map((id) => <span className="schm__tag schm__tag--session" key={id}>{sessionName(id)}</span>)
                                                    : <span className="schm__tag schm__tag--all">{S("allSessions")}</span>}
                                            </span>
                                        </div>
                                        <div className="schm__actions">
                                            <button type="button" className="schm__icon-btn" onClick={() => openHoliday(h)} aria-label={`${S("edit")}: ${h.name}`} title={S("edit")}>{I.edit}</button>
                                            <button type="button" className="schm__icon-btn schm__icon-btn--danger" onClick={() => setConfirm({ kind: "holiday", item: h })} aria-label={`${S("delete")}: ${h.name}`} title={S("delete")}>{I.trash}</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            )}

            {/* ======================= ADD / EDIT DRAWER ======================= */}
            {drawer && (
                <div className="schm__overlay" onMouseDown={(e) => e.target === e.currentTarget && closeDrawer()}>
                    <form className="schm__drawer" role="dialog" aria-modal="true" aria-labelledby="schm-drawer-title" onSubmit={saveSchedule} noValidate>
                        <div className="schm__drawer-head">
                            <h2 id="schm-drawer-title">{drawer.mode === "add" ? S("addSchedule") : S("editSchedule")}</h2>
                            <button type="button" className="schm__icon-btn" onClick={closeDrawer} aria-label={S("close")}>{I.close}</button>
                        </div>

                        <div className="schm__drawer-body">
                            {errors.form && <div className="schm__alert" role="alert">{I.alert}<span>{errors.form}</span></div>}

                            <fieldset className="schm__group">
                                <legend>{S("secDetails")}</legend>
                                <Field id="sf-name" label={S("fName")} error={errors.name}>
                                    <input id="sf-name" className="schm__input" value={f.name} maxLength={60} autoFocus placeholder={S("fNamePh")}
                                        aria-invalid={!!errors.name} onChange={(e) => setField("name", e.target.value)} />
                                </Field>
                                <div className="schm__field">
                                    <span className="schm__label" id="sf-type-l">{S("fType")}</span>
                                    <div className="schm__radio-cards" role="radiogroup" aria-labelledby="sf-type-l">
                                        {SESSION_TYPES.map((ty) => (
                                            <label key={ty} className={`schm__radio-card${f.type === ty ? " is-on" : ""}`}>
                                                <input type="radio" name="sf-type" value={ty} checked={f.type === ty} onChange={() => setField("type", ty)} />
                                                <span className={`schm__type-dot schm__type-dot--${ty}`}>{TYPE_ICON[ty]}</span>
                                                {typeLabel(ty)}
                                            </label>
                                        ))}
                                    </div>
                                    {drawer.mode === "add" && <p className="schm__hint">{S("fTypeHint")}</p>}
                                </div>
                                <Field id="sf-desc" label={S("fDescription")} optionalText={S("optional")}>
                                    <textarea id="sf-desc" className="schm__input schm__textarea" rows={2} maxLength={200} value={f.description}
                                        placeholder={S("fDescriptionPh")} onChange={(e) => setField("description", e.target.value)} />
                                </Field>
                            </fieldset>

                            <fieldset className="schm__group">
                                <legend>{S("secTiming")}</legend>
                                <div className="schm__field">
                                    <span className="schm__label" id="sf-repeat-l">{S("fRepeat")}</span>
                                    <div className="schm__seg schm__seg--form" role="radiogroup" aria-labelledby="sf-repeat-l">
                                        {["daily", "selected", "once"].map((r) => (
                                            <label key={r} className={`schm__seg-btn${f.repeat === r ? " is-on" : ""}`}>
                                                <input type="radio" name="sf-repeat" value={r} checked={f.repeat === r} onChange={() => setField("repeat", r)} />
                                                {S(`repeat_${r}`)}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {f.repeat === "selected" && (
                                    <div className={`schm__field${errors.days ? " has-error" : ""}`}>
                                        <span className="schm__label" id="sf-days-l">{S("fDays")}</span>
                                        <div className="schm__chips" role="group" aria-labelledby="sf-days-l">
                                            {WEEK_ORDER.map((d) => (
                                                <button type="button" key={d} className={`schm__chip${f.days.includes(d) ? " is-on" : ""}`} aria-pressed={f.days.includes(d)} aria-label={dayLong[d]} onClick={() => toggleDay(d)}>
                                                    {dayShort[d]}
                                                </button>
                                            ))}
                                        </div>
                                        {errors.days && <p className="schm__error" role="alert">{errors.days}</p>}
                                    </div>
                                )}
                                <div className="schm__row">
                                    <Field id="sf-sdate" label={f.repeat === "once" ? S("fSessionDate") : S("fStartDate")} error={errors.startDate}>
                                        <input id="sf-sdate" type="date" className="schm__input" value={f.startDate} onChange={(e) => setField("startDate", e.target.value)} aria-invalid={!!errors.startDate} />
                                    </Field>
                                    {f.repeat !== "once" && (
                                        <Field id="sf-edate" label={S("fEndDate")} error={errors.endDate} hint={S("fEndDateHint")} optionalText={S("optional")}>
                                            <input id="sf-edate" type="date" className="schm__input" value={f.endDate} min={f.startDate} onChange={(e) => setField("endDate", e.target.value)} aria-invalid={!!errors.endDate} />
                                        </Field>
                                    )}
                                </div>
                                <div className="schm__row">
                                    <Field id="sf-stime" label={S("fStartTime")} error={errors.startTime}>
                                        <input id="sf-stime" type="time" className="schm__input" value={f.startTime} onChange={(e) => setField("startTime", e.target.value)} aria-invalid={!!errors.startTime} />
                                    </Field>
                                    <Field id="sf-etime" label={S("fEndTime")} error={errors.endTime}>
                                        <input id="sf-etime" type="time" className="schm__input" value={f.endTime} onChange={(e) => setField("endTime", e.target.value)} aria-invalid={!!errors.endTime} />
                                    </Field>
                                </div>
                            </fieldset>

                            <fieldset className="schm__group schm__group--window">
                                <legend>{S("secWindow")}</legend>
                                <p className="schm__group-hint">{I.info}<span>{S("windowHint")}</span></p>
                                <div className="schm__row">
                                    <Field id="sf-open" label={S("fCheckInOpen")} error={errors.checkInOpen}>
                                        <input id="sf-open" type="time" className="schm__input" value={f.checkInOpen} onChange={(e) => setField("checkInOpen", e.target.value)} aria-invalid={!!errors.checkInOpen} />
                                    </Field>
                                    <Field id="sf-close" label={S("fCheckInClose")} error={errors.checkInClose}>
                                        <input id="sf-close" type="time" className="schm__input" value={f.checkInClose} onChange={(e) => setField("checkInClose", e.target.value)} aria-invalid={!!errors.checkInClose} />
                                    </Field>
                                </div>
                                <WindowTimeline s={f} locale={locale} S={S} />
                                <label className="schm__switch">
                                    <input type="checkbox" checked={f.lateAllowed} onChange={(e) => setField("lateAllowed", e.target.checked)} />
                                    <span className="schm__switch-ui" aria-hidden="true" />
                                    <span>
                                        <strong>{S("fLateAllowed")}</strong>
                                        <small>{S("fLateAllowedHint")}</small>
                                    </span>
                                </label>
                            </fieldset>

                            <fieldset className="schm__group">
                                <legend>{S("fStatus")}</legend>
                                <label className="schm__switch">
                                    <input type="checkbox" checked={f.status === "active"} onChange={(e) => setField("status", e.target.checked ? "active" : "inactive")} />
                                    <span className="schm__switch-ui" aria-hidden="true" />
                                    <span>
                                        <strong>{f.status === "active" ? S("status_active") : S("status_inactive")}</strong>
                                        <small>{S("fStatusHint")}</small>
                                    </span>
                                </label>
                            </fieldset>
                        </div>

                        <div className="schm__drawer-foot">
                            <button type="button" className="schm__btn schm__btn--ghost" onClick={closeDrawer} disabled={saving}>{S("cancel")}</button>
                            <button type="submit" className="schm__btn schm__btn--primary" disabled={saving}>
                                {saving ? S("saving") : S("saveSchedule")}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* =========================== VIEW MODAL =========================== */}
            {viewing && (
                <div className="schm__overlay schm__overlay--center" onMouseDown={(e) => e.target === e.currentTarget && closeView()}>
                    <div className="schm__modal" role="dialog" aria-modal="true" aria-labelledby="schm-view-title">
                        <div className="schm__drawer-head">
                            <div className="schm__name">
                                <span className={`schm__type-dot schm__type-dot--${viewing.type}`}>{TYPE_ICON[viewing.type]}</span>
                                <h2 id="schm-view-title">{viewing.name}</h2>
                            </div>
                            <button type="button" className="schm__icon-btn" onClick={closeView} aria-label={S("close")} autoFocus>{I.close}</button>
                        </div>
                        <div className="schm__modal-body">
                            <div className="schm__view-badges">
                                <span className={`schm__type schm__type--${viewing.type}`}>{typeLabel(viewing.type)}</span>
                                <span className={`schm__badge schm__badge--${viewing._status}`}>{statusLabel(viewing._status)}</span>
                                {viewing.isSample && <span className="schm__tag">{S("sample")}</span>}
                            </div>
                            {viewing.description && <p className="schm__view-desc">{viewing.description}</p>}
                            <dl className="schm__dl">
                                <div><dt>{S("colStart")}</dt><dd>{formatTime(viewing.startTime, locale)}</dd></div>
                                <div><dt>{S("colEnd")}</dt><dd>{formatTime(viewing.endTime, locale)}</dd></div>
                                <div><dt>{S("fRepeat")}</dt><dd>{S(`repeat_${viewing.repeat}`)}</dd></div>
                                <div><dt>{S("colDays")}</dt><dd>{daysLabel(viewing)}</dd></div>
                                <div><dt>{viewing.repeat === "once" ? S("fSessionDate") : S("fStartDate")}</dt><dd>{formatDate(viewing.startDate, locale)}</dd></div>
                                {viewing.repeat !== "once" && <div><dt>{S("fEndDate")}</dt><dd>{viewing.endDate ? formatDate(viewing.endDate, locale) : S("noEndDate")}</dd></div>}
                                <div><dt>{S("colWindow")}</dt><dd>{formatTime(viewing.checkInOpen, locale)} – {formatTime(viewing.checkInClose, locale)}</dd></div>
                                <div><dt>{S("fLateAllowed")}</dt><dd>{viewing.lateAllowed ? S("yes") : S("no")}</dd></div>
                            </dl>
                            <WindowTimeline s={viewing} locale={locale} S={S} />
                        </div>
                        <div className="schm__drawer-foot">
                            <button type="button" className="schm__btn schm__btn--ghost" onClick={() => quickToggle(viewing)} disabled={saving}>
                                {viewing.status === "active" ? S("deactivate") : S("activate")}
                            </button>
                            <button type="button" className="schm__btn schm__btn--primary" onClick={() => openEdit(viewing)}>{I.edit}{S("edit")}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================= HOLIDAY MODAL ========================= */}
            {holidayForm && (
                <div className="schm__overlay schm__overlay--center" onMouseDown={(e) => e.target === e.currentTarget && closeHoliday()}>
                    <form className="schm__modal" role="dialog" aria-modal="true" aria-labelledby="schm-hol-modal" onSubmit={saveHoliday} noValidate>
                        <div className="schm__drawer-head">
                            <h2 id="schm-hol-modal">{holidayForm.id ? S("editHoliday") : S("addHoliday")}</h2>
                            <button type="button" className="schm__icon-btn" onClick={closeHoliday} aria-label={S("close")}>{I.close}</button>
                        </div>
                        <div className="schm__modal-body">
                            {hErrors.form && <div className="schm__alert" role="alert">{I.alert}<span>{hErrors.form}</span></div>}
                            <Field id="hf-name" label={S("hName")} error={hErrors.name}>
                                <input id="hf-name" className="schm__input" value={holidayForm.form.name} maxLength={60} autoFocus placeholder={S("hNamePh")}
                                    aria-invalid={!!hErrors.name} onChange={(e) => setHField("name", e.target.value)} />
                            </Field>
                            <Field id="hf-date" label={S("hDate")} error={hErrors.date}>
                                <input id="hf-date" type="date" className="schm__input" value={holidayForm.form.date} aria-invalid={!!hErrors.date} onChange={(e) => setHField("date", e.target.value)} />
                            </Field>
                            <Field id="hf-desc" label={S("fDescription")} optionalText={S("optional")}>
                                <textarea id="hf-desc" className="schm__input schm__textarea" rows={2} maxLength={200} value={holidayForm.form.description} onChange={(e) => setHField("description", e.target.value)} />
                            </Field>
                            <div className={`schm__field${hErrors.sessionIds ? " has-error" : ""}`}>
                                <span className="schm__label" id="hf-applies-l">{S("hAppliesTo")}</span>
                                <div className="schm__seg schm__seg--form" role="radiogroup" aria-labelledby="hf-applies-l">
                                    {["all", "selected"].map((v) => (
                                        <label key={v} className={`schm__seg-btn${holidayForm.form.appliesTo === v ? " is-on" : ""}`}>
                                            <input type="radio" name="hf-applies" value={v} checked={holidayForm.form.appliesTo === v} onChange={() => setHField("appliesTo", v)} />
                                            {v === "all" ? S("allSessions") : S("selectedSessions")}
                                        </label>
                                    ))}
                                </div>
                                {holidayForm.form.appliesTo === "selected" && (
                                    schedules.length ? (
                                        <div className="schm__checks">
                                            {schedules.map((s) => (
                                                <label key={s.id} className="schm__check">
                                                    <input type="checkbox" checked={holidayForm.form.sessionIds.includes(s.id)} onChange={() => toggleHSession(s.id)} />
                                                    <span className={`schm__type-dot schm__type-dot--${s.type}`}>{TYPE_ICON[s.type]}</span>
                                                    {s.name}
                                                </label>
                                            ))}
                                        </div>
                                    ) : <p className="schm__hint">{S("noSessionsYet")}</p>
                                )}
                                {hErrors.sessionIds && <p className="schm__error" role="alert">{hErrors.sessionIds}</p>}
                            </div>
                        </div>
                        <div className="schm__drawer-foot">
                            <button type="button" className="schm__btn schm__btn--ghost" onClick={closeHoliday} disabled={saving}>{S("cancel")}</button>
                            <button type="submit" className="schm__btn schm__btn--primary" disabled={saving}>{saving ? S("saving") : S("saveHoliday")}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* ======================== CONFIRM DELETE ======================== */}
            {confirm && (
                <div className="schm__overlay schm__overlay--center" onMouseDown={(e) => e.target === e.currentTarget && closeConfirm()}>
                    <div className="schm__modal schm__modal--sm" role="alertdialog" aria-modal="true" aria-labelledby="schm-confirm-title" aria-describedby="schm-confirm-text">
                        <div className="schm__confirm">
                            <span className="schm__confirm-icon">{I.trash}</span>
                            <h2 id="schm-confirm-title">{confirm.kind === "schedule" ? S("deleteScheduleTitle") : S("deleteHolidayTitle")}</h2>
                            <p id="schm-confirm-text">{S("deleteText", { name: confirm.item.name })}</p>
                        </div>
                        <div className="schm__drawer-foot">
                            <button type="button" className="schm__btn schm__btn--ghost" onClick={closeConfirm} disabled={saving} autoFocus>{S("cancel")}</button>
                            <button type="button" className="schm__btn schm__btn--danger" onClick={doDelete} disabled={saving}>{saving ? S("deleting") : S("delete")}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================= TOAST ============================= */}
            <div className="schm__toast-zone" aria-live="polite">
                {toast && (
                    <div className={`schm__toast schm__toast--${toast.type}`}>
                        {toast.type === "success" ? I.check : I.alert}
                        <span>{toast.msg}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ScheduleManagement;