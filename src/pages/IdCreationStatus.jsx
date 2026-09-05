import React, { useEffect, useState } from "react";
import "./IdCreationStatus.css";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    getDoc,
    doc,
    query,
    where,
    updateDoc,
    serverTimestamp,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { logAdminAction } from "../utils/logAdminAction";

/* ---------------------------------------------------------------- */
/* Icons                                                             */
/* ---------------------------------------------------------------- */
const I = {
    back: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>),
    card: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5" /><line x1="2" y1="10" x2="22" y2="10" /><line x1="6" y1="15" x2="10" y2="15" /></svg>),
    cash: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 12h.01M18 12h.01" /></svg>),
    arrow: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>),
    search: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" /></svg>),
    ticket: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /></svg>),
    phone: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.6" /><path d="M10.5 18.5h3" /></svg>),
    receipt: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2.8h12v18.4l-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6L6 21.2V2.8Z" /><path d="M9.4 8h5.2M9.4 12h5.2" /></svg>),
    users: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
    shield: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4.2" /></svg>),
    idCard: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M13 12h5" /><path d="M13 16h3" /></svg>),
    check: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>),
    cross: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>),
    alert: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2v.1" /></svg>),
    send: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>),
    plus: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>),
    home: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>),
    download: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>),
    lotus: (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4c1.3 1.5 2 3.1 2 4.7 0 .8-.2 1.6-.6 2.4.7-.4 1.3-1 1.9-1.9.3 1.4.1 2.7-.6 3.9 1-.3 1.9-.8 2.8-1.6-.1 2.2-1.5 4-3.6 5.1-.6.4-1.2.6-1.9.8-.7-.2-1.3-.4-1.9-.8C8 15.4 6.6 13.6 6.5 11.4c.9.8 1.8 1.3 2.8 1.6-.7-1.2-.9-2.5-.6-3.9.6.9 1.2 1.5 1.9 1.9-.4-.8-.6-1.6-.6-2.4C10 7.1 10.7 5.5 12 4z" /></svg>),
};

/* Token input: uppercase letters + digits only, max 4 chars */
const cleanToken = (v) => v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4);

function IdCreationStatus() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const [mode, setMode] = useState("");          // "" | "online" | "offline"
    const [tokenInput, setTokenInput] = useState("");
    const [record, setRecord] = useState(null);    // fetched Firestore doc { docId, ...data }
    const [fetching, setFetching] = useState(false);
    const [fetchError, setFetchError] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [doneToken, setDoneToken] = useState(""); // set after successful completion
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

    const pickMode = (m) => {
        setMode(m);
        setTokenInput("");
        setRecord(null);
        setFetchError("");
        setDoneToken("");
    };

    const resetAll = () => {
        setMode("");
        setTokenInput("");
        setRecord(null);
        setFetchError("");
        setDoneToken("");
    };

    const onTokenChange = (e) => {
        setTokenInput(cleanToken(e.target.value));
        setRecord(null);
        setFetchError("");
    };

    /* ---------- fetch registration by token ---------- */
    const fetchByToken = async () => {
        if (tokenInput.length !== 4 || fetching) return;
        setFetching(true);
        setFetchError("");
        setRecord(null);
        try {
            const snap = await getDocs(
                query(collection(db, "idRegistrations"), where("token", "==", tokenInput))
            );
            if (snap.empty) {
                setFetchError(t("icNotFound", "No registration found with this token."));
            } else {
                const d = snap.docs[0];
                const data = { docId: d.id, ...d.data() };
                if (data.mode !== mode) {
                    setFetchError(
                        mode === "online"
                            ? t("icWrongModeOnline", "This token belongs to an OFFLINE registration. Switch mode to view it.")
                            : t("icWrongModeOffline", "This token belongs to an ONLINE registration. Switch mode to view it.")
                    );
                } else {
                    setRecord(data);
                }
            }
        } catch (err) {
            console.error(err);
            setFetchError(t("icFetchFailed", "Couldn't fetch details. Try again."));
        } finally {
            setFetching(false);
        }
    };

    /* verification / status flags derived from the record */
    const isVerified = !!record?.verifiedAt;
    const statusYes = record?.createIdStatus === true;
    const alreadyCreated = !!record?.idCreated;
    const canComplete = isVerified && statusYes && !alreadyCreated;

    /* ---------- submit: mark ID created successfully ---------- */
    const handleSubmit = async (ev) => {
        ev.preventDefault();
        if (submitting || !record || doneToken || !canComplete) return;

        setSubmitting(true);
        try {
            await updateDoc(doc(db, "idRegistrations", record.docId), {
                idCreated: true,
                idCreatedAt: serverTimestamp(),
                idCreatedBy: (localStorage.getItem("userId") || "").toUpperCase(),
            });
            await logAdminAction("id_created", {
                targetId: record.token,
                details: `${mode} · +91 ${record.mobileNumber} · ID created successfully`,
            });
            setDoneToken(record.token);
            showToast(t("icSuccess", "ID created successfully!"));
        } catch (err) {
            console.error(err);
            showToast(t("icFailed", "Couldn't save. Please try again."), "error");
        } finally {
            setSubmitting(false);
        }
    };

    const fmtDate = (ts) => {
        if (!ts) return "—";
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
        <div className="idcs__page" data-theme={theme}>

            <div className="idcs__blob idcs__blob--a" />
            <div className="idcs__blob idcs__blob--b" />
            <div className="idcs__blob idcs__blob--c" />
            <div className="idcs__dots" aria-hidden="true" />

            <button className="idcs__back" onClick={() => navigate("/admin-dashboard")}>
                {I.back} {t("back", "Back")}
            </button>

            <button className="idcs__export" onClick={handleExport} disabled={exporting}>
                {exporting ? <span className="idcs__spin idcs__spin--em" /> : I.download}
                {t("icExportData", "Export Data")}
            </button>

            {toast && (
                <div className={`idcs__toast idcs__toast--${toast.type}`} role="status">
                    {toast.type === "success" ? I.check : I.alert}
                    <span>{toast.msg}</span>
                </div>
            )}

            <div className="idcs__shell">

                {/* ---------- hero ---------- */}
                <div className="idcs__hero">
                    <span className="idcs__badge">
                        <span className="idcs__badge-dot" />
                        {t("icBadge", "ID Creation")}
                    </span>
                    <h1 className="idcs__title">
                        <span className="idcs__title-dark">{t("icTitleId", "ID Creation")}</span>{" "}
                        <span className="idcs__title-accent">{t("icTitleStatus", "Status")}</span>
                    </h1>
                    <p className="idcs__sub">{t("icSub", "Check a token's Create ID status and mark the ID as created.")}</p>
                    <span className="idcs__divider">
                        <span className="idcs__divider-lotus">{I.lotus}</span>
                    </span>
                </div>

                {/* ---------- card ---------- */}
                <div className="idcs__card">

                    {/* ============ SUCCESS ============ */}
                    {doneToken ? (
                        <div className="idcs__done">
                            <div className="idcs__done-badge">{I.idCard}</div>
                            <p className="idcs__done-label">{t("icDoneLabel", "ID Created Successfully")}</p>
                            <div className="idcs__token-boxes">
                                {doneToken.split("").map((c, i) => (
                                    <span key={i} className="idcs__token-char" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                                        {c}
                                    </span>
                                ))}
                            </div>
                            <p className="idcs__done-note">
                                {t("icDoneNote", "This registration is now complete.")}
                            </p>
                            <div className="idcs__done-meta">
                                <span className="idcs__chip">
                                    {mode === "online" ? I.card : I.cash}
                                    {mode === "online" ? t("irOnline", "Online") : t("irOffline", "Offline")}
                                </span>
                                <span className="idcs__chip">{I.phone} +91 {record?.mobileNumber}</span>
                                <span className="idcs__chip idcs__chip--yes">{I.check} {t("icCreated", "Created")}</span>
                            </div>
                            <div className="idcs__done-actions">
                                <button className="idcs__btn idcs__btn--ghost" onClick={resetAll}>
                                    {I.plus} {t("icNewCheck", "Check Another Token")}
                                </button>
                                <button className="idcs__btn idcs__btn--primary" onClick={() => navigate("/admin-dashboard")}>
                                    {I.home} {t("dashboard", "Dashboard")}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* ============ STEP 1 — mode ============ */}
                            <div className="idcs__step-head idcs__anim" style={{ animationDelay: "0.05s" }}>
                                <span className="idcs__step-icon">{I.idCard}</span>
                                <div>
                                    <p className="idcs__step-title">
                                        {t("icSelectMode", "Mode of transaction done")}<span className="idcs__req">*</span>
                                    </p>
                                    <p className="idcs__step-sub">{t("icChooseHow", "Select how the registration payment was made.")}</p>
                                </div>
                            </div>

                            <div className="idcs__modes idcs__anim" style={{ animationDelay: "0.12s" }}>
                                <button
                                    type="button"
                                    className={`idcs__mode idcs__mode--online ${mode === "online" ? "is-on" : ""}`}
                                    onClick={() => pickMode("online")}
                                >
                                    <span className="idcs__mode-icon">{I.card}</span>
                                    <span className="idcs__mode-title">{t("irOnline", "Online")}</span>
                                    <span className="idcs__mode-sub">{t("irOnlineSub", "UPI / QR payment")}</span>
                                    <span className="idcs__mode-arrow">{mode === "online" ? I.check : I.arrow}</span>
                                    <svg className="idcs__mode-wave" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">
                                        <path d="M0 60V28c40-18 80-18 120 0s90 20 180 4v28z" />
                                    </svg>
                                </button>

                                <button
                                    type="button"
                                    className={`idcs__mode idcs__mode--offline ${mode === "offline" ? "is-on" : ""}`}
                                    onClick={() => pickMode("offline")}
                                >
                                    <span className="idcs__mode-icon">{I.cash}</span>
                                    <span className="idcs__mode-title">{t("irOffline", "Offline")}</span>
                                    <span className="idcs__mode-sub">{t("irOfflineSub", "Cash payment")}</span>
                                    <span className="idcs__mode-arrow">{mode === "offline" ? I.check : I.arrow}</span>
                                    <svg className="idcs__mode-wave" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">
                                        <path d="M0 60V28c40-18 80-18 120 0s90 20 180 4v28z" />
                                    </svg>
                                </button>
                            </div>

                            {/* ============ STEP 2 — token lookup ============ */}
                            {mode && (
                                <form onSubmit={handleSubmit} noValidate className="idcs__form" key={mode}>

                                    <div className="idcs__field idcs__anim" style={{ animationDelay: "0.05s" }}>
                                        <label className="idcs__label" htmlFor="ics-token">
                                            <span className="idcs__label-ico">{I.ticket}</span>
                                            {t("icToken", "Enter Token Number")}<span className="idcs__req">*</span>
                                            <span className="idcs__count">{tokenInput.length}/4</span>
                                        </label>
                                        <div className="idcs__token-row">
                                            <input
                                                id="ics-token"
                                                className={`idcs__input idcs__input--token ${fetchError ? "is-error" : ""}`}
                                                type="text"
                                                maxLength={4}
                                                autoComplete="off"
                                                placeholder={t("icTokenPh", "e.g. A7K2")}
                                                value={tokenInput}
                                                onChange={onTokenChange}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") { e.preventDefault(); fetchByToken(); }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="idcs__btn idcs__btn--primary idcs__fetch-btn"
                                                onClick={fetchByToken}
                                                disabled={tokenInput.length !== 4 || fetching}
                                            >
                                                {fetching ? <span className="idcs__spin" /> : <>{I.search} {t("icFetch", "Fetch")}</>}
                                            </button>
                                        </div>
                                        {fetchError && <span className="idcs__error">{fetchError}</span>}
                                    </div>

                                    {/* fetched details */}
                                    {record && (
                                        <>
                                            {/* BIG create ID status banner */}
                                            <div
                                                className={`idcs__statusbox idcs__anim ${!isVerified ? "idcs__statusbox--pending"
                                                        : statusYes ? "idcs__statusbox--yes"
                                                            : "idcs__statusbox--no"
                                                    }`}
                                                style={{ animationDelay: "0.05s" }}
                                            >
                                                <span className="idcs__statusbox-ico">
                                                    {!isVerified ? I.alert : statusYes ? I.check : I.cross}
                                                </span>
                                                <div className="idcs__statusbox-body">
                                                    <p className="idcs__statusbox-label">{t("ivCreateIdStatus", "Create ID Status")}</p>
                                                    <p className="idcs__statusbox-value">
                                                        {!isVerified
                                                            ? t("icNotVerified", "Not verified yet")
                                                            : statusYes ? t("irYes", "Yes") : t("irNo", "No")}
                                                    </p>
                                                    {isVerified && (
                                                        <p className="idcs__statusbox-sub">
                                                            {t("ivVerifiedBy", "Verified by")} {record.verifiedBy || "—"} · {fmtDate(record.verifiedAt)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* details grid */}
                                            <div className="idcs__details idcs__anim" style={{ animationDelay: "0.1s" }}>
                                                <div className="idcs__detail">
                                                    <span className="idcs__detail-ico">{I.ticket}</span>
                                                    <span className="idcs__detail-body">
                                                        <span className="idcs__detail-label">{t("icTokenLabel", "Token Number")}</span>
                                                        <span className="idcs__detail-value idcs__detail-value--mono">{record.token}</span>
                                                    </span>
                                                </div>

                                                <div className="idcs__detail">
                                                    <span className="idcs__detail-ico">{I.phone}</span>
                                                    <span className="idcs__detail-body">
                                                        <span className="idcs__detail-label">{t("irMobile", "Mobile Number")}</span>
                                                        <span className="idcs__detail-value">+91 {record.mobileNumber}</span>
                                                    </span>
                                                </div>

                                                {mode === "online" ? (
                                                    <>
                                                        <div className="idcs__detail">
                                                            <span className="idcs__detail-ico">{I.receipt}</span>
                                                            <span className="idcs__detail-body">
                                                                <span className="idcs__detail-label">{t("irUtr", "UTR Reference Number")}</span>
                                                                <span className="idcs__detail-value idcs__detail-value--mono">{record.utrNumber || "—"}</span>
                                                            </span>
                                                        </div>
                                                        <div className="idcs__detail">
                                                            <span className="idcs__detail-ico">{I.shield}</span>
                                                            <span className="idcs__detail-body">
                                                                <span className="idcs__detail-label">{t("irUtrVerified", "UTR Verified")}</span>
                                                                <span className={`idcs__status ${record.utrVerified ? "idcs__status--yes" : "idcs__status--no"}`}>
                                                                    {record.utrVerified ? t("irYes", "Yes") : t("irNo", "No")}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="idcs__detail">
                                                        <span className="idcs__detail-ico">{I.cash}</span>
                                                        <span className="idcs__detail-body">
                                                            <span className="idcs__detail-label">{t("irCashCollected", "Cash Collected")}</span>
                                                            <span className={`idcs__status ${record.cashCollected ? "idcs__status--yes" : "idcs__status--no"}`}>
                                                                {record.cashCollected ? t("irYes", "Yes") : t("irNo", "No")}
                                                            </span>
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="idcs__detail">
                                                    <span className="idcs__detail-ico">{I.users}</span>
                                                    <span className="idcs__detail-body">
                                                        <span className="idcs__detail-label">{t("irPeople", "Number of People")}</span>
                                                        <span className="idcs__detail-value">{record.numberOfPeople}</span>
                                                    </span>
                                                </div>

                                                <div className="idcs__detail">
                                                    <span className="idcs__detail-ico">{I.idCard}</span>
                                                    <span className="idcs__detail-body">
                                                        <span className="idcs__detail-label">{t("icRegisteredOn", "Registered On")}</span>
                                                        <span className="idcs__detail-value">{fmtDate(record.createdAt)}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* footer: already created banner OR hint OR submit */}
                                            {alreadyCreated ? (
                                                <div className="idcs__already idcs__anim" style={{ animationDelay: "0.15s" }}>
                                                    <span className="idcs__already-ico">{I.check}</span>
                                                    <div className="idcs__already-body">
                                                        <p className="idcs__already-title">{t("icAlreadyCreated", "ID already created for this token.")}</p>
                                                        <p className="idcs__already-sub">
                                                            {t("icCreatedBy", "Created by")} {record.idCreatedBy || "—"} · {fmtDate(record.idCreatedAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {!canComplete && (
                                                        <p className="idcs__hint idcs__anim" style={{ animationDelay: "0.15s" }}>
                                                            {I.alert}
                                                            {!isVerified
                                                                ? t("icHintVerifyFirst", "This token must be verified on the ID Verification page first.")
                                                                : t("icHintStatusNo", "Create ID Status is \"No\" — update it on the ID Verification page before completing.")}
                                                        </p>
                                                    )}
                                                    <button
                                                        type="submit"
                                                        className="idcs__btn idcs__btn--primary idcs__submit idcs__anim"
                                                        style={{ animationDelay: "0.2s" }}
                                                        disabled={submitting || !canComplete}
                                                    >
                                                        {submitting
                                                            ? <><span className="idcs__spin" /> {t("submitting", "Submitting...")}</>
                                                            : <>{I.send} {t("icSubmitCreated", "ID Created Successfully")}</>}
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default IdCreationStatus;