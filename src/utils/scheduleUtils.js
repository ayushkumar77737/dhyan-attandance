/* ==================================================================
   Schedule helpers — shared by ScheduleManagement and (later) any
   attendance page that must skip holidays / weekly offs.

   Firestore layout
     schedules/{id}              one Dhyan session (recurring or one-time)
     holidays/{id}               { name, date, description, appliesTo, sessionIds }
     settings/scheduleSettings   { weeklyOffs: [0..6] }   (0 = Sunday)

   All dates are local "YYYY-MM-DD" strings and all times are "HH:MM"
   (24h), so comparisons are plain string / minute comparisons with no
   timezone shifts.
   ================================================================== */
import { db } from "../firebase/firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";

export const SCHEDULES_COL = "schedules";
export const HOLIDAYS_COL = "holidays";
export const SCHEDULE_SETTINGS = ["settings", "scheduleSettings"];

export const SESSION_TYPES = ["morning", "evening", "special"];
export const REPEAT_TYPES = ["daily", "selected", "once"];
/* Monday-first order for chips and day ranges */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/* ---------------- dates & times ---------------- */
const pad = (n) => String(n).padStart(2, "0");

export const todayYmd = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const addDaysYmd = (ymd, n) => {
    const [y, m, d] = ymd.split("-").map(Number);
    const x = new Date(y, m - 1, d + n);
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

export const weekdayOf = (ymd) => {
    const [y, m, d] = String(ymd).split("-").map(Number);
    return new Date(y, m - 1, d).getDay();
};

export const toMinutes = (hhmm) => {
    if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};

export const formatTime = (hhmm, locale) => {
    const mins = toMinutes(hhmm);
    if (mins === null) return "—";
    return new Date(2000, 0, 1, Math.floor(mins / 60), mins % 60)
        .toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
};

export const formatDate = (ymd, locale, opts = { day: "numeric", month: "short", year: "numeric" }) => {
    if (!ymd) return "—";
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, opts);
};

/* localized short weekday names, index 0 = Sunday */
export const weekdayNames = (locale, style = "short") =>
    Array.from({ length: 7 }, (_, i) =>
        new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: style })
    );

/* ---------------- schedule logic ---------------- */
export const scheduleDays = (s) => {
    if (s.repeat === "daily") return [0, 1, 2, 3, 4, 5, 6];
    if (s.repeat === "once") return s.startDate ? [weekdayOf(s.startDate)] : [];
    return Array.isArray(s.days) ? s.days : [];
};

/* active | inactive | upcoming | completed */
export const scheduleStatus = (s, today = todayYmd()) => {
    if (s.status !== "active") return "inactive";
    if (s.repeat === "once") {
        if (s.startDate > today) return "upcoming";
        if (s.startDate < today) return "completed";
        return "active";
    }
    if (s.startDate && s.startDate > today) return "upcoming";
    if (s.endDate && s.endDate < today) return "completed";
    return "active";
};

const dateRange = (s) =>
    s.repeat === "once"
        ? [s.startDate, s.startDate]
        : [s.startDate || "0000-01-01", s.endDate || "9999-12-31"];

/* Returns { kind: "name" | "time", other } when the draft duplicates or
   clashes with another schedule, otherwise null. */
export const findConflict = (draft, list, editingId) => {
    const name = String(draft.name || "").trim().toLowerCase();
    const sameName = list.find(
        (s) => s.id !== editingId && String(s.name || "").trim().toLowerCase() === name
    );
    if (sameName) return { kind: "name", other: sameName };

    if (draft.status !== "active") return null;
    const days = new Set(scheduleDays(draft));
    const [ds, de] = dateRange(draft);
    const a0 = toMinutes(draft.startTime);
    const a1 = toMinutes(draft.endTime);

    const clash = list.find((s) => {
        if (s.id === editingId || s.status !== "active") return false;
        const [ss, se] = dateRange(s);
        if (ss > de || ds > se) return false;
        if (!scheduleDays(s).some((d) => days.has(d))) return false;
        const b0 = toMinutes(s.startTime);
        const b1 = toMinutes(s.endTime);
        return a0 < b1 && b0 < a1;
    });
    return clash ? { kind: "time", other: clash } : null;
};

/* ---------------- holidays & weekly offs ----------------
   Use these from attendance / report pages so that holidays and weekly
   offs are NOT counted as absences:

     const cfg = await fetchNonWorkingConfig();
     if (isNonWorkingDay("2026-10-20", cfg)) { ...skip this date... }
   -------------------------------------------------------- */
export const fetchNonWorkingConfig = async () => {
    const [hSnap, sSnap] = await Promise.all([
        getDocs(collection(db, HOLIDAYS_COL)),
        getDoc(doc(db, ...SCHEDULE_SETTINGS)),
    ]);
    const holidays = hSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const weeklyOffs = sSnap.exists() && Array.isArray(sSnap.data().weeklyOffs) ? sSnap.data().weeklyOffs : [];
    return { holidays, weeklyOffs };
};

export const isNonWorkingDay = (ymd, { holidays = [], weeklyOffs = [] } = {}, sessionId = null) => {
    if (weeklyOffs.includes(weekdayOf(ymd))) return true;
    return holidays.some(
        (h) =>
            h.date === ymd &&
            (h.appliesTo !== "selected" || !sessionId || (h.sessionIds || []).includes(sessionId))
    );
};