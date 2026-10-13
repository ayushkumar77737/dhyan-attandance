import React, { useEffect, useState } from "react";
import "./DeletedAdmins.css";
import { logAdminAction } from "../utils/logAdminAction";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    updateDoc,
    deleteField,
    doc,
    getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useTranslation } from "react-i18next";

/* ----------------------------------------------------------------
   Cloudinary — same public_id formula as utils/cloudinaryUpload.js
   (`${employeeId}_${name with spaces -> underscores}`), used only as a
   fallback when an admin has no stored photo URL.
   ---------------------------------------------------------------- */
const CLOUD_NAME = "dgvjq9bhl";

const getProfileImageUrl = (employeeId, name = "", size = 60) => {
    if (!employeeId || !name) return "";
    const publicId = `${employeeId}_${name.replace(/\s+/g, "_")}`;
    const transforms = [
        "c_fill",
        "g_face",
        `w_${size}`,
        `h_${size}`,
        "r_max",
        "q_auto",
        "f_auto",
    ].join(",");
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
};

/* Avatar — photo if we have one, initial otherwise */
function DeletedAdminAvatar({ src, name }) {
    const [showImage, setShowImage] = useState(Boolean(src));
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setShowImage(Boolean(src));
        setLoaded(false);
    }, [src]);

    if (showImage) {
        return (
            <img
                src={src}
                alt={name || "-"}
                loading="lazy"
                className={`dad-avatar dad-avatar-img${loaded ? " is-loaded" : ""}`}
                onLoad={() => setLoaded(true)}
                onError={() => setShowImage(false)}
            />
        );
    }

    return (
        <span className="dad-avatar dad-avatar-fallback">
            {(name || "?").charAt(0).toUpperCase()}
        </span>
    );
}

const formatDeletedAt = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

function DeletedAdmins() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restoringId, setRestoringId] = useState(null);
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

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

    const fetchDeletedAdmins = async () => {
        try {
            setLoading(true);

            /* Photos live in `profiles/{ID}.profileImage` — build a lookup first */
            const imageMap = {};
            try {
                const profileSnap = await getDocs(collection(db, "profiles"));
                profileSnap.forEach((p) => {
                    const pd = p.data();
                    if (pd.profileImage) imageMap[String(p.id || "").toUpperCase()] = pd.profileImage;
                });
            } catch (e) {
                console.warn("DeletedAdmins: could not load profile images —", e);
            }

            const snap = await getDocs(collection(db, "users"));
            const list = [];
            snap.forEach((docItem) => {
                const data = docItem.data();
                if (data.role === "admin" && data.deleted === true) {
                    const id = String(data.id || docItem.id).toUpperCase();
                    const name = data.name || "";
                    list.push({
                        docId: docItem.id,
                        id,
                        name,
                        email: data.email || "—",
                        deletedAt: data.deletedAt || "",
                        deletedBy: data.deletedBy ? String(data.deletedBy).toUpperCase() : "—",
                        image:
                            imageMap[id] ||
                            data.profileImage ||
                            data.photoURL ||
                            getProfileImageUrl(docItem.id, name),
                    });
                }
            });

            /* most recently deleted first; admins deleted before we stored a
               timestamp sink to the bottom and sort by ID */
            list.sort((a, b) => {
                if (a.deletedAt && b.deletedAt) return b.deletedAt.localeCompare(a.deletedAt);
                if (a.deletedAt) return -1;
                if (b.deletedAt) return 1;
                return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" });
            });
            setAdmins(list);
        } catch (error) {
            console.log(error);
            setAdmins([]);
        } finally {
            setLoading(false);
        }
    };

    const checkAdmin = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            navigate("/");
            return;
        }
        try {
            const userSnap = await getDoc(doc(db, "users", localStorage.getItem("userId")));
            if (!userSnap.exists()) {
                navigate("/");
                return;
            }
            const userData = userSnap.data();
            if (userData.role !== "admin" || userData.uid !== auth.currentUser.uid) {
                navigate("/");
                return;
            }
            fetchDeletedAdmins();
        } catch (error) {
            console.log(error);
            navigate("/");
        }
    };

    useEffect(() => {
        checkAdmin();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const restoreAdmin = async (id) => {
        if (!id || restoringId) return;
        try {
            setRestoringId(id);
            await updateDoc(doc(db, "users", id), {
                deleted: false,
                deletedAt: deleteField(),
                deletedBy: deleteField(),
            });
            await logAdminAction("restore_admin", {
                targetId: id,
                details: t("logRestoredAdmin", { id }),
            });
            await fetchDeletedAdmins();
        } catch (error) {
            console.log(error);
        } finally {
            setRestoringId(null);
        }
    };

    const exportExcel = () => {
        if (admins.length === 0) {
            alert(t("noDeletedAdminsExport"));
            return;
        }
        const exportData = admins.map((a) => ({
            ID: a.id,
            Name: a.name || "-",
            Email: a.email,
            "Deleted On": formatDeletedAt(a.deletedAt),
            "Deleted By": a.deletedBy,
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Deleted Admins");
        XLSX.writeFile(workbook, "DeletedAdmins.xlsx");
    };

    return (
        <div className="deleted-admins-container" data-theme={theme}>
            <div className="dad-orb dad-orb-1" />
            <div className="dad-orb dad-orb-2" />
            <div className="dad-orb dad-orb-3" />

            <div className="dad-header">
                <button className="dad-back-btn" onClick={() => navigate("/admin-dashboard")}>
                    <span className="dad-back-arrow">←</span>
                    <span>{t("back")}</span>
                </button>

                <button className="dad-export-btn" onClick={exportExcel}>
                    <span className="dad-export-icon">↓</span>
                    {t("exportExcel")}
                </button>
            </div>

            <div className="dad-title-block">
                <div className="dad-eyebrow">{t("adminPanel")}</div>
                <h1 className="dad-title">{t("deletedAdmins")}</h1>
                <div className="dad-title-underline" />
            </div>

            <div className="dad-stats-strip">
                <div className="dad-stat-pill">
                    <span className="dad-stat-icon">🗑️</span>
                    <span className="dad-stat-label">{t("totalDeleted")}</span>
                    <span className="dad-stat-value">{admins.length}</span>
                </div>
            </div>

            <div className="dad-card">
                <div className="dad-table-wrapper">
                    <table className="dad-table">
                        <thead>
                            <tr>
                                <th>{t("id")}</th>
                                <th>{t("name")}</th>
                                <th>{t("email")}</th>
                                <th>{t("deletedOn")}</th>
                                <th>{t("deletedBy")}</th>
                                <th>{t("action")}</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="dad-no-data">
                                        <span className="dad-spinner" />
                                    </td>
                                </tr>
                            ) : admins.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="dad-no-data">
                                        <span className="dad-no-data-icon">📭</span>
                                        <p>{t("noDeletedAdminsFound")}</p>
                                    </td>
                                </tr>
                            ) : (
                                admins.map((admin, index) => (
                                    <tr key={admin.docId} style={{ animationDelay: `${index * 0.05}s` }}>
                                        <td>
                                            <span className="dad-id-badge">{admin.id}</span>
                                        </td>

                                        <td>
                                            <span className="dad-name-cell">
                                                <DeletedAdminAvatar src={admin.image} name={admin.name} />
                                                {admin.name || "-"}
                                            </span>
                                        </td>

                                        <td>{admin.email}</td>
                                        <td>{formatDeletedAt(admin.deletedAt)}</td>
                                        <td>{admin.deletedBy}</td>

                                        <td>
                                            <button
                                                className="dad-restore-btn"
                                                disabled={restoringId === admin.docId}
                                                onClick={() => restoreAdmin(admin.docId)}
                                            >
                                                ↩ {t("restore")}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default DeletedAdmins;