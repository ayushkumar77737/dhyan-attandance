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
        Array.from({ length: 20 }, (_, i) => ({
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

            generateQR(id);
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
                            <span className="qrv2__eyebrow-dot" />
                            {t("myQRCode")}
                        </div>
                        <h1 className="qrv2__title">{t("attendanceQRTitle")} <span className="qrv2__title-accent">QR</span></h1>
                        <p className="qrv2__date">{today}</p>
                    </div>

                    <div className="qrv2__user-section">
                        <div className="qrv2__avatar-wrap">
                            <div className="qrv2__avatar-ring" />
                            <div className="qrv2__avatar">
                                {userName ? userName.charAt(0).toUpperCase() : "?"}
                            </div>
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
                            <span className="qrv2__hint-icon">📡</span>
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
                            <span className="qrv2__info-icon">🔒</span>
                            <span>{t("qrSecure")}</span>
                        </div>
                        <div className="qrv2__info-divider" />
                        <div className="qrv2__info-item">
                            <span className="qrv2__info-icon">⚡</span>
                            <span>{t("qrInstant")}</span>
                        </div>
                        <div className="qrv2__info-divider" />
                        <div className="qrv2__info-item">
                            <span className="qrv2__info-icon">🙏</span>
                            <span>{t("dhyanPortal")}</span>
                        </div>
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