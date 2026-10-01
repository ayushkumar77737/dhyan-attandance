import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";
import { db, auth } from "../firebase/firebase";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import "./AttendanceCalendar.css";

/* ------------------------------------------------------------------ */
/* Helpers — all dates are LOCAL "YYYY-MM-DD" strings (no UTC shifts)  */
/* ------------------------------------------------------------------ */
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const monthKey = (y, m) => `${y}-${pad(m + 1)}`;
const todayStr = () => {
    const d = new Date();
    return ymd(d.getFullYear(), d.getMonth(), d.getDate());
};
const parseYmd = (s) => {
    const [y, m, d] = String(s).split("-").map(Number);
    return { y, m: m - 1, d };
};

const svg = (children, sw = 2) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        {children}
    </svg>
);
const icons = {
    back: svg(<><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>, 2.2),
    left: svg(<polyline points="15 18 9 12 15 6" />, 2.4),
    right: svg(<polyline points="9 18 15 12 9 6" />, 2.4),
    calendar: svg(<><rect x="3" y="4" width="18" height="18" rx="2.5" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>),
    download: svg(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>),
    search: svg(<><circle cx="11" cy="11" r="7.5" /><line x1="21" y1="21" x2="16.8" y2="16.8" /></>),
    inbox: svg(<><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>),
};

const STATUS = ["Present", "Absent", "Leave"];

function AttendanceCalendar() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const theme = useState(() => localStorage.getItem("dashTheme") || "dark")[0];

    const today = todayStr();
    const t0 = parseYmd(today);

    const [view, setView] = useState({ y: t0.y, m: t0.m });
    const [selected, setSelected] = useState(today);
    const [users, setUsers] = useState([]);
    const [months, setMonths] = useState({}); // "YYYY-MM" -> { att: [], leaves: [] }
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [filter, setFilter] = useState("All");
    const [search, setSearch] = useState("");

    /* keep the same inspect-lock behaviour as the other admin pages */
    useEffect(() => {
        const noCtx = (e) => e.preventDefault();
        const noKeys = (e) => {
            if (e.key === "F12") e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) e.preventDefault();
            if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
        };
        document.addEventListener("contextmenu", noCtx);
        document.addEventListener("keydown", noKeys);
        return () => {
            document.removeEventListener("contextmenu", noCtx);
            document.removeEventListener("keydown", noKeys);
        };
    }, []);

    /* admin guard — same rule as AttendanceReport */
    useEffect(() => {
        (async () => {
            const cu = auth.currentUser;
            if (!cu) return navigate("/");
            try {
                const snap = await getDoc(doc(db, "users", localStorage.getItem("userId")));
                if (!snap.exists()) return navigate("/");
                const d = snap.data();
                if (d.role !== "admin" || d.uid !== cu.uid) navigate("/");
            } catch (e) {
                console.error(e);
                navigate("/");
            }
        })();
    }, [navigate]);

    /* members (non-admin, not deleted) */
    useEffect(() => {
        (async () => {
            try {
                const snap = await getDocs(collection(db, "users"));
                const list = [];
                snap.forEach((d) => {
                    const data = d.data();
                    if (data.deleted !== true && data.role !== "admin") {
                        list.push({ id: String(data.id || d.id), name: data.name || data.id || d.id });
                    }
                });
                list.sort((a, b) => a.name.localeCompare(b.name));
                setUsers(list);
            } catch (e) {
                console.error("AttendanceCalendar: users", e);
            }
        })();
    }, []);

    /* load one month at a time (range query on a single field — no index needed) */
    const loadMonth = useCallback(async (y, m) => {
        const key = monthKey(y, m);
        const start = `${key}-01`;
        const end = `${key}-31`;
        const att = [];
        const leaves = [];
        const [aSnap, lSnap] = await Promise.all([
            getDocs(query(collection(db, "attendance"), where("date", ">=", start), where("date", "<=", end))),
            getDocs(query(collection(db, "leaveRequests"), where("date", ">=", start), where("date", "<=", end))),
        ]);
        aSnap.forEach((d) => att.push(d.data()));
        lSnap.forEach((d) => leaves.push(d.data()));
        return { key, data: { att, leaves } };
    }, []);

    const selP = parseYmd(selected);
    const needed = useMemo(
        () => Array.from(new Set([monthKey(view.y, view.m), monthKey(selP.y, selP.m)])),
        [view.y, view.m, selP.y, selP.m]
    );

    useEffect(() => {
        const missing = needed.filter((k) => !months[k]);
        if (!missing.length) return;
        let cancelled = false;
        setLoading(true);
        setLoadError(false);
        Promise.all(
            missing.map((k) => {
                const [y, mm] = k.split("-").map(Number);
                return loadMonth(y, mm - 1);
            })
        )
            .then((res) => {
                if (cancelled) return;
                setMonths((prev) => {
                    const next = { ...prev };
                    res.forEach((r) => { next[r.key] = r.data; });
                    return next;
                });
            })
            .catch((e) => {
                console.error("AttendanceCalendar: load", e);
                if (!cancelled) setLoadError(true);
            })
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [needed, months, loadMonth]);

    /* per-day aggregation: date -> { statusByUser, marked } */
    const byDate = useMemo(() => {
        const map = {};
        const ensure = (date) => (map[date] ||= { att: {}, leave: new Set(), marked: false });
        Object.values(months).forEach(({ att, leaves }) => {
            att.forEach((r) => {
                if (!r.date || !r.userId) return;
                const day = ensure(r.date);
                day.marked = true;
                day.att[String(r.userId)] = r.status === "Present" ? "Present" : "Absent";
            });
            leaves.forEach((l) => {
                if (!l.date || !l.userId) return;
                if (String(l.status || "").toLowerCase() !== "approved") return;
                ensure(l.date).leave.add(String(l.userId));
            });
        });
        return map;
    }, [months]);

    const userStatus = (day, uid) => {
        if (!day) return null;
        if (day.att[uid] === "Present") return "Present";
        if (day.leave.has(uid)) return "Leave";
        if (day.att[uid] === "Absent") return "Absent";
        return null;
    };

    const counts = (date) => {
        const day = byDate[date];
        const c = { Present: 0, Absent: 0, Leave: 0 };
        if (!day) return c;
        const ids = new Set([...Object.keys(day.att), ...day.leave]);
        ids.forEach((uid) => {
            const s = userStatus(day, uid);
            if (s) c[s] += 1;
        });
        return c;
    };

    /* selected-day summary */
    const selDay = byDate[selected];
    const selCounts = useMemo(() => counts(selected), [byDate, selected]); // eslint-disable-line
    const hasData = !!selDay && (selDay.marked || selDay.leave.size > 0);
    const totalAccounted = selCounts.Present + selCounts.Absent + selCounts.Leave;
    const rate = totalAccounted ? Math.round((selCounts.Present / totalAccounted) * 100) : 0;
    const isFuture = selected > today;

    const rows = useMemo(() => {
        if (!hasData) return [];
        const nameOf = (uid) => users.find((u) => u.id === uid)?.name || uid;
        const all = users.map((u) => ({ id: u.id, name: u.name, status: userStatus(selDay, u.id) }));
        // include ids that have a record but are no longer in the member list
        const known = new Set(users.map((u) => u.id));
        [...Object.keys(selDay.att), ...selDay.leave].forEach((uid) => {
            if (!known.has(uid)) all.push({ id: uid, name: nameOf(uid), status: userStatus(selDay, uid) });
        });
        const q = search.trim().toLowerCase();
        return all
            .filter((r) => (selDay.marked ? true : r.status))
            .filter((r) => (filter === "All" ? true : r.status === filter))
            .filter((r) => !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
    }, [hasData, users, selDay, filter, search]); // eslint-disable-line

    /* calendar grid */
    const grid = useMemo(() => {
        const first = new Date(view.y, view.m, 1).getDay();
        const dim = new Date(view.y, view.m + 1, 0).getDate();
        return [...Array(first).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
    }, [view]);

    const locale = i18n.language || undefined;
    const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
    const monthNames = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(locale, { month: "long" }));
    const years = Array.from({ length: 8 }, (_, i) => t0.y - 5 + i);
    const dayNames = [t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")];
    const selDate = new Date(selP.y, selP.m, selP.d);

    const shiftMonth = (delta) => {
        const d = new Date(view.y, view.m + delta, 1);
        setView({ y: d.getFullYear(), m: d.getMonth() });
    };
    const pick = (date) => { setSelected(date); setFilter("All"); setSearch(""); };
    const goToday = () => { setView({ y: t0.y, m: t0.m }); pick(today); };

    const statusLabel = (s) => (s === "Present" ? t("present") : s === "Absent" ? t("absent") : s === "Leave" ? t("acLeave", "Leave") : t("notMarked"));

    const exportDay = () => {
        if (!hasData) return;
        const data = users.map((u) => ({
            Name: u.name,
            ID: u.id,
            Status: userStatus(selDay, u.id) || (selDay.marked ? "Not marked" : "—"),
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");
        XLSX.writeFile(wb, `attendance_${selected}.xlsx`);
    };

    const initials = (n) => (n ? n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?");

    /* donut ring */
    const R = 52, C = 2 * Math.PI * R;
    const seg = (n) => (totalAccounted ? (n / totalAccounted) * C : 0);

    return (
        <div className="ac-page" data-theme={theme}>
            <div className="ac-blob ac-blob--1" />
            <div className="ac-blob ac-blob--2" />

            <div className="ac-wrap">
                <button className="ac-back" onClick={() => navigate("/admin-dashboard")}>
                    <span className="ac-ico">{icons.back}</span>{t("back")}
                </button>

                {/* ============================ HEADER ============================ */}
                <header className="ac-head">
                    <div className="ac-head-text">
                        <span className="ac-eyebrow">{t("adminPanel")}</span>
                        <h1 className="ac-title">
                            <span className="ac-title-emoji" aria-hidden="true">📅</span>
                            {t("attendanceCalendar", "Attendance Calendar")}
                        </h1>
                        <p className="ac-subtitle">{t("attendanceCalendarSub", "View and monitor daily attendance records by date.")}</p>
                    </div>
                    <div className="ac-head-actions">
                        <button className="ac-btn ac-btn--ghost" onClick={goToday}>
                            <span className="ac-ico">{icons.calendar}</span>{t("acToday", "Today")}
                        </button>
                        <button className="ac-btn ac-btn--primary" onClick={exportDay} disabled={!hasData}>
                            <span className="ac-ico">{icons.download}</span>{t("exportExcel")}
                        </button>
                    </div>
                </header>

                {/* ============================ LAYOUT ============================ */}
                <div className="ac-layout">

                    {/* ------------------------- CALENDAR ------------------------- */}
                    <section className="ac-card ac-cal" aria-label={monthLabel}>
                        <div className="ac-cal-top">
                            <div className="ac-cal-month">
                                <h2>{monthLabel}</h2>
                                {loading && <span className="ac-spinner" aria-label={t("loading")} />}
                            </div>
                            <div className="ac-cal-nav">
                                <select
                                    className="ac-select"
                                    value={view.m}
                                    aria-label={t("acMonth", "Month")}
                                    onChange={(e) => setView((v) => ({ ...v, m: Number(e.target.value) }))}
                                >
                                    {monthNames.map((n, i) => <option key={i} value={i}>{n}</option>)}
                                </select>
                                <select
                                    className="ac-select"
                                    value={view.y}
                                    aria-label={t("acYear", "Year")}
                                    onChange={(e) => setView((v) => ({ ...v, y: Number(e.target.value) }))}
                                >
                                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <button className="ac-arrow" onClick={() => shiftMonth(-1)} aria-label={t("previousMonth")}>{icons.left}</button>
                                <button className="ac-arrow" onClick={() => shiftMonth(1)} aria-label={t("nextMonth")}>{icons.right}</button>
                            </div>
                        </div>

                        <div className="ac-dow">
                            {dayNames.map((d, i) => <span key={i}>{d}</span>)}
                        </div>

                        <div className="ac-grid" role="grid">
                            {grid.map((d, i) => {
                                if (d === null) return <span key={`e${i}`} className="ac-cell ac-cell--empty" />;
                                const date = ymd(view.y, view.m, d);
                                const c = counts(date);
                                const isSel = date === selected;
                                const isToday = date === today;
                                const future = date > today;
                                const tip = STATUS.filter((s) => c[s]).map((s) => `${statusLabel(s)}: ${c[s]}`).join(" · ");
                                return (
                                    <button
                                        key={date}
                                        type="button"
                                        className={`ac-cell${isSel ? " is-selected" : ""}${isToday ? " is-today" : ""}${future ? " is-future" : ""}`}
                                        onClick={() => pick(date)}
                                        aria-pressed={isSel}
                                        aria-label={`${d} ${monthLabel}${tip ? ", " + tip : ""}`}
                                        title={tip || undefined}
                                    >
                                        <span className="ac-cell-num">{d}</span>
                                        <span className="ac-dots">
                                            {c.Present > 0 && <i className="ac-dot ac-dot--p" />}
                                            {c.Absent > 0 && <i className="ac-dot ac-dot--a" />}
                                            {c.Leave > 0 && <i className="ac-dot ac-dot--l" />}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="ac-legend">
                            <span><i className="ac-dot ac-dot--p" />{t("present")}</span>
                            <span><i className="ac-dot ac-dot--a" />{t("absent")}</span>
                            <span><i className="ac-dot ac-dot--l" />{t("acLeave", "Leave")}</span>
                        </div>

                        {loadError && <p className="ac-error">{t("acLoadError", "Couldn't load attendance for this month.")}</p>}
                    </section>

                    {/* ------------------------- SUMMARY -------------------------- */}
                    <aside className="ac-card ac-sum" aria-live="polite">
                        <div className="ac-sum-head">
                            <div>
                                <span className="ac-sum-weekday">{selDate.toLocaleDateString(locale, { weekday: "long" })}</span>
                                <h3 className="ac-sum-date">{selDate.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</h3>
                            </div>
                            <span className={`ac-badge ${selected === today ? "ac-badge--today" : isFuture ? "ac-badge--future" : hasData ? "ac-badge--ok" : "ac-badge--none"}`}>
                                {selected === today ? t("acToday", "Today") : isFuture ? t("acUpcoming", "Upcoming") : hasData ? t("acRecorded", "Recorded") : t("notMarked")}
                            </span>
                        </div>

                        {isFuture && !hasData ? (
                            <div className="ac-empty"><span className="ac-empty-ico">{icons.calendar}</span><p>{t("acFutureNote", "This date is in the future — no attendance yet.")}</p></div>
                        ) : !hasData ? (
                            <div className="ac-empty"><span className="ac-empty-ico">{icons.inbox}</span><p>{t("attendanceNotMarked")}</p></div>
                        ) : (
                            <>
                                <div className="ac-ring-row">
                                    <div className="ac-ring">
                                        <svg viewBox="0 0 120 120" aria-hidden="true">
                                            <circle cx="60" cy="60" r={R} className="ac-ring-track" />
                                            <circle cx="60" cy="60" r={R} className="ac-ring-seg ac-ring-seg--p" strokeDasharray={`${seg(selCounts.Present)} ${C}`} strokeDashoffset="0" />
                                            <circle cx="60" cy="60" r={R} className="ac-ring-seg ac-ring-seg--l" strokeDasharray={`${seg(selCounts.Leave)} ${C}`} strokeDashoffset={-seg(selCounts.Present)} />
                                            <circle cx="60" cy="60" r={R} className="ac-ring-seg ac-ring-seg--a" strokeDasharray={`${seg(selCounts.Absent)} ${C}`} strokeDashoffset={-(seg(selCounts.Present) + seg(selCounts.Leave))} />
                                        </svg>
                                        <div className="ac-ring-label"><strong>{rate}%</strong><span>{t("attendanceRate")}</span></div>
                                    </div>
                                    <div className="ac-stats">
                                        <div className="ac-stat ac-stat--p"><i className="ac-dot ac-dot--p" /><span>{t("present")}</span><strong>{selCounts.Present}</strong></div>
                                        <div className="ac-stat ac-stat--a"><i className="ac-dot ac-dot--a" /><span>{t("absent")}</span><strong>{selCounts.Absent}</strong></div>
                                        <div className="ac-stat ac-stat--l"><i className="ac-dot ac-dot--l" /><span>{t("acLeave", "Leave")}</span><strong>{selCounts.Leave}</strong></div>
                                        <div className="ac-stat ac-stat--t"><i className="ac-dot" /><span>{t("totalUsers")}</span><strong>{users.length}</strong></div>
                                    </div>
                                </div>

                                <div className="ac-tools">
                                    <div className="ac-tabs" role="tablist">
                                        {["All", ...STATUS].map((f) => (
                                            <button key={f} role="tab" aria-selected={filter === f} className={`ac-tab${filter === f ? " is-on" : ""}`} onClick={() => setFilter(f)}>
                                                {f === "All" ? t("all") : statusLabel(f)}
                                            </button>
                                        ))}
                                    </div>
                                    <label className="ac-search">
                                        <span className="ac-ico">{icons.search}</span>
                                        <input
                                            type="text"
                                            value={search}
                                            maxLength={40}
                                            autoComplete="off"
                                            placeholder={t("arpSearchPh", "Search by name or ID...")}
                                            onChange={(e) => setSearch(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""))}
                                        />
                                    </label>
                                </div>

                                <ul className="ac-list">
                                    {rows.length === 0 && <li className="ac-list-empty">{t("noUsersFound")}</li>}
                                    {rows.map((r) => (
                                        <li key={r.id} className="ac-row">
                                            <span className="ac-avatar">{initials(r.name)}</span>
                                            <span className="ac-row-main"><strong>{r.name}</strong><small>{r.id}</small></span>
                                            <span className={`ac-pill ac-pill--${(r.status || "none").toLowerCase()}`}>{statusLabel(r.status)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}

export default AttendanceCalendar;