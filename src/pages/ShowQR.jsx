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
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");
    const [particles] = useState(
        Array.from({ length: 12 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 8,
            duration: 6 + Math.random() * 6,
            size: 2 + Math.random() * 3,
        }))
    );

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
            if (!user || !user.email) {
                navigate("/");
                return;
            }

            const id = String(
                user.email?.split("@")[0] || ""
            ).toUpperCase();
            setUserId(id);
            const snap = await getDoc(doc(db, "users", id));

            if (!snap.exists()) {
                navigate("/");
                return;
            }
            const userData = snap.data();

            if (
                userData.role === "admin" &&
                userData.uid === auth.currentUser.uid
            ) {
                navigate("/admin-dashboard");
                return;
            }

            setUserName(snap.data().name || id);
            // QR is drawn by the effect below (keyed on userId) once the id is
            // set — no need to also draw it here, which caused a double render.
        });

        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
            unsub();
        };
    }, []);

    const generateQR = async (id) => {
        if (!canvasRef.current || !id) return;
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
        if (!userId) return;

        navigator.clipboard
            .writeText(userId)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(console.error);
    };

    const today = new Date().toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    });

    return (
        <>
            <div className="qrv2__page" data-theme={theme}>
                <div className="qrv2__bg-mesh" />
                <div className="qrv2__orb qrv2__orb--1" />
                <div className="qrv2__orb qrv2__orb--2" />
                <div className="qrv2__orb qrv2__orb--3" />
                <div className="qrv2__grid-overlay" />
                <div className="qrv2__particles">
                    {particles.map((p) => (
                        <span
                            key={p.id}
                            className="qrv2__particle"
                            style={{
                                left: `${p.left}%`,
                                animationDelay: `${p.delay}s`,
                                animationDuration: `${p.duration}s`,
                                width: `${p.size}px`,
                                height: `${p.size}px`,
                            }}
                        />
                    ))}
                </div>

                <button className="qrv2__back-btn" onClick={() => navigate("/user-dashboard")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    {t("back")}
                </button>

                <div className="qrv2__card">
                    <div className="qrv2__card-topbar" />
                    <div className="qrv2__card-shine" />

                    {/* Header */}
                    <div className="qrv2__card-header">
                        <div className="qrv2__eyebrow">
                            <svg className="qrv2__eyebrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            {t("myQRCode")}
                        </div>
                        <h1 className="qrv2__title">{t("attendanceQRTitle")} <span className="qrv2__title-accent">QR</span></h1>
                        <p className="qrv2__date">
                            <svg className="qrv2__date-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {today}
                        </p>
                    </div>

                    <div className="qrv2__user-section">
                        <div className="qrv2__avatar-wrap">
                            <div className="qrv2__avatar-ring" />
                            <div className="qrv2__avatar">
                                {userName ? userName.charAt(0).toUpperCase() : "?"}
                            </div>
                            <span className="qrv2__avatar-status" />
                        </div>
                        <div className="qrv2__user-info">
                            <span className="qrv2__user-name">{userName || t("loading")}</span>
                            <div className="qrv2__user-id-wrap" onClick={handleCopyId} title={t("clickToCopy")}>
                                <span className="qrv2__user-id">{userId}</span>
                                <span className="qrv2__copy-icon">
                                    {copied ? "✓" : (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                        </svg>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="qrv2__qr-section">
                        <div className={`qrv2__qr-frame ${qrReady ? "qrv2__qr-frame--ready" : ""}`}>
                            <span className="qrv2__fc qrv2__fc--tl" />
                            <span className="qrv2__fc qrv2__fc--tr" />
                            <span className="qrv2__fc qrv2__fc--bl" />
                            <span className="qrv2__fc qrv2__fc--br" />

                            <div className="qrv2__qr-inner">
                                <canvas ref={canvasRef} className="qrv2__canvas" />
                                {!qrReady && (
                                    <div className="qrv2__qr-loading">
                                        <div className="qrv2__qr-spinner" />
                                        <span>{t("generatingQR")}</span>
                                    </div>
                                )}
                            </div>

                            {qrReady && <div className="qrv2__scan-line" />}
                        </div>

                        <p className="qrv2__qr-hint">
                            <svg className="qrv2__hint-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="3" y1="12" x2="21" y2="12" />
                            </svg>
                            {t("qrHint")}
                        </p>
                    </div>

                    <div className="qrv2__actions">
                        <button
                            className="qrv2__btn qrv2__btn--download"
                            onClick={handleDownload}
                            disabled={!qrReady || downloading}
                        >
                            {downloading ? (
                                <>
                                    <div className="qrv2__btn-spinner" />
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
                            className="qrv2__btn qrv2__btn--fullscreen"
                            onClick={() => setFullscreen(true)}
                            disabled={!qrReady}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                            </svg>
                            {t("fullscreen")}
                        </button>
                    </div>

                    <div className="qrv2__info-strip">
                        <div className="qrv2__info-item">
                            <span className="qrv2__info-icon qrv2__info-icon--secure">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
                                </svg>
                            </span>
                            <span className="qrv2__info-title">{t("qrSecure")}</span>
                        </div>

                        <div className="qrv2__info-divider" />

                        <div className="qrv2__info-item">
                            <span className="qrv2__info-icon qrv2__info-icon--instant">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                </svg>
                            </span>
                            <span className="qrv2__info-title">{t("qrInstant")}</span>
                        </div>
                    </div>

                    <div className="qrv2__portal-footer">
                        <svg className="qrv2__portal-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2c-.9 1.6-.9 3.4 0 5 .9-1.6.9-3.4 0-5zM7 6.5c-.3 1.8.3 3.5 1.6 4.6-.1-1.8-.7-3.4-1.6-4.6zm10 0c-.9 1.2-1.5 2.8-1.6 4.6 1.3-1.1 1.9-2.8 1.6-4.6zM12 10a4 4 0 0 0-4 4 4 4 0 0 0 8 0 4 4 0 0 0-4-4zm-8 4.5c1.2.9 2.8 1.3 4.3 1-1.1-1.1-2.6-1.8-4.3-1zm16 0c-1.7-.8-3.2-.1-4.3 1 1.5.3 3.1-.1 4.3-1z" />
                        </svg>
                        {t("dhyanPortal")}
                    </div>
                </div>
            </div>

            {fullscreen && (
                <div className="qrv2__fullscreen" data-theme={theme} onClick={() => setFullscreen(false)}>
                    <div className="qrv2__fullscreen-card" onClick={e => e.stopPropagation()}>
                        <button className="qrv2__fullscreen-close" onClick={() => setFullscreen(false)}>✕</button>
                        <div className="qrv2__fullscreen-user">
                            <div className="qrv2__fullscreen-avatar">
                                {userName ? userName.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div>
                                <span className="qrv2__fullscreen-name">{userName}</span>
                                <span className="qrv2__fullscreen-id">{userId}</span>
                            </div>
                        </div>
                        <div className="qrv2__fullscreen-qr">
                            <span className="qrv2__fc qrv2__fc--tl" />
                            <span className="qrv2__fc qrv2__fc--tr" />
                            <span className="qrv2__fc qrv2__fc--bl" />
                            <span className="qrv2__fc qrv2__fc--br" />
                            {canvasRef.current && (
                                <img
                                    src={canvasRef.current.toDataURL()}
                                    alt="QR Code"
                                    className="qrv2__fullscreen-img"
                                />
                            )}
                        </div>
                        <p className="qrv2__fullscreen-hint">{t("tapOutsideToClose")}</p>
                    </div>
                </div>
            )}
        </>
    );
}

export default ShowQR;