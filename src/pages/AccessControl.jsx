import React, { useEffect, useState } from "react";
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

function AccessControl() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [admins, setAdmins] = useState([]);
    const [config, setConfig] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    const showMsg = (text, type = "success") => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    };

    const guard = async () => {
        const userId = localStorage.getItem("userId");
        if (!auth.currentUser || !userId) { navigate("/"); return false; }
        try {
            const snap = await getDoc(doc(db, "users", userId));
            if (!snap.exists() || snap.data().role !== "admin") { navigate("/"); return false; }
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
                    list.push({ id: d.id, name: u.name || d.id });
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
            const next = has ? entry.admins.filter((a) => a !== adminId) : [...entry.admins, adminId];
            return { ...prev, [pageId]: { mode: "selected", admins: next } };
        });

    const handleSave = async () => {
        setSaving(true);
        try {
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

    return (
        <div className="acsctrl__page">
            <div className="acsctrl__orb acsctrl__orb--1" />
            <div className="acsctrl__orb acsctrl__orb--2" />
            <div className="acsctrl__grid-bg" />

            <button className="acsctrl__back" onClick={() => navigate("/admin-dashboard")}>
                <span>←</span> {t("back")}
            </button>

            <div className="acsctrl__header">
                <div className="acsctrl__eyebrow"><span className="acsctrl__eyebrow-dot" />{t("adminPanel")}</div>
                <h1 className="acsctrl__title">🔐 {t("accessControl")}</h1>
                <p className="acsctrl__subtitle">{t("aclSubtitle")}</p>
            </div>

            {message.text && <div className={`acsctrl__msg acsctrl__msg--${message.type}`}>{message.text}</div>}

            {loading ? (
                <div className="acsctrl__loading"><div className="acsctrl__ring" /><p>{t("loading")}</p></div>
            ) : (
                <>
                    <div className="acsctrl__toolbar">
                        <span className="acsctrl__count">{CONTROLLABLE_PAGES.length} {t("aclPagesLabel")}</span>
                        <button className="acsctrl__save-btn" onClick={handleSave} disabled={saving}>
                            {saving ? t("saving") : `💾 ${t("saveChanges")}`}
                        </button>
                    </div>

                    <div className="acsctrl__cards">
                        {CONTROLLABLE_PAGES.map((page) => {
                            const entry = getEntry(page.id);
                            return (
                                <div key={page.id} className="acsctrl__card">
                                    <div className="acsctrl__card-head">
                                        <span className="acsctrl__page-name">{t(page.labelKey)}</span>
                                        <span className="acsctrl__page-path">{page.path}</span>
                                    </div>

                                    <div className="acsctrl__seg">
                                        <button
                                            className={`acsctrl__seg-btn ${entry.mode === "all" ? "acsctrl__seg-btn--active" : ""}`}
                                            onClick={() => setMode(page.id, "all")}
                                        >
                                            🌐 {t("aclAllAdmins")}
                                        </button>
                                        <button
                                            className={`acsctrl__seg-btn ${entry.mode === "selected" ? "acsctrl__seg-btn--active" : ""}`}
                                            onClick={() => setMode(page.id, "selected")}
                                        >
                                            👤 {t("aclSelectedAdmins")}
                                        </button>
                                    </div>

                                    {entry.mode === "selected" && (
                                        <div className="acsctrl__admins">
                                            {admins.length === 0 ? (
                                                <p className="acsctrl__no-admins">{t("aclNoOtherAdmins")}</p>
                                            ) : (
                                                admins.map((a) => {
                                                    const checked = entry.admins.includes(a.id);
                                                    return (
                                                        <label key={a.id} className={`acsctrl__chip ${checked ? "acsctrl__chip--on" : ""}`}>
                                                            <input type="checkbox" checked={checked} onChange={() => toggleAdmin(page.id, a.id)} />
                                                            <span className="acsctrl__chip-avatar">{(a.name || a.id).charAt(0).toUpperCase()}</span>
                                                            <span className="acsctrl__chip-name">{a.name}</span>
                                                            <span className="acsctrl__chip-id">{a.id}</span>
                                                        </label>
                                                    );
                                                })
                                            )}
                                            <p className="acsctrl__hint">🛡️ {t("aclSuperNote", { id: SUPER_ADMIN_ID })}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

export default AccessControl;