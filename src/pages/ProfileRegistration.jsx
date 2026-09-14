import React, { useEffect, useState } from "react";
import "./ProfileRegistration.css";
import { logAdminAction } from "../utils/logAdminAction";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import axios from "axios";

/* ---------------------------------------------------------------- */
/* Inline icons (stroke = currentColor, so they inherit theme color) */
/* ---------------------------------------------------------------- */

const IcoArrow = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="preg__ico">
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
);

const IcoImage = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" className="preg__ico">
        <rect x="3" y="4.5" width="18" height="15" rx="3" />
        <circle cx="8.6" cy="10" r="1.6" />
        <path d="M4 16.5l4.4-4a1.6 1.6 0 0 1 2.2 0l3.6 3.4a1.6 1.6 0 0 0 2.2 0l1.8-1.6a1.6 1.6 0 0 1 2.2 0L21 15.4" />
    </svg>
);

const IcoSend = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" className="preg__ico">
        <path d="M21 3L10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3Z" />
    </svg>
);

const IcoWarn = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" className="preg__ico">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5M12 16.2v.1" />
    </svg>
);

const IcoChevron = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" className="preg__ico">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

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
    const [imageFile, setImageFile] = useState(null);
    const [previewImage, setPreviewImage] = useState("");
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

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

    /* Release the object URL when the preview changes or unmounts. */
    useEffect(() => {
        if (!previewImage) return;
        return () => URL.revokeObjectURL(previewImage);
    }, [previewImage]);

    const showMsg = (text, type = "error") => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({
            ...form,
            [name]: value
        });
        if (errors[name]) setErrors({ ...errors, [name]: "" });
    };

    /* idNo: letters + digits only (format is one letter + 3 digits),
       forced uppercase as the admin types. */
    const handleIdNoChange = (e) => {
        const cleaned = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        setForm({ ...form, idNo: cleaned });
        if (errors.idNo) setErrors({ ...errors, idNo: "" });
    };

    /* Name / Father-Husband Name: letters and spaces only, no digits
       or special characters. */
    const handleNameFieldChange = (e) => {
        const { name, value } = e.target;
        const cleaned = value.replace(/[^a-zA-Z\s]/g, "").toUpperCase();
        setForm({ ...form, [name]: cleaned });
        if (errors[name]) setErrors({ ...errors, [name]: "" });
    };

    /* Phone number: digits only, capped at 10. */
    const handlePhoneChange = (e) => {
        const cleaned = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
        setForm({ ...form, phoneNumber: cleaned });
        if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: "" });
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
            newErrors.dob = t("dobRequired");
        } else {
            const today = new Date().toISOString().split("T")[0];

            if (form.dob > today) {
                newErrors.dob = t("futureDateNotAllowed");
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const uploadImageToCloudinary = async () => {
        if (!imageFile) return "";

        const formData = new FormData();

        formData.append("file", imageFile);
        formData.append("upload_preset", "user_profile");

        formData.append(
            "public_id",
            `${form.idNo}_${form.name.replace(/\s+/g, "_")}`
        );

        const response = await axios.post(
            "https://api.cloudinary.com/v1_1/dgvjq9bhl/image/upload",
            formData
        );

        return response.data.secure_url;
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
            const imageUrl =
                await uploadImageToCloudinary();

            await setDoc(doc(db, "profiles", idNo), {
                idNo: idNo,
                name: form.name.trim(),
                fatherHusbandName: form.fatherHusbandName.trim(),
                address: form.address.trim(),
                phoneNumber: form.phoneNumber.trim(),
                email: form.email.trim(),
                phoneType: form.phoneType,
                dob: form.dob,
                profileImage: imageUrl,
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
            setImageFile(null);
            setPreviewImage("");

        } catch (error) {
            console.error(error);
            showMsg(t("errorRegisteringProfile"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="preg__page" data-theme={theme}>

            <div className="preg__blob preg__blob--1" />
            <div className="preg__blob preg__blob--2" />
            <div className="preg__dots preg__dots--1" />
            <div className="preg__dots preg__dots--2" />
            <div className="preg__arc" />

            <button
                className="preg__back-btn"
                onClick={() => navigate("/admin-dashboard")}
            >
                <IcoArrow /> {t("back")}
            </button>

            <div className="preg__shell">

                <div className="preg__hero">
                    <div className="preg__hero-badge">
                        <span className="preg__badge-dot" />
                        {t("adminPanel")}
                        <span className="preg__badge-dot" />
                    </div>
                    <h1 className="preg__hero-title">{t("profileRegistration")}</h1>
                    <p className="preg__hero-sub">{t("registerAndStore")}</p>
                </div>

                {message.text && (
                    <div className={`preg__message preg__message--${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="preg__card">
                    <div className="preg__card-stripe" />

                    <div className="preg__image-section">
                        <label className="preg__image-wrap">

                            <input
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => {
                                    const file = e.target.files[0];

                                    if (file) {
                                        setImageFile(file);
                                        setPreviewImage(
                                            URL.createObjectURL(file)
                                        );
                                    }
                                }}
                            />

                            {previewImage ? (
                                <>
                                    <img
                                        src={previewImage}
                                        alt={t("profilePhoto")}
                                        className="preg__preview-img"
                                    />
                                    <div className="preg__image-overlay">
                                        {t("changePhoto")}
                                    </div>
                                </>
                            ) : (
                                <div className="preg__image-placeholder">
                                    <span className="preg__camera-icon"><IcoImage /></span>
                                    <span className="preg__upload-text">{t("uploadPhoto")}</span>
                                </div>
                            )}

                        </label>
                    </div>

                    <div className="preg__form-grid">

                        <div className="preg__field">
                            <label className="preg__label">
                                {t("idNo")} <span className="preg__req">*</span>
                            </label>
                            <input
                                className={`preg__input ${errors.idNo ? "preg__input--err" : ""}`}
                                type="text"
                                name="idNo"
                                value={form.idNo}
                                onChange={handleIdNoChange}
                                placeholder={t("enterIdNo")}
                                maxLength={4}
                            />
                            {errors.idNo && (
                                <span className="preg__err-msg">
                                    <IcoWarn /> {errors.idNo}
                                </span>
                            )}
                        </div>

                        <div className="preg__field">
                            <label className="preg__label">
                                {t("fullName")} <span className="preg__req">*</span>
                            </label>
                            <input
                                className={`preg__input ${errors.name ? "preg__input--err" : ""}`}
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleNameFieldChange}
                                placeholder={t("enterFullName")}
                            />
                            {errors.name && (
                                <span className="preg__err-msg">
                                    <IcoWarn /> {errors.name}
                                </span>
                            )}
                        </div>

                        <div className="preg__field">
                            <label className="preg__label">
                                {t("fatherHusbandName")} <span className="preg__req">*</span>
                            </label>
                            <input
                                className={`preg__input ${errors.fatherHusbandName ? "preg__input--err" : ""}`}
                                type="text"
                                name="fatherHusbandName"
                                value={form.fatherHusbandName}
                                onChange={handleNameFieldChange}
                                placeholder={t("fatherHusbandName")}
                            />
                            {errors.fatherHusbandName && (
                                <span className="preg__err-msg">
                                    <IcoWarn /> {errors.fatherHusbandName}
                                </span>
                            )}
                        </div>

                        <div className="preg__field">
                            <label className="preg__label">
                                {t("phoneNumberLabel")} <span className="preg__req">*</span>
                            </label>
                            <input
                                className={`preg__input ${errors.phoneNumber ? "preg__input--err" : ""}`}
                                type="text"
                                inputMode="numeric"
                                name="phoneNumber"
                                value={form.phoneNumber}
                                onChange={handlePhoneChange}
                                placeholder={t("enterPhoneNumber")}
                                maxLength={10}
                            />
                            {errors.phoneNumber && (
                                <span className="preg__err-msg">
                                    <IcoWarn /> {errors.phoneNumber}
                                </span>
                            )}
                        </div>

                        <div className="preg__field">
                            <label className="preg__label">
                                {t("dateOfBirth")} <span className="preg__req">*</span>
                            </label>
                            <input
                                className={`preg__input ${errors.dob ? "preg__input--err" : ""}`}
                                type="date"
                                name="dob"
                                value={form.dob}
                                onChange={handleChange}
                            />
                            {errors.dob && (
                                <span className="preg__err-msg">
                                    <IcoWarn /> {errors.dob}
                                </span>
                            )}
                        </div>

                        <div className="preg__field">
                            <label className="preg__label">
                                {t("phoneType")} <span className="preg__req">*</span>
                            </label>
                            <div className={`preg__select-wrap ${errors.phoneType ? "preg__input--err" : ""}`}>
                                <select
                                    className="preg__select"
                                    name="phoneType"
                                    value={form.phoneType}
                                    onChange={handleChange}
                                >
                                    <option value="">{t("selectPhoneType")}</option>
                                    <option value="WhatsApp">{t("whatsapp")}</option>
                                    <option value="Keypad">{t("keypad")}</option>
                                </select>
                                <span className="preg__select-chevron" aria-hidden="true">
                                    <IcoChevron />
                                </span>
                            </div>
                            {errors.phoneType && (
                                <span className="preg__err-msg">
                                    <IcoWarn /> {errors.phoneType}
                                </span>
                            )}
                        </div>

                        <div className="preg__field">
                            <label className="preg__label">
                                {t("emailIdLabel")} <span className="preg__req">*</span>
                            </label>
                            <input
                                className={`preg__input ${errors.email ? "preg__input--err" : ""}`}
                                type="text"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder={t("enterEmail")}
                            />
                            {errors.email && (
                                <span className="preg__err-msg">
                                    <IcoWarn /> {errors.email}
                                </span>
                            )}
                        </div>

                        <div className="preg__field preg__field--full">
                            <label className="preg__label">
                                {t("address")} <span className="preg__req">*</span>
                            </label>
                            <textarea
                                className={`preg__textarea ${errors.address ? "preg__input--err" : ""}`}
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder={t("address")}
                            />
                            {errors.address && (
                                <span className="preg__err-msg">
                                    <IcoWarn /> {errors.address}
                                </span>
                            )}
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
                            <><IcoSend /> {t("registerProfile")}</>
                        )}
                    </button>

                </div>

            </div>
        </div>
    );
}

export default ProfileRegistration;