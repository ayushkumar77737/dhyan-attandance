import React, { useState, useEffect, useRef } from "react";
import "./SmartAttendance.css";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { collection, getDocs, addDoc, serverTimestamp, query, where, orderBy, limit } from "firebase/firestore";

function SmartAttendance() {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const scanIntervalRef = useRef(null);
    const lastScannedRef = useRef(null);
    const scanCooldownRef = useRef(false);

    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [scannedUser, setScannedUser] = useState(null);
    const [scanStatus, setScanStatus] = useState(null); // 'success' | 'error' | 'already'
    const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, percentage: 0 });
    const [recentScans, setRecentScans] = useState([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [cameraError, setCameraError] = useState(null);
    const [toast, setToast] = useState(null);
    const [pulseActive, setPulseActive] = useState(false);

    useEffect(() => {
        const disableRightClick = (e) => e.preventDefault();
        const disableInspectKeys = (e) => {
            if (e.key === "F12") e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) e.preventDefault();
            if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
        };
        document.addEventListener("contextmenu", disableRightClick);
        document.addEventListener("keydown", disableInspectKeys);
        fetchStats();
        fetchRecentScans();
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
            usersSnap.forEach(d => { if (d.data().deleted !== true) totalUsers++; });

            const attSnap = await getDocs(collection(db, "smartAttendance"));
            let present = 0;
            attSnap.forEach(d => {
                const data = d.data();
                if (data.date === today && data.status === "Present") {
                    present++;
                }
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
            setCameraError("Camera access denied. Please allow camera permission.");
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

            // Find user
            const userSnap = await getDocs(query(collection(db, "users"), where("id", "==", userId.toUpperCase())));
            if (userSnap.empty) {
                setScanStatus("error");
                setScannedUser(null);
                showToast("❌ User not found for ID: " + userId, "error");
                return;
            }
            const userData = userSnap.docs[0].data();

            // Check if already marked today
            const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const existingSnap = await getDocs(query(
                collection(db, "smartAttendance"),
                where("userId", "==", userId.toUpperCase()),
                where("date", "==", today)
            ));

            if (!existingSnap.empty) {
                setScanStatus("already");
                setScannedUser(userData);
                showToast("⚠️ Already marked for today", "already");
                return;
            }

            // Mark attendance
            await addDoc(collection(db, "smartAttendance"), {
                userId: userId.toUpperCase(),
                userName: userData.name || userId,
                date: today,
                status: "Present",
                scannedAt: serverTimestamp(),
            });

            setScanStatus("success");
            setScannedUser(userData);
            showToast(`✅ ${userData.name || userId} marked Present!`, "success");
            fetchStats();
            fetchRecentScans();

        } catch (err) {
            console.error(err);
            setScanStatus("error");
            showToast("❌ Error marking attendance", "error");
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
        <div className="smat__page">
            {/* Background effects */}
            <div className="smat__bg-grid" />
            <div className="smat__orb smat__orb--1" />
            <div className="smat__orb smat__orb--2" />
            <div className="smat__orb smat__orb--3" />

            {/* Toast */}
            {toast && (
                <div className={`smat__toast smat__toast--${toast.type}`}>
                    <span className="smat__toast-dot" />
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="smat__header">
                <button className="smat__back-btn" onClick={() => navigate("/admin-dashboard")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back
                </button>
                <div className="smat__header-center">
                    <div className="smat__eyebrow">
                        <span className="smat__eyebrow-dot" />
                        Smart Attendance
                    </div>
                    <h1 className="smat__title">QR <span className="smat__title-accent">Scanner</span></h1>
                    <p className="smat__date">{today}</p>
                </div>
                <div className="smat__header-right">
                    <div className="smat__live-badge">
                        <span className="smat__live-dot" />
                        LIVE
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="smat__stats">
                <div className="smat__stat smat__stat--total">
                    <div className="smat__stat-icon">👥</div>
                    <div className="smat__stat-body">
                        <span className="smat__stat-num">{loadingStats ? "—" : stats.total}</span>
                        <span className="smat__stat-label">Total Users</span>
                    </div>
                    <div className="smat__stat-glow" style={{ background: "#3b82f6" }} />
                </div>
                <div className="smat__stat smat__stat--present">
                    <div className="smat__stat-icon">✅</div>
                    <div className="smat__stat-body">
                        <span className="smat__stat-num">{loadingStats ? "—" : stats.present}</span>
                        <span className="smat__stat-label">Present Today</span>
                    </div>
                    <div className="smat__stat-glow" style={{ background: "#22c55e" }} />
                </div>
                <div className="smat__stat smat__stat--absent">
                    <div className="smat__stat-icon">❌</div>
                    <div className="smat__stat-body">
                        <span className="smat__stat-num">{loadingStats ? "—" : stats.absent}</span>
                        <span className="smat__stat-label">Absent</span>
                    </div>
                    <div className="smat__stat-glow" style={{ background: "#ef4444" }} />
                </div>
                <div className="smat__stat smat__stat--pct">
                    <div className="smat__stat-icon">📊</div>
                    <div className="smat__stat-body">
                        <span className="smat__stat-num">{loadingStats ? "—" : `${stats.percentage}%`}</span>
                        <span className="smat__stat-label">Attendance Rate</span>
                    </div>
                    <div className="smat__stat-progress">
                        <div className="smat__stat-progress-fill" style={{ width: `${stats.percentage}%` }} />
                    </div>
                    <div className="smat__stat-glow" style={{ background: "#f59e0b" }} />
                </div>
            </div>

            {/* Main Content */}
            <div className="smat__main">

                {/* LEFT — Scanner */}
                <div className="smat__scanner-panel">
                    <div className="smat__panel-header">
                        <span className="smat__panel-title">📷 QR Scanner</span>
                        <span className={`smat__scan-status-badge ${scanning ? "smat__scan-status-badge--active" : ""}`}>
                            {scanning ? "● Scanning" : "○ Idle"}
                        </span>
                    </div>

                    {/* Camera View */}
                    <div className={`smat__camera-wrap ${pulseActive ? "smat__camera-wrap--pulse" : ""}`}>
                        <video ref={videoRef} className="smat__video" playsInline muted />
                        <canvas ref={canvasRef} className="smat__canvas" />

                        {!scanning && (
                            <div className="smat__camera-placeholder">
                                <div className="smat__camera-icon">📷</div>
                                <p>Camera is off</p>
                                <span>Click Start Scanner to begin</span>
                            </div>
                        )}

                        {/* Scanner overlay */}
                        {scanning && (
                            <div className="smat__scan-overlay">
                                <div className="smat__scan-frame">
                                    <span className="smat__scan-corner smat__scan-corner--tl" />
                                    <span className="smat__scan-corner smat__scan-corner--tr" />
                                    <span className="smat__scan-corner smat__scan-corner--bl" />
                                    <span className="smat__scan-corner smat__scan-corner--br" />
                                    <div className="smat__scan-line" />
                                </div>
                                <p className="smat__scan-hint">Point camera at QR code</p>
                            </div>
                        )}

                        {cameraError && (
                            <div className="smat__camera-error">
                                <span>⚠️</span>
                                <p>{cameraError}</p>
                            </div>
                        )}
                    </div>

                    {/* Camera Controls */}
                    <div className="smat__camera-controls">
                        {!scanning ? (
                            <button className="smat__btn smat__btn--start" onClick={startCamera}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                Start Scanner
                            </button>
                        ) : (
                            <button className="smat__btn smat__btn--stop" onClick={stopCamera}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                                </svg>
                                Stop Scanner
                            </button>
                        )}
                        <button className="smat__btn smat__btn--refresh" onClick={() => { fetchStats(); fetchRecentScans(); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                            Refresh
                        </button>
                    </div>

                    {/* Manual Entry */}
                    <div className="smat__manual">
                        <p className="smat__manual-label">Manual ID Entry</p>
                        <form className="smat__manual-form" onSubmit={handleManualScan}>
                            <input
                                className="smat__manual-input"
                                name="manualId"
                                type="text"
                                placeholder="Enter User ID (e.g. A101)"
                                maxLength={10}
                            />
                            <button className="smat__btn smat__btn--mark" type="submit">
                                Mark
                            </button>
                        </form>
                    </div>
                </div>

                {/* RIGHT — User Card + Activity */}
                <div className="smat__right-panel">

                    {/* Scanned User Card */}
                    <div className={`smat__user-card ${scanStatus ? `smat__user-card--${scanStatus}` : ""}`}>
                        <div className="smat__user-card-header">
                            <span className="smat__user-card-title">Last Scan Result</span>
                            {scanStatus && (
                                <span className={`smat__result-badge smat__result-badge--${scanStatus}`}>
                                    {scanStatus === "success" ? "✅ Marked" : scanStatus === "already" ? "⚠️ Duplicate" : "❌ Not Found"}
                                </span>
                            )}
                        </div>

                        {scannedUser ? (
                            <div className="smat__user-info">
                                <div className="smat__user-avatar">
                                    {(scannedUser.name || "U").charAt(0).toUpperCase()}
                                </div>
                                <div className="smat__user-details">
                                    <span className="smat__user-name">{scannedUser.name || "Unknown"}</span>
                                    <span className="smat__user-id">ID: {scannedUser.id || scanResult}</span>
                                    {scanStatus === "success" && (
                                        <span className="smat__user-time">
                                            ⏰ {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    )}
                                </div>
                                <div className={`smat__user-status-icon smat__user-status-icon--${scanStatus}`}>
                                    {scanStatus === "success" ? "✓" : scanStatus === "already" ? "!" : "✕"}
                                </div>
                            </div>
                        ) : (
                            <div className="smat__user-empty">
                                <div className="smat__user-empty-icon">🎯</div>
                                <p>Scan a QR code to see user details</p>
                            </div>
                        )}
                    </div>

                    {/* Progress Ring */}
                    <div className="smat__progress-card">
                        <span className="smat__progress-title">Today's Progress</span>
                        <div className="smat__progress-ring-wrap">
                            <svg className="smat__progress-svg" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth="10" />
                                <circle
                                    cx="60" cy="60" r="50"
                                    fill="none"
                                    stroke="url(#progressGrad)"
                                    strokeWidth="10"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 50}`}
                                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - stats.percentage / 100)}`}
                                    transform="rotate(-90 60 60)"
                                    style={{ transition: "stroke-dashoffset 1s ease" }}
                                />
                                <defs>
                                    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#22c55e" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="smat__progress-center">
                                <span className="smat__progress-pct">{stats.percentage}%</span>
                                <span className="smat__progress-sub">{stats.present}/{stats.total}</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Scans */}
                    <div className="smat__activity">
                        <div className="smat__activity-header">
                            <span className="smat__activity-title">🕐 Recent Scans</span>
                            <span className="smat__activity-count">{recentScans.length} records</span>
                        </div>
                        <div className="smat__activity-list">
                            {recentScans.length === 0 ? (
                                <div className="smat__activity-empty">
                                    <span>📋</span>
                                    <p>No scans yet today</p>
                                </div>
                            ) : (
                                recentScans.map((scan, i) => (
                                    <div key={scan.id} className="smat__activity-row" style={{ animationDelay: `${i * 40}ms` }}>
                                        <div className="smat__activity-avatar">
                                            {(scan.userName || "U").charAt(0).toUpperCase()}
                                        </div>
                                        <div className="smat__activity-info">
                                            <span className="smat__activity-name">{scan.userName}</span>
                                            <span className="smat__activity-id">{scan.userId}</span>
                                        </div>
                                        <div className="smat__activity-right">
                                            <span className={`smat__activity-badge smat__activity-badge--${scan.status?.toLowerCase()}`}>
                                                {scan.status}
                                            </span>
                                            <span className="smat__activity-time">{formatTime(scan.scannedAt)}</span>
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