import React, { useEffect, useState } from "react";
import "./AccountLock.css";
import { logAdminAction } from "../utils/logAdminAction";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    getDoc
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { SUPER_ADMIN_ID } from "../utils/accessControl";

/* ----------------------------------------------------------------
   Cloudinary
   Mirrors the public_id formula used in utils/cloudinaryUpload.js:
   `${employeeId}_${name with spaces -> underscores}`
   ---------------------------------------------------------------- */
const CLOUD_NAME = "dgvjq9bhl";

const getProfileImageUrl = (employeeId, name = "", size = 160) => {
    if (!employeeId || !name) return "";
    const publicId = `${employeeId}_${name.replace(/\s+/g, "_")}`;
    const transforms = [
        "c_fill", "g_face", `w_${size}`, `h_${size}`, "r_max", "q_auto", "f_auto"
    ].join(",");
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
};

/* Search: capital letters, digits and spaces only. */
const sanitizeSearch = (v) =>
    (v || "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 40);

/* ---------------------------------------------------------------- */
/* Inline icons                                                      */
/* ---------------------------------------------------------------- */
const IcoChevron = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" className="aclk__ico">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const IcoShield = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="aclk__ico">
        <path d="M12 2.5 4.5 5.4v5.8c0 4.6 3.1 8.6 7.5 9.8 4.4-1.2 7.5-5.2 7.5-9.8V5.4L12 2.5z" />
    </svg>
);

const IcoCheck = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="aclk__ico">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.2 12.3l2.6 2.6 5-5.2" />
    </svg>
);

const IcoSearch = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="aclk__ico">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.6-3.6" />
    </svg>
);

const IcoClose = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" className="aclk__ico">
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

const IcoLock = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="aclk__ico">
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.6" />
        <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </svg>
);

const IcoUnlock = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="aclk__ico">
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.6" />
        <path d="M8 10.5V7.8a4 4 0 0 1 7.6-1.7" />
    </svg>
);

const IcoCrown = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="aclk__ico">
        <path d="M3 8l4.2 3.1L12 4l4.8 7.1L21 8l-1.6 10H4.6L3 8z" />
    </svg>
);

/* ---------------------------------------------------------------- */
/* Avatar                                                            */
/* ---------------------------------------------------------------- */
function AdminAvatar({ src, name, locked, label }) {
    const [showImage, setShowImage] = useState(Boolean(src));
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setShowImage(Boolean(src));
        setLoaded(false);
    }, [src]);

    return (
        <div className={`aclk__avatar ${locked ? "aclk__avatar--off" : "aclk__avatar--on"}`}>
            {showImage ? (
                <img
                    src={src}
                    alt={label}
                    className={`aclk__avatar-img${loaded ? " is-loaded" : ""}`}
                    loading="lazy"
                    onLoad={() => setLoaded(true)}
                    onError={() => setShowImage(false)}
                />
            ) : (
                <span>{name ? name.charAt(0).toUpperCase() : "?"}</span>
            )}
        </div>
    );
}

function AccountLock() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState(null);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [search, setSearch] = useState("");
    const [confirm, setConfirm] = useState(null);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

    const currentUserId = (localStorage.getItem("userId") || "").toUpperCase();

    /* Only the super admin may lock other admins. A regular admin who
       could lock peers could lock the super admin's colleagues and leave
       the portal unmanaged. */
    const checkAdmin = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser || !currentUserId) {
            navigate("/");
            return;
        }
        try {
            const userSnap = await getDoc(doc(db, "users", currentUserId));
            if (
                !userSnap.exists() ||
                userSnap.data().role !== "admin" ||
                userSnap.data().uid !== auth.currentUser.uid
            ) {
                navigate("/");
                return;
            }
            if (currentUserId !== SUPER_ADMIN_ID) {
                navigate("/admin-dashboard");
                return;
            }
            fetchAdmins();
        } catch (error) {
            console.error(error);
            navigate("/");
        }
    };

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
        checkAdmin();
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, "users"));
            const list = [];
            snapshot.forEach((docItem) => {
                const data = docItem.data();
                if (data.role !== "admin" || data.deleted === true) return;

                const idNo = String(data.id || docItem.id).toUpperCase();
                const name = data.name || "";
                const stored =
                    data.profileImage || data.photoURL ||
                    data.profileImageUrl || data.imageUrl;

                list.push({
                    docId: docItem.id,
                    name,
                    idNo,
                    email: data.email || "",
                    photo: stored || getProfileImageUrl(idNo, name),
                    locked: data.disabled === true,
                    lockedAt: data.lockedAt || null,
                    isSuper: idNo === SUPER_ADMIN_ID,
                    isSelf: idNo === currentUserId,
                });
            });
            /* Super admin pinned first, then A→Z by ID. */
            list.sort((a, b) =>
                (b.isSuper - a.isSuper) || a.idNo.localeCompare(b.idNo)
            );
            setAdmins(list);
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

    /* Locking is destructive enough (it signs someone out of admin work)
       to warrant a confirm. Unlocking is immediate. */
    const requestToggle = (admin) => {
        if (admin.isSuper || admin.isSelf) return;
        if (admin.locked) {
            performToggle(admin);
        } else {
            setConfirm(admin);
        }
    };

    const performToggle = async (admin) => {
        if (!admin?.docId || admin.isSuper || admin.isSelf) return;

        setConfirm(null);
        setTogglingId(admin.docId);
        try {
            const willLock = !admin.locked;
            const now = new Date().toISOString();

            await updateDoc(doc(db, "users", admin.docId), {
                disabled: willLock,
                lockedAt: willLock ? now : null,
                lockedBy: willLock ? currentUserId : null,
            });

            await logAdminAction("toggle_admin_lock", {
                targetId: admin.idNo,
                details: willLock
                    ? t("logLockedAdmin", { name: admin.name, idNo: admin.idNo })
                    : t("logUnlockedAdmin", { name: admin.name, idNo: admin.idNo }),
            });

            setAdmins((prev) =>
                prev.map((a) =>
                    a.docId === admin.docId
                        ? { ...a, locked: willLock, lockedAt: willLock ? now : null }
                        : a
                )
            );

            showMsg(
                willLock
                    ? t("adminLockedMsg", { name: admin.name, idNo: admin.idNo })
                    : t("adminUnlockedMsg", { name: admin.name, idNo: admin.idNo }),
                willLock ? "error" : "success"
            );
        } catch (error) {
            console.error(error);
            showMsg(t("errorUpdatingStatus"), "error");
        } finally {
            setTogglingId(null);
        }
    };

    const q = search.trim().toUpperCase();
    const filtered = admins.filter(
        (a) =>
            !q ||
            (a.name || "").toUpperCase().includes(q) ||
            (a.idNo || "").toUpperCase().includes(q)
    );

    const lockableCount = admins.filter((a) => !a.isSuper).length;
    const activeCount = admins.filter((a) => !a.locked).length;
    const lockedCount = admins.filter((a) => a.locked).length;

    const formatDate = (v) => {
        if (!v) return "";
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
    };

    return (
        <div className="aclk__page" data-theme={theme}>

            <div className="aclk__blob aclk__blob--1" />
            <div className="aclk__blob aclk__blob--2" />
            <div className="aclk__dots aclk__dots--1" />
            <div className="aclk__dots aclk__dots--2" />

            <button className="aclk__back-btn" onClick={() => navigate("/admin-dashboard")}>
                <IcoChevron /> {t("back")}
            </button>

            <div className="aclk__shell">

                <div className="aclk__hero">
                    <div className="aclk__hero-badge">
                        <span className="aclk__badge-dot" />
                        {t("superAdmin")}
                    </div>
                    <h1 className="aclk__hero-title">{t("accountLock")}</h1>
                    <p className="aclk__hero-sub">{t("accountLockSub")}</p>
                </div>

                {message.text && (
                    <div className={`aclk__msg aclk__msg--${message.type}`}>
                        {message.text}
                    </div>
                )}

                {!loading && (
                    <div className="aclk__stats">
                        <div className="aclk__stat-card aclk__stat-card--total">
                            <span className="aclk__stat-icon"><IcoShield /></span>
                            <span className="aclk__stat-text">
                                <span className="aclk__stat-num">{admins.length}</span>
                                <span className="aclk__stat-lbl">{t("totalAdmins")}</span>
                            </span>
                        </div>
                        <div className="aclk__stat-card aclk__stat-card--active">
                            <span className="aclk__stat-icon"><IcoCheck /></span>
                            <span className="aclk__stat-text">
                                <span className="aclk__stat-num">{activeCount}</span>
                                <span className="aclk__stat-lbl">{t("active")}</span>
                            </span>
                        </div>
                        <div className="aclk__stat-card aclk__stat-card--locked">
                            <span className="aclk__stat-icon"><IcoLock /></span>
                            <span className="aclk__stat-text">
                                <span className="aclk__stat-num">{lockedCount}</span>
                                <span className="aclk__stat-lbl">{t("locked")}</span>
                            </span>
                        </div>
                    </div>
                )}

                <div className="aclk__search-wrap">
                    <div className="aclk__search-inner">
                        <span className="aclk__search-icon"><IcoSearch /></span>
                        <input
                            className="aclk__search"
                            type="text"
                            placeholder={t("searchByNameOrId")}
                            value={search}
                            maxLength={40}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(e) => setSearch(sanitizeSearch(e.target.value))}
                            onKeyDown={(e) => {
                                if (
                                    e.key.length === 1 &&
                                    !/^[a-zA-Z0-9 ]$/.test(e.key) &&
                                    !(e.ctrlKey || e.metaKey)
                                ) e.preventDefault();
                            }}
                            onPaste={(e) => {
                                e.preventDefault();
                                const clean = sanitizeSearch(e.clipboardData.getData("text"));
                                setSearch((prev) => (prev + clean).slice(0, 40));
                            }}
                        />
                        {search && (
                            <button
                                className="aclk__search-clear"
                                onClick={() => setSearch("")}
                                aria-label={t("clearSearch")}
                            >
                                <IcoClose />
                            </button>
                        )}
                    </div>

                    <p className="aclk__note">
                        <IcoShield />
                        {t("accountLockNote", { count: lockableCount })}
                    </p>
                </div>

                {loading && (
                    <div className="aclk__loading">
                        <div className="aclk__loader">
                            <div className="aclk__loader-ring" />
                            <div className="aclk__loader-ring aclk__loader-ring--2" />
                        </div>
                        <p>{t("loading")}</p>
                    </div>
                )}

                {!loading && (
                    <div className="aclk__list">
                        {filtered.length === 0 ? (
                            <div className="aclk__empty">
                                <span className="aclk__empty-icon"><IcoSearch /></span>
                                <p>{t("noAdminsFound")}</p>
                            </div>
                        ) : (
                            filtered.map((admin, index) => {
                                const protectedRow = admin.isSuper || admin.isSelf;
                                return (
                                    <div
                                        key={admin.docId}
                                        className={`aclk__row ${admin.locked ? "aclk__row--locked" : ""} ${admin.isSuper ? "aclk__row--super" : ""}`}
                                        style={{ animationDelay: `${index * 0.04}s` }}
                                    >
                                        <AdminAvatar
                                            src={admin.photo}
                                            name={admin.name}
                                            locked={admin.locked}
                                            label={admin.name || t("profilePhoto")}
                                        />

                                        <div className="aclk__info">
                                            <span className="aclk__name">
                                                {admin.name || "—"}
                                                {admin.isSuper && (
                                                    <span className="aclk__super-tag"><IcoCrown />{t("superAdmin")}</span>
                                                )}
                                                {admin.isSelf && !admin.isSuper && (
                                                    <span className="aclk__you-tag">{t("you")}</span>
                                                )}
                                            </span>
                                            <span className="aclk__meta">
                                                <span className="aclk__id-chip">{admin.idNo}</span>
                                                {admin.email && <span className="aclk__email">{admin.email}</span>}
                                            </span>
                                            {admin.locked && admin.lockedAt && (
                                                <span className="aclk__locked-at">
                                                    {t("lockedOn")} {formatDate(admin.lockedAt)}
                                                </span>
                                            )}
                                        </div>

                                        <div className={`aclk__status ${admin.locked ? "aclk__status--off" : "aclk__status--on"}`}>
                                            <span className="aclk__status-dot" />
                                            {admin.locked ? t("locked") : t("active")}
                                        </div>

                                        {protectedRow ? (
                                            <span className="aclk__protected" title={t("cannotLockThis")}>
                                                <IcoShield /> {t("protected")}
                                            </span>
                                        ) : (
                                            <button
                                                className={`aclk__btn ${admin.locked ? "aclk__btn--unlock" : "aclk__btn--lock"}`}
                                                onClick={() => requestToggle(admin)}
                                                disabled={togglingId === admin.docId}
                                            >
                                                {togglingId === admin.docId ? (
                                                    <span className="aclk__btn-spin" />
                                                ) : (
                                                    <>
                                                        {admin.locked ? <IcoUnlock /> : <IcoLock />}
                                                        {admin.locked ? t("unlock") : t("lock")}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {confirm && (
                <div className="aclk__modal-overlay" onClick={() => setConfirm(null)}>
                    <div className="aclk__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="aclk__modal-icon"><IcoLock /></div>
                        <h3 className="aclk__modal-title">{t("lockAdminTitle")}</h3>
                        <p className="aclk__modal-msg">
                            {t("lockAdminMsg", { name: confirm.name, idNo: confirm.idNo })}
                        </p>
                        <div className="aclk__modal-actions">
                            <button className="aclk__modal-btn aclk__modal-btn--cancel" onClick={() => setConfirm(null)}>
                                {t("cancel")}
                            </button>
                            <button className="aclk__modal-btn aclk__modal-btn--confirm" onClick={() => performToggle(confirm)}>
                                <IcoLock /> {t("yesLock")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AccountLock;