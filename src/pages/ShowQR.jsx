import React, { useEffect, useState, useRef } from "react";
import "./ShowQR.css";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import QRCode from "qrcode";
import { useTranslation } from "react-i18next";

function ShowQR() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const canvasRef = useRef(null);
    const [userName, setUserName] = useState("");
    const [userId, setUserId] = useState("");
    const [qrReady, setQrReady] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const disableRightClick = (e) => e.preventDefault();
        const disableInspectKeys = (e) => {
            if (e.key === "F12") e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) e.preventDefault();
            if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
        };
        document.addEventListener("contextmenu", disableRightClick);
        document.addEventListener("keydown", disableInspectKeys);

        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) return;
            const id = user.email.split("@")[0].toUpperCase();
            setUserId(id);
            const snap = await getDoc(doc(db, "users", id));
            if (snap.exists()) setUserName(snap.data().name || id);
            generateQR(id);
        });

        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
            unsub();
        };
    }, []);

    const generateQR = async (id) => {
        if (!canvasRef.current) return;
        try {
            await QRCode.toCanvas(canvasRef.current, id, {
                width: 280,
                margin: 2,
                color: {
                    dark: "#0a0f1e",
                    light: "#ffffff",
                },
                errorCorrectionLevel: "H",
            });
            setQrReady(true);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (userId && canvasRef.current) generateQR(userId);
    }, [userId]);

    const handleDownload = () => {
        if (!canvasRef.current) return;
        setDownloading(true);
        const link = document.createElement("a");
        link.download = `${userId}-QR.png`;
        link.href = canvasRef.current.toDataURL("image/png");
        link.click();
        setTimeout(() => setDownloading(false), 1500);
    };

    const handleCopyId = () => {
        navigator.clipboard.writeText(userId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const today = new Date().toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    });

    return (
        <>
            <div className="sqr__page">
                {/* Background */}
                <div className="sqr__bg-mesh" />
                <div className="sqr__orb sqr__orb--1" />
                <div className="sqr__orb sqr__orb--2" />
                <div className="sqr__orb sqr__orb--3" />
                <div className="sqr__particles">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <span key={i} className="sqr__particle" style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 8}s`,
                            animationDuration: `${6 + Math.random() * 6}s`,
                            width: `${2 + Math.random() * 3}px`,
                            height: `${2 + Math.random() * 3}px`,
                        }} />
                    ))}
                </div>

                {/* Back */}
                <button className="sqr__back-btn" onClick={() => navigate("/user-dashboard")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    {t("back")}
                </button>

                {/* Main card */}
                <div className="sqr__card">
                    <div className="sqr__card-topbar" />

                    {/* Header */}
                    <div className="sqr__card-header">
                        <div className="sqr__eyebrow">
                            <span className="sqr__eyebrow-dot" />
                            {t("myQRCode")}
                        </div>
                        <h1 className="sqr__title">{t("attendanceQRTitle")} <span className="sqr__title-accent">QR</span></h1>
                        <p className="sqr__date">{today}</p>
                    </div>

                    {/* Avatar + name */}
                    <div className="sqr__user-section">
                        <div className="sqr__avatar-wrap">
                            <div className="sqr__avatar-ring" />
                            <div className="sqr__avatar">
                                {userName ? userName.charAt(0).toUpperCase() : "?"}
                            </div>
                        </div>
                        <div className="sqr__user-info">
                            <span className="sqr__user-name">{userName || t("loading")}</span>
                            <div className="sqr__user-id-wrap" onClick={handleCopyId} title={t("clickToCopy")}>
                                <span className="sqr__user-id">{userId}</span>
                                <span className="sqr__copy-icon">
                                    {copied ? "✓" : (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                        </svg>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="sqr__qr-section">
                        <div className={`sqr__qr-frame ${qrReady ? "sqr__qr-frame--ready" : ""}`}>
                            <span className="sqr__fc sqr__fc--tl" />
                            <span className="sqr__fc sqr__fc--tr" />
                            <span className="sqr__fc sqr__fc--bl" />
                            <span className="sqr__fc sqr__fc--br" />

                            <div className="sqr__qr-inner">
                                <canvas ref={canvasRef} className="sqr__canvas" />
                                {!qrReady && (
                                    <div className="sqr__qr-loading">
                                        <div className="sqr__qr-spinner" />
                                        <span>{t("generatingQR")}</span>
                                    </div>
                                )}
                            </div>

                            {qrReady && <div className="sqr__scan-line" />}
                        </div>

                        <p className="sqr__qr-hint">
                            <span className="sqr__hint-icon">📡</span>
                            {t("qrHint")}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="sqr__actions">
                        <button
                            className="sqr__btn sqr__btn--download"
                            onClick={handleDownload}
                            disabled={!qrReady || downloading}
                        >
                            {downloading ? (
                                <>
                                    <div className="sqr__btn-spinner" />
                                    {t("downloading")}
                                </>
                            ) : (
                                <>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    {t("downloadQR")}
                                </>
                            )}
                        </button>

                        <button
                            className="sqr__btn sqr__btn--fullscreen"
                            onClick={() => setFullscreen(true)}
                            disabled={!qrReady}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                            </svg>
                            {t("fullscreen")}
                        </button>
                    </div>

                    {/* Info strip */}
                    <div className="sqr__info-strip">
                        <div className="sqr__info-item">
                            <span className="sqr__info-icon">🔒</span>
                            <span>{t("qrSecure")}</span>
                        </div>
                        <div className="sqr__info-divider" />
                        <div className="sqr__info-item">
                            <span className="sqr__info-icon">⚡</span>
                            <span>{t("qrInstant")}</span>
                        </div>
                        <div className="sqr__info-divider" />
                        <div className="sqr__info-item">
                            <span className="sqr__info-icon">🙏</span>
                            <span>{t("dhyanPortal")}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fullscreen Modal */}
            {fullscreen && (
                <div className="sqr__fullscreen" onClick={() => setFullscreen(false)}>
                    <div className="sqr__fullscreen-card" onClick={e => e.stopPropagation()}>
                        <button className="sqr__fullscreen-close" onClick={() => setFullscreen(false)}>✕</button>
                        <div className="sqr__fullscreen-user">
                            <div className="sqr__fullscreen-avatar">
                                {userName ? userName.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div>
                                <span className="sqr__fullscreen-name">{userName}</span>
                                <span className="sqr__fullscreen-id">{userId}</span>
                            </div>
                        </div>
                        <div className="sqr__fullscreen-qr">
                            <span className="sqr__fc sqr__fc--tl" />
                            <span className="sqr__fc sqr__fc--tr" />
                            <span className="sqr__fc sqr__fc--bl" />
                            <span className="sqr__fc sqr__fc--br" />
                            {canvasRef.current && (
                                <img
                                    src={canvasRef.current.toDataURL()}
                                    alt="QR Code"
                                    className="sqr__fullscreen-img"
                                />
                            )}
                        </div>
                        <p className="sqr__fullscreen-hint">{t("tapOutsideToClose")}</p>
                    </div>
                </div>
            )}
        </>
    );
}

export default ShowQR;