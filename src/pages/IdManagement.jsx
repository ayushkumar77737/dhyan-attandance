import React, { useEffect, useMemo, useState } from "react";
import "./IdManagement.css";
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
    deleteField,
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
    search: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" /></svg>),
    ticket: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /></svg>),
    phone: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.6" /><path d="M10.5 18.5h3" /></svg>),
    receipt: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2.8h12v18.4l-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6L6 21.2V2.8Z" /><path d="M9.4 8h5.2M9.4 12h5.2" /></svg>),
    users: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
    shield: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4.2" /></svg>),
    idCard: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M13 12h5" /><path d="M13 16h3" /></svg>),
    check: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>),
    alert: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2v.1" /></svg>),
    save: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>),
    undo: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10" /></svg>),
    edit: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>),
    chev: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>),
    lock: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>),
    lotus: (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4c1.3 1.5 2 3.1 2 4.7 0 .8-.2 1.6-.6 2.4.7-.4 1.3-1 1.9-1.9.3 1.4.1 2.7-.6 3.9 1-.3 1.9-.8 2.8-1.6-.1 2.2-1.5 4-3.6 5.1-.6.4-1.2.6-1.9.8-.7-.2-1.3-.4-1.9-.8C8 15.4 6.6 13.6 6.5 11.4c.9.8 1.8 1.3 2.8 1.6-.7-1.2-.9-2.5-.6-3.9.6.9 1.2 1.5 1.9 1.9-.4-.8-.6-1.6-.6-2.4C10 7.1 10.7 5.5 12 4z" /></svg>),
};

const PEOPLE_OPTIONS = [1, 2, 3, 4, 5];

/* Token input: uppercase letters + digits only, max 4 chars */
const cleanToken = (v) => v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4);

const fmtDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/* Firestore record -> editable form values */
const toForm = (r) => ({
    mode: r.mode || "online",
    mobile: r.mobileNumber || "",
    utr: r.utrNumber || "",
    people: Number(r.numberOfPeople) || 1,
    utrVerified: r.utrVerified ? "yes" : "no",
    cashCollected: r.cashCollected ? "yes" : "no",
    verified: r.verifiedAt ? "yes" : "no",
    createIdStatus: r.createIdStatus === true ? "yes" : "no",
    idCreated: r.idCreated ? "yes" : "no",
});

const canCreate = (f) => f.verified === "yes" && f.createIdStatus === "yes";

/* Only the fields that actually apply — used for change detection + saving.
   `mode` is carried along for display only; it is fixed and never edited. */
const norm = (f) => ({
    mode: f.mode,
    mobile: f.mobile,
    people: f.people,
    utr: f.mode === "online" ? f.utr : "",
    utrVerified: f.mode === "online" ? f.utrVerified : "",
    cashCollected: f.mode === "offline" ? f.cashCollected : "",
    verified: f.verified,
    createIdStatus: f.verified === "yes" ? f.createIdStatus : "",
    idCreated: canCreate(f) ? f.idCreated : "no",
});

const CHANGE_LABELS = {
    mobile: "mobile",
    people: "people",
    utr: "UTR",
    utrVerified: "UTR verified",
    cashCollected: "cash collected",
    verified: "verified",
    createIdStatus: "create ID status",
    idCreated: "ID created",
};

const Select = ({ id, value, onChange, disabled, tone, children }) => (
    <div className={`idmg__select-wrap ${disabled ? "is-disabled" : ""}`}>
        <select
            id={id}
            className={`idmg__select ${tone ? `idmg__select--${tone}` : ""}`}
            value={value}
            onChange={onChange}
            disabled={disabled}
        >
            {children}
        </select>
        <span className="idmg__select-chev">{I.chev}</span>
    </div>
);

function IdManagement() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const [tokenInput, setTokenInput] = useState("");
    const [record, setRecord] = useState(null);   // { docId, ...data }
    const [form, setForm] = useState(null);
    const [fetching, setFetching] = useState(false);
    const [fetchError, setFetchError] = useState("");
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const orig = useMemo(() => (record ? norm(toForm(record)) : null), [record]);
    const dirty = !!(form && orig && JSON.stringify(norm(form)) !== JSON.stringify(orig));

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

    /* Field setter that keeps the Verified -> Create ID -> ID Created chain consistent */
    const setField = (name, value) => {
        setForm((prev) => {
            const next = { ...prev, [name]: value };
            if (next.verified !== "yes") {
                next.createIdStatus = "no";
                next.idCreated = "no";
            } else if (next.createIdStatus !== "yes") {
                next.idCreated = "no";
            }
            return next;
        });
        if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    };

    /* ---------- fetch by token ---------- */
    const fetchByToken = async () => {
        if (tokenInput.length !== 4 || fetching) return;
        setFetching(true);
        setFetchError("");
        setRecord(null);
        setForm(null);
        setErrors({});
        try {
            const snap = await getDocs(
                query(collection(db, "idRegistrations"), where("token", "==", tokenInput))
            );
            if (snap.empty) {
                setFetchError(t("imNotFound", "No registration found with this token."));
            } else {
                const d = snap.docs[0];
                const data = { docId: d.id, ...d.data() };
                setRecord(data);
                setForm(toForm(data));
            }
        } catch (err) {
            console.error(err);
            setFetchError(t("imFetchFailed", "Couldn't fetch details. Try again."));
        } finally {
            setFetching(false);
        }
    };

    const clearRecord = () => {
        if (dirty && !window.confirm(t("imDiscardConfirm", "Discard your unsaved changes?"))) return;
        setRecord(null);
        setForm(null);
        setTokenInput("");
        setFetchError("");
        setErrors({});
    };

    const resetForm = () => {
        if (!record) return;
        setForm(toForm(record));
        setErrors({});
    };

    /* ---------- UTR duplicate check (ignores this record itself) ---------- */
    const isUtrDuplicate = async (v) => {
        const snap = await getDocs(
            query(collection(db, "idRegistrations"), where("utrNumber", "==", v))
        );
        return snap.docs.some((d) => d.id !== record.docId);
    };

    const onMobile = (e) => setField("mobile", e.target.value.replace(/\D/g, "").slice(0, 10));

    const onUtr = async (e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 12);
        setField("utr", v);
        if (v.length === 12) {
            try {
                if (await isUtrDuplicate(v)) {
                    setErrors((p) => ({ ...p, utr: t("imUtrExists", "This UTR reference number already exists.") }));
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const validate = () => {
        const e = {};
        if (!/^[6-9]\d{9}$/.test(form.mobile))
            e.mobile = t("imMobileInvalid", "Enter a valid 10-digit mobile number.");
        if (form.mode === "online" && !/^\d{12}$/.test(form.utr))
            e.utr = t("imUtrInvalid", "UTR reference must be exactly 12 digits.");
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /* ---------- save ---------- */
    const handleSave = async (ev) => {
        ev.preventDefault();
        if (saving || !record || !dirty) return;
        if (!validate()) return;

        setSaving(true);
        try {
            const admin = (localStorage.getItem("userId") || "").toUpperCase();
            const n = norm(form);
            const o = orig;

            if (n.mode === "online" && n.utr !== o.utr) {
                if (await isUtrDuplicate(n.utr)) {
                    const msg = t("imUtrExists", "This UTR reference number already exists.");
                    setErrors((p) => ({ ...p, utr: msg }));
                    showToast(msg, "error");
                    return;
                }
            }

            /* mode is never written — it is fixed at registration time */
            const upd = {
                mobileNumber: n.mobile,
                numberOfPeople: n.people,
                updatedAt: serverTimestamp(),
                updatedBy: admin,
            };

            /* payment fields — only the ones that apply to this record's mode */
            if (n.mode === "online") {
                upd.utrNumber = n.utr;
                upd.utrVerified = n.utrVerified === "yes";
                upd.cashCollected = deleteField();
            } else {
                upd.cashCollected = n.cashCollected === "yes";
                upd.utrNumber = deleteField();
                upd.utrVerified = deleteField();
            }

            /* verification */
            if (n.verified === "yes") {
                upd.createIdStatus = n.createIdStatus === "yes";
                if (o.verified !== "yes") {
                    upd.verifiedAt = serverTimestamp();
                    upd.verifiedBy = admin;
                }
            } else {
                upd.createIdStatus = deleteField();
                upd.verifiedAt = deleteField();
                upd.verifiedBy = deleteField();
            }

            /* ID creation */
            if (n.idCreated === "yes") {
                upd.idCreated = true;
                if (o.idCreated !== "yes") {
                    upd.idCreatedAt = serverTimestamp();
                    upd.idCreatedBy = admin;
                }
            } else {
                upd.idCreated = deleteField();
                upd.idCreatedAt = deleteField();
                upd.idCreatedBy = deleteField();
            }

            await updateDoc(doc(db, "idRegistrations", record.docId), upd);

            const changed = Object.keys(CHANGE_LABELS)
                .filter((k) => n[k] !== o[k])
                .map((k) => `${CHANGE_LABELS[k]}: ${o[k] || "—"} → ${n[k] || "—"}`);
            await logAdminAction("id_management_update", {
                targetId: record.token,
                details: changed.join(" · "),
            });

            /* re-read so server timestamps show up correctly */
            const fresh = await getDoc(doc(db, "idRegistrations", record.docId));
            const data = { docId: fresh.id, ...fresh.data() };
            setRecord(data);
            setForm(toForm(data));
            setErrors({});
            showToast(t("imSaved", "Changes saved!"));
        } catch (err) {
            console.error(err);
            showToast(t("imSaveFailed", "Couldn't save. Please try again."), "error");
        } finally {
            setSaving(false);
        }
    };

    const createUnlocked = form ? canCreate(form) : false;

    /* ================================================================ */
    return (
        <div className="idmg__page" data-theme={theme}>

            <div className="idmg__blob idmg__blob--a" />
            <div className="idmg__blob idmg__blob--b" />
            <div className="idmg__blob idmg__blob--c" />
            <div className="idmg__dots" aria-hidden="true" />

            <button className="idmg__back" onClick={() => navigate("/admin-dashboard")}>
                {I.back} {t("back", "Back")}
            </button>

            {toast && (
                <div className={`idmg__toast idmg__toast--${toast.type}`} role="status">
                    {toast.type === "success" ? I.check : I.alert}
                    <span>{toast.msg}</span>
                </div>
            )}

            <div className="idmg__shell">

                {/* ---------- hero ---------- */}
                <div className="idmg__hero">
                    <span className="idmg__badge">
                        <span className="idmg__badge-dot" />
                        {t("imBadge", "Records Control")}
                    </span>
                    <h1 className="idmg__title">
                        <span className="idmg__title-dark">{t("imTitleId", "ID")}</span>{" "}
                        <span className="idmg__title-accent">{t("imTitleMgmt", "Management")}</span>
                    </h1>
                    <p className="idmg__sub">
                        {t("imSub", "Look up a token and update its registration, verification and ID creation details.")}
                    </p>
                    <span className="idmg__divider">
                        <span className="idmg__divider-lotus">{I.lotus}</span>
                    </span>
                </div>

                {/* ---------- card ---------- */}
                <div className="idmg__card">

                    {/* ============ STEP 1 — find token ============ */}
                    <div className="idmg__step-head idmg__anim" style={{ animationDelay: "0.05s" }}>
                        <span className="idmg__step-icon">{I.search}</span>
                        <div>
                            <p className="idmg__step-title">{t("imFindTitle", "Find a registration")}</p>
                            <p className="idmg__step-sub">{t("imFindSub", "Enter the 4-character token to load its details.")}</p>
                        </div>
                    </div>

                    <div className="idmg__field idmg__anim" style={{ animationDelay: "0.1s" }}>
                        <label className="idmg__label" htmlFor="img-token">
                            <span className="idmg__label-ico">{I.ticket}</span>
                            {t("imToken", "Token Number")}<span className="idmg__req">*</span>
                            <span className="idmg__count">{tokenInput.length}/4</span>
                        </label>
                        <div className="idmg__token-row">
                            <input
                                id="img-token"
                                className={`idmg__input idmg__input--token ${fetchError ? "is-error" : ""}`}
                                type="text"
                                maxLength={4}
                                autoComplete="off"
                                placeholder={t("imTokenPh", "e.g. A7K2")}
                                value={tokenInput}
                                readOnly={!!record}
                                onChange={(e) => {
                                    setTokenInput(cleanToken(e.target.value));
                                    setFetchError("");
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") { e.preventDefault(); if (!record) fetchByToken(); }
                                }}
                            />
                            {record ? (
                                <button type="button" className="idmg__btn idmg__btn--ghost idmg__fetch-btn" onClick={clearRecord}>
                                    {I.edit} {t("imChangeToken", "Change")}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="idmg__btn idmg__btn--primary idmg__fetch-btn"
                                    onClick={fetchByToken}
                                    disabled={tokenInput.length !== 4 || fetching}
                                >
                                    {fetching ? <span className="idmg__spin" /> : <>{I.search} {t("imFetch", "Fetch")}</>}
                                </button>
                            )}
                        </div>
                        {fetchError && <span className="idmg__error">{fetchError}</span>}
                    </div>

                    {/* ============ STEP 2 — edit ============ */}
                    {record && form && (
                        <form onSubmit={handleSave} noValidate className="idmg__form" key={record.docId}>

                            {/* summary */}
                            <div className="idmg__summary idmg__anim" style={{ animationDelay: "0.05s" }}>
                                <div className="idmg__token-boxes">
                                    {record.token.split("").map((c, i) => (
                                        <span key={i} className="idmg__token-char" style={{ animationDelay: `${0.1 + i * 0.09}s` }}>{c}</span>
                                    ))}
                                </div>
                                <div className="idmg__chips">
                                    <span className="idmg__chip idmg__chip--info">
                                        {I.ticket} {t("imStatusRegistered", "Registered")}
                                    </span>
                                    <span className={`idmg__chip ${record.verifiedAt ? "idmg__chip--yes" : "idmg__chip--pending"}`}>
                                        {I.shield} {record.verifiedAt ? t("imStatusVerified", "Verified") : t("imStatusPending", "Not verified")}
                                    </span>
                                    <span className={`idmg__chip ${record.idCreated ? "idmg__chip--yes" : "idmg__chip--pending"}`}>
                                        {I.idCard} {record.idCreated ? t("imStatusCreated", "ID created") : t("imStatusNotCreated", "ID not created")}
                                    </span>
                                </div>
                                <p className="idmg__meta">
                                    {t("imRegisteredOn", "Registered on")} {fmtDate(record.createdAt)}
                                    {record.createdBy ? ` · ${t("imRegisteredBy", "by")} ${record.createdBy}` : ""}
                                </p>
                                {record.updatedAt && (
                                    <p className="idmg__meta">
                                        {t("imLastUpdated", "Last updated")} {fmtDate(record.updatedAt)}
                                        {record.updatedBy ? ` · ${t("imRegisteredBy", "by")} ${record.updatedBy}` : ""}
                                    </p>
                                )}
                            </div>

                            {/* ---------- SECTION 1: registration ---------- */}
                            <div className="idmg__section idmg__anim" style={{ animationDelay: "0.1s" }}>
                                <div className="idmg__section-head">
                                    <span className="idmg__section-ico">{I.card}</span>
                                    <div>
                                        <p className="idmg__section-title">{t("imSecRegistration", "Registration details")}</p>
                                        <p className="idmg__section-sub">{t("imSecRegistrationSub", "Payment mode, contact and group size.")}</p>
                                    </div>
                                </div>

                                {/* mode of transaction — read-only, fixed at registration */}
                                <div className="idmg__field">
                                    <label className="idmg__label">
                                        <span className="idmg__label-ico">{I.card}</span>
                                        {t("imMode", "Mode of transaction")}
                                    </label>
                                    <div className={`idmg__mode-display idmg__mode-display--${form.mode}`}>
                                        <span className="idmg__mode-display-ico">
                                            {form.mode === "online" ? I.card : I.cash}
                                        </span>
                                        <span className="idmg__mode-display-body">
                                            <span className="idmg__mode-display-title">
                                                {form.mode === "online" ? t("imOnline", "Online") : t("imOffline", "Offline")}
                                            </span>
                                            <span className="idmg__mode-display-sub">
                                                {form.mode === "online" ? t("imOnlineSub", "UPI / QR payment") : t("imOfflineSub", "Cash payment")}
                                            </span>
                                        </span>
                                        <span className="idmg__mode-display-tag">
                                            {I.lock} {t("imModeFixed", "Fixed")}
                                        </span>
                                    </div>
                                </div>

                                <div className="idmg__field">
                                    <label className="idmg__label" htmlFor="img-mobile">
                                        <span className="idmg__label-ico">{I.phone}</span>
                                        {t("imMobile", "Mobile Number")}<span className="idmg__req">*</span>
                                        <span className="idmg__count">{form.mobile.length}/10</span>
                                    </label>
                                    <div className={`idmg__input-wrap ${form.mobile.length === 10 && !errors.mobile ? "is-ok" : ""}`}>
                                        <span className="idmg__prefix">+91</span>
                                        <input
                                            id="img-mobile"
                                            className={`idmg__input ${errors.mobile ? "is-error" : ""}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={10}
                                            autoComplete="off"
                                            placeholder={t("imMobilePh", "10-digit mobile number")}
                                            value={form.mobile}
                                            onChange={onMobile}
                                        />
                                        {form.mobile.length === 10 && !errors.mobile && <span className="idmg__tick">{I.check}</span>}
                                    </div>
                                    {errors.mobile && <span className="idmg__error">{errors.mobile}</span>}
                                </div>

                                {form.mode === "online" && (
                                    <div className="idmg__field">
                                        <label className="idmg__label" htmlFor="img-utr">
                                            <span className="idmg__label-ico">{I.receipt}</span>
                                            {t("imUtr", "UTR Reference Number")}<span className="idmg__req">*</span>
                                            <span className="idmg__count">{form.utr.length}/12</span>
                                        </label>
                                        <div className={`idmg__input-wrap ${form.utr.length === 12 && !errors.utr ? "is-ok" : ""}`}>
                                            <input
                                                id="img-utr"
                                                className={`idmg__input idmg__input--mono ${errors.utr ? "is-error" : ""}`}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={12}
                                                autoComplete="off"
                                                placeholder={t("imUtrPh", "12-digit UTR number")}
                                                value={form.utr}
                                                onChange={onUtr}
                                            />
                                            {form.utr.length === 12 && !errors.utr && <span className="idmg__tick">{I.check}</span>}
                                        </div>
                                        {errors.utr && <span className="idmg__error">{errors.utr}</span>}
                                    </div>
                                )}

                                <div className="idmg__row">
                                    <div className="idmg__field">
                                        <label className="idmg__label" htmlFor="img-people">
                                            <span className="idmg__label-ico">{I.users}</span>
                                            {t("imPeople", "Number of People")}<span className="idmg__req">*</span>
                                        </label>
                                        <Select
                                            id="img-people"
                                            value={form.people}
                                            onChange={(e) => setField("people", Number(e.target.value))}
                                        >
                                            {PEOPLE_OPTIONS.map((n) => (
                                                <option key={n} value={n}>{n}</option>
                                            ))}
                                        </Select>
                                    </div>

                                    {form.mode === "online" ? (
                                        <div className="idmg__field">
                                            <label className="idmg__label" htmlFor="img-utrv">
                                                <span className="idmg__label-ico">{I.shield}</span>
                                                {t("imUtrVerified", "UTR Verified")}
                                            </label>
                                            <Select
                                                id="img-utrv"
                                                tone={form.utrVerified}
                                                value={form.utrVerified}
                                                onChange={(e) => setField("utrVerified", e.target.value)}
                                            >
                                                <option value="yes">{t("imYes", "Yes")}</option>
                                                <option value="no">{t("imNo", "No")}</option>
                                            </Select>
                                        </div>
                                    ) : (
                                        <div className="idmg__field">
                                            <label className="idmg__label" htmlFor="img-cash">
                                                <span className="idmg__label-ico">{I.cash}</span>
                                                {t("imCashCollected", "Cash Collected")}
                                            </label>
                                            <Select
                                                id="img-cash"
                                                tone={form.cashCollected}
                                                value={form.cashCollected}
                                                onChange={(e) => setField("cashCollected", e.target.value)}
                                            >
                                                <option value="yes">{t("imYes", "Yes")}</option>
                                                <option value="no">{t("imNo", "No")}</option>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ---------- SECTION 2: verification ---------- */}
                            <div className="idmg__section idmg__anim" style={{ animationDelay: "0.16s" }}>
                                <div className="idmg__section-head">
                                    <span className="idmg__section-ico">{I.shield}</span>
                                    <div>
                                        <p className="idmg__section-title">{t("imSecVerification", "Verification")}</p>
                                        <p className="idmg__section-sub">{t("imSecVerificationSub", "Whether this token has been verified, and if an ID should be created.")}</p>
                                    </div>
                                </div>

                                <div className="idmg__row">
                                    <div className="idmg__field">
                                        <label className="idmg__label" htmlFor="img-verified">
                                            <span className="idmg__label-ico">{I.shield}</span>
                                            {t("imVerified", "Verified")}
                                        </label>
                                        <Select
                                            id="img-verified"
                                            tone={form.verified}
                                            value={form.verified}
                                            onChange={(e) => setField("verified", e.target.value)}
                                        >
                                            <option value="yes">{t("imYes", "Yes")}</option>
                                            <option value="no">{t("imNo", "No")}</option>
                                        </Select>
                                    </div>

                                    <div className="idmg__field">
                                        <label className="idmg__label" htmlFor="img-cid">
                                            <span className="idmg__label-ico">{I.idCard}</span>
                                            {t("imCreateIdStatus", "Create ID Status")}
                                        </label>
                                        <Select
                                            id="img-cid"
                                            tone={form.verified === "yes" ? form.createIdStatus : ""}
                                            value={form.createIdStatus}
                                            disabled={form.verified !== "yes"}
                                            onChange={(e) => setField("createIdStatus", e.target.value)}
                                        >
                                            <option value="yes">{t("imYes", "Yes")}</option>
                                            <option value="no">{t("imNo", "No")}</option>
                                        </Select>
                                    </div>
                                </div>

                                {form.verified !== "yes" && (
                                    <p className="idmg__note">{I.alert}{t("imHintNeedVerified", "Mark the token as Verified to set its Create ID Status.")}</p>
                                )}
                                {record.verifiedAt && (
                                    <p className="idmg__meta">
                                        {t("imVerifiedBy", "Verified by")} {record.verifiedBy || "—"} · {fmtDate(record.verifiedAt)}
                                    </p>
                                )}
                            </div>

                            {/* ---------- SECTION 3: ID creation ---------- */}
                            <div className="idmg__section idmg__anim" style={{ animationDelay: "0.22s" }}>
                                <div className="idmg__section-head">
                                    <span className="idmg__section-ico">{I.idCard}</span>
                                    <div>
                                        <p className="idmg__section-title">{t("imSecCreation", "ID creation")}</p>
                                        <p className="idmg__section-sub">{t("imSecCreationSub", "Mark whether the member's ID has been created.")}</p>
                                    </div>
                                </div>

                                <div className="idmg__field">
                                    <label className="idmg__label" htmlFor="img-created">
                                        <span className="idmg__label-ico">{I.check}</span>
                                        {t("imIdCreated", "ID Created")}
                                    </label>
                                    <Select
                                        id="img-created"
                                        tone={createUnlocked ? form.idCreated : ""}
                                        value={form.idCreated}
                                        disabled={!createUnlocked}
                                        onChange={(e) => setField("idCreated", e.target.value)}
                                    >
                                        <option value="yes">{t("imYes", "Yes")}</option>
                                        <option value="no">{t("imNo", "No")}</option>
                                    </Select>
                                </div>

                                {!createUnlocked && (
                                    <p className="idmg__note">{I.alert}{t("imHintNeedStatusYes", "ID Created can only be set when the token is Verified and Create ID Status is Yes.")}</p>
                                )}
                                {record.idCreated && (
                                    <p className="idmg__meta">
                                        {t("imCreatedBy", "Created by")} {record.idCreatedBy || "—"} · {fmtDate(record.idCreatedAt)}
                                    </p>
                                )}
                            </div>

                            {/* ---------- actions ---------- */}
                            <div className="idmg__actions idmg__anim" style={{ animationDelay: "0.28s" }}>
                                {dirty && (
                                    <span className="idmg__unsaved">
                                        <span className="idmg__unsaved-dot" />
                                        {t("imUnsaved", "Unsaved changes")}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    className="idmg__btn idmg__btn--ghost"
                                    onClick={resetForm}
                                    disabled={!dirty || saving}
                                >
                                    {I.undo} {t("imReset", "Reset")}
                                </button>
                                <button
                                    type="submit"
                                    className="idmg__btn idmg__btn--primary"
                                    disabled={!dirty || saving}
                                    title={!dirty ? t("imNoChanges", "No changes to save") : undefined}
                                >
                                    {saving
                                        ? <><span className="idmg__spin" /> {t("imSaving", "Saving...")}</>
                                        : <>{I.save} {t("imSave", "Save Changes")}</>}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default IdManagement;