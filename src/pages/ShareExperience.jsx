import React, { useEffect, useState } from "react";
import "./ShareExperience.css";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useTranslation } from "react-i18next";

function ShareExperience() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [userId, setUserId] = useState("");
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState("");
    const [sessionType, setSessionType] = useState("");
    const [moodBefore, setMoodBefore] = useState("");
    const [moodAfter, setMoodAfter] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [alreadySubmitted, setAlreadySubmitted] = useState(false);
    const [checkingSubmission, setCheckingSubmission] = useState(true);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        const p = Array.from({ length: 22 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 10,
            duration: 7 + Math.random() * 10,
            size: 1.5 + Math.random() * 3.5,
        }));
        setParticles(p);
    }, []);

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
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user || !user.email) {
                navigate("/");
                return;
            }

            const email = user.email;

            const id = email
                .split("@")[0]
                .toUpperCase();
            const userRef = doc(db, "users", id);

            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                navigate("/");
                return;
            }

            const userData = userSnap.data();

            // Block admin access
            if (userData.role === "admin") {
                navigate("/admin-dashboard");
                return;
            }
            setUserId(id);

            const today = new Date().toISOString().split("T")[0];
            const q = query(
                collection(db, "experiences"),
                where("userId", "==", id),
                where("date", "==", today)
            );
            const snap = await getDocs(q);
            if (!snap.empty) setAlreadySubmitted(true);
            setCheckingSubmission(false);
        });
        return () => unsubscribe();
    }, []);

    const showMsg = (text, type = "success") => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 4000);
    };

    const handleSubmit = async () => {
        if (!userId) {
            return showMsg(t("loginRequired"), "error");
        }
        if (!rating) return showMsg(t("pleaseSelectRating"), "error");
        if (!sessionType) return showMsg(t("pleaseSelectSession"), "error");
        if (!moodBefore) return showMsg(t("pleaseSelectMoodBefore"), "error");
        if (!moodAfter) return showMsg(t("pleaseSelectMoodAfter"), "error");
        if (!comment.trim() || comment.trim().length < 10) {
            return showMsg(t("pleaseShareWords"), "error");
        }

        setLoading(true);
        try {
            const today = new Date().toISOString().split("T")[0];
            const q = query(
                collection(db, "experiences"),
                where("userId", "==", userId),
                where("date", "==", today)
            );

            const snap = await getDocs(q);

            if (!snap.empty) {
                setAlreadySubmitted(true);
                setLoading(false);
                return;
            }
            await addDoc(collection(db, "experiences"), {
                userId,
                rating,
                sessionType,
                moodBefore,
                moodAfter,
                comment: comment.trim().slice(0, 500),
                date: today,
                createdAt: new Date().toISOString(),
            });
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            showMsg("Something went wrong. Please try again.", "error");
        } finally {
            setLoading(false);
        }
    };

    const ratingLabels = ["", "Difficult", "Okay", "Good", "Great", "Transcendent"];

    const sessionTypes = [
        { value: "breathing", label: "🌬️ Breathing" },
        { value: "guided", label: "🎙️ Guided" },
        { value: "silent", label: "🤫 Silent" },
        { value: "movement", label: "🌊 Movement" },
        { value: "sleep", label: "🌙 Sleep" },
    ];

    const moods = [
        { value: "anxious", label: "😰 Anxious" },
        { value: "tired", label: "😴 Tired" },
        { value: "neutral", label: "😐 Neutral" },
        { value: "calm", label: "😌 Calm" },
        { value: "joyful", label: "✨ Joyful" },
    ];

    const Particles = () => (
        <>
            {particles.map(p => (
                <div key={p.id} className="shrexp__particle" style={{
                    left: `${p.left}%`,
                    width: p.size,
                    height: p.size,
                    animationDelay: `${p.delay}s`,
                    animationDuration: `${p.duration}s`
                }} />
            ))}
        </>
    );

    if (checkingSubmission) {
        return (
            <div className="shrexp__page">
                <div className="shrexp__orb shrexp__orb--1" />
                <div className="shrexp__orb shrexp__orb--2" />
                <div className="shrexp__loader-screen">
                    <div className="shrexp__lotus">
                        {[...Array(6)].map((_, i) => <div key={i} className="shrexp__petal" />)}
                    </div>
                    <p className="shrexp__loader-text">{t("preparingSpace")}</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="shrexp__page">
                <Particles />
                <div className="shrexp__orb shrexp__orb--1" />
                <div className="shrexp__orb shrexp__orb--2" />
                <div className="shrexp__orb shrexp__orb--3" />
                <div className="shrexp__fullscreen">
                    <div className="shrexp__fs-glow shrexp__fs-glow--gold" />
                    <div className="shrexp__rings">
                        <div className="shrexp__ring shrexp__ring--1" />
                        <div className="shrexp__ring shrexp__ring--2" />
                        <div className="shrexp__ring shrexp__ring--3" />
                    </div>
                    <div className="shrexp__fs-icon">🪷</div>
                    <h2 className="shrexp__fs-title">{t("thankYou")}</h2>
                    <p className="shrexp__fs-sub">{t("experienceReceived")}</p>
                    <button className="shrexp__return-btn" onClick={() => navigate("/user-dashboard")}>
                        {t("returnDashboard")}
                    </button>
                </div>
            </div>
        );
    }

    if (alreadySubmitted) {
        return (
            <div className="shrexp__page">
                <div className="shrexp__orb shrexp__orb--1" />
                <div className="shrexp__orb shrexp__orb--2" />
                <div className="shrexp__fullscreen">
                    <div className="shrexp__fs-glow shrexp__fs-glow--rose" />
                    <div className="shrexp__fs-icon">🌸</div>
                    <h2 className="shrexp__fs-title">{t("alreadyShared")}</h2>
                    <p className="shrexp__fs-sub">{t("alreadySharedMsg")}</p>
                    <button className="shrexp__return-btn" onClick={() => navigate("/user-dashboard")}>
                        {t("returnDashboard")}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="shrexp__page">

            <Particles />
            <div className="shrexp__orb shrexp__orb--1" />
            <div className="shrexp__orb shrexp__orb--2" />
            <div className="shrexp__orb shrexp__orb--3" />
            <div className="shrexp__grid-bg" />

            {/* Back */}
            <button className="shrexp__back-btn" onClick={() => navigate("/user-dashboard")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("back")}
            </button>

            {/* Hero */}
            <div className="shrexp__hero">
                <div className="shrexp__mandala-symbol">❋</div>
                <div className="shrexp__badge">
                    <span className="shrexp__badge-pulse" />
                    {t("meditationPortal")}
                </div>
                <h1 className="shrexp__hero-title">{t("shareYourExperience")}</h1>
                <p className="shrexp__hero-sub">{t("shareExperienceSub")}</p>
                <div className="shrexp__hero-divider" />
            </div>

            {/* Toast */}
            {message.text && (
                <div className={`shrexp__toast shrexp__toast--${message.type}`}>
                    <span className="shrexp__toast-indicator" />
                    {message.text}
                </div>
            )}

            {/* Card */}
            <div className="shrexp__card">
                <div className="shrexp__card-top-glow" />
                <div className="shrexp__card-inner-shine" />

                {/* Session Type */}
                <div className="shrexp__section">
                    <div className="shrexp__sec-header">
                        <span className="shrexp__sec-ico">🧘</span>
                        <span className="shrexp__sec-lbl">{t("sessionType")}</span>
                    </div>
                    <div className="shrexp__pill-row">
                        {sessionTypes.map(s => (
                            <button
                                key={s.value}
                                className={`shrexp__pill ${sessionType === s.value ? "shrexp__pill--active" : ""}`}
                                onClick={() => setSessionType(s.value)}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="shrexp__divider" />

                {/* Stars */}
                <div className="shrexp__section">
                    <div className="shrexp__sec-header">
                        <span className="shrexp__sec-ico">✦</span>
                        <span className="shrexp__sec-lbl">{t("rateYourSession")}</span>
                    </div>
                    <div className="shrexp__stars-wrap">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button
                                key={star}
                                className={`shrexp__star-btn ${star <= (hoveredRating || rating) ? "shrexp__star-btn--lit" : ""}`}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                onClick={() => setRating(star)}
                            >★</button>
                        ))}
                        {(hoveredRating || rating) > 0 && (
                            <span className="shrexp__rating-word">{ratingLabels[hoveredRating || rating]}</span>
                        )}
                    </div>
                </div>

                <div className="shrexp__divider" />

                {/* Mood Before */}
                <div className="shrexp__section">
                    <div className="shrexp__sec-header">
                        <span className="shrexp__sec-ico">🌑</span>
                        <span className="shrexp__sec-lbl">{t("beforeSession")}</span>
                    </div>
                    <div className="shrexp__pill-row">
                        {moods.map(m => (
                            <button
                                key={m.value}
                                className={`shrexp__pill ${moodBefore === m.value ? "shrexp__pill--active" : ""}`}
                                onClick={() => setMoodBefore(m.value)}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="shrexp__divider" />

                {/* Mood After */}
                <div className="shrexp__section">
                    <div className="shrexp__sec-header">
                        <span className="shrexp__sec-ico">🌕</span>
                        <span className="shrexp__sec-lbl">{t("afterSession")}</span>
                    </div>
                    <div className="shrexp__pill-row">
                        {moods.map(m => (
                            <button
                                key={m.value}
                                className={`shrexp__pill ${moodAfter === m.value ? "shrexp__pill--active" : ""}`}
                                onClick={() => setMoodAfter(m.value)}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="shrexp__divider" />

                {/* Comment */}
                <div className="shrexp__section">
                    <div className="shrexp__sec-header">
                        <span className="shrexp__sec-ico">🪶</span>
                        <span className="shrexp__sec-lbl">{t("yourWords")}</span>
                    </div>
                    <textarea
                        className="shrexp__textarea"
                        placeholder={t("textareaPlaceholder")}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={500}
                        rows={4}
                    />
                    <div className="shrexp__char-counter">{comment.length} / 500</div>
                </div>

                {/* Submit */}
                <button className="shrexp__submit" onClick={handleSubmit} disabled={loading}>
                    <span className="shrexp__submit-shimmer" />
                    {loading ? (
                        <><span className="shrexp__spin" /> {t("submitting")}</>
                    ) : (
                        <><span>🪷</span> {t("submitExperience")}</>
                    )}
                </button>

            </div>

            <p className="shrexp__footnote">{t("shareFootnote")}</p>

        </div>
    );
}

export default ShareExperience;