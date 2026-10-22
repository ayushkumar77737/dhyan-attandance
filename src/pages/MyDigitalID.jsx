import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, getDoc, query, where, limit } from "firebase/firestore";
import QRCode from "qrcode";
import { useTranslation } from "react-i18next";
import { auth, db } from "../firebase/firebase";
import logo from "../assets/logo2.png";
import "./MyDigitalID.css";

/* ------------------------------------------------------------------ */
/* My Digital ID                                                       */
/*  Photo ............ profiles/{id}.profileImage                      */
/*  Name ............. profiles/{id}.name -> users/{id}.name           */
/*  User ID .......... users doc id (same value ShowQR encodes)        */
/*  Registration date  users/{id}.createdAt -> profiles/{id}.createdAt */
/*                     -> Firebase Auth account creation time          */
/*  ID status ........ users.disabled -> "disabled"                    */
/*                     no profiles doc -> "pending"                    */
/*                     otherwise       -> "active"                     */
/* ------------------------------------------------------------------ */

const toDate = (v) => {
    if (!v) return null;
    if (typeof v?.toDate === "function") return v.toDate();
    if (typeof v === "object" && v.seconds) return new Date(v.seconds * 1000);
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

const loadImg = (src) =>
    new Promise((resolve) => {
        if (!src) return resolve(null);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });

const STATUS_COLORS = {
    active: { fg: "#34d399", bg: "rgba(16,185,129,0.16)" },
    pending: { fg: "#fbbf24", bg: "rgba(245,158,11,0.16)" },
    disabled: { fg: "#f87171", bg: "rgba(239,68,68,0.16)" },
};

const Icon = {
    back: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
    ),
    calendar: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
    ),
    shield: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
    ),
    verified: (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#38bdf8" d="M12 1l2.6 2.2 3.4-.4.9 3.3 3 1.7-1.2 3.2 1.2 3.2-3 1.7-.9 3.3-3.4-.4L12 23l-2.6-2.2-3.4.4-.9-3.3-3-1.7L3.3 13 2.1 9.8l3-1.7.9-3.3 3.4.4z" /><path fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M7.5 12.2l3 3 6-6" /></svg>
    ),
    copy: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
    ),
    download: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
    ),
};

function MyDigitalID() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const qrRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState("");
    const [name, setName] = useState("");
    const [photo, setPhoto] = useState("");
    const [photoOk, setPhotoOk] = useState(true);
    const [regDate, setRegDate] = useState(null);
    const [status, setStatus] = useState("active");
    const [qrReady, setQrReady] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (authUser) => {
            if (!authUser) { navigate("/"); return; }
            try {
                const res = await getDocs(
                    query(collection(db, "users"), where("uid", "==", authUser.uid), limit(1))
                );
                if (res.empty) { navigate("/"); return; }

                const snap = res.docs[0];
                const u = snap.data();
                if (u.role === "admin") { navigate("/admin-dashboard"); return; }

                const id = snap.id;
                let p = null;
                try {
                    const ps = await getDoc(doc(db, "profiles", String(id).toUpperCase()));
                    if (ps.exists()) p = ps.data();
                } catch (e) {
                    console.warn("MyDigitalID: profile lookup failed", e);
                }

                setUserId(id);
                setName(p?.name || u.name || id);
                setPhoto(p?.profileImage || u.profileImage || u.photoURL || "");
                setRegDate(
                    toDate(u.createdAt) || toDate(p?.createdAt) || toDate(authUser.metadata?.creationTime)
                );
                setStatus(u.disabled === true ? "disabled" : p ? "active" : "pending");
            } catch (err) {
                console.error("MyDigitalID:", err);
            } finally {
                setLoading(false);
            }
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!userId || !qrRef.current) return;
        QRCode.toCanvas(qrRef.current, userId, {
            width: 180,
            margin: 1,
            errorCorrectionLevel: "H",
            color: { dark: "#0a0f1e", light: "#ffffff" },
        })
            .then(() => setQrReady(true))
            .catch(console.error);
    }, [userId, loading]);

    const locale = i18n.resolvedLanguage || i18n.language || "en";
    const latinAttr = locale.startsWith("en") ? "" : undefined;
    const regDateText = regDate
        ? regDate.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
        : "—";
    const statusText = {
        active: t("mdidStatusActive", "Active"),
        pending: t("mdidStatusPending", "Pending"),
        disabled: t("mdidStatusDisabled", "Disabled"),
    }[status];
    const initials = (name || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2);

    const goBack = () => navigate("/user-dashboard");

    const handleCopy = () => {
        if (!userId) return;
        navigator.clipboard?.writeText(userId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        }).catch(console.error);
    };

    /* ---------- draw the card to a PNG (portrait badge, 2x scale) ---------- */
    const handleDownload = async () => {
        if (!qrReady || downloading) return;
        setDownloading(true);
        try {
            const W = 720, H = 1140;
            const c = document.createElement("canvas");
            c.width = W; c.height = H;
            const g = c.getContext("2d");
            const center = (txt, y, font, color) => {
                g.font = font; g.fillStyle = color; g.textAlign = "center"; g.fillText(txt, W / 2, y);
            };

            // card body
            g.fillStyle = "#0f172a";
            g.beginPath(); g.roundRect(0, 0, W, H, 40); g.fill();

            // header band
            const hb = g.createLinearGradient(0, 0, W, 300);
            hb.addColorStop(0, "#6d28d9"); hb.addColorStop(0.5, "#4338ca"); hb.addColorStop(1, "#7c3aed");
            g.save(); g.beginPath(); g.roundRect(0, 0, W, 300, [40, 40, 0, 0]); g.clip();
            g.fillStyle = hb; g.fillRect(0, 0, W, 300);
            g.restore();
            g.fillStyle = "#f59e0b"; g.fillRect(0, 296, W, 6);

            // gradient edge, matching the on-screen card border
            const edge = g.createLinearGradient(0, 0, W, H);
            edge.addColorStop(0, "rgba(167,139,250,0.9)");
            edge.addColorStop(0.5, "rgba(245,158,11,0.6)");
            edge.addColorStop(1, "rgba(99,102,241,0.9)");
            g.strokeStyle = edge; g.lineWidth = 4;
            g.beginPath(); g.roundRect(2, 2, W - 4, H - 4, 38); g.stroke();

            const [logoImg, photoImg] = await Promise.all([loadImg(logo), loadImg(photo)]);
            if (logoImg) g.drawImage(logoImg, W / 2 - 34, 34, 68, 68);
            center(t("mdidOrgLine", "Jai Gurubande • Dhyan Portal"), 140, "600 28px system-ui, sans-serif", "#fde68a");
            center(t("mdidCardTitle", "Member Identity Card").toUpperCase(), 178, "600 20px system-ui, sans-serif", "#e0e7ff");

            // photo (circle overlapping the band) with gold ring
            const cx = W / 2, cy = 310, r = 110;
            const ring = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
            ring.addColorStop(0, "#f59e0b"); ring.addColorStop(0.5, "#8b5cf6"); ring.addColorStop(1, "#6366f1");
            g.beginPath(); g.arc(cx, cy, r + 12, 0, Math.PI * 2); g.fillStyle = ring; g.fill();
            g.beginPath(); g.arc(cx, cy, r + 5, 0, Math.PI * 2); g.fillStyle = "#0f172a"; g.fill();
            g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
            if (photoImg) {
                const s = Math.max((r * 2) / photoImg.width, (r * 2) / photoImg.height);
                g.drawImage(photoImg, cx - (photoImg.width * s) / 2, cy - (photoImg.height * s) / 2, photoImg.width * s, photoImg.height * s);
            } else {
                g.fillStyle = "#4c1d95"; g.fillRect(cx - r, cy - r, r * 2, r * 2);
                center(initials, cy + 30, "700 84px system-ui, sans-serif", "#ede9fe");
            }
            g.restore();

            center(name.slice(0, 28), 480, "700 40px system-ui, sans-serif", "#ffffff");
            center(userId, 528, "600 30px ui-monospace, Menlo, monospace", "#fde68a");

            // info rows
            const rows = [
                [t("mdidRegDate", "Registration Date"), regDateText],
                [t("mdidStatus", "ID Status"), statusText],
            ];
            rows.forEach(([label, val], i) => {
                const y = 600 + i * 72;
                g.fillStyle = "rgba(255,255,255,0.05)";
                g.beginPath(); g.roundRect(60, y - 40, W - 120, 60, 14); g.fill();
                g.textAlign = "left"; g.font = "500 22px system-ui, sans-serif"; g.fillStyle = "#94a3b8";
                g.fillText(label, 84, y);
                g.textAlign = "right"; g.font = "700 24px system-ui, sans-serif";
                g.fillStyle = i === 1 ? STATUS_COLORS[status].fg : "#ffffff";
                g.fillText(val, W - 84, y);
            });

            // QR
            g.fillStyle = "#ffffff";
            g.beginPath(); g.roundRect(W / 2 - 150, 760, 300, 300, 20); g.fill();
            g.drawImage(qrRef.current, W / 2 - 135, 775, 270, 270);
            center(t("mdidScanHint", "Scan this QR to mark attendance"), 1100, "500 20px system-ui, sans-serif", "#94a3b8");

            const a = document.createElement("a");
            a.download = `${userId}-Digital-ID.png`;
            a.href = c.toDataURL("image/png");
            a.click();
        } catch (err) {
            console.error("Digital ID download failed:", err);
        } finally {
            setTimeout(() => setDownloading(false), 800);
        }
    };

    const topBar = (
        <nav className="mdid__topbar">
            <button className="mdid__back" onClick={goBack}>
                {Icon.back}
                {t("back", "Back")}
            </button>
        </nav>
    );

    if (loading) {
        return (
            <div className="mdid" data-latin={latinAttr}>
                {topBar}
                <div className="mdid__loading"><span className="mdid__spinner" />{t("loading", "Loading...")}</div>
            </div>
        );
    }

    const sc = STATUS_COLORS[status];

    return (
        <div className="mdid" data-latin={latinAttr}>
            {topBar}

            <header className="mdid__head">
                <span className="mdid__eyebrow">{t("mdidEyebrow", "Official Member Pass")}</span>
                <h1 className="mdid__title">{t("myDigitalId", "My Digital ID")}</h1>
                <p className="mdid__sub">{t("mdidSub", "Your member identity card. Show it at the venue or download a copy.")}</p>
            </header>

            {status === "pending" && (
                <div className="mdid__notice">{t("mdidPendingNote", "Your profile is not registered yet. Please contact the admin to complete it.")}</div>
            )}
            {status === "disabled" && (
                <div className="mdid__notice mdid__notice--error">{t("mdidDisabledNote", "This ID is disabled. Please contact the admin.")}</div>
            )}

            <article className="mdid__card" aria-label={t("mdidCardTitle", "Member Identity Card")}>
                <div className="mdid__band">
                    <span className="mdid__slot" aria-hidden="true" />
                    <span className="mdid__chip" aria-hidden="true" />
                    <img src={logo} alt="" className="mdid__logo" />
                    <div className="mdid__org">{t("mdidOrgLine", "Jai Gurubande • Dhyan Portal")}</div>
                    <div className="mdid__card-title">{t("mdidCardTitle", "Member Identity Card")}</div>
                </div>

                <div className="mdid__photo-wrap">
                    <div className="mdid__photo">
                        {photo && photoOk
                            ? <img src={photo} alt={name} onError={() => setPhotoOk(false)} />
                            : <span className="mdid__initials">{initials}</span>}
                    </div>
                </div>

                <div className="mdid__identity">
                    <h2 className="mdid__name">
                        {name}
                        {status === "active" && <span className="mdid__verified" title={t("mdidVerified", "Verified")}>{Icon.verified}</span>}
                    </h2>
                    <button className="mdid__id" onClick={handleCopy} title={t("mdidCopyId", "Copy ID")}>
                        <span className="mdid__id-label">{t("mdidUserId", "User ID")}</span>
                        <span className="mdid__id-val">{userId}</span>
                        <span className="mdid__id-copy">{copied ? "✓" : Icon.copy}</span>
                    </button>
                    {copied && <span className="mdid__copied">{t("mdidCopied", "ID copied")}</span>}
                </div>

                <dl className="mdid__rows">
                    <div className="mdid__row">
                        <dt><span className="mdid__row-icon">{Icon.calendar}</span>{t("mdidRegDate", "Registration Date")}</dt>
                        <dd>{regDateText}</dd>
                    </div>
                    <div className="mdid__row">
                        <dt><span className="mdid__row-icon">{Icon.shield}</span>{t("mdidStatus", "ID Status")}</dt>
                        <dd>
                            <span className="mdid__status" style={{ color: sc.fg, background: sc.bg }}>
                                <span className="mdid__status-dot" style={{ background: sc.fg }} />
                                {statusText}
                            </span>
                        </dd>
                    </div>
                </dl>

                <div className="mdid__divider" aria-hidden="true" />

                <div className="mdid__qr">
                    <div className="mdid__qr-box">
                        <span className="mdid__qr-corner mdid__qr-corner--tl" />
                        <span className="mdid__qr-corner mdid__qr-corner--tr" />
                        <span className="mdid__qr-corner mdid__qr-corner--bl" />
                        <span className="mdid__qr-corner mdid__qr-corner--br" />
                        <canvas ref={qrRef} />
                        {!qrReady && <span className="mdid__spinner" />}
                    </div>
                    <span className="mdid__qr-hint">{t("mdidScanHint", "Scan this QR to mark attendance")}</span>
                </div>
            </article>

            <div className="mdid__actions">
                <button className="mdid__btn mdid__btn--primary" onClick={handleDownload} disabled={!qrReady || downloading}>
                    {Icon.download}
                    {downloading ? t("mdidDownloading", "Downloading...") : t("mdidDownload", "Download ID Card")}
                </button>
            </div>
        </div>
    );
}

export default MyDigitalID;