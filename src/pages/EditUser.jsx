import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { logAdminAction } from "../utils/logAdminAction";
import { db, auth } from "../firebase/firebase";
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";

import "./EditUser.css";

import { useTranslation } from "react-i18next";

function EditUser() {

    const { t } = useTranslation();

    useEffect(() => {
        const disableRightClick = (e) => e.preventDefault();
        const disableInspectKeys = (e) => {
            if (e.key === "F12") e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase()))
                e.preventDefault();
            if (e.ctrlKey && e.key.toUpperCase() === "U")
                e.preventDefault();
        };
        document.addEventListener("contextmenu", disableRightClick);
        document.addEventListener("keydown", disableInspectKeys);
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    const { id } = useParams();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [userId, setUserId] = useState("");
    const [email, setEmail] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");
    const checkAdmin = async () => {

        const currentUser = auth.currentUser;

        if (!currentUser) {
            navigate("/");
            return;
        }

        try {

            const userRef = doc(db, "users", localStorage.getItem("userId"));
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                navigate("/");
                return;
            }

            const userData = userSnap.data();

            if (
                userData.role !== "admin" ||
                userData.uid !== auth.currentUser.uid
            ) {
                navigate("/");
                return;
            }

            fetchUser();

        } catch (error) {
            console.log(error);
            navigate("/");
        }
    };

    useEffect(() => {
        checkAdmin();
    }, [id]);

    // ← ADD
    const showMessage = (text, type = "error") => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    };

    const fetchUser = async () => {
        try {
            const docRef = doc(db, "users", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setName(data.name || "");
                setUserId(data.id || id);
                setEmail(data.email || "");
            } else {
                showMessage(t("userNotFound"));
            }
        } catch (error) {
            console.log("Fetch Error:", error);
        }
    };

    const handleUpdate = async () => {
        if (!name.trim() || !userId.trim() || !email.trim()) {
            showMessage(t("fillAllFields"));
            return;
        }
        if (!/^[a-zA-Z ]+$/.test(name)) {
            showMessage(t("nameLettersOnly"));
            return;
        }

        if (!/^[a-zA-Z0-9]{4}$/.test(userId)) {
            showMessage(t("idLettersNumbers"));
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage(t("emailInvalid"));
            return;
        }

        setSaving(true);
        try {
            const oldRef = doc(db, "users", id);
            const newRef = doc(db, "users", userId);

            const oldSnap = await getDoc(oldRef);
            const oldData = oldSnap.data();

            if (userId !== id) {
                const existingDoc = await getDoc(newRef);

                if (existingDoc.exists()) {
                    showMessage(t("userIdAlreadyExists"));
                    setSaving(false);
                    return;
                }
            }

            const trimmedEmail = email.trim();
            const emailChanged = trimmedEmail !== (oldData.email || "");

            // Update the Firebase Auth email first — this can only be done
            // by an admin through a server call, never directly from here.
            if (emailChanged && oldData.uid) {
                const idToken = await auth.currentUser.getIdToken();

                const res = await fetch("/api/users/update-email", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        targetUid: oldData.uid,
                        newEmail: trimmedEmail,
                    }),
                });

                const result = await res.json();

                if (!result.success) {
                    showMessage(result.message || t("errorUpdatingUser"));
                    setSaving(false);
                    return;
                }
            }

            await setDoc(newRef, {
                ...oldData,
                name: name.trim(),
                email: trimmedEmail,
                id: userId,
                role: "user"
            });
            if (userId !== id) {
                await deleteDoc(oldRef);
            }
            // 🔹 also sync name into the profiles collection
            const oldProfileRef = doc(db, "profiles", id);
            const oldProfileSnap = await getDoc(oldProfileRef);

            if (oldProfileSnap.exists()) {
                if (userId !== id) {
                    const newProfileRef = doc(db, "profiles", userId);
                    await setDoc(newProfileRef, {
                        ...oldProfileSnap.data(),
                        name: name.trim(),
                        idNo: userId,
                    });
                    await deleteDoc(oldProfileRef);
                } else {
                    await updateDoc(oldProfileRef, { name: name.trim() });
                }
            }
            await logAdminAction("update_user", {
                targetId: userId,
                details: t("logUpdatedUser", { name: name.trim() }),
            });
            showMessage(t("userUpdatedSuccess"), "success");
            setTimeout(() => navigate("/all-users"), 1500);
        } catch (error) {
            console.log("Update Error:", error);
            showMessage(t("errorUpdatingUser"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="edit-container" data-theme={theme}>

            <button
                className="back-btn"
                onClick={() => navigate("/all-users")}
            >
                ← {t("back")}
            </button>

            <div className="edit-card">
                <div className="edit-card-accent" />

                <div className="edit-avatar" aria-hidden="true">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21c0-3.87 3.58-7 8-7s8 3.13 8 7" />
                    </svg>
                </div>

                <h2 className="edit-title">{t("editUser")}</h2>

                <p className="required-note">
                    <span className="required-mark" aria-hidden="true">*</span>
                    {t("mandatoryFieldsNote") || "All fields marked with an asterisk are mandatory"}
                </p>

                {message.text && (
                    <div className={`edit-message ${message.type}`}>
                        {message.type === "error" ? "⚠ " : "✓ "}
                        {message.text}
                    </div>
                )}

                <div className="input-group">
                    <label className="input-label">
                        {t("fullName")}
                        <span className="required-mark" aria-hidden="true">*</span>
                    </label>
                    <div className="input-with-icon">
                        <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 21c0-3.87 3.58-7 8-7s8 3.13 8 7" />
                        </svg>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^[a-zA-Z ]*$/.test(value)) setName(value.toUpperCase());
                            }}
                            placeholder={t("enterFullName")}
                            aria-label={t("fullName")}
                            required
                            aria-required="true"
                        />
                    </div>
                </div>

                <div className="input-group">
                    <label className="input-label">
                        {t("userId")}
                        <span className="required-mark" aria-hidden="true">*</span>
                    </label>
                    <div className="input-with-icon">
                        <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3Z" />
                            <path d="m9 12 2 2 4-4" />
                        </svg>
                        <input
                            type="text"
                            value={userId}
                            maxLength={4}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^[a-zA-Z0-9]*$/.test(value)) setUserId(value);
                            }}
                            placeholder={t("enterUserId")}
                            aria-label={t("userId")}
                            required
                            aria-required="true"
                        />
                    </div>
                </div>

                <div className="input-group">
                    <label className="input-label">
                        {t("emailIdLabel")}
                        <span className="required-mark" aria-hidden="true">*</span>
                    </label>
                    <div className="input-with-icon">
                        <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
                            <polyline points="3 7 12 13.5 21 7" />
                        </svg>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t("enterEmail")}
                            aria-label={t("emailIdLabel")}
                            required
                            aria-required="true"
                        />
                    </div>
                </div>

                <button className="update-btn" onClick={handleUpdate} disabled={saving}>
                    <span>{saving ? t("registering") : t("updateUser")}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </button>

            </div>
        </div>
    );
}

export default EditUser;