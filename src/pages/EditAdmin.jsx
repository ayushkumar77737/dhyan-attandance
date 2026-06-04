import React, { useEffect, useState } from "react";
import "./EditAdmin.css";
import { useNavigate, useParams } from "react-router-dom";

import { db, auth } from "../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import { useTranslation } from "react-i18next";
import useAutoLogout from "../hooks/useAutoLogout";

import logo from "../assets/logo2.png";

function EditAdmin() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams(); // Firestore doc id = Admin ID (e.g. ADMIN1)

    useAutoLogout();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });

    /* ── Guard: only admins can view this page ── */
    const checkAdmin = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) { navigate("/"); return; }
        try {
            const userRef = doc(db, "users", localStorage.getItem("userId"));
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists() || userSnap.data().role !== "admin") {
                navigate("/");
            }
        } catch (err) { console.error(err); navigate("/"); }
    };

    /* ── Load the admin being edited ── */
    const fetchAdmin = async () => {
        try {
            setLoading(true);
            const ref = doc(db, "users", id);
            const snap = await getDoc(ref);
            if (!snap.exists() || snap.data().role !== "admin") {
                setNotFound(true);
                return;
            }
            const data = snap.data();
            setName(data.name || "");
            setEmail(data.email || "");
        } catch (err) {
            console.error(err);
            setNotFound(true);
        } finally {
            setLoading(false);
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

    useEffect(() => {
        checkAdmin();
        fetchAdmin();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    /* ── Save changes ── */
    const handleUpdate = async () => {
        setMsg({ type: "", text: "" });

        const trimmedName = name.trim();
        const trimmedEmail = email.trim();

        if (!trimmedName) {
            setMsg({ type: "error", text: t("nameRequired") });
            return;
        }
        if (!/^[A-Za-z\s.]+$/.test(trimmedName)) {
            setMsg({ type: "error", text: t("nameLettersOnly") });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setMsg({ type: "error", text: t("invalidEmail") });
            return;
        }

        try {
            setSaving(true);
            const ref = doc(db, "users", id);
            await updateDoc(ref, {
                name: trimmedName,
                email: trimmedEmail,
            });
            setMsg({ type: "success", text: t("adminUpdatedSuccess") });
            setTimeout(() => navigate("/all-admins"), 900);
        } catch (err) {
            console.error(err);
            setMsg({ type: "error", text: t("errorUpdatingAdmin") });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="editadmin-container">
            {/* ── Header ── */}
            <div className="editadmin-header">
                <div className="editadmin-header-left">
                    <img src={logo} alt="Logo" className="editadmin-logo" />
                    <div className="editadmin-header-text">
                        <p className="editadmin-portal-label">{t("appTitle")}</p>
                        <h1 className="editadmin-title">{t("editAdmin")}</h1>
                    </div>
                </div>
                <button className="editadmin-back-btn" onClick={() => navigate("/all-admins")}>
                    ← {t("back")}
                </button>
            </div>

            {/* ── Body ── */}
            {loading ? (
                <div className="editadmin-spinner-wrap"><div className="editadmin-spinner" /></div>
            ) : notFound ? (
                <div className="editadmin-empty"><span>📭</span>{t("noAdminsFound")}</div>
            ) : (
                <div className="editadmin-card">
                    <div className="editadmin-id-pill">ID: {id}</div>

                    <label className="editadmin-label">{t("fullName")}</label>
                    <input
                        type="text"
                        className="editadmin-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("enterFullName")}
                    />

                    <label className="editadmin-label">{t("email")}</label>
                    <input
                        type="email"
                        className="editadmin-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("enterEmail")}
                    />

                    {msg.text && (
                        <div className={`editadmin-msg editadmin-msg--${msg.type}`}>{msg.text}</div>
                    )}

                    <button className="editadmin-save-btn" onClick={handleUpdate} disabled={saving}>
                        {saving ? t("saving") : t("updateAdmin")}
                    </button>

                    {/* Note: password is managed in Firebase Auth, not editable here */}
                </div>
            )}
        </div>
    );
}

export default EditAdmin;