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

            if (userData.role !== "admin") {
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

            const userSnap = await getDocs(query(collection(db, "users"), where("id", "==", userId.toUpperCase())));
            if (userSnap.empty) {
                setScanStatus("error");
                setScannedUser(null);
                showToast(`❌ ${t("userNotFoundScan")} ${userId}`, "error");
                return;
            }
            const userData = userSnap.docs[0].data();

            const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const existingSnap = await getDocs(query(
                collection(db, "smartAttendance"),
                where("userId", "==", userId.toUpperCase()),
                where("date", "==", today)
            ));

            if (!existingSnap.empty) {
                setScanStatus("already");
                setScannedUser(userData);
                showToast(`⚠️ ${t("alreadyMarkedToday")}`, "already");
                return;
            }

            await addDoc(collection(db, "smartAttendance"), {
                userId: userId.toUpperCase(),
                userName: userData.name || userId,
                date: today,
                status: "Present",
                scannedAt: serverTimestamp(),
            });
            await logAdminAction("mark_attendance", {
                targetId: userId.toUpperCase(),
                details: t("logScannedPresent", { name: userData.name || userId }),
            });
            setScanStatus("success");
            setScannedUser(userData);
            showToast(`✅ ${userData.name || userId} ${t("markedPresentSuccess")}`, "success");
            fetchStats();
            fetchRecentScans();

        } catch (err) {
            console.error(err);
            setScanStatus("error");
            showToast(`❌ ${t("errorMarkingAttendance")}`, "error");
        }
    };

    const handleManualScan = async (e) => {
        e.preventDefault();
        const val = e.target.manualId.value.trim().toUpperCase();
        if (!val) return;
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

    return (
        <div className="satnv2__page">
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

            <div className="satnv2__header">
                <button className="satnv2__back-btn" onClick={() => navigate("/admin-dashboard")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    {t("back")}
                </button>
                <div className="satnv2__header-center">
                    <div className="satnv2__eyebrow">
                        <span className="satnv2__eyebrow-dot" />
                        {t("smartAttendance")}
                    </div>
                    <h1 className="satnv2__title">QR <span className="satnv2__title-accent">{t("scanner")}</span></h1>
                    <p className="satnv2__date">{today}</p>
                </div>
                <div className="satnv2__header-right">
                    <div className="satnv2__live-badge">
                        <span className="satnv2__live-dot" />
                        {t("live")}
                    </div>
                </div>
            </div>

            <div className="satnv2__stats">
                <div className="satnv2__stat satnv2__stat--total">
                    <div className="satnv2__stat-icon">👥</div>
                    <div className="satnv2__stat-body">
                        <span className="satnv2__stat-num">{loadingStats ? "—" : stats.total}</span>
                        <span className="satnv2__stat-label">{t("totalUsers")}</span>
                    </div>
                    <div className="satnv2__stat-glow" style={{ background: "#3b82f6" }} />
                </div>
                <div className="satnv2__stat satnv2__stat--present">
                    <div className="satnv2__stat-icon">✅</div>
                    <div className="satnv2__stat-body">
                        <span className="satnv2__stat-num">{loadingStats ? "—" : stats.present}</span>
                        <span className="satnv2__stat-label">{t("presentToday")}</span>
                    </div>
                    <div className="satnv2__stat-glow" style={{ background: "#22c55e" }} />
                </div>
                <div className="satnv2__stat satnv2__stat--absent">
                    <div className="satnv2__stat-icon">❌</div>
                    <div className="satnv2__stat-body">
                        <span className="satnv2__stat-num">{loadingStats ? "—" : stats.absent}</span>
                        <span className="satnv2__stat-label">{t("absent")}</span>
                    </div>
                    <div className="satnv2__stat-glow" style={{ background: "#ef4444" }} />
                </div>
                <div className="satnv2__stat satnv2__stat--pct">
                    <div className="satnv2__stat-icon">📊</div>
                    <div className="satnv2__stat-body">
                        <span className="satnv2__stat-num">{loadingStats ? "—" : `${stats.percentage}%`}</span>
                        <span className="satnv2__stat-label">{t("attendanceRate")}</span>
                    </div>
                    <div className="satnv2__stat-progress">
                        <div className="satnv2__stat-progress-fill" style={{ width: `${stats.percentage}%` }} />
                    </div>
                    <div className="satnv2__stat-glow" style={{ background: "#f59e0b" }} />
                </div>
            </div>

            <div className="satnv2__main">

                <div className="satnv2__scanner-panel">
                    <div className="satnv2__panel-header">
                        <span className="satnv2__panel-title">📷 {t("qrScannerTitle")}</span>
                        <span className={`satnv2__scan-status-badge ${scanning ? "satnv2__scan-status-badge--active" : ""}`}>
                            {scanning ? `● ${t("scanning")}` : `○ ${t("idle")}`}
                        </span>
                    </div>

                    <div className={`satnv2__camera-wrap ${pulseActive ? "satnv2__camera-wrap--pulse" : ""}`}>
                        <video ref={videoRef} className="satnv2__video" playsInline muted />
                        <canvas ref={canvasRef} className="satnv2__canvas" />

                        {!scanning && (
                            <div className="satnv2__camera-placeholder">
                                <div className="satnv2__camera-icon">📷</div>
                                <p>{t("cameraOff")}</p>
                                <span>{t("clickToStartScanner")}</span>
                            </div>
                        )}

                        {scanning && (
                            <div className="satnv2__scan-overlay">
                                <div className="satnv2__scan-frame">
                                    <span className="satnv2__scan-corner satnv2__scan-corner--tl" />
                                    <span className="satnv2__scan-corner satnv2__scan-corner--tr" />
                                    <span className="satnv2__scan-corner satnv2__scan-corner--bl" />
                                    <span className="satnv2__scan-corner satnv2__scan-corner--br" />
                                    <div className="satnv2__scan-line" />
                                </div>
                                <p className="satnv2__scan-hint">{t("pointCameraAtQR")}</p>
                            </div>
                        )}

                        {cameraError && (
                            <div className="satnv2__camera-error">
                                <span>⚠️</span>
                                <p>{cameraError}</p>
                            </div>
                        )}
                    </div>

                    <div className="satnv2__camera-controls">
                        {!scanning ? (
                            <button className="satnv2__btn satnv2__btn--start" onClick={startCamera}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                {t("startScanner")}
                            </button>
                        ) : (
                            <button className="satnv2__btn satnv2__btn--stop" onClick={stopCamera}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                                </svg>
                                {t("stopScanner")}
                            </button>
                        )}
                        <button className="satnv2__btn satnv2__btn--refresh" onClick={() => { fetchStats(); fetchRecentScans(); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                            {t("refresh")}
                        </button>
                    </div>

                    <div className="satnv2__manual">
                        <p className="satnv2__manual-label">{t("manualIdEntry")}</p>
                        <form className="satnv2__manual-form" onSubmit={handleManualScan}>
                            <input
                                className="satnv2__manual-input"
                                name="manualId"
                                type="text"
                                placeholder={t("enterUserIdPlaceholder")}
                                maxLength={10}
                            />
                            <button className="satnv2__btn satnv2__btn--mark" type="submit">
                                {t("mark")}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="satnv2__right-panel">

                    <div className={`satnv2__user-card ${scanStatus ? `satnv2__user-card--${scanStatus}` : ""}`}>
                        <div className="satnv2__user-card-header">
                            <span className="satnv2__user-card-title">{t("lastScanResult")}</span>
                            {scanStatus && (
                                <span className={`satnv2__result-badge satnv2__result-badge--${scanStatus}`}>
                                    {scanStatus === "success" ? `✅ ${t("marked")}` : scanStatus === "already" ? `⚠️ ${t("duplicate")}` : `❌ ${t("notFound")}`}
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
                                            ⏰ {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    )}
                                </div>
                                <div className={`satnv2__user-status-icon satnv2__user-status-icon--${scanStatus}`}>
                                    {scanStatus === "success" ? "✓" : scanStatus === "already" ? "!" : "✕"}
                                </div>
                            </div>
                        ) : (
                            <div className="satnv2__user-empty">
                                <div className="satnv2__user-empty-icon">🎯</div>
                                <p>{t("scanQRToSeeDetails")}</p>
                            </div>
                        )}
                    </div>

                    <div className="satnv2__progress-card">
                        <span className="satnv2__progress-title">{t("todaysProgress")}</span>
                        <div className="satnv2__progress-ring-wrap">
                            <svg className="satnv2__progress-svg" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth="10" />
                                <circle
                                    cx="60" cy="60" r="50"
                                    fill="none"
                                    stroke="url(#satnv2ProgressGrad)"
                                    strokeWidth="10"
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
                    </div>

                    <div className="satnv2__activity">
                        <div className="satnv2__activity-header">
                            <span className="satnv2__activity-title">🕐 {t("recentScans")}</span>
                            <span className="satnv2__activity-count">{recentScans.length} {t("records")}</span>
                        </div>
                        <div className="satnv2__activity-list">
                            {recentScans.length === 0 ? (
                                <div className="satnv2__activity-empty">
                                    <span>📋</span>
                                    <p>{t("noScansYet")}</p>
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
                                                {scan.status}
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