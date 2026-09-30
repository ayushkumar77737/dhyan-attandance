import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./Teachings.css";

// Guruji photos (calendar-flip slideshow)
import gurujiImg from "../assets/guruji.webp";
import photo7 from "../assets/photo7.webp";
import hero1 from "../assets/hero1.webp";

const SLIDES = [gurujiImg, photo7, hero1];
const FLIP_EVERY = 6000; // ms each photo stays before the next page flips up

/* ------------------------------------------------------------------ */
/* Typewriter: types paragraphs, holds, erases, then loops forever    */
/* ------------------------------------------------------------------ */
const TYPE_SPEED = 42;       // ms per character (slow + calm)
const PAUSE_BETWEEN = 1400;  // pause between paragraphs
const HOLD_END = 4000;       // how long the finished text stays on screen
const ERASE_SPEED = 16;      // ms per step while erasing
const ERASE_STEP = 2;        // characters removed per step
const PAUSE_RESTART = 1200;  // pause before typing starts again

function useTypewriter(paragraphs, start) {
    const [typed, setTyped] = useState(() => paragraphs.map(() => ""));
    const [active, setActive] = useState(-1);

    useEffect(() => {
        if (!start) return;

        const reduce =
            typeof window !== "undefined" &&
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        // Reduced motion: show everything immediately, no loop
        if (reduce) {
            setTyped(paragraphs);
            setActive(-1);
            return;
        }

        let cancelled = false;
        let timer;

        setTyped(paragraphs.map(() => ""));

        const setPara = (p, len) =>
            setTyped((prev) => {
                const next = [...prev];
                next[p] = paragraphs[p].slice(0, len);
                return next;
            });

        // ---- erase: last paragraph first, then the one above ----
        const erase = () => {
            let p = paragraphs.length - 1;
            let len = paragraphs[p].length;

            const step = () => {
                if (cancelled) return;
                setActive(p);
                len = Math.max(0, len - ERASE_STEP);
                setPara(p, len);

                if (len > 0) {
                    timer = setTimeout(step, ERASE_SPEED);
                } else if (p > 0) {
                    p -= 1;
                    len = paragraphs[p].length;
                    timer = setTimeout(step, ERASE_SPEED);
                } else {
                    setActive(-1);
                    timer = setTimeout(() => typeParagraph(0), PAUSE_RESTART);
                }
            };
            step();
        };

        // ---- type ----
        const typeParagraph = (p) => {
            if (cancelled) return;
            if (p >= paragraphs.length) {
                setActive(paragraphs.length - 1); // cursor keeps blinking at the end
                timer = setTimeout(erase, HOLD_END);
                return;
            }
            setActive(p);
            let i = 0;
            const tick = () => {
                if (cancelled) return;
                i += 1;
                setPara(p, i);
                if (i < paragraphs[p].length) {
                    timer = setTimeout(tick, TYPE_SPEED);
                } else {
                    timer = setTimeout(() => typeParagraph(p + 1), PAUSE_BETWEEN);
                }
            };
            tick();
        };

        timer = setTimeout(() => typeParagraph(0), 600);
        return () => { cancelled = true; clearTimeout(timer); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [start, paragraphs.join("|")]);

    return { typed, active };
}

/* ------------------------------------------------------------------ */
/* Calendar flip: current photo lifts from the bottom, flips over the  */
/* top hinge and reveals the next one underneath                       */
/* ------------------------------------------------------------------ */
function useFlipShow(count) {
    const [cur, setCur] = useState(0);
    const [flip, setFlip] = useState(null); // { from, to } while flipping
    const [paused, setPaused] = useState(false);

    const reduce =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // warm the cache so the flip never shows a blank page
    useEffect(() => {
        SLIDES.forEach((src) => { const im = new Image(); im.src = src; });
    }, []);

    const go = (n) => {
        if (flip || n === cur) return;
        if (reduce) { setCur(n); return; }
        setFlip({ from: cur, to: n });
    };

    const done = () => {
        setCur((c) => (flip ? flip.to : c));
        setFlip(null);
    };

    useEffect(() => {
        if (paused || flip || reduce || count < 2) return;
        const id = setTimeout(() => go((cur + 1) % count), FLIP_EVERY);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cur, flip, paused, count]);

    return { cur, flip, go, done, setPaused };
}

/* ------------------------------------------------------------------ */
/* Start typing only when the section scrolls into view               */
/* ------------------------------------------------------------------ */
function useInView(threshold = 0.35) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) { setInView(true); obs.disconnect(); }
        }, { threshold });
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return [ref, inView];
}

/* ================================================================== */
const Teachings = () => {
    const { t } = useTranslation();
    const [ref, inView] = useInView();

    const paragraphs = [
        t("tcPara1") ||
        "Ulat-Bhaidni reveals hidden spiritual truths through symbolic and paradoxical expressions, guiding the seeker beyond ordinary understanding.",
        t("tcPara2") ||
        "These mystical expressions encourage seekers to look beyond literal meanings and experience deeper spiritual realization.",
    ];

    const { typed, active } = useTypewriter(paragraphs, inView);
    const { cur, flip, go, done, setPaused } = useFlipShow(SLIDES.length);
    const shown = flip ? flip.to : cur;

    return (
        <div className="tch-page">
            {/* sunrise background + lotus corners (same as login) */}
            <div className="tch-sunrise-bg" aria-hidden="true" />

            <section className="tch-section" ref={ref} aria-labelledby="tch-heading">
                <header className="tch-pagehead">
                    <h1 className="tch-pagetitle">
                        {t("tcPageTitle") || "Sacred Teachings"}
                    </h1>
                    <span className="tch-pagerule" aria-hidden="true"><i /></span>
                    <p className="tch-pagesub">
                        {t("tcPageSub") || "Timeless wisdom from Guruji to guide your Dhyan and your spiritual journey."}
                    </p>
                </header>

                <div className="tch-inner">
                    {/* -------- left: Guruji (calendar-page flip) -------- */}
                    <figure
                        className="tch-figure"
                        onMouseEnter={() => setPaused(true)}
                        onMouseLeave={() => setPaused(false)}
                    >
                        <div className="tch-frame">
                            <div className="tch-stage">
                                {/* page underneath: the photo being revealed */}
                                <div className="tch-base">
                                    <img
                                        src={SLIDES[shown]}
                                        alt={t("tcImgAlt") || "Guruji"}
                                        className="tch-img"
                                    />
                                </div>

                                {flip && (
                                    <>
                                        <div className="tch-shade" key={`s${flip.from}-${flip.to}`} aria-hidden="true" />
                                        {/* page lifted from the bottom and flipped up over the hinge */}
                                        <div
                                            className="tch-flap"
                                            key={`f${flip.from}-${flip.to}`}
                                            aria-hidden="true"
                                            onAnimationEnd={(e) => { if (e.target === e.currentTarget) done(); }}
                                        >
                                            <div className="tch-flap-front">
                                                <img src={SLIDES[flip.from]} alt="" className="tch-img" />
                                            </div>
                                            <div className="tch-flap-back" />
                                        </div>
                                    </>
                                )}

                                <span className="tch-hinge" aria-hidden="true" />
                            </div>
                        </div>

                        <div className="tch-dots" role="tablist" aria-label="Photos">
                            {SLIDES.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    role="tab"
                                    aria-selected={i === shown}
                                    aria-label={`Photo ${i + 1}`}
                                    className={`tch-dot ${i === shown ? "is-on" : ""}`}
                                    onClick={() => go(i)}
                                />
                            ))}
                        </div>
                    </figure>

                    {/* -------- right: teaching -------- */}
                    <div className="tch-content">
                        <h2 id="tch-heading" className="tch-heading">
                            {t("tcHeading") || "Ulat-Bhaidni"}
                        </h2>
                        <span className="tch-rule" aria-hidden="true" />

                        {/* Screen readers get the full text at once */}
                        <div className="tch-sr">
                            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                        </div>

                        {/* Visual typed text (hidden from assistive tech) */}
                        <div className="tch-text" aria-hidden="true">
                            {paragraphs.map((full, i) => (
                                <p key={i} className="tch-para">
                                    {/* invisible full text reserves the height so nothing jumps */}
                                    <span className="tch-ghost">{full}</span>
                                    <span className="tch-typed">
                                        {typed[i]}
                                        {active === i && <span className="tch-cursor" />}
                                    </span>
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Teachings;