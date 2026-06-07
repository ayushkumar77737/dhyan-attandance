import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { logAdminAction } from "../utils/logAdminAction";
import { db, auth } from "../firebase/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

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
    const [message, setMessage] = useState({ text: "", type: "" });
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

            if (userData.role !== "admin") {
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
            } else {
                showMessage(t("userNotFound"));
            }
        } catch (error) {
            console.log("Fetch Error:", error);
        }
    };

    const handleUpdate = async () => {
        if (!name.trim() || !userId.trim()) {
            showMessage(t("fillAllFields"));
            return;
        }
        try {
            const oldRef = doc(db, "users", id);
            const newRef = doc(db, "users", userId);

            if (userId !== id) {
                const existingDoc = await getDoc(newRef);
                if (existingDoc.exists()) {
                    showMessage(t("userIdAlreadyExists"));
                    return;
                }
            }

            await setDoc(newRef, {
                name: name.trim(),
                email: `${userId}@dhyan.com`,
                id: userId,
                role: "user"
            });
            if (userId !== id) {
                await deleteDoc(oldRef);
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
        }
    };

    return (
        <div className="edit-container">

            <button
                className="back-btn"
                onClick={() => navigate("/all-users")}
            >
                ← {t("back")}
            </button>

            <div className="edit-card">
                <div className="edit-card-accent" />

                <h2 className="edit-title">{t("editUser")}</h2>

                {message.text && (
                    <div className={`edit-message ${message.type}`}>
                        {message.type === "error" ? "⚠ " : "✓ "}
                        {message.text}
                    </div>
                )}

                <div className="input-group">
                    <label className="input-label">{t("fullName")}</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("enterFullName")}
                    />
                </div>

                <div className="input-group">
                    <label className="input-label">{t("userId")}</label>
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder={t("enterUserId")}
                    />
                </div>

                <button className="update-btn" onClick={handleUpdate}>
                    <span>{t("updateUser")}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </button>

            </div>
        </div>
    );
}

export default EditUser;