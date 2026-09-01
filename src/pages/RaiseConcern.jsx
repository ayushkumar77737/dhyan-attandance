import React, { useEffect, useMemo, useRef, useState } from "react";
import "./RaiseConcern.css";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";

/* ----------------------------------------------------------------
   Cloudinary — same cloud + unsigned preset as ReportIssue.jsx.
   Screenshots land in the "concerns" folder.
   ---------------------------------------------------------------- */
const CLOUD_NAME = "dgvjq9bhl";
const UPLOAD_PRESET = "user_profile";
const MAX_FILES = 3;
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
    form.append("folder", "concerns");
    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: form }
    );
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    return json.secure_url;
};

/* Users pick a category (what the concern is about) and a priority
   (how urgent it feels). No "critical" — that's an admin call. */
const CATEGORIES = ["attendance", "session", "portal", "conduct", "facility", "other"];
const PRIORITIES = ["low", "medium", "high"];

/* createdAt may be a Firestore Timestamp, ISO string or Date */
const toMs = (v) => {
    if (!v) return 0;
    if (typeof v === "object" && typeof v.toDate === "function") return v.toDate().getTime();
    if (typeof v === "object" && v.seconds) return v.seconds * 1000;
    const parsed = new Date(v).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
};

const statusKey = (s = "") => {
    const v = String(s).toLowerCase();
    if (v.includes("progress")) return "progress";
    if (v.includes("resolv") || v.includes("closed")) return "resolved";
    return "open";
};

/* Deterministic avatar tint from a name — same palette as ReportIssue. */
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
    concern: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="15" x2="12.01" y2="15" />
        </svg>
    ),
    history: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
        </svg>
    ),
    shield: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    ),
};

/* Photo if we have one, coloured initial otherwise. */
function AssigneeAvatar({ src, name }) {
    const [ok, setOk] = useState(Boolean(src));
    useEffect(() => setOk(Boolean(src)), [src]);
    const initial = (name || "?").charAt(0).toUpperCase();
    return (
        <span className={`rc__avatar rc__avatar--${toneFor(name)}`}>
            {ok ? (
                <img src={src} alt={name} loading="lazy" onError={() => setOk(false)} />
            ) : initial}
        </span>
    );
}

function RaiseConcern() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const fileRef = useRef(null);

    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const [me, setMe] = useState(null);
    const [mine, setMine] = useState([]);
    const [loadingMine, setLoadingMine] = useState(true);

    const [admins, setAdmins] = useState([]);
    const [loadingAdmins, setLoadingAdmins] = useState(true);
    const [assignees, setAssignees] = useState([]);
    const [assignSearch, setAssignSearch] = useState("");

    const [form, setForm] = useState({
        title: "",
        category: "attendance",
        priority: "medium",
        description: "",
    });
    const [files, setFiles] = useState([]);

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [uploadNote, setUploadNote] = useState("");
    const [done, setDone] = useState(false);
    const [toast, setToast] = useState({ text: "", type: "" });

    /* ---------------- guard + load ----------------
       Uses onAuthStateChanged (like UserDashboard) so a hard refresh
       waits for Firebase instead of bouncing on a null currentUser.
       The user ID is derived from the login email, not localStorage. */
    useEffect(() => {
        const disableRightClick = (e) => e.preventDefault();
        const disableInspectKeys = (e) => {
            if (e.key === "F12") e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) e.preventDefault();
            if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
        };
        document.addEventListener("contextmenu", disableRightClick);
        document.addEventListener("keydown", disableInspectKeys);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user || !user.email) { navigate("/"); return; }
            const id = String(user.email.split("@")[0] || "").toUpperCase();
            try {
                const snap = await getDoc(doc(db, "users", id));
                if (!snap.exists()) { navigate("/"); return; }
                const data = snap.data();
                if (data.deleted === true || data.disabled === true) { navigate("/"); return; }
                setMe({ id, name: data.name || id, role: data.role || "user" });
                await Promise.all([loadMine(id), loadAdmins()]);
            } catch (e) {
                console.error(e);
                navigate("/");
            }
        });

        return () => {
            unsubscribe();
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    const loadMine = async (id) => {
        setLoadingMine(true);
        try {
            const snap = await getDocs(
                query(collection(db, "concerns"), where("reporterId", "==", id))
            );
            const list = [];
            snap.forEach((d) => {
                const c = d.data();
                list.push({
                    id: d.id,
                    title: c.title || "",
                    status: c.status || "Open",
                    category: c.category || "other",
                    createdMs: toMs(c.createdAt),
                });
            });
            list.sort((a, b) => b.createdMs - a.createdMs);
            setMine(list.slice(0, 5));
        } catch (e) {
            console.error(e);
            setMine([]);
        } finally {
            setLoadingMine(false);
        }
    };

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

    const toggleAssignee = (id) =>
        setAssignees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const visibleAdmins = useMemo(() => {
        const q = assignSearch.trim().toLowerCase();
        if (!q) return admins;
        return admins.filter(
            (a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
        );
    }, [admins, assignSearch]);

    const showToast = (text, type = "success") => {
        setToast({ text, type });
        setTimeout(() => setToast({ text: "", type: "" }), 3200);
    };

    /* ---------------- form handlers ---------------- */
    const setField = (k, v) => {
        setForm((p) => ({ ...p, [k]: v }));
        if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
    };

    const onFiles = (e) => {
        const picked = Array.from(e.target.files || []);
        const accepted = [];
        for (const f of picked) {
            if (!f.type.startsWith("image/")) continue;
            if (f.size > MAX_FILE_MB * 1024 * 1024) {
                showToast(
                    t("rcFileTooLarge", { name: f.name, mb: MAX_FILE_MB }) ||
                    `${f.name} is larger than ${MAX_FILE_MB} MB`,
                    "error"
                );
                continue;
            }
            accepted.push(f);
        }
        setFiles((prev) => [...prev, ...accepted].slice(0, MAX_FILES));
        e.target.value = "";
    };

    const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = t("rcTitleRequired") || "Please give your concern a short title.";
        else if (form.title.trim().length < 5) e.title = t("rcTitleShort") || "Title should be at least 5 characters.";
        if (!form.description.trim()) e.description = t("rcDescRequired") || "Please describe what happened.";
        else if (form.description.trim().length < 20) e.description = t("rcDescShort") || "Add a little more detail (at least 20 characters).";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /* ---------------- submit ---------------- */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting || done || !me) return;
        if (!validate()) return;

        setSubmitting(true);
        try {
            const urls = [];
            for (let i = 0; i < files.length; i++) {
                setUploadNote(
                    t("rcUploading", { n: i + 1, total: files.length }) ||
                    `Uploading screenshot ${i + 1} of ${files.length}…`
                );
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

            await addDoc(collection(db, "concerns"), {
                title: form.title.trim().slice(0, 120),
                category: form.category,
                priority: form.priority,
                description: form.description.trim().slice(0, 4000),
                screenshots: urls,
                assignedTo,
                assignedIds: assignedTo.map((a) => a.id),
                status: "Open",
                reporterType: "user",
                reporterId: me.id,
                reporterName: me.name,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setDone(true);
            showToast(t("rcSubmitted") || "Concern sent. We'll get back to you.", "success");
            setTimeout(() => navigate("/user-dashboard"), 1200);
        } catch (err) {
            console.error(err);
            showToast(t("rcSubmitFailed") || "Couldn't send your concern. Please try again.", "error");
        } finally {
            setSubmitting(false);
            setUploadNote("");
        }
    };

    const titleLen = form.title.length;
    const descLen = form.description.length;

    return (
        <div className="rc__page" data-theme={theme}>
            <div className="rc__glow rc__glow--a" />
            <div className="rc__glow rc__glow--b" />

            <button className="rc__back" onClick={() => navigate("/user-dashboard")}>
                {I.back} {t("back") || "Back"}
            </button>

            {toast.text && (
                <div className={`rc__toast rc__toast--${toast.type}`} role="status">
                    {toast.type === "success" ? I.check : I.alert}
                    <span>{toast.text}</span>
                </div>
            )}

            <form className={`rc__card ${done ? "is-done" : ""}`} onSubmit={handleSubmit} noValidate>

                {/* ---------- header ---------- */}
                <div className="rc__head">
                    <div className="rc__head-left">
                        <span className="rc__head-icon">{I.concern}</span>
                        <div>
                            <h1 className="rc__title">{t("rcTitle") || "Raise a Concern"}</h1>
                            <p className="rc__sub">
                                {t("rcSub") || "Tell us what's troubling you. The admin team reads every concern."}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="rc__close"
                        onClick={() => navigate("/user-dashboard")}
                        aria-label={t("cancel") || "Cancel"}
                    >
                        {I.close}
                    </button>
                </div>

                {/* ---------- title + priority ---------- */}
                <div className="rc__row rc__row--split">
                    <div className="rc__field">
                        <label className="rc__label" htmlFor="rc-title">
                            {t("rcFieldTitle") || "What is it about?"}<span className="rc__req">*</span>
                            <span className="rc__count">{titleLen}/120</span>
                        </label>
                        <input
                            id="rc-title"
                            className={`rc__input ${errors.title ? "is-error" : ""}`}
                            type="text"
                            maxLength={120}
                            autoComplete="off"
                            placeholder={t("rcTitlePh") || "e.g. My attendance for last Sunday is missing"}
                            value={form.title}
                            onChange={(e) => setField("title", e.target.value)}
                            autoFocus
                        />
                        {errors.title && <span className="rc__error">{errors.title}</span>}
                    </div>

                    <div className="rc__field rc__field--pri">
                        <label className="rc__label" htmlFor="rc-pri">{t("rcPriority") || "How urgent?"}</label>
                        <div className={`rc__select-wrap rc__pri--${form.priority}`}>
                            <span className="rc__pri-dot" />
                            <select
                                id="rc-pri"
                                className="rc__select"
                                value={form.priority}
                                onChange={(e) => setField("priority", e.target.value)}
                            >
                                {PRIORITIES.map((p) => (
                                    <option key={p} value={p}>{t(`rcPri_${p}`) || p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* ---------- category ---------- */}
                <div className="rc__field rc__field--category">
                    <label className="rc__label">{t("rcCategory") || "Category"}</label>
                    <div className="rc__chips" role="radiogroup">
                        {CATEGORIES.map((c) => {
                            const on = form.category === c;
                            return (
                                <button
                                    type="button"
                                    key={c}
                                    role="radio"
                                    aria-checked={on}
                                    className={`rc__chip ${on ? "is-on" : ""}`}
                                    onClick={() => setField("category", c)}
                                >
                                    {t(`rcCat_${c}`) || c.charAt(0).toUpperCase() + c.slice(1)}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ---------- description ---------- */}
                <div className="rc__field rc__field--desc">
                    <label className="rc__label" htmlFor="rc-desc">
                        {t("rcDesc") || "Tell us more"}<span className="rc__req">*</span>
                        <span className="rc__count">{descLen}/4000</span>
                    </label>
                    <textarea
                        id="rc-desc"
                        className={`rc__textarea ${errors.description ? "is-error" : ""}`}
                        maxLength={4000}
                        rows={5}
                        placeholder={t("rcDescPh") || "What happened, when, and what would help resolve it?"}
                        value={form.description}
                        onChange={(e) => setField("description", e.target.value)}
                    />
                    {errors.description && <span className="rc__error">{errors.description}</span>}
                </div>

                {/* ---------- screenshots ---------- */}
                <div className="rc__field rc__field--shots">
                    <label className="rc__label rc__label--icon">
                        {I.clip} {t("rcScreenshots") || "Screenshots"} <span className="rc__opt">({t("rcOptional") || "optional"})</span>
                    </label>
                    <div className="rc__files">
                        <button
                            type="button"
                            className="rc__file-btn"
                            onClick={() => fileRef.current?.click()}
                            disabled={files.length >= MAX_FILES}
                        >
                            {t("rcChooseFiles") || "Choose images"}
                        </button>
                        <span className="rc__file-hint">
                            {files.length === 0
                                ? (t("rcNoFile") || `Up to ${MAX_FILES} images, ${MAX_FILE_MB} MB each`)
                                : (t("rcFilesChosen", { count: files.length, max: MAX_FILES }) || `${files.length} of ${MAX_FILES} selected`)}
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
                        <div className="rc__thumbs">
                            {files.map((f, i) => (
                                <div className="rc__thumb" key={`${f.name}-${i}`}>
                                    <img src={URL.createObjectURL(f)} alt={f.name} />
                                    <button
                                        type="button"
                                        className="rc__thumb-x"
                                        onClick={() => removeFile(i)}
                                        aria-label={t("rcRemove") || "Remove"}
                                    >
                                        {I.close}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ---------- assign to ---------- */}
                <div className="rc__field rc__field--assign">
                    <label className="rc__label rc__label--icon">
                        {I.users} {t("rcAssignTo") || "Send to"} <span className="rc__opt">({t("rcOptional") || "optional"})</span>
                        {assignees.length > 0 && (
                            <span className="rc__count rc__count--chip">{assignees.length}</span>
                        )}
                    </label>

                    <div className="rc__assign-search">
                        <span className="rc__assign-search-ico">{I.search}</span>
                        <input
                            type="text"
                            placeholder={t("rcSearchPeople") || "Search admins by name or ID"}
                            value={assignSearch}
                            autoComplete="off"
                            onChange={(e) => setAssignSearch(e.target.value)}
                        />
                    </div>

                    <div className="rc__people" role="listbox" aria-multiselectable="true">
                        {loadingAdmins ? (
                            <div className="rc__people-empty">{t("loading") || "Loading…"}</div>
                        ) : visibleAdmins.length === 0 ? (
                            <div className="rc__people-empty">{t("rcNoPeople") || "No admins match that search."}</div>
                        ) : (
                            visibleAdmins.map((a) => {
                                const on = assignees.includes(a.id);
                                return (
                                    <button
                                        type="button"
                                        key={a.id}
                                        role="option"
                                        aria-selected={on}
                                        className={`rc__person ${on ? "is-on" : ""}`}
                                        onClick={() => toggleAssignee(a.id)}
                                    >
                                        <AssigneeAvatar src={a.photo} name={a.name} />
                                        <span className="rc__person-text">
                                            <span className="rc__person-name">{a.name}</span>
                                            <span className="rc__person-id">{a.id}</span>
                                        </span>
                                        <span className="rc__person-check">{I.check}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                    <span className="rc__assign-hint">
                        {t("rcAssignHint") || "Leave empty and the whole admin team will see it."}
                    </span>
                </div>

                {/* ---------- my recent concerns ---------- */}
                <div className="rc__field rc__field--mine">
                    <label className="rc__label rc__label--icon">
                        {I.history} {t("rcMyConcerns") || "Your recent concerns"}
                        {mine.length > 0 && <span className="rc__count rc__count--chip">{mine.length}</span>}
                    </label>

                    <div className="rc__mine">
                        {loadingMine ? (
                            <div className="rc__mine-empty">{t("loading") || "Loading…"}</div>
                        ) : mine.length === 0 ? (
                            <div className="rc__mine-empty">
                                {t("rcNoneYet") || "Nothing raised yet. Whatever you send here shows up in this list."}
                            </div>
                        ) : (
                            mine.map((c) => (
                                <div className="rc__mine-row" key={c.id}>
                                    <span className={`rc__status rc__status--${statusKey(c.status)}`}>
                                        {c.status}
                                    </span>
                                    <span className="rc__mine-text">
                                        <span className="rc__mine-title">{c.title}</span>
                                        <span className="rc__mine-meta">
                                            {t(`rcCat_${c.category}`) || c.category}
                                            {c.createdMs
                                                ? ` · ${new Date(c.createdMs).toLocaleDateString(i18n.language || undefined)}`
                                                : ""}
                                        </span>
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="rc__note">
                        {I.shield}
                        <span>
                            {t("rcPrivacyNote") || "Only the admin team can see your concern. Your name and ID are attached so they can follow up with you."}
                        </span>
                    </div>
                </div>

                {/* ---------- footer ---------- */}
                <div className="rc__footer">
                    {uploadNote && <span className="rc__upload-note">{uploadNote}</span>}
                    <button
                        type="button"
                        className="rc__btn rc__btn--ghost"
                        onClick={() => navigate("/user-dashboard")}
                        disabled={submitting}
                    >
                        {t("cancel") || "Cancel"}
                    </button>
                    <button
                        type="submit"
                        className="rc__btn rc__btn--primary"
                        disabled={submitting || done || !me}
                    >
                        {done
                            ? <>{I.check} {t("rcSent") || "Sent"}</>
                            : submitting
                                ? <><span className="rc__spin" /> {t("rcSending") || "Sending…"}</>
                                : <>{I.send} {t("rcSend") || "Send concern"}</>}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default RaiseConcern;