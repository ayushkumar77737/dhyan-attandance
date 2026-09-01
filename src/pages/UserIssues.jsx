import React, { useEffect, useMemo, useState } from "react";
import "./UserIssues.css";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    addDoc,
    serverTimestamp,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { logAdminAction } from "../utils/logAdminAction";

/* ----------------------------------------------------------------
   Reads the `concerns` collection written by RaiseConcern.jsx and
   lets admins triage it: filter, open, change status, assign to
   themselves, leave a note. Every status change also drops a
   notification into `notifications` for the reporter.
   ---------------------------------------------------------------- */

const STATUSES = ["Open", "In Progress", "Resolved"];
const CATEGORIES = ["attendance", "session", "portal", "conduct", "facility", "other"];
const PRIORITIES = ["high", "medium", "low"];

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

const AVATAR_TONES = ["rose", "blue", "violet", "teal", "amber", "green"];
const toneFor = (s = "") => {
    let h = 0;
    for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return AVATAR_TONES[h % AVATAR_TONES.length];
};

/* Same public_id formula as utils/cloudinaryUpload.js — used as the
   last-resort guess when neither `profiles` nor `users` has a URL. */
const CLOUD_NAME = "dgvjq9bhl";
const getProfileImageUrl = (employeeId, name = "", size = 96) => {
    if (!employeeId || !name) return "";
    const publicId = `${employeeId}_${name.replace(/\s+/g, "_")}`;
    const transforms = ["c_fill", "g_face", `w_${size}`, `h_${size}`, "r_max", "q_auto", "f_auto"].join(",");
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
};

/* Look up profile photos for a set of user IDs:
   profiles/{id}.profileImage → users/{id}.(profileImage|photoURL|…) → Cloudinary guess */
const fetchPhotos = async (ids, names = {}) => {
    const out = {};
    await Promise.all(
        [...new Set(ids.filter(Boolean))].map(async (id) => {
            try {
                const p = await getDoc(doc(db, "profiles", id));
                if (p.exists() && p.data().profileImage) { out[id] = p.data().profileImage; return; }
            } catch (e) { /* fall through */ }
            try {
                const u = await getDoc(doc(db, "users", id));
                if (u.exists()) {
                    const d = u.data();
                    const stored = d.profileImage || d.photoURL || d.profileImageUrl || d.imageUrl;
                    out[id] = stored || getProfileImageUrl(id, d.name || names[id] || "");
                    return;
                }
            } catch (e) { /* fall through */ }
            out[id] = getProfileImageUrl(id, names[id] || "");
        })
    );
    return out;
};

const relTime = (ms, lang) => {
    if (!ms) return "";
    const diff = Date.now() - ms;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(ms).toLocaleDateString(lang || undefined, { day: "numeric", month: "short" });
};

/* ---------------------------------------------------------------- */
/* Icons                                                             */
/* ---------------------------------------------------------------- */
const I = {
    back: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>),
    close: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>),
    search: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" /></svg>),
    check: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>),
    alert: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2v.1" /></svg>),
    bug: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.9 2M16 2l-1.9 2" /><rect x="7" y="7" width="10" height="13" rx="5" /><path d="M12 7v13M3 13h4M17 13h4M4 19l3.5-2M20 19l-3.5-2M4 8l3.5 2M20 8l-3.5 2" /></svg>),
    inbox: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>),
    clock: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>),
    done: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>),
    user: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>),
    image: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>),
    note: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>),
    trash: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>),
    hand: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5" /><path d="M14 10V4a2 2 0 0 0-4 0v6" /><path d="M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>),
    refresh: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>),
};

/* Photo if we have one, coloured initial otherwise. */
function Avatar({ name, src }) {
    const [ok, setOk] = useState(Boolean(src));
    useEffect(() => setOk(Boolean(src)), [src]);
    return (
        <span className={`ui__avatar ui__avatar--${toneFor(name)}`} title={name}>
            {ok ? (
                <img src={src} alt={name} loading="lazy" onError={() => setOk(false)} />
            ) : (name || "?").charAt(0).toUpperCase()}
        </span>
    );
}

function UserIssues() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");
    const currentUserId = (localStorage.getItem("userId") || "").toUpperCase();

    const [me, setMe] = useState(null);
    const [items, setItems] = useState([]);
    const [photos, setPhotos] = useState({});
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [category, setCategory] = useState("all");
    const [priority, setPriority] = useState("all");
    const [mineOnly, setMineOnly] = useState(false);

    const [selectedId, setSelectedId] = useState(null);
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
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
                await load();
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

    const load = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "concerns"));
            const list = [];
            snap.forEach((d) => {
                const c = d.data();
                list.push({
                    id: d.id,
                    title: c.title || "",
                    description: c.description || "",
                    category: c.category || "other",
                    priority: c.priority || "medium",
                    status: c.status || "Open",
                    screenshots: Array.isArray(c.screenshots) ? c.screenshots : [],
                    assignedTo: Array.isArray(c.assignedTo) ? c.assignedTo : [],
                    assignedIds: Array.isArray(c.assignedIds) ? c.assignedIds : [],
                    reporterId: c.reporterId || "",
                    reporterName: c.reporterName || c.reporterId || "",
                    reporterPhoto: c.reporterPhoto || "",
                    adminNote: c.adminNote || "",
                    resolvedBy: c.resolvedBy || "",
                    createdMs: toMs(c.createdAt),
                    updatedMs: toMs(c.updatedAt),
                });
            });
            list.sort((a, b) => b.createdMs - a.createdMs);
            setItems(list);

            /* photos: reporters without a stored photo + every assignee */
            const names = {};
            const ids = [];
            list.forEach((c) => {
                if (!c.reporterPhoto) { ids.push(c.reporterId); names[c.reporterId] = c.reporterName; }
                c.assignedTo.forEach((a) => { ids.push(a.id); names[a.id] = a.name; });
            });
            if (ids.length) setPhotos(await fetchPhotos(ids, names));
        } catch (e) {
            console.error(e);
            showToast(t("uiLoadFailed"), "error");
        } finally {
            setLoading(false);
        }
    };

    const showToast = (text, type = "success") => {
        setToast({ text, type });
        setTimeout(() => setToast({ text: "", type: "" }), 3000);
    };

    /* ---------------- derived ---------------- */
    const counts = useMemo(() => ({
        total: items.length,
        open: items.filter((i) => statusKey(i.status) === "open").length,
        progress: items.filter((i) => statusKey(i.status) === "progress").length,
        resolved: items.filter((i) => statusKey(i.status) === "resolved").length,
    }), [items]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter((i) => {
            if (status !== "all" && statusKey(i.status) !== status) return false;
            if (category !== "all" && i.category !== category) return false;
            if (priority !== "all" && i.priority !== priority) return false;
            if (mineOnly && !i.assignedIds.includes(currentUserId)) return false;
            if (!q) return true;
            return (
                i.title.toLowerCase().includes(q) ||
                i.reporterName.toLowerCase().includes(q) ||
                i.reporterId.toLowerCase().includes(q) ||
                i.description.toLowerCase().includes(q)
            );
        });
    }, [items, search, status, category, priority, mineOnly, currentUserId]);

    const selected = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId]);

    const openItem = (id) => {
        setSelectedId(id);
        const it = items.find((i) => i.id === id);
        setNote(it?.adminNote || "");
    };

    /* ---------------- actions ---------------- */
    const notifyReporter = async (item, newStatus) => {
        try {
            await addDoc(collection(db, "notifications"), {
                userId: item.reporterId,
                type: "concern",
                title: t("uiNotifTitle"),
                message: t("uiNotifBody", { title: item.title, status: newStatus }),
                concernId: item.id,
                createdAt: serverTimestamp(),
                read: false,
            });
        } catch (e) {
            console.warn("notification failed", e);
        }
    };

    const patch = (id, changes) =>
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));

    const changeStatus = async (item, newStatus) => {
        if (saving || item.status === newStatus) return;
        setSaving(true);
        try {
            const changes = {
                status: newStatus,
                updatedAt: serverTimestamp(),
            };
            if (statusKey(newStatus) === "resolved") {
                changes.resolvedAt = serverTimestamp();
                changes.resolvedBy = me?.name || currentUserId;
            }
            await updateDoc(doc(db, "concerns", item.id), changes);
            patch(item.id, { status: newStatus, updatedMs: Date.now(), resolvedBy: changes.resolvedBy || item.resolvedBy });
            await notifyReporter(item, newStatus);
            await logAdminAction("concern_status", {
                targetId: item.id,
                details: `${item.title} → ${newStatus}`,
            });
            showToast(t("uiStatusUpdated", { status: newStatus }));
        } catch (e) {
            console.error(e);
            showToast(t("uiUpdateFailed"), "error");
        } finally {
            setSaving(false);
        }
    };

    const assignToMe = async (item) => {
        if (saving || !me) return;
        const already = item.assignedIds.includes(currentUserId);
        setSaving(true);
        try {
            const assignedTo = already
                ? item.assignedTo.filter((a) => a.id !== currentUserId)
                : [...item.assignedTo, { id: currentUserId, name: me.name || currentUserId }];
            const assignedIds = assignedTo.map((a) => a.id);
            await updateDoc(doc(db, "concerns", item.id), { assignedTo, assignedIds, updatedAt: serverTimestamp() });
            patch(item.id, { assignedTo, assignedIds, updatedMs: Date.now() });
            showToast(already ? (t("uiUnassigned")) : (t("uiAssigned")));
        } catch (e) {
            console.error(e);
            showToast(t("uiUpdateFailed"), "error");
        } finally {
            setSaving(false);
        }
    };

    const saveNote = async (item) => {
        if (saving) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, "concerns", item.id), {
                adminNote: note.trim().slice(0, 2000),
                updatedAt: serverTimestamp(),
            });
            patch(item.id, { adminNote: note.trim(), updatedMs: Date.now() });
            showToast(t("uiNoteSaved"));
        } catch (e) {
            console.error(e);
            showToast(t("uiUpdateFailed"), "error");
        } finally {
            setSaving(false);
        }
    };

    const remove = async (item) => {
        if (saving) return;
        const ok = window.confirm(t("uiDeleteConfirm"));
        if (!ok) return;
        setSaving(true);
        try {
            await deleteDoc(doc(db, "concerns", item.id));
            setItems((prev) => prev.filter((i) => i.id !== item.id));
            setSelectedId(null);
            await logAdminAction("concern_delete", { targetId: item.id, details: item.title });
            showToast(t("uiDeleted"));
        } catch (e) {
            console.error(e);
            showToast(t("uiUpdateFailed"), "error");
        } finally {
            setSaving(false);
        }
    };

    const photoFor = (id, stored = "") => stored || photos[id] || "";
    const catLabel = (c) => t(`rcCat_${c}`);
    const priLabel = (p) => t(`rcPri_${p}`);

    return (
        <div className="ui__page" data-theme={theme}>
            <div className="ui__glow ui__glow--a" />
            <div className="ui__glow ui__glow--b" />

            <button className="ui__back" onClick={() => navigate("/admin-dashboard")}>
                {I.back} {t("back")}
            </button>

            {toast.text && (
                <div className={`ui__toast ui__toast--${toast.type}`} role="status">
                    {toast.type === "success" ? I.check : I.alert}
                    <span>{toast.text}</span>
                </div>
            )}

            <div className="ui__wrap">

                {/* ---------- header ---------- */}
                <div className="ui__head">
                    <div className="ui__head-left">
                        <span className="ui__head-icon">{I.bug}</span>
                        <div>
                            <h1 className="ui__title">{t("uiTitle")}</h1>
                            <p className="ui__sub">{t("uiSub")}</p>
                        </div>
                    </div>
                    <button className="ui__refresh" onClick={load} disabled={loading} aria-label="Refresh">
                        {I.refresh}
                    </button>
                </div>

                {/* ---------- stats ---------- */}
                <div className="ui__stats">
                    <button className={`ui__stat ${status === "all" ? "is-on" : ""}`} onClick={() => setStatus("all")}>
                        <span className="ui__stat-ico ui__stat-ico--all">{I.inbox}</span>
                        <span className="ui__stat-val">{counts.total}</span>
                        <span className="ui__stat-label">{t("uiAll")}</span>
                    </button>
                    <button className={`ui__stat ${status === "open" ? "is-on" : ""}`} onClick={() => setStatus("open")}>
                        <span className="ui__stat-ico ui__stat-ico--open">{I.alert}</span>
                        <span className="ui__stat-val">{counts.open}</span>
                        <span className="ui__stat-label">{t("uiOpen")}</span>
                    </button>
                    <button className={`ui__stat ${status === "progress" ? "is-on" : ""}`} onClick={() => setStatus("progress")}>
                        <span className="ui__stat-ico ui__stat-ico--progress">{I.clock}</span>
                        <span className="ui__stat-val">{counts.progress}</span>
                        <span className="ui__stat-label">{t("uiInProgress")}</span>
                    </button>
                    <button className={`ui__stat ${status === "resolved" ? "is-on" : ""}`} onClick={() => setStatus("resolved")}>
                        <span className="ui__stat-ico ui__stat-ico--resolved">{I.done}</span>
                        <span className="ui__stat-val">{counts.resolved}</span>
                        <span className="ui__stat-label">{t("uiResolved")}</span>
                    </button>
                </div>

                {/* ---------- toolbar ---------- */}
                <div className="ui__toolbar">
                    <div className="ui__search">
                        <span className="ui__search-ico">{I.search}</span>
                        <input
                            type="text"
                            placeholder={t("uiSearchPh")}
                            value={search}
                            autoComplete="off"
                            onChange={(e) => setSearch(e.target.value.replace(/[<>]/g, ""))}
                        />
                        {search && <button className="ui__search-x" onClick={() => setSearch("")}>{I.close}</button>}
                    </div>

                    <select className="ui__select" value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="all">{t("uiAllCategories")}</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
                    </select>

                    <select className="ui__select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                        <option value="all">{t("uiAllPriorities")}</option>
                        {PRIORITIES.map((p) => <option key={p} value={p}>{priLabel(p)}</option>)}
                    </select>

                    <button
                        className={`ui__toggle ${mineOnly ? "is-on" : ""}`}
                        onClick={() => setMineOnly((v) => !v)}
                    >
                        {I.hand} {t("uiAssignedToMe")}
                    </button>
                </div>

                {/* ---------- list + detail ---------- */}
                <div className={`ui__layout ${selected ? "has-detail" : ""}`}>

                    <div className="ui__list">
                        {loading ? (
                            <div className="ui__empty"><span className="ui__spin" /> {t("loading")}</div>
                        ) : visible.length === 0 ? (
                            <div className="ui__empty">
                                {I.inbox}
                                <span>{items.length === 0
                                    ? (t("uiNoneYet"))
                                    : (t("uiNoMatch"))}</span>
                            </div>
                        ) : (
                            visible.map((it) => (
                                <button
                                    key={it.id}
                                    className={`ui__row ui__row--${statusKey(it.status)} ${selectedId === it.id ? "is-on" : ""}`}
                                    onClick={() => openItem(it.id)}
                                >
                                    <span className={`ui__pri ui__pri--${it.priority}`} title={priLabel(it.priority)} />
                                    <span className="ui__row-body">
                                        <span className="ui__row-top">
                                            <span className="ui__row-title">{it.title}</span>
                                            <span className={`ui__status ui__status--${statusKey(it.status)}`}>{it.status}</span>
                                        </span>
                                        <span className="ui__row-meta">
                                            <span className="ui__cat">{catLabel(it.category)}</span>
                                            <span className="ui__dot" />
                                            <span>{it.reporterName}</span>
                                            <span className="ui__id">{it.reporterId}</span>
                                            <span className="ui__dot" />
                                            <span>{relTime(it.createdMs, i18n.language)}</span>
                                            {it.screenshots.length > 0 && (
                                                <span className="ui__row-shots">{I.image} {it.screenshots.length}</span>
                                            )}
                                        </span>
                                    </span>
                                    <span className="ui__row-people">
                                        {it.assignedTo.slice(0, 3).map((a) => <Avatar key={a.id} name={a.name} src={photoFor(a.id)} />)}
                                        {it.assignedTo.length > 3 && <span className="ui__avatar ui__avatar--more">+{it.assignedTo.length - 3}</span>}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>

                    {/* ---------- detail ---------- */}
                    {selected && (
                        <>
                            <div className="ui__detail-backdrop" onClick={() => setSelectedId(null)} />
                            <aside className="ui__detail">
                                <div className="ui__detail-head">
                                    <span className={`ui__status ui__status--${statusKey(selected.status)}`}>{selected.status}</span>
                                    <button className="ui__detail-x" onClick={() => setSelectedId(null)} aria-label="Close">{I.close}</button>
                                </div>

                                <h2 className="ui__detail-title">{selected.title}</h2>

                                <div className="ui__detail-tags">
                                    <span className="ui__tag">{catLabel(selected.category)}</span>
                                    <span className={`ui__tag ui__tag--pri ui__tag--${selected.priority}`}>
                                        <span className={`ui__pri ui__pri--${selected.priority}`} /> {priLabel(selected.priority)}
                                    </span>
                                </div>

                                <div className="ui__reporter">
                                    <Avatar name={selected.reporterName} src={photoFor(selected.reporterId, selected.reporterPhoto)} />
                                    <span className="ui__reporter-text">
                                        <span className="ui__reporter-name">{selected.reporterName}</span>
                                        <span className="ui__reporter-meta">
                                            {selected.reporterId} · {new Date(selected.createdMs).toLocaleString(i18n.language || undefined, { dateStyle: "medium", timeStyle: "short" })}
                                        </span>
                                    </span>
                                </div>

                                <p className="ui__desc">{selected.description}</p>

                                {selected.screenshots.length > 0 && (
                                    <div className="ui__section">
                                        <span className="ui__section-label">{I.image} {t("uiScreenshots")}</span>
                                        <div className="ui__shots">
                                            {selected.screenshots.map((u, i) => (
                                                <a key={i} href={u} target="_blank" rel="noreferrer" className="ui__shot">
                                                    <img src={u} alt={`screenshot ${i + 1}`} loading="lazy" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="ui__section">
                                    <span className="ui__section-label">{I.user} {t("uiAssignees")}</span>
                                    <div className="ui__assignees">
                                        {selected.assignedTo.length === 0
                                            ? <span className="ui__muted">{t("uiUnassignedYet")}</span>
                                            : selected.assignedTo.map((a) => (
                                                <span className="ui__chip" key={a.id}>
                                                    <Avatar name={a.name} src={photoFor(a.id)} /> {a.name}
                                                    {a.id === currentUserId && <em>{t("you")}</em>}
                                                </span>
                                            ))}
                                    </div>
                                    <button className="ui__btn ui__btn--ghost ui__btn--sm" onClick={() => assignToMe(selected)} disabled={saving}>
                                        {I.hand} {selected.assignedIds.includes(currentUserId)
                                            ? (t("uiUnassignMe"))
                                            : (t("uiAssignMe"))}
                                    </button>
                                </div>

                                <div className="ui__section">
                                    <span className="ui__section-label">{I.note} {t("uiAdminNote")} <span className="ui__muted">({t("uiInternal")})</span></span>
                                    <textarea
                                        className="ui__note"
                                        rows={3}
                                        maxLength={2000}
                                        placeholder={t("uiNotePh")}
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                    />
                                    <button
                                        className="ui__btn ui__btn--ghost ui__btn--sm"
                                        onClick={() => saveNote(selected)}
                                        disabled={saving || note.trim() === (selected.adminNote || "").trim()}
                                    >
                                        {I.check} {t("uiSaveNote")}
                                    </button>
                                </div>

                                <div className="ui__section ui__section--status">
                                    <span className="ui__section-label">{t("uiSetStatus")}</span>
                                    <div className="ui__status-btns">
                                        {STATUSES.map((s) => (
                                            <button
                                                key={s}
                                                className={`ui__status-btn ui__status-btn--${statusKey(s)} ${selected.status === s ? "is-on" : ""}`}
                                                onClick={() => changeStatus(selected, s)}
                                                disabled={saving || selected.status === s}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                    {selected.resolvedBy && statusKey(selected.status) === "resolved" && (
                                        <span className="ui__muted">{t("uiResolvedBy")} {selected.resolvedBy}</span>
                                    )}
                                </div>

                                <div className="ui__detail-foot">
                                    <button className="ui__btn ui__btn--danger ui__btn--sm" onClick={() => remove(selected)} disabled={saving}>
                                        {I.trash} {t("delete")}
                                    </button>
                                </div>
                            </aside>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UserIssues;