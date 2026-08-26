import React, { useState, useEffect, useRef } from "react";
import "./SmartAttendance.css";
import { logAdminAction } from "../utils/logAdminAction";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    limit,
    getDoc,
    doc
} from "firebase/firestore";
import { useTranslation } from "react-i18next";

/* ------------------------------------------------------------------ */
/* Inline icons (presentational only)                                 */
/* ------------------------------------------------------------------ */
const icons = {
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    ),
    users: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    checkSquare: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 20 6" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
    ),
    xSquare: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
        </svg>
    ),
    barChart: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="20" x2="6" y2="13" /><line x1="12" y1="20" x2="12" y2="5" />
            <line x1="18" y1="20" x2="18" y2="10" />
        </svg>
    ),
    camera: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    ),
    play: (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="6 4 20 12 6 20 6 4" />
        </svg>
    ),
    stop: (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
    ),
    refresh: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
    ),
    userSquare: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="9" r="3.2" />
            <path d="M6.5 19.4a6 6 0 0 1 11 0" />
        </svg>
    ),
    clipboard: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" />
        </svg>
    ),
    target: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" />
        </svg>
    ),
    trend: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
        </svg>
    ),
    clock: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" />
        </svg>
    ),
    alertTriangle: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
};

function SmartAttendance() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const scanIntervalRef = useRef(null);
    const lastScannedRef = useRef(null);
    const scanCooldownRef = useRef(false);

    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [scannedUser, setScannedUser] = useState(null);
    const [scanStatus, setScanStatus] = useState(null);
    const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, percentage: 0 });
    const [recentScans, setRecentScans] = useState([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [cameraError, setCameraError] = useState(null);
    const [toast, setToast] = useState(null);
    const [pulseActive, setPulseActive] = useState(false);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const checkAdmin = async () => {

        const currentUser = auth.currentUser;

        if (!currentUser) {
            navigate("/");
            return;
        }

        try {

            const userRef = doc(
                db,
                "users",
                localStorage.getItem("userId")
            );

            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                navigate("/");
                return;
            }

            const userData = userSnap.data();

            if (
                userData.role !== "admin" ||
                userData.uid !== auth.currentUser.uid
            ) {
                navigate("/");
                stopCamera();
                return;
            }

            fetchStats();
            fetchRecentScans();

        } catch (error) {
            console.error(error);
            stopCamera();
            navigate("/");
        }
    };

    useEffect(() => {
        const disableRightClick = (e) => e.preventDefault();
        const disableInspectKeys = (e) => {
            if (e.key === "F12") e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) e.preventDefault();
            if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
        };
        document.addEventListener("contextmenu", disableRightClick);
        document.addEventListener("keydown", disableInspectKeys);
        checkAdmin();
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
            stopCamera();
        };
    }, []);

    const fetchStats = async () => {
        try {
            setLoadingStats(true);
            const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const usersSnap = await getDocs(collection(db, "users"));
            let totalUsers = 0;
            usersSnap.forEach(d => {
                const u = d.data();
                if (u.deleted !== true && u.role !== "admin") totalUsers++;
            });

            const attSnap = await getDocs(collection(db, "smartAttendance"));
            let present = 0;
            attSnap.forEach(d => {
                const data = d.data();
                if (data.date === today && data.status === "Present") present++;
            });
            const absent = totalUsers - present;
            const pct = totalUsers > 0 ? Math.round((present / totalUsers) * 100) : 0;
            setStats({ total: totalUsers, present, absent, percentage: pct });
        } catch (err) { console.error(err); }
        finally { setLoadingStats(false); }
    };

    const fetchRecentScans = async () => {
        try {
            const snap = await getDocs(query(
                collection(db, "smartAttendance"),
                orderBy("scannedAt", "desc"),
                limit(10)
            ));
            const data = [];
            snap.forEach(d => data.push({ id: d.id, ...d.data() }));
            setRecentScans(data);
        } catch (err) { console.error(err); }
    };

    const startCamera = async () => {
        try {
            setCameraError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setScanning(true);
            startQRScan();
        } catch (err) {
            setCameraError(t("cameraAccessDenied"));
            console.error(err);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        setScanning(false);
    };

    const startQRScan = () => {
        scanIntervalRef.current = setInterval(() => {
            if (!videoRef.current || !canvasRef.current) return;
            if (scanCooldownRef.current) return;
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            if ("BarcodeDetector" in window) {
                const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
                detector.detect(canvas).then(barcodes => {
                    if (barcodes.length > 0) {
                        const code = barcodes[0].rawValue;
                        if (code !== lastScannedRef.current && !scanCooldownRef.current) {
                            lastScannedRef.current = code;
                            scanCooldownRef.current = true;
                            setScanResult(code);
                            handleScan(code);
                            setTimeout(() => {
                                scanCooldownRef.current = false;
                                lastScannedRef.current = null;
                            }, 5000);
                        }
                    }
                }).catch(() => { });
            }
        }, 500);
    };

    const handleScan = async (userId) => {
        try {
            setPulseActive(true);
            setTimeout(() => setPulseActive(false), 1000);

            const userRef = doc(
                db,
                "users",
                userId.toUpperCase()
            );

            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                setScanStatus("error");
                setScannedUser(null);
                showToast(`${t("userNotFoundScan")} ${userId}`, "error");
                return;
            }

            const userData = userSnap.data();

            const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const existingSnap = await getDocs(query(
                collection(db, "smartAttendance"),
                where("userId", "==", userId.toUpperCase()),
                where("date", "==", today)
            ));

            if (!existingSnap.empty) {
                setScanStatus("already");
                setScannedUser(userData);
                showToast(t("alreadyMarkedToday"), "already");
                return;
            }

            await addDoc(collection(db, "smartAttendance"), {
                userId: userId.toUpperCase(),
                userName: userData.name || userId,
                date: today,
                status: "Present",
                scannedAt: serverTimestamp(),
                markedBy: localStorage.getItem("userId")
            });
            await logAdminAction("mark_attendance", {
                targetId: userId.toUpperCase(),
                details: t("logScannedPresent", { name: userData.name || userId }),
            });
            setScanStatus("success");
            setScannedUser(userData);
            showToast(`${userData.name || userId} — ${t("markedPresentSuccess")}`, "success");
            fetchStats();
            fetchRecentScans();

        } catch (err) {
            console.error(err);
            setScanStatus("error");
            showToast(t("errorMarkingAttendance"), "error");
        }
    };

    const handleManualScan = async (e) => {
        e.preventDefault();
        const val = e.target.manualId.value.trim().toUpperCase();
        if (!/^[A-Z0-9]{4}$/.test(val)) {
            showToast(t("invalidUserId"), "error");
            return;
        }
        setScanResult(val);
        await handleScan(val);
        e.target.reset();
    };

    const showToast = (msg, type) => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const formatTime = (ts) => {
        if (!ts) return "—";
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };

    const today = new Date().toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    });

    const statusIcon = {
        success: icons.checkSquare,
        already: icons.alertTriangle,
        error: icons.xSquare,
    };

    return (
        <div className="satnv2__page" data-theme={theme}>
            <div className="satnv2__bg-grid" />
            <div className="satnv2__noise" />
            <div className="satnv2__orb satnv2__orb--1" />
            <div className="satnv2__orb satnv2__orb--2" />
            <div className="satnv2__orb satnv2__orb--3" />

            {toast && (
                <div className={`satnv2__toast satnv2__toast--${toast.type}`}>
                    <span className="satnv2__toast-dot" />
                    {toast.msg}
                </div>
            )}

            {/* ============================ HEADER ============================ */}
            <div className="satnv2__header">
                <button className="satnv2__back-btn" onClick={() => navigate("/admin-dashboard")}>
                    <span className="satnv2__back-icon">{icons.back}</span>
                    {t("back")}
                </button>

                <div className="satnv2__header-center">
                    <div className="satnv2__eyebrow">
                        <span className="satnv2__eyebrow-dot" />
                        {t("smartAttendance")}
                    </div>
                    <h1 className="satnv2__title">
                        QR <span className="satnv2__title-accent">{t("scanner")}</span>
                    </h1>
                    <p className="satnv2__date">{today}</p>
                </div>

                <div className="satnv2__header-right">
                    <div className="satnv2__live-badge">
                        <span className="satnv2__live-dot" />
                        {t("live")}
                    </div>
                </div>
            </div>

            {/* ============================= STATS ============================ */}
            <div className="satnv2__stats">
                <div className="satnv2__stat satnv2__stat--total">
                    <span className="satnv2__stat-icon">{icons.users}</span>
                    <div className="satnv2__stat-body">
                        <span className="satnv2__stat-num">{loadingStats ? "—" : stats.total}</span>
                        <span className="satnv2__stat-label">{t("totalUsers")}</span>
                        <span className="satnv2__stat-sub">{t("registeredUsers") || "Registered users"}</span>
                    </div>
                    <span className="satnv2__stat-ghost" aria-hidden="true">{icons.users}</span>
                    <span className="satnv2__stat-bar" aria-hidden="true" />
                </div>

                <div className="satnv2__stat satnv2__stat--present">
                    <span className="satnv2__stat-icon">{icons.checkSquare}</span>
                    <div className="satnv2__stat-body">
                        <span className="satnv2__stat-num">{loadingStats ? "—" : stats.present}</span>
                        <span className="satnv2__stat-label">{t("presentToday")}</span>
                        <span className="satnv2__stat-sub">{t("markedPresent") || "Marked present"}</span>
                    </div>
                    <span className="satnv2__stat-ghost" aria-hidden="true">{icons.checkSquare}</span>
                    <span className="satnv2__stat-bar" aria-hidden="true" />
                </div>

                <div className="satnv2__stat satnv2__stat--absent">
                    <span className="satnv2__stat-icon">{icons.xSquare}</span>
                    <div className="satnv2__stat-body">
                        <span className="satnv2__stat-num">{loadingStats ? "—" : stats.absent}</span>
                        <span className="satnv2__stat-label">{t("absent")}</span>
                        <span className="satnv2__stat-sub">{t("markedAbsent") || "Marked absent"}</span>
                    </div>
                    <span className="satnv2__stat-ghost" aria-hidden="true">{icons.xSquare}</span>
                    <span className="satnv2__stat-bar" aria-hidden="true" />
                </div>

                <div className="satnv2__stat satnv2__stat--pct">
                    <span className="satnv2__stat-icon">{icons.barChart}</span>
                    <div className="satnv2__stat-body">
                        <span className="satnv2__stat-num">{loadingStats ? "—" : `${stats.percentage}%`}</span>
                        <span className="satnv2__stat-label">{t("attendanceRate")}</span>
                        <span className="satnv2__stat-sub">{t("overallAttendance") || "Overall attendance"}</span>
                    </div>
                    <span className="satnv2__stat-ghost" aria-hidden="true">{icons.barChart}</span>
                    <span
                        className="satnv2__stat-bar satnv2__stat-bar--fill"
                        style={{ "--fill": `${stats.percentage}%` }}
                        aria-hidden="true"
                    />
                </div>
            </div>

            {/* ============================= MAIN ============================= */}
            <div className="satnv2__main">

                {/* ------------------- SCANNER ------------------- */}
                <div className="satnv2__scanner-panel">
                    <div className="satnv2__panel-header">
                        <span className="satnv2__panel-title">
                            <span className="satnv2__panel-icon">{icons.camera}</span>
                            {t("qrScannerTitle")}
                        </span>
                        <span className={`satnv2__scan-status-badge ${scanning ? "satnv2__scan-status-badge--active" : ""}`}>
                            <span className="satnv2__scan-status-dot" />
                            {scanning ? t("scanning") : t("idle")}
                        </span>
                    </div>

                    <div className={`satnv2__camera-wrap ${pulseActive ? "satnv2__camera-wrap--pulse" : ""}`}>
                        <video ref={videoRef} className="satnv2__video" playsInline muted />
                        <canvas ref={canvasRef} className="satnv2__canvas" />

                        {/* corner brackets stay visible in both states */}
                        <span className="satnv2__corner satnv2__corner--tl" aria-hidden="true" />
                        <span className="satnv2__corner satnv2__corner--tr" aria-hidden="true" />
                        <span className="satnv2__corner satnv2__corner--bl" aria-hidden="true" />
                        <span className="satnv2__corner satnv2__corner--br" aria-hidden="true" />

                        {!scanning && (
                            <div className="satnv2__camera-placeholder">
                                <span className="satnv2__camera-badge">{icons.camera}</span>
                                <p>{t("cameraOff")}</p>
                                <span className="satnv2__camera-hint">{t("clickToStartScanner")}</span>
                            </div>
                        )}

                        {scanning && (
                            <div className="satnv2__scan-overlay">
                                <div className="satnv2__scan-frame">
                                    <div className="satnv2__scan-line" />
                                </div>
                                <p className="satnv2__scan-hint">{t("pointCameraAtQR")}</p>
                            </div>
                        )}

                        {cameraError && (
                            <div className="satnv2__camera-error">
                                <span className="satnv2__camera-error-icon">{icons.alertTriangle}</span>
                                <p>{cameraError}</p>
                            </div>
                        )}
                    </div>

                    <div className="satnv2__camera-controls">
                        {!scanning ? (
                            <button className="satnv2__btn satnv2__btn--start" onClick={startCamera}>
                                <span className="satnv2__btn-icon">{icons.play}</span>
                                {t("startScanner")}
                            </button>
                        ) : (
                            <button className="satnv2__btn satnv2__btn--stop" onClick={stopCamera}>
                                <span className="satnv2__btn-icon">{icons.stop}</span>
                                {t("stopScanner")}
                            </button>
                        )}
                        <button
                            className="satnv2__btn satnv2__btn--refresh"
                            onClick={() => { fetchStats(); fetchRecentScans(); }}
                        >
                            <span className="satnv2__btn-icon">{icons.refresh}</span>
                            {t("refresh")}
                        </button>
                    </div>

                    <div className="satnv2__manual">
                        <p className="satnv2__manual-label">
                            <span className="satnv2__manual-icon">{icons.userSquare}</span>
                            {t("manualIdEntry")}
                        </p>
                        <form className="satnv2__manual-form" onSubmit={handleManualScan}>
                            <input
                                className="satnv2__manual-input"
                                name="manualId"
                                type="text"
                                placeholder={t("enterUserIdPlaceholder")}
                                maxLength={4}
                                autoComplete="off"
                                onChange={(e) => {
                                    const value = e.target.value;
                                    e.target.value = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                                }}
                            />
                            <button className="satnv2__btn satnv2__btn--mark" type="submit">
                                {t("mark")}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ------------------- RIGHT COLUMN ------------------- */}
                <div className="satnv2__right-panel">

                    {/* last scan */}
                    <div className={`satnv2__user-card ${scanStatus ? `satnv2__user-card--${scanStatus}` : ""}`}>
                        <div className="satnv2__card-head">
                            <span className="satnv2__card-icon">{icons.clipboard}</span>
                            <span className="satnv2__card-title">{t("lastScanResult")}</span>
                            {scanStatus && (
                                <span className={`satnv2__result-badge satnv2__result-badge--${scanStatus}`}>
                                    {scanStatus === "success"
                                        ? t("marked")
                                        : scanStatus === "already"
                                            ? t("duplicate")
                                            : t("notFound")}
                                </span>
                            )}
                        </div>

                        {scannedUser ? (
                            <div className="satnv2__user-info">
                                <div className="satnv2__user-avatar">
                                    {(scannedUser.name || "U").charAt(0).toUpperCase()}
                                </div>
                                <div className="satnv2__user-details">
                                    <span className="satnv2__user-name">{scannedUser.name || t("unknown")}</span>
                                    <span className="satnv2__user-id">ID: {scannedUser.id || scanResult}</span>
                                    {scanStatus === "success" && (
                                        <span className="satnv2__user-time">
                                            <span className="satnv2__user-time-icon">{icons.clock}</span>
                                            {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    )}
                                </div>
                                <div className={`satnv2__user-status-icon satnv2__user-status-icon--${scanStatus}`}>
                                    {statusIcon[scanStatus]}
                                </div>
                            </div>
                        ) : (
                            <div className="satnv2__empty">
                                <span className="satnv2__empty-icon">{icons.target}</span>
                                <p className="satnv2__empty-title">{t("scanQRPrompt") || "Scan a QR code"}</p>
                                <span className="satnv2__empty-sub">
                                    {t("scanQRPromptSub") || "to see user details"}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* progress */}
                    <div className="satnv2__progress-card">
                        <div className="satnv2__card-head">
                            <span className="satnv2__card-icon">{icons.trend}</span>
                            <span className="satnv2__card-title">{t("todaysProgress")}</span>
                        </div>

                        <div className="satnv2__progress-body">
                            <div className="satnv2__progress-ring-wrap">
                                <svg className="satnv2__progress-svg" viewBox="0 0 120 120">
                                    <circle
                                        cx="60" cy="60" r="50" fill="none"
                                        stroke="var(--sa-ring-track)" strokeWidth="11"
                                    />
                                    <circle
                                        cx="60" cy="60" r="50"
                                        fill="none"
                                        stroke="url(#satnv2ProgressGrad)"
                                        strokeWidth="11"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 50}`}
                                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - stats.percentage / 100)}`}
                                        transform="rotate(-90 60 60)"
                                        style={{ transition: "stroke-dashoffset 1s ease" }}
                                    />
                                    <defs>
                                        <linearGradient id="satnv2ProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#3b82f6" />
                                            <stop offset="100%" stopColor="#22c55e" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="satnv2__progress-center">
                                    <span className="satnv2__progress-pct">{stats.percentage}%</span>
                                    <span className="satnv2__progress-sub">{stats.present}/{stats.total}</span>
                                </div>
                            </div>

                            <ul className="satnv2__progress-legend">
                                <li>
                                    <span className="satnv2__legend-dot" style={{ background: "#22c55e" }} />
                                    <span className="satnv2__legend-label">{t("present")}</span>
                                    <span className="satnv2__legend-val">{stats.present}</span>
                                </li>
                                <li>
                                    <span className="satnv2__legend-dot" style={{ background: "#ef4444" }} />
                                    <span className="satnv2__legend-label">{t("absent")}</span>
                                    <span className="satnv2__legend-val">{stats.absent}</span>
                                </li>
                                <li>
                                    <span className="satnv2__legend-dot" style={{ background: "#3b82f6" }} />
                                    <span className="satnv2__legend-label">{t("totalUsers")}</span>
                                    <span className="satnv2__legend-val">{stats.total}</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* recent scans */}
                    <div className="satnv2__activity">
                        <div className="satnv2__card-head">
                            <span className="satnv2__card-icon">{icons.clock}</span>
                            <span className="satnv2__card-title">{t("recentScans")}</span>
                            <span className="satnv2__activity-count">
                                {recentScans.length} {t("records")}
                            </span>
                        </div>

                        <div className="satnv2__activity-list">
                            {recentScans.length === 0 ? (
                                <div className="satnv2__empty">
                                    <span className="satnv2__empty-icon">{icons.clipboard}</span>
                                    <p className="satnv2__empty-title">{t("noScansYet")}</p>
                                    <span className="satnv2__empty-sub">
                                        {t("startScanningHint") || "Start scanning to see records here."}
                                    </span>
                                </div>
                            ) : (
                                recentScans.map((scan, i) => (
                                    <div key={scan.id} className="satnv2__activity-row" style={{ animationDelay: `${i * 40}ms` }}>
                                        <div className="satnv2__activity-avatar">
                                            {(scan.userName || "U").charAt(0).toUpperCase()}
                                        </div>
                                        <div className="satnv2__activity-info">
                                            <span className="satnv2__activity-name">{scan.userName}</span>
                                            <span className="satnv2__activity-id">{scan.userId}</span>
                                        </div>
                                        <div className="satnv2__activity-right">
                                            <span className={`satnv2__activity-badge satnv2__activity-badge--${scan.status?.toLowerCase()}`}>
                                                {scan.status === "Present" ? t("present") : t("absent")}
                                            </span>
                                            <span className="satnv2__activity-time">{formatTime(scan.scannedAt)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SmartAttendance;