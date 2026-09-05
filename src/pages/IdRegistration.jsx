import React, { useEffect, useState } from "react";
import "./IdRegistration.css";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { logAdminAction } from "../utils/logAdminAction";
import qrImage from "../assets/scanner.jpg";

/* Token: 4 chars, unique, mix of letters + digits. */
const LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const ALL = LETTERS + DIGITS;

const makeToken = () => {
    const pick = (s) => s[Math.floor(Math.random() * s.length)];
    const chars = [pick(LETTERS), pick(DIGITS), pick(ALL), pick(ALL)];
    for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
};

const generateUniqueToken = async () => {
    for (let attempt = 0; attempt < 15; attempt++) {
        const token = makeToken();
        const snap = await getDocs(
            query(collection(db, "idRegistrations"), where("token", "==", token))
        );
        if (snap.empty) return token;
    }
    throw new Error("Could not generate a unique token");
};

const PEOPLE_OPTIONS = [1, 2, 3, 4, 5];

/* ---------------------------------------------------------------- */
/* Icons                                                             */
/* ---------------------------------------------------------------- */
const I = {
    back: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>),
    idCard: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M13 12h5" /><path d="M13 16h3" /></svg>),
    card: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5" /><line x1="2" y1="10" x2="22" y2="10" /><line x1="6" y1="15" x2="10" y2="15" /></svg>),
    cash: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 12h.01M18 12h.01" /></svg>),
    arrow: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>),
    phone: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.6" /><path d="M10.5 18.5h3" /></svg>),
    receipt: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2.8h12v18.4l-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6L6 21.2V2.8Z" /><path d="M9.4 8h5.2M9.4 12h5.2" /></svg>),
    users: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
    shield: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4.2" /></svg>),
    check: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>),
    alert: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2v.1" /></svg>),
    send: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>),
    ticket: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /></svg>),
    plus: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>),
    home: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>),
    download: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>),
    lotus: (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4c1.3 1.5 2 3.1 2 4.7 0 .8-.2 1.6-.6 2.4.7-.4 1.3-1 1.9-1.9.3 1.4.1 2.7-.6 3.9 1-.3 1.9-.8 2.8-1.6-.1 2.2-1.5 4-3.6 5.1-.6.4-1.2.6-1.9.8-.7-.2-1.3-.4-1.9-.8C8 15.4 6.6 13.6 6.5 11.4c.9.8 1.8 1.3 2.8 1.6-.7-1.2-.9-2.5-.6-3.9.6.9 1.2 1.5 1.9 1.9-.4-.8-.6-1.6-.6-2.4C10 7.1 10.7 5.5 12 4z" /></svg>),
};

/* Decorative floating ID-card illustration (top-right, like mockup) */
function IdCardArt() {
    return (
        <svg className="idrg__art" viewBox="0 0 200 160" fill="none" aria-hidden="true">
            <g className="idrg__art-card">
                <rect x="30" y="40" width="140" height="92" rx="12" fill="#ffffff" />
                <rect x="30" y="40" width="140" height="92" rx="12" stroke="#e2e8f0" strokeWidth="1.5" />
                <rect x="88" y="26" width="24" height="26" rx="6" fill="#3b82f6" />
                <rect x="44" y="62" width="42" height="42" rx="10" fill="#dbeafe" />
                <circle cx="65" cy="76" r="7" fill="#3b82f6" />
                <path d="M52 100c2-8 8-12 13-12s11 4 13 12" fill="#3b82f6" />
                <rect x="96" y="64" width="58" height="9" rx="4.5" fill="#93c5fd" />
                <rect x="96" y="80" width="44" height="8" rx="4" fill="#e2e8f0" />
                <rect x="96" y="94" width="50" height="8" rx="4" fill="#e2e8f0" />
            </g>
            <circle className="idrg__art-badge" cx="158" cy="118" r="24" fill="#2dd4a8" />
            <path d="M147 118l7 7 15-15" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path className="idrg__art-spark" d="M36 22l6 8M50 14l2 10M24 34l9 4" stroke="#2dd4a8" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

function IdRegistration() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const [mode, setMode] = useState("");
    const [mobile, setMobile] = useState("");
    const [utr, setUtr] = useState("");
    const [people, setPeople] = useState(1);
    const [utrVerified, setUtrVerified] = useState("no");
    const [cashCollected, setCashCollected] = useState("no");

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [token, setToken] = useState("");
    const [toast, setToast] = useState(null);

    /* ---------- admin guard ---------- */
    useEffect(() => {
        const disableRightClick = (e) => e.preventDefault();
        const disableInspectKeys = (e) => {
            if (e.key === "F12") e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) e.preventDefault();
            if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
        };
        document.addEventListener("contextmenu", disableRightClick);
        document.addEventListener("keydown", disableInspectKeys);

        (async () => {
            const currentUser = auth.currentUser;
            const userId = localStorage.getItem("userId");
            if (!currentUser || !userId) { navigate("/"); return; }
            try {
                const snap = await getDoc(doc(db, "users", userId));
                if (!snap.exists() || snap.data().role !== "admin" || snap.data().uid !== currentUser.uid) {
                    navigate("/");
                }
            } catch (e) {
                console.error(e);
                navigate("/");
            }
        })();

        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const onMobile = (e) => {
        setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
        if (errors.mobile) setErrors((p) => ({ ...p, mobile: "" }));
    };

    /* UTR input — digits only + live duplicate check at 12 digits */
    const onUtr = async (e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 12);
        setUtr(v);
        if (errors.utr) setErrors((p) => ({ ...p, utr: "" }));

        if (v.length === 12) {
            try {
                const dupSnap = await getDocs(
                    query(collection(db, "idRegistrations"), where("utrNumber", "==", v))
                );
                if (!dupSnap.empty) {
                    setErrors((p) => ({
                        ...p,
                        utr: t("irUtrExists", "This UTR reference number already exists."),
                    }));
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const pickMode = (m) => {
        setMode(m);
        setErrors({});
    };

    const resetForm = () => {
        setMode("");
        setMobile("");
        setUtr("");
        setPeople(1);
        setUtrVerified("no");
        setCashCollected("no");
        setErrors({});
        setToken("");
    };

    const validate = () => {
        const e = {};
        if (!/^[6-9]\d{9}$/.test(mobile))
            e.mobile = t("irMobileInvalid", "Enter a valid 10-digit mobile number.");
        if (mode === "online" && !/^\d{12}$/.test(utr))
            e.utr = t("irUtrInvalid", "UTR reference must be exactly 12 digits.");
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        if (submitting || token) return;
        if (!validate()) return;

        setSubmitting(true);
        try {
            /* ---- duplicate UTR check (online mode only) ---- */
            if (mode === "online") {
                const dupSnap = await getDocs(
                    query(collection(db, "idRegistrations"), where("utrNumber", "==", utr))
                );
                if (!dupSnap.empty) {
                    setErrors((p) => ({
                        ...p,
                        utr: t("irUtrExists", "This UTR reference number already exists."),
                    }));
                    showToast(t("irUtrExists", "This UTR reference number already exists."), "error");
                    setSubmitting(false);
                    return;
                }
            }

            const newToken = await generateUniqueToken();

            const data = {
                token: newToken,
                mode,
                mobileNumber: mobile,
                numberOfPeople: people,
                createdAt: serverTimestamp(),
                createdBy: (localStorage.getItem("userId") || "").toUpperCase(),
            };
            if (mode === "online") {
                data.utrNumber = utr;
                data.utrVerified = utrVerified === "yes";
            } else {
                data.cashCollected = cashCollected === "yes";
            }

            await addDoc(collection(db, "idRegistrations"), data);
            await logAdminAction("id_registration", {
                targetId: newToken,
                details: `${mode} registration · +91 ${mobile} · token ${newToken}`,
            });

            setToken(newToken);
            showToast(t("irSuccess", "Registration saved!"));
        } catch (err) {
            console.error(err);
            showToast(t("irFailed", "Couldn't save. Please try again."), "error");
        } finally {
            setSubmitting(false);
        }
    };

    /* ---------- export all registrations as CSV ---------- */
    const handleExport = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            const snap = await getDocs(collection(db, "idRegistrations"));
            if (snap.empty) {
                showToast(t("icNothingToExport", "No data to export."), "error");
                return;
            }

            const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
            const yn = (v) => (v === true ? "Yes" : v === false ? "No" : "");
            const fmtDate = (ts) => {
                if (!ts) return "—";
                const d = ts.toDate ? ts.toDate() : new Date(ts);
                return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
            };

            const header = [
                "Token", "Mode", "Mobile Number", "UTR Number", "UTR Verified",
                "Cash Collected", "No. of People", "Registered On", "Registered By",
                "Verified", "Create ID Status", "Verified By", "Verified On",
                "ID Created", "Created By", "ID Created On",
            ];

            const rows = snap.docs.map((d) => {
                const r = d.data();
                return [
                    r.token, r.mode, r.mobileNumber, r.utrNumber || "",
                    r.mode === "online" ? yn(r.utrVerified) : "",
                    r.mode === "offline" ? yn(r.cashCollected) : "",
                    r.numberOfPeople,
                    fmtDate(r.createdAt), r.createdBy || "",
                    r.verifiedAt ? "Yes" : "No",
                    r.verifiedAt ? yn(r.createIdStatus) : "",
                    r.verifiedBy || "", r.verifiedAt ? fmtDate(r.verifiedAt) : "",
                    yn(r.idCreated) || "No",
                    r.idCreatedBy || "", r.idCreatedAt ? fmtDate(r.idCreatedAt) : "",
                ].map(esc).join(",");
            });

            const csv = [header.map(esc).join(","), ...rows].join("\n");
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `id-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            await logAdminAction("id_registrations_exported", {
                details: `Exported ${snap.size} ID registration(s) to CSV`,
            });
            showToast(t("icExported", "Data exported successfully!"));
        } catch (err) {
            console.error(err);
            showToast(t("icExportFailed", "Couldn't export. Try again."), "error");
        } finally {
            setExporting(false);
        }
    };

    /* ================================================================ */
    return (
        <div className="idrg__page" data-theme={theme}>

            {/* ---------- decorative background ---------- */}
            <div className="idrg__blob idrg__blob--a" />
            <div className="idrg__blob idrg__blob--b" />
            <div className="idrg__blob idrg__blob--c" />
            <div className="idrg__dots" aria-hidden="true" />
            <svg className="idrg__leaves" viewBox="0 0 160 220" fill="none" aria-hidden="true">
                <path d="M20 220C10 170 20 120 60 90c-8 45-18 85-40 130z" fill="#86efac" opacity="0.7" />
                <path d="M40 220c5-55 30-100 80-120-20 48-45 88-80 120z" fill="#6ee7b7" opacity="0.55" />
                <path d="M0 220c2-40 12-80 40-108-4 40-16 76-40 108z" fill="#93c5fd" opacity="0.5" />
            </svg>
            <IdCardArt />

            <button className="idrg__back" onClick={() => navigate("/admin-dashboard")}>
                {I.back} {t("back", "Back")}
            </button>

            <button className="idrg__export" onClick={handleExport} disabled={exporting}>
                {exporting ? <span className="idrg__spin idrg__spin--tl" /> : I.download}
                {t("icExportData", "Export Data")}
            </button>

            {toast && (
                <div className={`idrg__toast idrg__toast--${toast.type}`} role="status">
                    {toast.type === "success" ? I.check : I.alert}
                    <span>{toast.msg}</span>
                </div>
            )}

            <div className="idrg__shell">

                {/* ---------- hero header ---------- */}
                <div className="idrg__hero">
                    <span className="idrg__badge">
                        <span className="idrg__badge-dot" />
                        {t("irBadge", "Member Registration")}
                    </span>
                    <h1 className="idrg__title">
                        <span className="idrg__title-dark">{t("irTitleId", "ID")}</span>{" "}
                        <span className="idrg__title-accent">{t("irTitleReg", "Registration")}</span>
                    </h1>
                    <p className="idrg__sub">{t("irSub", "Register a member and generate their token.")}</p>
                    <span className="idrg__divider">
                        <span className="idrg__divider-lotus">{I.lotus}</span>
                    </span>
                </div>

                {/* ---------- white card ---------- */}
                <div className="idrg__card">

                    {/* ============ SUCCESS — token reveal ============ */}
                    {token ? (
                        <div className="idrg__done">
                            <div className="idrg__done-badge">{I.ticket}</div>
                            <p className="idrg__done-label">{t("irYourToken", "Token Number")}</p>
                            <div className="idrg__token">
                                {token.split("").map((c, i) => (
                                    <span
                                        key={i}
                                        className="idrg__token-char"
                                        style={{ animationDelay: `${0.15 + i * 0.12}s` }}
                                    >
                                        {c}
                                    </span>
                                ))}
                            </div>
                            <p className="idrg__done-note">
                                {t("irTokenNote", "Note this token — it identifies this registration.")}
                            </p>
                            <div className="idrg__done-meta">
                                <span className="idrg__chip">
                                    {mode === "online" ? I.card : I.cash}
                                    {mode === "online" ? t("irOnline", "Online") : t("irOffline", "Offline")}
                                </span>
                                <span className="idrg__chip">{I.phone} +91 {mobile}</span>
                                <span className="idrg__chip">{I.users} {people}</span>
                            </div>
                            <div className="idrg__done-actions">
                                <button className="idrg__btn idrg__btn--ghost" onClick={resetForm}>
                                    {I.plus} {t("irNewRegistration", "New Registration")}
                                </button>
                                <button className="idrg__btn idrg__btn--primary" onClick={() => navigate("/admin-dashboard")}>
                                    {I.home} {t("dashboard", "Dashboard")}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* ============ STEP 1 — mode ============ */}
                            <div className="idrg__step-head idrg__anim" style={{ animationDelay: "0.05s" }}>
                                <span className="idrg__step-icon">{I.idCard}</span>
                                <div>
                                    <p className="idrg__step-title">
                                        {t("irSelectMode", "Select mode of transaction")}<span className="idrg__req">*</span>
                                    </p>
                                    <p className="idrg__step-sub">{t("irChooseHow", "Choose how you want to register the member.")}</p>
                                </div>
                            </div>

                            <div className="idrg__modes idrg__anim" style={{ animationDelay: "0.12s" }}>
                                <button
                                    type="button"
                                    className={`idrg__mode idrg__mode--online ${mode === "online" ? "is-on" : ""}`}
                                    onClick={() => pickMode("online")}
                                >
                                    <span className="idrg__mode-flag">{t("irRecommended", "Recommended")}</span>
                                    <span className="idrg__mode-icon">{I.card}</span>
                                    <span className="idrg__mode-title">{t("irOnline", "Online")}</span>
                                    <span className="idrg__mode-sub">{t("irOnlineSub", "UPI / QR payment")}</span>
                                    <span className="idrg__mode-arrow">{mode === "online" ? I.check : I.arrow}</span>
                                    <svg className="idrg__mode-wave" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">
                                        <path d="M0 60V28c40-18 80-18 120 0s90 20 180 4v28z" />
                                    </svg>
                                </button>

                                <button
                                    type="button"
                                    className={`idrg__mode idrg__mode--offline ${mode === "offline" ? "is-on" : ""}`}
                                    onClick={() => pickMode("offline")}
                                >
                                    <span className="idrg__mode-icon">{I.cash}</span>
                                    <span className="idrg__mode-title">{t("irOffline", "Offline")}</span>
                                    <span className="idrg__mode-sub">{t("irOfflineSub", "Cash payment")}</span>
                                    <span className="idrg__mode-arrow">{mode === "offline" ? I.check : I.arrow}</span>
                                    <svg className="idrg__mode-wave" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">
                                        <path d="M0 60V28c40-18 80-18 120 0s90 20 180 4v28z" />
                                    </svg>
                                </button>
                            </div>

                            {/* ============ STEP 2 — form ============ */}
                            {mode && (
                                <form onSubmit={handleSubmit} noValidate className="idrg__form" key={mode}>

                                    {mode === "online" && (
                                        <div className="idrg__qr idrg__anim" style={{ animationDelay: "0.05s" }}>
                                            <div className="idrg__qr-frame">
                                                <span className="idrg__fc idrg__fc--tl" />
                                                <span className="idrg__fc idrg__fc--tr" />
                                                <span className="idrg__fc idrg__fc--bl" />
                                                <span className="idrg__fc idrg__fc--br" />
                                                <img src={qrImage} alt="Payment QR" loading="lazy" />
                                                <div className="idrg__scan-line" />
                                            </div>
                                            <p>{t("irScanPay", "Scan & pay, then enter the details below.")}</p>
                                        </div>
                                    )}

                                    <div className="idrg__field idrg__anim" style={{ animationDelay: "0.1s" }}>
                                        <label className="idrg__label" htmlFor="irg-mobile">
                                            <span className="idrg__label-ico">{I.phone}</span>
                                            {t("irMobile", "Mobile Number")}<span className="idrg__req">*</span>
                                            <span className="idrg__count">{mobile.length}/10</span>
                                        </label>
                                        <div className={`idrg__input-wrap ${mobile.length === 10 ? "is-ok" : ""}`}>
                                            <span className="idrg__prefix">+91</span>
                                            <input
                                                id="irg-mobile"
                                                className={`idrg__input ${errors.mobile ? "is-error" : ""}`}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={10}
                                                autoComplete="off"
                                                placeholder={t("irMobilePh", "10-digit mobile number")}
                                                value={mobile}
                                                onChange={onMobile}
                                            />
                                            {mobile.length === 10 && <span className="idrg__tick">{I.check}</span>}
                                        </div>
                                        {errors.mobile && <span className="idrg__error">{errors.mobile}</span>}
                                    </div>

                                    {mode === "online" && (
                                        <div className="idrg__field idrg__anim" style={{ animationDelay: "0.15s" }}>
                                            <label className="idrg__label" htmlFor="irg-utr">
                                                <span className="idrg__label-ico">{I.receipt}</span>
                                                {t("irUtr", "UTR Reference Number")}<span className="idrg__req">*</span>
                                                <span className="idrg__count">{utr.length}/12</span>
                                            </label>
                                            <div className={`idrg__input-wrap ${utr.length === 12 && !errors.utr ? "is-ok" : ""}`}>
                                                <input
                                                    id="irg-utr"
                                                    className={`idrg__input idrg__input--mono ${errors.utr ? "is-error" : ""}`}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={12}
                                                    autoComplete="off"
                                                    placeholder={t("irUtrPh", "12-digit UTR number")}
                                                    value={utr}
                                                    onChange={onUtr}
                                                />
                                                {utr.length === 12 && !errors.utr && <span className="idrg__tick">{I.check}</span>}
                                            </div>
                                            {errors.utr && <span className="idrg__error">{errors.utr}</span>}
                                        </div>
                                    )}

                                    <div className="idrg__row">
                                        <div className="idrg__field idrg__anim" style={{ animationDelay: "0.2s" }}>
                                            <label className="idrg__label" htmlFor="irg-people">
                                                <span className="idrg__label-ico">{I.users}</span>
                                                {t("irPeople", "Number of People")}<span className="idrg__req">*</span>
                                            </label>
                                            <select
                                                id="irg-people"
                                                className="idrg__select"
                                                value={people}
                                                onChange={(e) => setPeople(Number(e.target.value))}
                                            >
                                                {PEOPLE_OPTIONS.map((n) => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {mode === "online" ? (
                                            <div className="idrg__field idrg__anim" style={{ animationDelay: "0.25s" }}>
                                                <label className="idrg__label" htmlFor="irg-verified">
                                                    <span className="idrg__label-ico">{I.shield}</span>
                                                    {t("irUtrVerified", "UTR Verified")}<span className="idrg__req">*</span>
                                                </label>
                                                <select
                                                    id="irg-verified"
                                                    className={`idrg__select idrg__select--${utrVerified}`}
                                                    value={utrVerified}
                                                    onChange={(e) => setUtrVerified(e.target.value)}
                                                >
                                                    <option value="yes">{t("irYes", "Yes")}</option>
                                                    <option value="no">{t("irNo", "No")}</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="idrg__field idrg__anim" style={{ animationDelay: "0.25s" }}>
                                                <label className="idrg__label" htmlFor="irg-cash">
                                                    <span className="idrg__label-ico">{I.cash}</span>
                                                    {t("irCashCollected", "Cash Collected")}<span className="idrg__req">*</span>
                                                </label>
                                                <select
                                                    id="irg-cash"
                                                    className={`idrg__select idrg__select--${cashCollected}`}
                                                    value={cashCollected}
                                                    onChange={(e) => setCashCollected(e.target.value)}
                                                >
                                                    <option value="yes">{t("irYes", "Yes")}</option>
                                                    <option value="no">{t("irNo", "No")}</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <button type="submit" className="idrg__btn idrg__btn--primary idrg__submit idrg__anim" style={{ animationDelay: "0.3s" }} disabled={submitting}>
                                        {submitting
                                            ? <><span className="idrg__spin" /> {t("submitting", "Submitting...")}</>
                                            : <>{I.send} {t("submit", "Submit")}</>}
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default IdRegistration;