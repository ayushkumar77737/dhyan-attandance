import React, { useEffect, useMemo, useState } from "react";
import "./AccessControl.css";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { logAdminAction } from "../utils/logAdminAction";
import { useTranslation } from "react-i18next";
import {
    SUPER_ADMIN_ID,
    CONTROLLABLE_PAGES,
    fetchAccessConfig,
    saveAccessConfig,
} from "../utils/accessControl";

/* ---------------- icons (inline, no extra deps) ---------------- */
const IconArrow = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
    </svg>
);

const IconUsers = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const IconUser = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const IconSave = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M17 21v-8H7v8" /><path d="M7 3v5h8" />
    </svg>
);

const IconSearch = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.1-4.1" />
    </svg>
);

const IconLock = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2.5" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

/* decorative shield — purely visual, hidden from screen readers */
const ShieldMark = () => (
    <svg className="acsctrl__shield" viewBox="0 0 190 190" aria-hidden="true" focusable="false">
        <defs>
            <linearGradient id="acsctrlShield" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#93b4fd" />
                <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <pattern id="acsctrlDots" width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.6" fill="currentColor" />
            </pattern>
        </defs>
        <rect x="0" y="18" width="96" height="84" fill="url(#acsctrlDots)" opacity=".35" />
        <path
            d="M112 8 L182 34 V92 c0 44-30 72-70 88-40-16-70-44-70-88 V34 Z"
            fill="url(#acsctrlShield)" opacity=".9"
        />
        <path d="M84 96 l18 19 l38-40" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

function AccessControl() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [admins, setAdmins] = useState([]);
    const [config, setConfig] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [query, setQuery] = useState("");
    const [message, setMessage] = useState({ text: "", type: "" });
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const showMsg = (text, type = "success") => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    };

    const guard = async () => {
        const userId = localStorage.getItem("userId");
        if (!auth.currentUser || !userId) { navigate("/"); return false; }
        try {
            const snap = await getDoc(doc(db, "users", userId));
            if (
                !snap.exists() ||
                snap.data().role !== "admin" ||
                snap.data().uid !== auth.currentUser.uid
            ) {
                navigate("/");
                return false;
            }
            if (userId.toUpperCase() !== SUPER_ADMIN_ID) { navigate("/admin-dashboard"); return false; }
            return true;
        } catch (e) { console.error(e); navigate("/"); return false; }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "users"));
            const list = [];
            snap.forEach((d) => {
                const u = d.data();
                if (u.role === "admin" && u.deleted !== true && d.id.toUpperCase() !== SUPER_ADMIN_ID) {
                    list.push({
                        id: String(d.id).toUpperCase(),
                        name: String(u.name || d.id).substring(0, 50)
                    });
                }
            });
            setAdmins(list);
            setConfig((await fetchAccessConfig()) || {});
        } catch (e) {
            console.error(e);
            showMsg(t("aclLoadError"), "error");
        } finally {
            setLoading(false);
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
        (async () => { const ok = await guard(); if (ok) loadData(); })();
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    const getEntry = (pageId) => config[pageId] || { mode: "all", admins: [] };

    const setMode = (pageId, mode) =>
        setConfig((prev) => ({
            ...prev,
            [pageId]: { mode, admins: prev[pageId]?.admins || [] },
        }));

    const toggleAdmin = (pageId, adminId) =>
        setConfig((prev) => {
            const entry = prev[pageId] || { mode: "selected", admins: [] };
            const has = entry.admins.includes(adminId);
            const next = has
                ? entry.admins.filter((a) => a !== adminId)
                : [...new Set([...entry.admins, adminId])];
            return { ...prev, [pageId]: { mode: "selected", admins: next } };
        });

    const handleSave = async () => {
        setSaving(true);
        try {
            if (!config || typeof config !== "object") {
                showMsg(t("aclSaveError"), "error");
                return;
            }
            await saveAccessConfig(config);
            await logAdminAction("update_access_control", { details: t("logUpdatedAccessControl") });
            showMsg(t("aclSaved"), "success");
        } catch (e) {
            console.error(e);
            showMsg(t("aclSaveError"), "error");
        } finally {
            setSaving(false);
        }
    };

    const restrictedCount = useMemo(
        () => CONTROLLABLE_PAGES.filter((p) => (config[p.id]?.mode || "all") === "selected").length,
        [config]
    );

    const visiblePages = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return CONTROLLABLE_PAGES;
        return CONTROLLABLE_PAGES.filter(
            (p) =>
                String(t(p.labelKey)).toLowerCase().includes(q) ||
                String(p.path).toLowerCase().includes(q)
        );
    }, [query, t]);

    return (
        <div className="acsctrl__page" data-theme={theme}>
            <div className="acsctrl__wash" />

            <div className="acsctrl__shell">
                <button className="acsctrl__back" onClick={() => navigate("/admin-dashboard")}>
                    <IconArrow /> {t("back")}
                </button>

                <header className="acsctrl__header">
                    <div className="acsctrl__head-text">
                        <span className="acsctrl__eyebrow">
                            <span className="acsctrl__eyebrow-dot" />{t("adminPanel")}
                        </span>

                        <h1 className="acsctrl__title">
                            <span className="acsctrl__title-icon"><IconLock /></span>
                            {t("accessControl")}
                        </h1>

                        <p className="acsctrl__subtitle">{t("aclSubtitle")}</p>
                    </div>

                    <div className="acsctrl__head-side">
                        <ShieldMark />
                        <button className="acsctrl__save-btn" onClick={handleSave} disabled={saving || loading}>
                            <IconSave />
                            {saving ? t("saving") : t("saveChanges")}
                        </button>
                    </div>
                </header>

                {message.text && (
                    <div className={`acsctrl__msg acsctrl__msg--${message.type}`} role="status">
                        {message.text}
                    </div>
                )}

                {loading ? (
                    <div className="acsctrl__loading"><div className="acsctrl__ring" /><p>{t("loading")}</p></div>
                ) : (
                    <>
                        <div className="acsctrl__toolbar">
                            <div className="acsctrl__stats">
                                <span className="acsctrl__count">
                                    <b>{visiblePages.length}</b> {t("aclPagesLabel")}
                                </span>
                                {restrictedCount > 0 && (
                                    <span className="acsctrl__pill-stat">
                                        {t("aclRestrictedLabel", { count: restrictedCount })}
                                    </span>
                                )}
                            </div>

                            <label className="acsctrl__search">
                                <IconSearch />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={t("aclSearchPlaceholder")}
                                />
                            </label>
                        </div>

                        {visiblePages.length === 0 ? (
                            <div className="acsctrl__empty">
                                <p className="acsctrl__empty-title">{t("aclNoResultsTitle")}</p>
                                <p className="acsctrl__empty-hint">{t("aclNoResultsHint")}</p>
                            </div>
                        ) : (
                            <div className="acsctrl__cards">
                                {visiblePages.map((page) => {
                                    const entry = getEntry(page.id);
                                    const isSelected = entry.mode === "selected";
                                    return (
                                        <div key={page.id} className={`acsctrl__card ${isSelected ? "acsctrl__card--restricted" : ""}`}>
                                            <div className="acsctrl__card-head">
                                                <span className="acsctrl__page-name">{t(page.labelKey)}</span>
                                                <span className="acsctrl__page-path">{page.path}</span>
                                            </div>

                                            <div className="acsctrl__seg" role="group" aria-label={t(page.labelKey)}>
                                                <button
                                                    type="button"
                                                    aria-pressed={!isSelected}
                                                    className={`acsctrl__seg-btn acsctrl__seg-btn--all ${!isSelected ? "is-active" : ""}`}
                                                    onClick={() => setMode(page.id, "all")}
                                                >
                                                    <IconUsers /> {t("aclAllAdmins")}
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-pressed={isSelected}
                                                    className={`acsctrl__seg-btn acsctrl__seg-btn--sel ${isSelected ? "is-active" : ""}`}
                                                    onClick={() => setMode(page.id, "selected")}
                                                >
                                                    <IconUser /> {t("aclSelectedAdmins")}
                                                </button>
                                            </div>

                                            {isSelected && (
                                                <div className="acsctrl__admins">
                                                    {admins.length === 0 ? (
                                                        <p className="acsctrl__no-admins">{t("aclNoOtherAdmins")}</p>
                                                    ) : (
                                                        admins.map((a) => {
                                                            const checked = entry.admins.includes(a.id);
                                                            return (
                                                                <label key={a.id} className={`acsctrl__chip ${checked ? "acsctrl__chip--on" : ""}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={() => toggleAdmin(page.id, a.id)}
                                                                    />
                                                                    <span className="acsctrl__chip-avatar">
                                                                        {(a.name || a.id).charAt(0).toUpperCase()}
                                                                    </span>
                                                                    <span className="acsctrl__chip-name">{a.name}</span>
                                                                    <span className="acsctrl__chip-id">{a.id}</span>
                                                                </label>
                                                            );
                                                        })
                                                    )}
                                                    <p className="acsctrl__hint">{t("aclSuperNote", { id: SUPER_ADMIN_ID })}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default AccessControl;