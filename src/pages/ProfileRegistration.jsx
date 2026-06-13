import React, { useEffect, useState } from "react";
import "./ProfileRegistration.css";
import { logAdminAction } from "../utils/logAdminAction";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

function ProfileRegistration() {

    const { t } = useTranslation();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    const [form, setForm] = useState({
        idNo: "",
        name: "",
        fatherHusbandName: "",
        address: "",
        phoneNumber: "",
        email: "",
        phoneType: "",
        dob: ""
    });

    const [errors, setErrors] = useState({});
    const checkAdmin = async () => {

        const currentUser = auth.currentUser;

        if (!currentUser) {
            navigate("/");
            return;
        }

        try {

            const userRef = doc(
                db,
                "users",
                localStorage.getItem("userId")
            );

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
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);
    useEffect(() => {
        checkAdmin();
    }, []);

    const showMsg = (text, type = "error") => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "idNo") {
            setForm({
                ...form,
                [name]: value.toUpperCase()
            });
        } else {
            setForm({
                ...form,
                [name]: value
            });
        }
        if (errors[name]) setErrors({ ...errors, [name]: "" });
    };

    const validateForm = () => {
        const newErrors = {};

        if (!form.idNo.trim()) {
            newErrors.idNo = t("idNoRequired");
        } else if (!/^[a-zA-Z]\d{3}$/.test(form.idNo)) {
            newErrors.idNo = t("idNoFormat");
        }

        if (!form.name.trim()) {
            newErrors.name = t("nameRequired2");
        } else if (!/^[a-zA-Z\s]+$/.test(form.name)) {
            newErrors.name = t("nameLettersOnly2");
        }

        if (!form.fatherHusbandName.trim()) {
            newErrors.fatherHusbandName = t("fatherHusbandRequired");
        } else if (!/^[a-zA-Z\s]+$/.test(form.fatherHusbandName)) {
            newErrors.fatherHusbandName = t("nameLettersOnly2");
        }

        if (!form.address.trim()) {
            newErrors.address = t("addressRequired");
        }

        if (!form.phoneNumber.trim()) {
            newErrors.phoneNumber = t("phoneRequired");
        } else if (!/^\d+$/.test(form.phoneNumber)) {
            newErrors.phoneNumber = t("phoneNumbersOnly");
        } else if (!/^\d{10}$/.test(form.phoneNumber)) {
            newErrors.phoneNumber = t("phoneMustBe10Digits");
        }

        if (!form.email.trim()) {
            newErrors.email = t("emailRequired");
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
        ) {
            newErrors.email = t("emailInvalid");
        }

        if (!form.phoneType) {
            newErrors.phoneType = t("phoneTypeRequired");
        }

        if (!form.dob) {
            newErrors.dob = "Date of birth is required";
        } else {

            const today = new Date().toISOString().split("T")[0];

            if (form.dob > today) {
                newErrors.dob = "Future date not allowed";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            if (form.address.trim().length > 500) {
                showMsg(t("addressTooLong"));
                setLoading(false);
                return;
            }
            const idNo = form.idNo.trim().toUpperCase();
            if (!/^[A-Z]\d{3}$/.test(idNo)) {
                showMsg(t("idNoFormat"));
                setLoading(false);
                return;
            }

            const existingDoc = await getDoc(doc(db, "profiles", idNo));
            if (existingDoc.exists()) {
                showMsg(t("profileAlreadyExists"));
                setForm({
                    idNo: "", name: "", fatherHusbandName: "",
                    address: "", phoneNumber: "", email: "", phoneType: ""
                });
                setLoading(false);
                return;
            }

            await setDoc(doc(db, "profiles", idNo), {
                idNo: idNo,
                name: form.name.trim(),
                fatherHusbandName: form.fatherHusbandName.trim(),
                address: form.address.trim(),
                phoneNumber: form.phoneNumber.trim(),
                email: form.email.trim(),
                phoneType: form.phoneType,
                dob: form.dob,
                createdAt: new Date().toISOString()
            }); await logAdminAction("create_profile", {
                targetId: idNo,
                details: t("logRegisteredProfile", { name: form.name.trim() }),
            });
            showMsg(t("profileRegisteredSuccess"), "success");
            setForm({
                idNo: "", name: "", fatherHusbandName: "",
                address: "", phoneNumber: "", email: "", phoneType: "", dob: ""
            });

        } catch (error) {
            console.error(error);
            showMsg(t("errorRegisteringProfile"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="preg__page">

            <div className="preg__orb preg__orb--1" />
            <div className="preg__orb preg__orb--2" />
            <div className="preg__orb preg__orb--3" />
            <div className="preg__grid" />

            <button className="preg__back-btn" onClick={() => navigate("/admin-dashboard")}>
                <span>←</span> {t("back")}
            </button>

            <div className="preg__hero">
                <div className="preg__hero-badge">
                    <span className="preg__badge-dot" />
                    {t("adminPanel")}
                </div>
                <h1 className="preg__hero-title">
                    {t("profileRegistration")}
                </h1>
                <p className="preg__hero-sub">{t("registerAndStore")}</p>
            </div>

            {message.text && (
                <div className={`preg__message preg__message--${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="preg__card">
                <div className="preg__card-stripe" />

                <div className="preg__form-grid">

                    <div className="preg__field">
                        <label className="preg__label">{t("idNo")} <span className="preg__req">*</span></label>
                        <input
                            className={`preg__input ${errors.idNo ? "preg__input--err" : ""}`}
                            type="text"
                            name="idNo"
                            value={form.idNo}
                            onChange={handleChange}
                            placeholder={t("enterIdNo")}
                            maxLength={4}
                        />
                        {errors.idNo && <span className="preg__err-msg">{errors.idNo}</span>}
                    </div>

                    <div className="preg__field">
                        <label className="preg__label">{t("fullName")} <span className="preg__req">*</span></label>
                        <input
                            className={`preg__input ${errors.name ? "preg__input--err" : ""}`}
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder={t("enterFullName")}
                        />
                        {errors.name && <span className="preg__err-msg">{errors.name}</span>}
                    </div>

                    <div className="preg__field">
                        <label className="preg__label">{t("fatherHusbandName")} <span className="preg__req">*</span></label>
                        <input
                            className={`preg__input ${errors.fatherHusbandName ? "preg__input--err" : ""}`}
                            type="text"
                            name="fatherHusbandName"
                            value={form.fatherHusbandName}
                            onChange={handleChange}
                            placeholder={t("fatherHusbandName")}
                        />
                        {errors.fatherHusbandName && <span className="preg__err-msg">{errors.fatherHusbandName}</span>}
                    </div>

                    <div className="preg__field">
                        <label className="preg__label">{t("phoneNumberLabel")} <span className="preg__req">*</span></label>
                        <input
                            className={`preg__input ${errors.phoneNumber ? "preg__input--err" : ""}`}
                            type="text"
                            name="phoneNumber"
                            value={form.phoneNumber}
                            onChange={handleChange}
                            placeholder="Enter phone number"
                            maxLength={15}
                        />
                        {errors.phoneNumber && <span className="preg__err-msg">{errors.phoneNumber}</span>}
                    </div>

                    <div className="preg__field">
                        <label className="preg__label">{t("dateOfBirth")} <span className="preg__req">*</span></label>
                        <input
                            className={`preg__input ${errors.dob ? "preg__input--err" : ""}`}
                            type="date"
                            name="dob"
                            value={form.dob}
                            onChange={handleChange}
                        />
                        {errors.dob && <span className="preg__err-msg">{errors.dob}</span>}
                    </div>

                    <div className="preg__field">
                        <label className="preg__label">{t("phoneType")} <span className="preg__req">*</span></label>
                        <select
                            className={`preg__select ${errors.phoneType ? "preg__input--err" : ""}`}
                            name="phoneType"
                            value={form.phoneType}
                            onChange={handleChange}
                        >
                            <option value="">{t("selectPhoneType")}</option>
                            <option value="WhatsApp">{t("whatsapp")}</option>
                            <option value="Keypad">{t("keypad")}</option>
                        </select>
                        {errors.phoneType && <span className="preg__err-msg">{errors.phoneType}</span>}
                    </div>

                    <div className="preg__field">
                        <label className="preg__label">{t("emailIdLabel")} <span className="preg__req">*</span></label>
                        <input
                            className={`preg__input ${errors.email ? "preg__input--err" : ""}`}
                            type="text"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder={t("enterEmail")}
                        />
                        {errors.email && <span className="preg__err-msg">{errors.email}</span>}
                    </div>

                    <div className="preg__field preg__field--full">
                        <label className="preg__label">{t("address")} <span className="preg__req">*</span></label>
                        <textarea
                            className={`preg__textarea ${errors.address ? "preg__input--err" : ""}`}
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            placeholder={t("address")}
                        />
                        {errors.address && <span className="preg__err-msg">{errors.address}</span>}
                    </div>

                </div>

                <button
                    className="preg__submit-btn"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <><span className="preg__spinner" /> {t("registering")}</>
                    ) : (
                        <><span>✓</span> {t("registerProfile")}</>
                    )}
                </button>

            </div>

        </div>
    );
}

export default ProfileRegistration;