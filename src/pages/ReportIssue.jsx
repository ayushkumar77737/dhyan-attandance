import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ReportIssue.css";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    serverTimestamp,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { logAdminAction } from "../utils/logAdminAction";

/* ----------------------------------------------------------------
   Cloudinary — screenshots go to the same cloud as profile photos.
   UPLOAD_PRESET must be an *unsigned* preset created in your
   Cloudinary console (Settings → Upload → Upload presets).
   ---------------------------------------------------------------- */
const CLOUD_NAME = "dgvjq9bhl";
const UPLOAD_PRESET = "user_profile";
const MAX_FILES = 4;
const MAX_FILE_MB = 5;

/* Same public_id formula as utils/cloudinaryUpload.js, so an admin's
   profile photo can be rebuilt from id + name when no URL is stored. */
const getProfileImageUrl = (employeeId, name = "", size = 96) => {
    if (!employeeId || !name) return "";
    const publicId = `${employeeId}_${name.replace(/\s+/g, "_")}`;
    const transforms = [
        "c_fill", "g_face", `w_${size}`, `h_${size}`, "r_max", "q_auto", "f_auto"
    ].join(",");
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
};

const uploadScreenshot = async (file) => {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);
    form.append("folder", "issues");
    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: form }
    );
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    return json.secure_url;
};

const SEVERITIES = ["low", "medium", "high", "critical"];

/* Deterministic avatar tint from a name — matches the reference where
   each assignee had a different colour. */
const AVATAR_TONES = ["rose", "blue", "violet", "teal", "amber", "green"];
const toneFor = (s = "") => {
    let h = 0;
    for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return AVATAR_TONES[h % AVATAR_TONES.length];
};

/* ---------------------------------------------------------------- */
/* Icons                                                             */
/* ---------------------------------------------------------------- */
const I = {
    back: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    ),
    close: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
        </svg>
    ),
    clip: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.4 11.05l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.65 5.65l-9.2 9.2a2 2 0 0 1-2.83-2.83l8.5-8.5" />
        </svg>
    ),
    users: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    search: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" />
        </svg>
    ),
    send: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    alert: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2v.1" />
        </svg>
    ),
    bug: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2l1.9 2M16 2l-1.9 2" /><rect x="7" y="7" width="10" height="13" rx="5" />
            <path d="M12 7v13M3 13h4M17 13h4M4 19l3.5-2M20 19l-3.5-2M4 8l3.5 2M20 8l-3.5 2" />
        </svg>
    ),
};

/* Photo if we have one, coloured initial otherwise. */
function AssigneeAvatar({ src, name }) {
    const [ok, setOk] = useState(Boolean(src));
    useEffect(() => setOk(Boolean(src)), [src]);
    const initial = (name || "?").charAt(0).toUpperCase();
    return (
        <span className={`ri__avatar ri__avatar--${toneFor(name)}`}>
            {ok ? (
                <img src={src} alt={name} loading="lazy" onError={() => setOk(false)} />
            ) : initial}
        </span>
    );
}

function ReportIssue() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const fileRef = useRef(null);

    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");
    const currentUserId = (localStorage.getItem("userId") || "").toUpperCase();

    const [me, setMe] = useState(null);
    const [admins, setAdmins] = useState([]);
    const [loadingAdmins, setLoadingAdmins] = useState(true);

    const [form, setForm] = useState({
        title: "",
        severity: "medium",
        area: "",
        description: "",
    });
    const [files, setFiles] = useState([]);
    const [assignees, setAssignees] = useState([]);
    const [assignSearch, setAssignSearch] = useState("");

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [uploadNote, setUploadNote] = useState("");
    const [done, setDone] = useState(false);
    const [toast, setToast] = useState({ text: "", type: "" });

    /* ---------------- guard + load ---------------- */
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
            if (!currentUser || !currentUserId) { navigate("/"); return; }
            try {
                const snap = await getDoc(doc(db, "users", currentUserId));
                if (
                    !snap.exists() ||
                    snap.data().role !== "admin" ||
                    snap.data().uid !== currentUser.uid
                ) { navigate("/"); return; }
                setMe({ id: currentUserId, ...snap.data() });
                await loadAdmins();
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

    const loadAdmins = async () => {
        setLoadingAdmins(true);
        try {
            const snap = await getDocs(collection(db, "users"));
            const list = [];
            snap.forEach((d) => {
                const u = d.data();
                if (u.role === "admin" && u.deleted !== true && u.disabled !== true) {
                    const idNo = String(u.id || d.id).toUpperCase();
                    const name = String(u.name || d.id);
                    const stored =
                        u.profileImage || u.photoURL || u.profileImageUrl || u.imageUrl;
                    list.push({
                        id: idNo,
                        name,
                        email: u.email || "",
                        photo: stored || getProfileImageUrl(idNo, name),
                    });
                }
            });
            list.sort((a, b) => a.name.localeCompare(b.name));
            setAdmins(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAdmins(false);
        }
    };

    const showToast = (text, type = "success") => {
        setToast({ text, type });
        setTimeout(() => setToast({ text: "", type: "" }), 3200);
    };

    /* ---------------- form handlers ---------------- */
    /* Title and Area are words, not codes — digits are stripped on
       every change (typed or pasted). Letters, spaces and punctuation
       such as "Login / Attendance" still pass. */
    const NO_DIGITS = new Set(["title", "area"]);
    const blockDigitKey = (e) => {
        if (/^[0-9]$/.test(e.key)) e.preventDefault();
    };

    const setField = (k, v) => {
        const clean = NO_DIGITS.has(k) ? v.replace(/[0-9]/g, "") : v;
        setForm((p) => ({ ...p, [k]: clean }));
        if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
    };

    const onFiles = (e) => {
        const picked = Array.from(e.target.files || []);
        const accepted = [];
        for (const f of picked) {
            if (!f.type.startsWith("image/")) continue;
            if (f.size > MAX_FILE_MB * 1024 * 1024) {
                showToast(t("riFileTooLarge", { name: f.name, mb: MAX_FILE_MB }), "error");
                continue;
            }
            accepted.push(f);
        }
        setFiles((prev) => [...prev, ...accepted].slice(0, MAX_FILES));
        e.target.value = "";
    };

    const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

    const toggleAssignee = (id) =>
        setAssignees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const visibleAdmins = useMemo(() => {
        const q = assignSearch.trim().toLowerCase();
        if (!q) return admins;
        return admins.filter(
            (a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
        );
    }, [admins, assignSearch]);

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = t("riTitleRequired");
        else if (form.title.trim().length < 5) e.title = t("riTitleShort");
        if (!form.description.trim()) e.description = t("riDescRequired");
        else if (form.description.trim().length < 20) e.description = t("riDescShort");
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /* ---------------- submit ---------------- */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting || done) return;
        if (!validate()) return;

        setSubmitting(true);
        try {
            /* screenshots first, so the doc is written with final URLs */
            const urls = [];
            for (let i = 0; i < files.length; i++) {
                setUploadNote(t("riUploading", { n: i + 1, total: files.length }));
                try {
                    urls.push(await uploadScreenshot(files[i]));
                } catch (err) {
                    console.warn("Screenshot upload failed:", err);
                }
            }
            setUploadNote("");

            const assignedTo = admins
                .filter((a) => assignees.includes(a.id))
                .map((a) => ({ id: a.id, name: a.name }));

            const ref = await addDoc(collection(db, "issues"), {
                title: form.title.trim().slice(0, 120),
                severity: form.severity,
                area: form.area.trim().slice(0, 60),
                description: form.description.trim().slice(0, 4000),
                screenshots: urls,
                assignedTo,
                assignedIds: assignedTo.map((a) => a.id),
                status: "Open",
                reporterType: "admin",
                reporterId: me?.id || currentUserId,
                reporterName: me?.name || currentUserId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            await logAdminAction("report_issue", {
                targetId: ref.id,
                details: t("logReportedIssue", { title: form.title.trim() }),
            });

            setDone(true);
            showToast(t("riSubmitted"), "success");
            setTimeout(() => navigate("/admin-dashboard"), 1200);
        } catch (err) {
            console.error(err);
            showToast(t("riSubmitFailed"), "error");
        } finally {
            setSubmitting(false);
            setUploadNote("");
        }
    };

    const titleLen = form.title.length;
    const descLen = form.description.length;

    return (
        <div className="ri__page" data-theme={theme}>
            <div className="ri__glow ri__glow--a" />
            <div className="ri__glow ri__glow--b" />

            <button className="ri__back" onClick={() => navigate("/admin-dashboard")}>
                {I.back} {t("back")}
            </button>

            {toast.text && (
                <div className={`ri__toast ri__toast--${toast.type}`} role="status">
                    {toast.type === "success" ? I.check : I.alert}
                    <span>{toast.text}</span>
                </div>
            )}

            <form className={`ri__card ${done ? "is-done" : ""}`} onSubmit={handleSubmit} noValidate>

                {/* ---------- header ---------- */}
                <div className="ri__head">
                    <div className="ri__head-left">
                        <span className="ri__head-icon">{I.bug}</span>
                        <div>
                            <h1 className="ri__title">{t("riTitle")}</h1>
                            <p className="ri__sub">{t("riSub")}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="ri__close"
                        onClick={() => navigate("/admin-dashboard")}
                        aria-label={t("cancel")}
                    >
                        {I.close}
                    </button>
                </div>

                {/* ---------- title + severity ---------- */}
                <div className="ri__row ri__row--split">
                    <div className="ri__field">
                        <label className="ri__label" htmlFor="ri-title">
                            {t("riFieldTitle")}<span className="ri__req">*</span>
                            <span className="ri__count">{titleLen}/120</span>
                        </label>
                        <input
                            id="ri-title"
                            className={`ri__input ${errors.title ? "is-error" : ""}`}
                            type="text"
                            maxLength={120}
                            autoComplete="off"
                            placeholder={t("riTitlePh")}
                            value={form.title}
                            onChange={(e) => setField("title", e.target.value)}
                            onKeyDown={blockDigitKey}
                            autoFocus
                        />
                        {errors.title && <span className="ri__error">{errors.title}</span>}
                    </div>

                    <div className="ri__field ri__field--sev">
                        <label className="ri__label" htmlFor="ri-sev">{t("riSeverity")}</label>
                        <div className={`ri__select-wrap ri__sev--${form.severity}`}>
                            <span className="ri__sev-dot" />
                            <select
                                id="ri-sev"
                                className="ri__select"
                                value={form.severity}
                                onChange={(e) => setField("severity", e.target.value)}
                            >
                                {SEVERITIES.map((s) => (
                                    <option key={s} value={s}>{t(`riSev_${s}`)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* ---------- area ---------- */}
                <div className="ri__field">
                    <label className="ri__label" htmlFor="ri-area">
                        {t("riArea")} <span className="ri__opt">({t("riOptional")})</span>
                    </label>
                    <input
                        id="ri-area"
                        className="ri__input"
                        type="text"
                        maxLength={60}
                        autoComplete="off"
                        placeholder={t("riAreaPh")}
                        value={form.area}
                        onChange={(e) => setField("area", e.target.value)}
                        onKeyDown={blockDigitKey}
                    />
                </div>

                {/* ---------- description ---------- */}
                <div className="ri__field">
                    <label className="ri__label" htmlFor="ri-desc">
                        {t("riDesc")}<span className="ri__req">*</span>
                        <span className="ri__count">{descLen}/4000</span>
                    </label>
                    <textarea
                        id="ri-desc"
                        className={`ri__textarea ${errors.description ? "is-error" : ""}`}
                        maxLength={4000}
                        rows={4}
                        placeholder={t("riDescPh")}
                        value={form.description}
                        onChange={(e) => setField("description", e.target.value)}
                    />
                    {errors.description && <span className="ri__error">{errors.description}</span>}
                </div>

                {/* ---------- screenshots ---------- */}
                <div className="ri__field">
                    <label className="ri__label ri__label--icon">
                        {I.clip} {t("riScreenshots")} <span className="ri__opt">({t("riOptional")})</span>
                    </label>
                    <div className="ri__files">
                        <button
                            type="button"
                            className="ri__file-btn"
                            onClick={() => fileRef.current?.click()}
                            disabled={files.length >= MAX_FILES}
                        >
                            {t("riChooseFiles")}
                        </button>
                        <span className="ri__file-hint">
                            {files.length === 0
                                ? t("riNoFile")
                                : t("riFilesChosen", { count: files.length, max: MAX_FILES })}
                        </span>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={onFiles}
                        />
                    </div>

                    {files.length > 0 && (
                        <div className="ri__thumbs">
                            {files.map((f, i) => (
                                <div className="ri__thumb" key={`${f.name}-${i}`}>
                                    <img src={URL.createObjectURL(f)} alt={f.name} />
                                    <button
                                        type="button"
                                        className="ri__thumb-x"
                                        onClick={() => removeFile(i)}
                                        aria-label={t("riRemove")}
                                    >
                                        {I.close}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ---------- assign ---------- */}
                <div className="ri__field">
                    <label className="ri__label ri__label--icon">
                        {I.users} {t("riAssignTo")}
                        {assignees.length > 0 && (
                            <span className="ri__count ri__count--chip">{assignees.length}</span>
                        )}
                    </label>

                    <div className="ri__assign-search">
                        <span className="ri__assign-search-ico">{I.search}</span>
                        <input
                            type="text"
                            placeholder={t("riSearchPeople")}
                            value={assignSearch}
                            autoComplete="off"
                            onChange={(e) => setAssignSearch(e.target.value)}
                        />
                    </div>

                    <div className="ri__people" role="listbox" aria-multiselectable="true">
                        {loadingAdmins ? (
                            <div className="ri__people-empty">{t("loading")}</div>
                        ) : visibleAdmins.length === 0 ? (
                            <div className="ri__people-empty">{t("riNoPeople")}</div>
                        ) : (
                            visibleAdmins.map((a) => {
                                const on = assignees.includes(a.id);
                                return (
                                    <button
                                        type="button"
                                        key={a.id}
                                        role="option"
                                        aria-selected={on}
                                        className={`ri__person ${on ? "is-on" : ""}`}
                                        onClick={() => toggleAssignee(a.id)}
                                    >
                                        <AssigneeAvatar src={a.photo} name={a.name} />
                                        <span className="ri__person-text">
                                            <span className="ri__person-name">
                                                {a.name}
                                                {a.id === currentUserId && <span className="ri__you">{t("you")}</span>}
                                            </span>
                                            <span className="ri__person-id">{a.id}</span>
                                        </span>
                                        <span className="ri__person-check">{I.check}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ---------- footer ---------- */}
                <div className="ri__footer">
                    {uploadNote && <span className="ri__upload-note">{uploadNote}</span>}
                    <button
                        type="button"
                        className="ri__btn ri__btn--ghost"
                        onClick={() => navigate("/admin-dashboard")}
                        disabled={submitting}
                    >
                        {t("cancel")}
                    </button>
                    <button
                        type="submit"
                        className="ri__btn ri__btn--primary"
                        disabled={submitting || done}
                    >
                        {done
                            ? <>{I.check} {t("riReported")}</>
                            : submitting
                                ? <><span className="ri__spin" /> {t("riSubmitting")}</>
                                : <>{I.send} {t("riReport")}</>}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ReportIssue;