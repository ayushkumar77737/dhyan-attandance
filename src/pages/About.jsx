import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./About.css";

// Reuse your existing assets
import dhyanImage from "../assets/Dhyan.png";
import logo2 from "../assets/logo2.png";

/* ------------------------------------------------------------------ */
/* Inline icons (same stroke style as your Login screen)              */
/* ------------------------------------------------------------------ */
const I = {
    meditate: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5.4" r="2.2" />
            <path d="M12 8c-2.5 0-4 2-4 4.5 0 1 .4 1.9 1.1 2.5" />
            <path d="M12 8c2.5 0 4 2 4 4.5 0 1-.4 1.9-1.1 2.5" />
            <path d="M5 18c1.6-1.4 4.1-2.1 7-2.1s5.4.7 7 2.1c-2 1-4.3 1.5-7 1.5s-5-.5-7-1.5z" />
        </svg>
    ),
    flame: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.5-2-1-2.5 2 .8 3.5 2.9 3.5 5.5a5.5 5.5 0 1 1-11 0c0-3 2-4.6 4.5-7z" />
        </svg>
    ),
    heart: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z" />
        </svg>
    ),
    lotus: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4c1.3 1.5 2 3.1 2 4.7 0 .8-.2 1.6-.6 2.4.7-.4 1.3-1 1.9-1.9.3 1.4.1 2.7-.6 3.9 1-.3 1.9-.8 2.8-1.6-.1 2.2-1.5 4-3.6 5.1-.6.4-1.2.6-1.9.8-.7-.2-1.3-.4-1.9-.8C8 15.4 6.6 13.6 6.5 11.4c.9.8 1.8 1.3 2.8 1.6-.7-1.2-.9-2.5-.6-3.9.6.9 1.2 1.5 1.9 1.9-.4-.8-.6-1.6-.6-2.4C10 7.1 10.7 5.5 12 4z" />
        </svg>
    ),
    book: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4h6a3 3 0 0 1 4 1 3 3 0 0 1 4-1h6v15h-6a3 3 0 0 0-4 1 3 3 0 0 0-4-1H2z" /><path d="M12 5v15" />
        </svg>
    ),
    calendarCheck: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M9 16l2 2 4-4" />
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
    growth: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" />
        </svg>
    ),
    globe: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M3 12h18" />
            <path d="M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18" />
        </svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    arrow: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
    ),
    lotusLine: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3c1.6 1.9 2.4 3.8 2.4 5.6M12 3c-1.6 1.9-2.4 3.8-2.4 5.6" />
            <path d="M4 11c2 .4 3.6 1.4 4.8 3M20 11c-2 .4-3.6 1.4-4.8 3" />
            <path d="M3 14c0 3 4 6 9 6s9-3 9-6c-2.5 1.6-4 2.2-4 2.2" />
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
        if (typeof IntersectionObserver === "undefined") {
            setInView(true);
            return;
        }
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setInView(true);
                obs.unobserve(el);
            }
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
        <Tag
            ref={ref}
            className={`mdpa-reveal ${inView ? "mdpa-in" : ""} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
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
        const startTime = performance.now();
        let raf;
        const tick = (now) => {
            const p = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
            setCount(Math.floor(eased * end));
            if (p < 1) raf = requestAnimationFrame(tick);
            else setCount(end);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [inView, end, duration]);

    return (
        <span ref={ref} className="mdpa-stat-num">
            {count.toLocaleString()}<span className="mdpa-stat-plus">{suffix}</span>
        </span>
    );
}

/* ================================================================== */
/* PAGE                                                               */
/* ================================================================== */
const About = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // 🔁 Adjust these route paths to match your router setup
    const goLogin = () => navigate("/login");
    const goContact = () => navigate("/contact");

    const values = [
        { icon: I.meditate, cls: "mdpa-ic-violet", title: t("valMeditation") || "Meditation", desc: t("valMeditationDesc") || "Practice mindfulness and self-awareness" },
        { icon: I.flame, cls: "mdpa-ic-gold", title: t("valDiscipline") || "Discipline", desc: t("valDisciplineDesc") || "Build consistency and spiritual growth" },
        { icon: I.heart, cls: "mdpa-ic-rose", title: t("valService") || "Service", desc: t("valServiceDesc") || "Serve humanity with compassion" },
        { icon: I.lotus, cls: "mdpa-ic-green", title: t("valInnerPeace") || "Inner Peace", desc: t("valInnerPeaceDesc") || "Develop harmony within" },
    ];

    const whyJoin = [
        { icon: I.meditate, cls: "mdpa-ic-violet", title: t("whyDailyMeditation") || "Daily Meditation Practice", desc: t("whyDailyMeditationDesc") || "Guided sessions to anchor your everyday practice" },
        { icon: I.book, cls: "mdpa-ic-gold", title: t("whySpiritualGuidance") || "Spiritual Guidance", desc: t("whySpiritualGuidanceDesc") || "Walk the path with the wisdom of Guruji" },
        { icon: I.calendarCheck, cls: "mdpa-ic-rose", title: t("whyAttendance") || "Attendance Tracking", desc: t("whyAttendanceDesc") || "Stay consistent and watch your discipline grow" },
        { icon: I.users, cls: "mdpa-ic-green", title: t("whyCommunity") || "Community Support", desc: t("whyCommunityDesc") || "A family of seekers walking beside you" },
        { icon: I.star, cls: "mdpa-ic-violet", title: t("whySatsang") || "Satsang & Events", desc: t("whySatsangDesc") || "Gather for collective prayer and celebration" },
        { icon: I.growth, cls: "mdpa-ic-gold", title: t("whyGrowth") || "Personal Growth Journey", desc: t("whyGrowthDesc") || "Evolve a little more with every passing day" },
    ];

    const timeline = [
        { title: t("step1Title") || "Join Portal", desc: t("step1Desc") || "Create your sacred space and step in" },
        { title: t("step2Title") || "Learn Meditation", desc: t("step2Desc") || "Discover techniques rooted in ancient wisdom" },
        { title: t("step3Title") || "Daily Practice", desc: t("step3Desc") || "Build a steady, devoted rhythm" },
        { title: t("step4Title") || "Spiritual Growth", desc: t("step4Desc") || "Witness the quiet transformation within" },
        { title: t("step5Title") || "Divine Connection", desc: t("step5Desc") || "Awaken to a deeper union with the divine" },
    ];

    const stats = [
        { icon: I.users, end: 5000, suffix: "+", label: t("statMembers") || "Active Members" },
        { icon: I.meditate, end: 1200, suffix: "+", label: t("statSessions") || "Daily Meditation Sessions" },
        { icon: I.calendarCheck, end: 350, suffix: "+", label: t("statEvents") || "Spiritual Events" },
        { icon: I.globe, end: 30, suffix: "+", label: t("statReach") || "Community Reach" },
    ];

    return (
        <div className="mdpa-page">

            {/* ---------------- ambient background ---------------- */}
            <div className="mdpa-bg" aria-hidden="true">
                <span className="mdpa-orb mdpa-orb-1" />
                <span className="mdpa-orb mdpa-orb-2" />
                <span className="mdpa-orb mdpa-orb-3" />
                <span className="mdpa-grid" />
            </div>

            {/* ============================ HERO ============================ */}
            <header className="mdpa-hero">
                <div className="mdpa-hero-glow" />
                <Reveal className="mdpa-hero-inner">
                    <img src={logo2} alt="Logo" className="mdpa-hero-logo" loading="lazy" />
                    <p className="mdpa-kicker mdpa-kicker-center">🙏 {t("guruText") || "Jai Gurubande"} 🙏</p>
                    <h1 className="mdpa-hero-title">
                        {t("aboutHeroTitlePre") || "About"}{" "}
                        <span className="mdpa-gold-text">{t("appTitle") || "Meditation Dhyan Portal"}</span>
                    </h1>
                    <p className="mdpa-hero-sub">
                        {t("aboutHeroSubtitle") ||
                            "A sacred platform dedicated to meditation, self-realization, discipline, and spiritual growth."}
                    </p>
                    <button className="mdpa-btn mdpa-btn-primary" onClick={goLogin}>
                        <span>{t("aboutBeginJourney") || "Begin Your Journey"}</span>
                        <span className="mdpa-btn-arrow">{I.arrow}</span>
                    </button>
                </Reveal>
                <div className="mdpa-scroll-cue" aria-hidden="true"><span /></div>
            </header>

            {/* ======================= ABOUT GURUJI ======================= */}
            <section className="mdpa-section mdpa-guru">
                <div className="mdpa-container mdpa-guru-grid">
                    <Reveal className="mdpa-guru-media">
                        <div className="mdpa-guru-photo">
                            <span className="mdpa-guru-ring" aria-hidden="true" />
                            <img src={dhyanImage} alt={t("aboutGurujiName") || "Param Sant Swami Jai Gurubande Ji Maharaj"} loading="lazy" />
                        </div>
                    </Reveal>

                    <Reveal className="mdpa-guru-body" delay={120}>
                        <span className="mdpa-kicker">{t("aboutGuideKicker") || "Our Guide"}</span>
                        <h2 className="mdpa-section-title">{t("aboutGuideHeading") || "Our Spiritual Guide"}</h2>
                        <p className="mdpa-guru-name">{t("aboutGurujiName") || "Param Sant Swami Jai Gurubande Ji Maharaj"}</p>
                        <p className="mdpa-text">
                            {t("aboutGurujiDesc") ||
                                "With boundless compassion and timeless wisdom, Guruji guides countless souls toward the light within. His teachings blend ancient meditation practices with a deeply practical path of discipline, devotion, and service — illuminating the way to inner peace and divine connection for every seeker who walks beside him."}
                        </p>

                        <div className="mdpa-quote-card">
                            <span className="mdpa-quote-mark" aria-hidden="true">&ldquo;</span>
                            <p className="mdpa-quote-card-text">
                                {t("aboutGurujiQuote") || "When the mind becomes still, the soul begins to speak."}
                            </p>
                            <span className="mdpa-quote-card-by">— {t("aboutGurujiQuoteBy") || "Guruji's Teachings"}</span>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ========================= MISSION ========================= */}
            <section className="mdpa-section mdpa-mission">
                <div className="mdpa-container">
                    <Reveal className="mdpa-mission-card">
                        <span className="mdpa-mission-watermark" aria-hidden="true">ॐ</span>
                        <span className="mdpa-kicker mdpa-kicker-center">{t("aboutMissionKicker") || "Our Purpose"}</span>
                        <h2 className="mdpa-section-title mdpa-center">{t("aboutMissionHeading") || "Our Mission"}</h2>
                        <p className="mdpa-mission-text">
                            {t("aboutMissionText") ||
                                "To help individuals achieve inner peace, self-awareness, discipline, and divine connection through daily meditation and spiritual practices."}
                        </p>
                    </Reveal>
                </div>
            </section>

            {/* ======================= CORE VALUES ======================= */}
            <section className="mdpa-section">
                <div className="mdpa-container">
                    <Reveal className="mdpa-section-head">
                        <span className="mdpa-kicker mdpa-kicker-center">{t("aboutValuesKicker") || "What We Value"}</span>
                        <h2 className="mdpa-section-title mdpa-center">{t("aboutValuesHeading") || "Core Values"}</h2>
                    </Reveal>

                    <div className="mdpa-grid-4">
                        {values.map((v, i) => (
                            <Reveal key={i} className="mdpa-card mdpa-value-card" delay={i * 90}>
                                <span className={`mdpa-icon ${v.cls}`}>{v.icon}</span>
                                <h3 className="mdpa-card-title">{v.title}</h3>
                                <p className="mdpa-card-desc">{v.desc}</p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ======================= WHY JOIN US ======================= */}
            <section className="mdpa-section">
                <div className="mdpa-container">
                    <Reveal className="mdpa-section-head">
                        <span className="mdpa-kicker mdpa-kicker-center">{t("aboutWhyKicker") || "Benefits"}</span>
                        <h2 className="mdpa-section-title mdpa-center">{t("aboutWhyHeading") || "Why Join Us"}</h2>
                    </Reveal>

                    <div className="mdpa-grid-3">
                        {whyJoin.map((f, i) => (
                            <Reveal key={i} className="mdpa-card mdpa-feature-card" delay={(i % 3) * 90}>
                                <span className="mdpa-feature-check">{I.check}</span>
                                <span className={`mdpa-icon mdpa-icon-sm ${f.cls}`}>{f.icon}</span>
                                <div className="mdpa-feature-text">
                                    <h3 className="mdpa-card-title">{f.title}</h3>
                                    <p className="mdpa-card-desc">{f.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ======================= JOURNEY TIMELINE ======================= */}
            <section className="mdpa-section">
                <div className="mdpa-container">
                    <Reveal className="mdpa-section-head">
                        <span className="mdpa-kicker mdpa-kicker-center">{t("aboutJourneyKicker") || "The Path"}</span>
                        <h2 className="mdpa-section-title mdpa-center">{t("aboutJourneyHeading") || "Your Spiritual Journey"}</h2>
                    </Reveal>

                    <div className="mdpa-tl-track">
                        {timeline.map((s, i) => (
                            <Reveal key={i} className="mdpa-tl-step" delay={i * 110}>
                                <div className="mdpa-tl-node">
                                    <span className="mdpa-tl-num">{i + 1}</span>
                                </div>
                                <div className="mdpa-tl-card">
                                    <h4 className="mdpa-tl-title">{s.title}</h4>
                                    <p className="mdpa-tl-desc">{s.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===================== INSPIRATIONAL QUOTE ===================== */}
            <section className="mdpa-section mdpa-quote-section">
                <div className="mdpa-container">
                    <Reveal className="mdpa-big-quote">
                        <span className="mdpa-big-quote-mark" aria-hidden="true">&ldquo;</span>
                        <p className="mdpa-big-quote-text">
                            {t("aboutQuoteText") || "Discipline is the bridge between goals and accomplishment."}
                        </p>
                        <span className="mdpa-big-quote-by">
                            — {t("aboutQuoteAuthor") || "Param Sant Swami Jai Gurubande Ji Maharaj"}
                        </span>
                        <span className="mdpa-big-quote-lotus" aria-hidden="true">{I.lotusLine}</span>
                    </Reveal>
                </div>
            </section>

            {/* ====================== COMMUNITY STATS ====================== */}
            <section className="mdpa-section">
                <div className="mdpa-container">
                    <Reveal className="mdpa-section-head">
                        <span className="mdpa-kicker mdpa-kicker-center">{t("aboutStatsKicker") || "Our Community"}</span>
                        <h2 className="mdpa-section-title mdpa-center">{t("aboutStatsHeading") || "Growing Together In Spirit"}</h2>
                    </Reveal>

                    <div className="mdpa-grid-4">
                        {stats.map((s, i) => (
                            <Reveal key={i} className="mdpa-card mdpa-stat-card" delay={i * 90}>
                                <span className="mdpa-stat-icon">{s.icon}</span>
                                <Counter end={s.end} suffix={s.suffix} />
                                <p className="mdpa-stat-label">{s.label}</p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ====================== CALL TO ACTION ====================== */}
            <section className="mdpa-section mdpa-cta-section">
                <div className="mdpa-container">
                    <Reveal className="mdpa-cta-card">
                        <span className="mdpa-cta-glow" aria-hidden="true" />
                        <span className="mdpa-kicker mdpa-kicker-center">{t("aboutCtaKicker") || "Take The First Step"}</span>
                        <h2 className="mdpa-cta-title">{t("aboutCtaHeading") || "Begin Your Spiritual Journey Today"}</h2>
                        <p className="mdpa-cta-text">
                            {t("aboutCtaText") || "Join a community devoted to peace, discipline, and inner awakening."}
                        </p>
                        <div className="mdpa-cta-actions">
                            <button className="mdpa-btn mdpa-btn-primary" onClick={goLogin}>
                                <span>{t("login") || "Login"}</span>
                                <span className="mdpa-btn-arrow">{I.arrow}</span>
                            </button>
                            <button className="mdpa-btn mdpa-btn-ghost" onClick={goContact}>
                                {t("aboutContactUs") || "Contact Us"}
                            </button>
                        </div>
                    </Reveal>
                </div>
            </section>

        </div>
    );
};

export default About;