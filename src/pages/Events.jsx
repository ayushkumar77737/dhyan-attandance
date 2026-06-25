import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import "./Events.css";

// Reuse your existing asset
import logo2 from "../assets/logo2.png";

import weeklyImg from "../assets/guruji.webp";
import satsangImg from "../assets/Dhyan.png";
import retreatImg from "../assets/guruji.webp";

const I = {
    meditate: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5.4" r="2.2" />
            <path d="M12 8c-2.5 0-4 2-4 4.5 0 1 .4 1.9 1.1 2.5" />
            <path d="M12 8c2.5 0 4 2 4 4.5 0 1-.4 1.9-1.1 2.5" />
            <path d="M5 18c1.6-1.4 4.1-2.1 7-2.1s5.4.7 7 2.1c-2 1-4.3 1.5-7 1.5s-5-.5-7-1.5z" />
        </svg>
    ),
    lotus: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4c1.3 1.5 2 3.1 2 4.7 0 .8-.2 1.6-.6 2.4.7-.4 1.3-1 1.9-1.9.3 1.4.1 2.7-.6 3.9 1-.3 1.9-.8 2.8-1.6-.1 2.2-1.5 4-3.6 5.1-.6.4-1.2.6-1.9.8-.7-.2-1.3-.4-1.9-.8C8 15.4 6.6 13.6 6.5 11.4c.9.8 1.8 1.3 2.8 1.6-.7-1.2-.9-2.5-.6-3.9.6.9 1.2 1.5 1.9 1.9-.4-.8-.6-1.6-.6-2.4C10 7.1 10.7 5.5 12 4z" />
        </svg>
    ),
    heart: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z" />
        </svg>
    ),
    users: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    star: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l2.3 5.3 5.7.5-4.3 3.8 1.3 5.6L12 16.8 7 18.6l1.3-5.6L4 9.2l5.7-.5z" />
        </svg>
    ),
    calendar: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
    clock: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" />
        </svg>
    ),
    pin: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
    ),
    globe: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M3 12h18" />
            <path d="M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18" />
        </svg>
    ),
    arrow: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
    ),
    chevL: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    ),
    chevR: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    ),
    close: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
        </svg>
    ),
    hands: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21c-1-3-4-5-4-9V5a1.5 1.5 0 0 1 3 0v5" />
            <path d="M12 21c1-3 4-5 4-9V5a1.5 1.5 0 0 0-3 0v5" />
        </svg>
    ),
};

/* ------------------------------------------------------------------ */
/* Reveal-on-scroll hook                                              */
/* ------------------------------------------------------------------ */
function useInView(options = { threshold: 0.18 }) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setInView(true); obs.unobserve(el); }
        }, options);
        obs.observe(el);
        return () => obs.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return [ref, inView];
}

function Reveal({ children, className = "", delay = 0, as: Tag = "div" }) {
    const [ref, inView] = useInView();
    return (
        <Tag ref={ref} className={`mdev-reveal ${inView ? "mdev-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
            {children}
        </Tag>
    );
}

/* ------------------------------------------------------------------ */
/* Animated counter                                                   */
/* ------------------------------------------------------------------ */
function Counter({ end, suffix = "", duration = 1900 }) {
    const [ref, inView] = useInView({ threshold: 0.4 });
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!inView) return;
        const start = performance.now();
        let raf;
        const tick = (now) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setCount(Math.floor(eased * end));
            if (p < 1) raf = requestAnimationFrame(tick);
            else setCount(end);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [inView, end, duration]);
    return <span className="mdev-stat-num">{count.toLocaleString()}<span className="mdev-stat-plus">{suffix}</span></span>;
}

/* ------------------------------------------------------------------ */
/* Live countdown                                                     */
/* ------------------------------------------------------------------ */
function Countdown({ target }) {
    const { t } = useTranslation();
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    const diff = Math.max(0, target - now);
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    if (diff <= 0) {
        return <div className="mdev-cd-soon">{t("cdStarting") || "Starting soon"}</div>;
    }

    const units = [
        { v: d, l: t("cdDays") || "Days" },
        { v: h, l: t("cdHrs") || "Hrs" },
        { v: m, l: t("cdMin") || "Min" },
        { v: s, l: t("cdSec") || "Sec" },
    ];
    return (
        <div className="mdev-countdown">
            {units.map((u, i) => (
                <div className="mdev-cd-box" key={i}>
                    <span className="mdev-cd-val">{String(u.v).padStart(2, "0")}</span>
                    <span className="mdev-cd-lbl">{u.l}</span>
                </div>
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Gallery + lightbox                                                 */
/* ------------------------------------------------------------------ */
function Gallery({ items }) {
    const [open, setOpen] = useState(null);

    useEffect(() => {
        if (open === null) return;
        const onKey = (e) => {
            if (e.key === "Escape") setOpen(null);
            if (e.key === "ArrowRight") setOpen((o) => (o + 1) % items.length);
            if (e.key === "ArrowLeft") setOpen((o) => (o - 1 + items.length) % items.length);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, items.length]);

    return (
        <>
            <div className="mdev-gallery">
                {items.map((g, i) => (
                    <button key={i} className={`mdev-gal-tile ${g.tall ? "mdev-gal-tall" : ""}`} style={{ background: g.bg }} onClick={() => setOpen(i)}>
                        {g.img
                            ? <img className="mdev-gal-img" src={g.img} alt="" loading="lazy" />
                            : <span className="mdev-gal-icon">{g.icon}</span>}
                        <span className="mdev-gal-label">{g.label}</span>
                        <span className="mdev-gal-shine" aria-hidden="true" />
                    </button>
                ))}
            </div>

            {open !== null && (
                <div className="mdev-lightbox" onClick={() => setOpen(null)}>
                    <button className="mdev-lb-close" onClick={() => setOpen(null)} aria-label="Close">{I.close}</button>
                    <button className="mdev-lb-nav mdev-lb-prev" onClick={(e) => { e.stopPropagation(); setOpen((o) => (o - 1 + items.length) % items.length); }} aria-label="Previous">{I.chevL}</button>
                    <div className="mdev-lb-stage" style={{ background: items[open].bg }} onClick={(e) => e.stopPropagation()}>
                        {items[open].img
                            ? <img className="mdev-lb-img" src={items[open].img} alt="" />
                            : <span className="mdev-lb-icon">{items[open].icon}</span>}
                        <span className="mdev-lb-label">{items[open].label}</span>
                    </div>
                    <button className="mdev-lb-nav mdev-lb-next" onClick={(e) => { e.stopPropagation(); setOpen((o) => (o + 1) % items.length); }} aria-label="Next">{I.chevR}</button>
                </div>
            )}
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Floating particles (deterministic positions)                       */
/* ------------------------------------------------------------------ */
const PARTICLES = [
    { l: 8, t: 18, s: 5, d: 0 }, { l: 22, t: 64, s: 3, d: 1.4 }, { l: 35, t: 28, s: 6, d: 2.1 },
    { l: 48, t: 72, s: 4, d: 0.6 }, { l: 60, t: 22, s: 5, d: 1.1 }, { l: 73, t: 58, s: 3, d: 2.6 },
    { l: 84, t: 30, s: 6, d: 0.9 }, { l: 92, t: 66, s: 4, d: 1.8 }, { l: 15, t: 44, s: 4, d: 2.3 },
    { l: 40, t: 50, s: 3, d: 1.6 }, { l: 66, t: 42, s: 5, d: 0.3 }, { l: 80, t: 12, s: 4, d: 2.0 },
];

/* ================================================================== */
/* PAGE                                                               */
/* ================================================================== */
const Events = () => {
    const { t } = useTranslation();

    const upcomingRef = useRef(null);
    const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth" });

    // future targets for the live countdowns
    const meditationTarget = useMemo(() => {
        const r = new Date();
        r.setHours(6, 0, 0, 0);
        const day = r.getDay();
        let add = (7 - day) % 7;
        if (add === 0 && Date.now() > r.getTime()) add = 7;
        r.setDate(r.getDate() + add);
        return r.getTime();
    }, []);
    const satsangTarget = useMemo(() => new Date("2026-08-15T10:00:00").getTime(), []);
    const retreatTarget = useMemo(() => new Date("2026-09-20T08:00:00").getTime(), []);

    const events = [
        {
            title: t("evWeeklyTitle") || "Weekly Meditation Session",
            date: t("evWeeklyDate") || "Every Sunday", time: t("evWeeklyTime") || "6:00 AM – 7:00 AM",
            loc: t("evWeeklyLoc") || "Meditation Hall",
            badge: t("evBadgeWeekly") || "Weekly", icon: I.meditate, img: weeklyImg, cls: "mdev-ic-violet", target: meditationTarget,
        },
        {
            title: t("evSatsangTitle") || "Guruji Satsang",
            date: t("evSatsangDate") || "15 August 2026", time: t("evSatsangTime") || "10:00 AM",
            loc: t("evSatsangLoc") || "Main Ashram",
            badge: t("evBadgeFeatured") || "Featured", icon: I.hands, img: satsangImg, cls: "mdev-ic-gold", target: satsangTarget,
        },
        {
            title: t("evRetreatTitle") || "Spiritual Retreat",
            date: t("evRetreatDate") || "20 September 2026", time: t("evRetreatTime") || "Full Day Program",
            loc: t("evRetreatLoc") || "Retreat Center",
            badge: t("evBadgeRetreat") || "Limited Seats", icon: I.lotus, img: retreatImg, cls: "mdev-ic-rose", target: retreatTarget,
        },
    ];

    const gallery = [
        { label: t("galMeditation") || "Meditation Sessions", icon: I.meditate, img: weeklyImg, bg: "linear-gradient(150deg,#3b1d6e,#6d28d9)", tall: true },
        { label: t("galGuruji") || "Guruji Visits", icon: I.hands, img: retreatImg, bg: "linear-gradient(150deg,#7a4a06,#d99a2b)" },
        { label: t("galRetreats") || "Spiritual Retreats", icon: I.lotus, img: satsangImg, bg: "linear-gradient(150deg,#0b3a52,#1d7a9c)" },
        { label: t("galGatherings") || "Community Gatherings", icon: I.users, img: weeklyImg, bg: "linear-gradient(150deg,#5e1138,#b3275f)", tall: true },
        { label: t("galMeditation") || "Meditation Sessions", icon: I.lotus, img: retreatImg, bg: "linear-gradient(150deg,#27225e,#574fd6)" },
        { label: t("galGuruji") || "Guruji Visits", icon: I.star, img: satsangImg, bg: "linear-gradient(150deg,#5a3a06,#c79a3a)", tall: true },
        { label: t("galRetreats") || "Spiritual Retreats", icon: I.meditate, img: weeklyImg, bg: "linear-gradient(150deg,#123043,#2b7d9c)" },
        { label: t("galGatherings") || "Community Gatherings", icon: I.heart, img: retreatImg, bg: "linear-gradient(150deg,#4a1030,#9c2760)" },
    ];

    const past = [
        { title: t("pe1Title") || "New Year Meditation Camp", date: t("pe1Date") || "January 2026", desc: t("pe1Desc") || "A serene three-day camp welcoming the year with collective stillness and intention.", icon: I.meditate, img: weeklyImg, bg: "linear-gradient(150deg,#3b1d6e,#6d28d9)" },
        { title: t("pe2Title") || "Guru Purnima Celebration", date: t("pe2Date") || "July 2025", desc: t("pe2Desc") || "Devotees gathered in gratitude to honour the grace and guidance of Guruji.", icon: I.hands, img: retreatImg, bg: "linear-gradient(150deg,#7a4a06,#d99a2b)" },
        { title: t("pe3Title") || "Annual Spiritual Gathering", date: t("pe3Date") || "December 2025", desc: t("pe3Desc") || "Our largest assembly of seekers for a day of discourse, bhajan, and meditation.", icon: I.users, img: satsangImg, bg: "linear-gradient(150deg,#0b3a52,#1d7a9c)" },
        { title: t("pe4Title") || "Community Service Program", date: t("pe4Date") || "October 2025", desc: t("pe4Desc") || "Seva in action — meals, care, and support offered to those in need.", icon: I.heart, img: weeklyImg, bg: "linear-gradient(150deg,#5e1138,#b3275f)" },
    ];

    const stats = [
        { icon: I.users, end: 25000, suffix: "+", label: t("statParticipants") || "Total Participants" },
        { icon: I.calendar, end: 480, suffix: "+", label: t("statEventsConducted") || "Events Conducted" },
        { icon: I.clock, end: 120000, suffix: "+", label: t("statMeditationHours") || "Meditation Hours" },
        { icon: I.globe, end: 60, suffix: "+", label: t("statReach") || "Community Reach" },
    ];

    return (
        <div className="mdev-page">

            {/* ---------------- ambient background ---------------- */}
            <div className="mdev-bg" aria-hidden="true">
                <span className="mdev-orb mdev-orb-1" />
                <span className="mdev-orb mdev-orb-2" />
                <span className="mdev-orb mdev-orb-3" />
                <span className="mdev-grid" />
            </div>

            {/* ============================ HERO ============================ */}
            <header className="mdev-hero">
                <div className="mdev-hero-glow" />
                <span className="mdev-hero-lotus" aria-hidden="true">{I.lotus}</span>
                <div className="mdev-particles" aria-hidden="true">
                    {PARTICLES.map((p, i) => (
                        <span key={i} className="mdev-particle" style={{ left: `${p.l}%`, top: `${p.t}%`, width: p.s, height: p.s, animationDelay: `${p.d}s` }} />
                    ))}
                </div>

                <Reveal className="mdev-hero-inner">
                    <img src={logo2} alt="Logo" className="mdev-hero-logo" loading="lazy" />
                    <p className="mdev-kicker mdev-kicker-center">🙏 {t("guruText") || "Jai Gurubande"} 🙏</p>
                    <h1 className="mdev-hero-title">
                        <span className="mdev-gold-text">{t("eventsHeroTitle") || "Spiritual Events & Satsang"}</span>
                    </h1>
                    <p className="mdev-hero-sub">
                        {t("eventsHeroSub") || "Join meditation sessions, spiritual discourses, and community gatherings that inspire inner peace and spiritual growth."}
                    </p>
                    <div className="mdev-hero-actions">
                        <button className="mdev-btn mdev-btn-primary" onClick={() => scrollTo(upcomingRef)}>
                            <span>{t("eventsExplore") || "Explore Events"}</span>
                            <span className="mdev-btn-arrow">{I.arrow}</span>
                        </button>
                    </div>
                </Reveal>
                <div className="mdev-scroll-cue" aria-hidden="true"><span /></div>
            </header>

            {/* ====================== UPCOMING EVENTS ====================== */}
            <section className="mdev-section" ref={upcomingRef}>
                <div className="mdev-container">
                    <Reveal className="mdev-section-head">
                        <span className="mdev-kicker mdev-kicker-center">{t("eventsUpcomingKicker") || "What's Next"}</span>
                        <h2 className="mdev-section-title mdev-center">{t("eventsUpcomingHeading") || "Upcoming Events"}</h2>
                    </Reveal>

                    <div className="mdev-grid-3">
                        {events.map((ev, i) => (
                            <Reveal key={i} className="mdev-card mdev-event-card" delay={i * 100}>
                                <span className="mdev-event-badge">{ev.badge}</span>
                                <span className={`mdev-icon ${ev.cls}`}>
                                    {ev.img ? <img src={ev.img} alt="" className="mdev-icon-img" /> : ev.icon}
                                </span>
                                <h3 className="mdev-event-title">{ev.title}</h3>
                                <div className="mdev-event-meta">
                                    <p>{I.calendar}<span>{ev.date}</span></p>
                                    <p>{I.clock}<span>{ev.time}</span></p>
                                    <p>{I.pin}<span>{ev.loc}</span></p>
                                </div>
                                <span className="mdev-cd-label">{t("cdBeginsIn") || "Begins in"}</span>
                                <Countdown target={ev.target} />
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========================= GALLERY ========================= */}
            <section className="mdev-section">
                <div className="mdev-container">
                    <Reveal className="mdev-section-head">
                        <span className="mdev-kicker mdev-kicker-center">{t("eventsGalKicker") || "Moments"}</span>
                        <h2 className="mdev-section-title mdev-center">{t("eventsGalHeading") || "Event Gallery"}</h2>
                    </Reveal>
                    <Reveal><Gallery items={gallery} /></Reveal>
                </div>
            </section>

            {/* ====================== PAST EVENTS TIMELINE ====================== */}
            <section className="mdev-section">
                <div className="mdev-container">
                    <Reveal className="mdev-section-head">
                        <span className="mdev-kicker mdev-kicker-center">{t("eventsPastKicker") || "Looking Back"}</span>
                        <h2 className="mdev-section-title mdev-center">{t("eventsPastHeading") || "Past Events"}</h2>
                    </Reveal>

                    <div className="mdev-ptl">
                        {past.map((p, i) => (
                            <Reveal key={i} className="mdev-ptl-item" delay={i * 80}>
                                <div className="mdev-ptl-node"><span className="mdev-cal-dot mdev-dot-gold" /></div>
                                <div className="mdev-ptl-body">
                                    <div className="mdev-ptl-media" style={{ background: p.bg }}>
                                        {p.img
                                            ? <img className="mdev-ptl-img" src={p.img} alt="" loading="lazy" />
                                            : <span className="mdev-ptl-media-icon">{p.icon}</span>}
                                    </div>
                                    <div className="mdev-ptl-content">
                                        <span className="mdev-ptl-date">{p.date}</span>
                                        <h3 className="mdev-ptl-title">{p.title}</h3>
                                        <p className="mdev-ptl-desc">{p.desc}</p>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ====================== EVENT STATISTICS ====================== */}
            <section className="mdev-section">
                <div className="mdev-container">
                    <Reveal className="mdev-section-head">
                        <span className="mdev-kicker mdev-kicker-center">{t("eventsStatsKicker") || "Our Impact"}</span>
                        <h2 className="mdev-section-title mdev-center">{t("eventsStatsHeading") || "A Growing Spiritual Family"}</h2>
                    </Reveal>

                    <div className="mdev-grid-4">
                        {stats.map((s, i) => (
                            <Reveal key={i} className="mdev-card mdev-stat-card" delay={i * 90}>
                                <span className="mdev-stat-icon">{s.icon}</span>
                                <Counter end={s.end} suffix={s.suffix} />
                                <p className="mdev-stat-label">{s.label}</p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

        </div>
    );
};

export default Events;