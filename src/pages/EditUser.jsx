import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

import "./EditUser.css";

import { useTranslation } from "react-i18next"; // ← ADD

function EditUser() {

    const { t } = useTranslation(); // ← ADD

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

    useEffect(() => {
        fetchUser();
    }, [id]);

    const fetchUser = async () => {
        try {
            const docRef = doc(db, "users", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setName(data.name || "");
                setUserId(data.id || id);
            } else {
                alert(t("userNotFound")); // ← CHANGED
            }
        } catch (error) {
            console.log("Fetch Error:", error);
        }
    };

    const handleUpdate = async () => {
        if (!name.trim() || !userId.trim()) {
            alert(t("fillAllFields")); // ← CHANGED
            return;
        }
        try {
            const oldRef = doc(db, "users", id);
            const newRef = doc(db, "users", userId);
            await setDoc(newRef, {
                name: name.trim(),
                email: `${userId}@dhyan.com`,
                id: userId,
                role: "user"
            });
            if (userId !== id) {
                await deleteDoc(oldRef);
            }
            alert(t("userUpdatedSuccess")); // ← CHANGED
            navigate("/all-users");
        } catch (error) {
            console.log("Update Error:", error);
            alert(t("errorUpdatingUser")); // ← CHANGED
        }
    };

    return (
        <div className="edit-container">

            <button
                className="back-btn"
                onClick={() => navigate("/all-users")}
            >
                ← {t("back")} {/* ← CHANGED */}
            </button>

            <div className="edit-card">
                <div className="edit-card-accent" />

                <h2 className="edit-title">{t("editUser")}</h2> {/* ← CHANGED */}

                <div className="input-group">
                    <label className="input-label">{t("fullName")}</label> {/* ← CHANGED */}
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("enterFullName")} // ← CHANGED
                    />
                </div>

                <div className="input-group">
                    <label className="input-label">{t("userId")}</label> {/* ← CHANGED */}
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder={t("enterUserId")} // ← CHANGED
                    />
                </div>

                <button className="update-btn" onClick={handleUpdate}>
                    <span>{t("updateUser")}</span> {/* ← CHANGED */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </button>

            </div>
        </div>
    );
}

export default EditUser;