import React, { useEffect, useState } from "react";
import "./ToggleStatus.css";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

function ToggleStatus() {

    const { t } = useTranslation();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState(null);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [search, setSearch] = useState("");

    useEffect(() => {
        const disableRightClick = (e) => e.preventDefault();
        const disableInspectKeys = (e) => {
            if (e.key === "F12") e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase()))
                e.preventDefault();
            if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
        };
        document.addEventListener("contextmenu", disableRightClick);
        document.addEventListener("keydown", disableInspectKeys);
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, "users"));
            const list = [];
            snapshot.forEach((docItem) => {
                const data = docItem.data();
                if (!data.deleted) {
                    list.push({
                        docId: docItem.id,
                        name: data.name || "",
                        idNo: data.idNo || data.userId || docItem.id,
                        disabled: data.disabled === true,
                    });
                }
            });
            list.sort((a, b) => a.idNo.localeCompare(b.idNo));
            setUsers(list);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const showMsg = (text, type = "success") => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    };

    const handleToggle = async (user) => {
        setTogglingId(user.docId);
        try {
            const newStatus = !user.disabled;
            await updateDoc(doc(db, "users", user.docId), {
                disabled: newStatus
            });
            setUsers((prev) =>
                prev.map((u) =>
                    u.docId === user.docId ? { ...u, disabled: newStatus } : u
                )
            );
            showMsg(
                newStatus
                    ? t("userDisabledMsg", { name: user.name, idNo: user.idNo })
                    : t("userEnabledMsg", { name: user.name, idNo: user.idNo }),
                newStatus ? "error" : "success"
            );
        } catch (error) {
            console.error(error);
            showMsg(t("errorUpdatingStatus"), "error");
        } finally {
            setTogglingId(null);
        }
    };

    const handleToggleAll = async () => {
        const allDisabled = users.every((u) => u.disabled);
        const newStatus = !allDisabled; // if all disabled → enable all; else → disable all
        setTogglingId("__all__");
        try {
            await Promise.all(
                users.map((user) =>
                    updateDoc(doc(db, "users", user.docId), { disabled: newStatus })
                )
            );
            setUsers((prev) => prev.map((u) => ({ ...u, disabled: newStatus })));
            showMsg(
                newStatus ? t("allDisabledMsg") : t("allEnabledMsg"),
                newStatus ? "error" : "success"
            );
        } catch (error) {
            console.error(error);
            showMsg(t("errorUpdatingStatus"), "error");
        } finally {
            setTogglingId(null);
        }
    };

    const filtered = users.filter(
        (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.idNo.toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = users.filter((u) => !u.disabled).length;
    const disabledCount = users.filter((u) => u.disabled).length;
    const allDisabled = users.length > 0 && users.every((u) => u.disabled);

    return (
        <div className="tgls__page">

            <div className="tgls__orb tgls__orb--1" />
            <div className="tgls__orb tgls__orb--2" />
            <div className="tgls__orb tgls__orb--3" />
            <div className="tgls__grid" />

            {/* Back */}
            <button className="tgls__back-btn" onClick={() => navigate("/admin-dashboard")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("back")}
            </button>

            {/* Hero */}
            <div className="tgls__hero">
                <div className="tgls__hero-badge">
                    <span className="tgls__badge-dot" />
                    {t("adminPanel")}
                </div>
                <h1 className="tgls__hero-title">{t("toggleStatus")}</h1>
                <p className="tgls__hero-sub">{t("toggleStatusSub")}</p>
            </div>

            {/* Message */}
            {message.text && (
                <div className={`tgls__msg tgls__msg--${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Stats */}
            {!loading && (
                <div className="tgls__stats">
                    <div className="tgls__stat-card">
                        <div className="tgls__stat-icon">👥</div>
                        <span className="tgls__stat-num">{users.length}</span>
                        <span className="tgls__stat-lbl">{t("totalUsers")}</span>
                    </div>
                    <div className="tgls__stat-card tgls__stat-card--active">
                        <div className="tgls__stat-icon">✅</div>
                        <span className="tgls__stat-num tgls__num--active">{activeCount}</span>
                        <span className="tgls__stat-lbl">{t("active")}</span>
                    </div>
                    <div className="tgls__stat-card tgls__stat-card--disabled">
                        <div className="tgls__stat-icon">🚫</div>
                        <span className="tgls__stat-num tgls__num--disabled">{disabledCount}</span>
                        <span className="tgls__stat-lbl">{t("disabled")}</span>
                    </div>
                </div>
            )}

            {/* Search */}
            {/* Search */}
            <div className="tgls__search-wrap">

                {/* ✅ New inner wrapper */}
                <div className="tgls__search-inner">
                    <span className="tgls__search-icon">🔍</span>
                    <input
                        className="tgls__search"
                        type="text"
                        placeholder={t("searchByNameOrId")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="tgls__search-clear" onClick={() => setSearch("")}>✕</button>
                    )}
                </div>

                <button
                    className={`tgls__bulk-btn ${allDisabled ? "tgls__bulk-btn--enable" : "tgls__bulk-btn--disable"}`}
                    onClick={handleToggleAll}
                    disabled={togglingId === "__all__" || users.length === 0}
                >
                    {togglingId === "__all__" ? (
                        <span className="tgls__btn-spin" />
                    ) : (
                        <>
                            <span>{allDisabled ? "🔓" : "🔒"}</span>
                            {allDisabled ? t("enableAll") : t("disableAll")}
                        </>
                    )}
                </button>

            </div>

            {/* Loading */}
            {loading && (
                <div className="tgls__loading">
                    <div className="tgls__loader">
                        <div className="tgls__loader-ring" />
                        <div className="tgls__loader-ring tgls__loader-ring--2" />
                    </div>
                    <p>{t("loading")}</p>
                </div>
            )}

            {/* User List */}
            {!loading && (
                <div className="tgls__list">
                    {filtered.length === 0 ? (
                        <div className="tgls__empty">
                            <span className="tgls__empty-icon">🔍</span>
                            <p>{t("noUsersFound")}</p>
                        </div>
                    ) : (
                        filtered.map((user, index) => (
                            <div
                                key={user.docId}
                                className={`tgls__row ${user.disabled ? "tgls__row--disabled" : ""}`}
                                style={{ animationDelay: `${index * 0.04}s` }}
                            >
                                {/* Avatar */}
                                <div className={`tgls__avatar ${user.disabled ? "tgls__avatar--off" : "tgls__avatar--on"}`}>
                                    {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                                </div>

                                {/* Info */}
                                <div className="tgls__info">
                                    <span className="tgls__name">{user.name}</span>
                                    <span className="tgls__id-chip">{user.idNo}</span>
                                </div>

                                {/* Status badge */}
                                <div className={`tgls__status ${user.disabled ? "tgls__status--off" : "tgls__status--on"}`}>
                                    <span className="tgls__status-dot" />
                                    {user.disabled ? t("disabled") : t("active")}
                                </div>

                                {/* Toggle Button */}
                                <button
                                    className={`tgls__btn ${user.disabled ? "tgls__btn--enable" : "tgls__btn--disable"}`}
                                    onClick={() => handleToggle(user)}
                                    disabled={togglingId === user.docId}
                                >
                                    {togglingId === user.docId ? (
                                        <span className="tgls__btn-spin" />
                                    ) : (
                                        <>
                                            <span className="tgls__btn-icon">
                                                {user.disabled ? "🔓" : "🔒"}
                                            </span>
                                            {user.disabled ? t("enable") : t("disable")}
                                        </>
                                    )}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

        </div>
    );
}

export default ToggleStatus;