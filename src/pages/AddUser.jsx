import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AddUser.css";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, secondaryAuth } from "../firebase/firebase"; // ✅ added secondaryAuth
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { useTranslation } from "react-i18next";

import guruji from "../assets/guruji.webp";
import bgImage from "../assets/bg1.webp";

function AddUser() {

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

    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [idNo, setIdNo] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const clearMessages = () => {
        setTimeout(() => {
            setMessage("");
            setErrorMsg("");
        }, 3000);
    };

    const handleAddUser = async (e) => {

        e.preventDefault();
        setMessage("");
        setErrorMsg("");
        setLoading(true);

        if (!/^[a-zA-Z ]+$/.test(name)) {
            setErrorMsg(t("nameLettersOnly"));
            setLoading(false);
            clearMessages();
            return;
        }

        if (!/^[a-zA-Z0-9]+$/.test(idNo)) {
            setErrorMsg(t("idLettersNumbers"));
            setLoading(false);
            clearMessages();
            return;
        }

        if (!/^[a-zA-Z0-9]+$/.test(password)) {
            setErrorMsg(t("noSpecialChars"));
            setLoading(false);
            clearMessages();
            return;
        }

        try {
            const email = idNo + "@dhyan.com";

            // ✅ Using secondaryAuth so admin stays logged in
            await createUserWithEmailAndPassword(secondaryAuth, email, password);

            await setDoc(doc(db, "users", idNo), {
                name: name,
                id: idNo,
                email: email,
                role: "user",
                deleted: false,
                createdAt: serverTimestamp()
            });

            setMessage(t("userAddedSuccess"));
            setName("");
            setIdNo("");
            setPassword("");
            setLoading(false);
            clearMessages();

        } catch (error) {

            if (error.code === "auth/email-already-in-use") {
                setErrorMsg(t("userIdExists"));
            } else if (error.code === "auth/weak-password") {
                setErrorMsg(t("weakPassword"));
            } else {
                setErrorMsg(t("somethingWentWrong"));
            }

            setName("");
            setIdNo("");
            setPassword("");
            setLoading(false);
            clearMessages();
        }
    };

    return (
        <div
            className="adduser-container"
            style={{ backgroundImage: `url(${bgImage})` }}
        >
            <div className="adduser-card">

                <div className="adduser-image">
                    <img src={guruji} alt="Guruji" />
                </div>

                <form className="adduser-form" onSubmit={handleAddUser}>

                    <h2>{t("addNewUser")}</h2>

                    {message && <div className="success-message">{message}</div>}
                    {errorMsg && <div className="error-message">{errorMsg}</div>}

                    <input
                        type="text"
                        placeholder={t("enterFullName")}
                        value={name}
                        maxLength={30}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (/^[a-zA-Z ]*$/.test(value)) setName(value);
                        }}
                        required
                    />

                    <input
                        type="text"
                        placeholder={t("enterIdNumber")}
                        value={idNo}
                        maxLength={10}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (/^[a-zA-Z0-9]*$/.test(value)) setIdNo(value);
                        }}
                        required
                    />

                    <input
                        type="password"
                        placeholder={t("enterPassword")}
                        value={password}
                        maxLength={10}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (/^[a-zA-Z0-9]*$/.test(value)) setPassword(value);
                        }}
                        required
                    />

                    <button type="submit" disabled={loading}>
                        {loading ? t("pleaseWait") : t("addUser")}
                    </button>

                    <button
                        type="button"
                        className="back-btn"
                        onClick={() => navigate("/admin-dashboard")}
                    >
                        {t("back")}
                    </button>

                </form>
            </div>
        </div>
    );
}

export default AddUser;