import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./GetId.css";
import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import barcodeImage from "../assets/scanner.jpg";
import { useTranslation } from "react-i18next";

const GetId = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [mobile, setMobile] = useState("");
    const [transactionId, setTransactionId] = useState("");
    const [mobileError, setMobileError] = useState("");
    const [transactionError, setTransactionError] = useState("");
    const [duplicateError, setDuplicateError] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [checkId, setCheckId] = useState("");
    const [checkStatus, setCheckStatus] = useState(null);
    const [checkLoading, setCheckLoading] = useState(false);
    const [checkError, setCheckError] = useState("");

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

    const handleMobileChange = (e) => {
        const val = e.target.value.replace(/[^0-9]/g, "");
        if (val.length <= 10) setMobile(val);
        if (mobileError) setMobileError("");
    };

    const handleTransactionChange = (e) => {
        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
        if (val.length <= 12) setTransactionId(val);
        if (transactionError) setTransactionError("");
    };

    const validate = () => {
        let valid = true;
        if (mobile.length !== 10) {
            setMobileError(t("mobileExact10"));
            valid = false;
        }
        if (transactionId.length !== 12) {
            setTransactionError(t("transactionExact12"));
            valid = false;
        }
        return valid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setDuplicateError("");
        if (!validate()) return;
        try {
            setLoading(true);
            const q = query(
                collection(db, "idRequests"),
                where("transactionId", "==", transactionId.toUpperCase())
            );
            const existing = await getDocs(q);
            if (!existing.empty) {
                setDuplicateError(t("duplicateTransaction"));
                setLoading(false);
                setTimeout(() => {
                    setTransactionId("");
                    setMobile("");
                    setDuplicateError("");
                }, 3000);
                return;
            }
            await addDoc(collection(db, "idRequests"), {
                mobileNumber: mobile,
                transactionId: transactionId.toUpperCase(),
                status: "pending",
                submittedAt: serverTimestamp(),
            });
            setSubmitted(true);
        } catch (err) {
            console.error("Error submitting:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckStatus = async () => {
        if (checkId.trim().length === 0) {
            setCheckError("Please enter a Transaction ID.");
            return;
        }
        try {
            setCheckLoading(true);
            setCheckStatus(null);
            setCheckError("");
            const q = query(
                collection(db, "idRequests"),
                where("transactionId", "==", checkId.trim().toUpperCase())
            );
            const snap = await getDocs(q);
            if (snap.empty) {
                setCheckError("No request found with this Transaction ID.");
            } else {
                const data = snap.docs[0].data();
                setCheckStatus(data.status);
            }
        } catch (err) {
            setCheckError("Error checking status. Try again.");
        } finally {
            setCheckLoading(false);
        }
    };

    return (
        <div className="gidpg__page">

            <div className="gidpg__orb gidpg__orb--1" />
            <div className="gidpg__orb gidpg__orb--2" />
            <div className="gidpg__orb gidpg__orb--3" />
            <div className="gidpg__grid" />

            <button className="gidpg__back-btn" onClick={() => navigate("/login")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("backToLogin")}
            </button>

            {submitted ? (
                <div className="gidpg__success-wrap">
                    <div className="gidpg__success-card">
                        <div className="gidpg__success-ring">
                            <div className="gidpg__success-icon">
                                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="gidpg__success-title">{t("requestSubmitted")}</h2>
                        <p className="gidpg__success-msg">{t("requestSubmittedMsg")}</p>
                        <div className="gidpg__success-details">
                            <div className="gidpg__success-row">
                                <span className="gidpg__success-label">{t("mobileLabel")}</span>
                                <span className="gidpg__success-value">+91 {mobile}</span>
                            </div>
                            <div className="gidpg__success-row">
                                <span className="gidpg__success-label">{t("transactionIdLabel")}</span>
                                <span className="gidpg__success-value">{transactionId.toUpperCase()}</span>
                            </div>
                        </div>
                        <button className="gidpg__back-login-btn" onClick={() => navigate("/login")}>
                            {t("backToLogin")}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="gidpg__container">

                    <div className="gidpg__left">
                        <div className="gidpg__left-glow" />

                        <div className="gidpg__header">
                            <div className="gidpg__eyebrow">
                                <span className="gidpg__eyebrow-dot" />
                                <span>{t("getYourId")}</span>
                            </div>
                            <h1 className="gidpg__title">
                                {t("registerAnd")}<br />
                                <span className="gidpg__title-accent">{t("getYourId")}</span>
                            </h1>
                            <p className="gidpg__subtitle">{t("getIdSubtitle")}</p>
                        </div>

                        <form className="gidpg__form" onSubmit={handleSubmit}>

                            <div className="gidpg__field">
                                <label className="gidpg__label">
                                    <span className="gidpg__label-icon">📱</span>
                                    {t("mobileNumber")}
                                    <span className="gidpg__label-req">*</span>
                                </label>
                                <div className={`gidpg__input-wrap ${mobileError ? "gidpg__input-wrap--err" : ""} ${mobile.length === 10 ? "gidpg__input-wrap--ok" : ""}`}>
                                    <span className="gidpg__prefix">+91</span>
                                    <input
                                        className="gidpg__input"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder={t("mobilePlaceholder")}
                                        value={mobile}
                                        onChange={handleMobileChange}
                                        maxLength={10}
                                    />
                                    <span className="gidpg__counter">{mobile.length}/10</span>
                                    {mobile.length === 10 && <span className="gidpg__tick">✓</span>}
                                </div>
                                {mobileError && <p className="gidpg__err-msg">{mobileError}</p>}
                            </div>

                            <div className="gidpg__field">
                                <label className="gidpg__label">
                                    <span className="gidpg__label-icon">🧾</span>
                                    {t("transactionId")}
                                    <span className="gidpg__label-req">*</span>
                                </label>
                                <div className={`gidpg__input-wrap ${transactionError ? "gidpg__input-wrap--err" : ""} ${transactionId.length === 12 ? "gidpg__input-wrap--ok" : ""}`}>
                                    <input
                                        className="gidpg__input gidpg__input--mono"
                                        type="text"
                                        placeholder={t("transactionPlaceholder")}
                                        value={transactionId}
                                        onChange={handleTransactionChange}
                                        maxLength={12}
                                    />
                                    <span className="gidpg__counter">{transactionId.length}/12</span>
                                    {transactionId.length === 12 && <span className="gidpg__tick">✓</span>}
                                </div>
                                {transactionError && <p className="gidpg__err-msg">{transactionError}</p>}
                            </div>

                            {duplicateError && (
                                <p className="gidpg__err-msg gidpg__err-msg--dup">⚠️ {duplicateError}</p>
                            )}

                            <button className="gidpg__submit-btn" type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <span className="gidpg__spinner" />
                                        {t("submitting")}
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="22" y1="2" x2="11" y2="13" />
                                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                        </svg>
                                        {t("submitRequest")}
                                    </>
                                )}
                            </button>

                        </form>

                        <p className="gidpg__note">{t("secureNote")}</p>
                    </div>

                    <div className="gidpg__right">
                        <div className="gidpg__qr-card">
                            <div className="gidpg__qr-topbar" />

                            <div className="gidpg__qr-header">
                                <span className="gidpg__qr-title">{t("scanAndPay")}</span>
                                <span className="gidpg__qr-sub">{t("upiSubtext")}</span>
                            </div>

                            <div className="gidpg__qr-frame">
                                <span className="gidpg__fc gidpg__fc--tl" />
                                <span className="gidpg__fc gidpg__fc--tr" />
                                <span className="gidpg__fc gidpg__fc--bl" />
                                <span className="gidpg__fc gidpg__fc--br" />
                                <img src={barcodeImage} alt="Payment QR Code" className="gidpg__qr-img" />
                                <div className="gidpg__scan-line" />
                            </div>

                            <div className="gidpg__upi-row">
                                {["GPay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                                    <span key={app} className="gidpg__upi-tag">{app}</span>
                                ))}
                            </div>
                            <p className="gidpg__qr-hint">{t("afterPaymentNote")}</p>

                            <div className="gidpg__steps">
                                {[t("step1"), t("step2"), t("step3")].map((text, i) => (
                                    <div key={i} className="gidpg__step">
                                        <span className="gidpg__step-num">{i + 1}</span>
                                        <span className="gidpg__step-text">{text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="gidpg__offline-note">
                            <span>💵</span>
                            <p>{t("offlineNote")}</p>
                        </div>

                        <div className="gidpg__check-card">
                            <div className="gidpg__check-header">
                                <span className="gidpg__check-icon">🔍</span>
                                <span className="gidpg__check-title">Check Request Status</span>
                            </div>
                            <div className="gidpg__check-input-row">
                                <input
                                    className="gidpg__check-input"
                                    type="text"
                                    placeholder="Enter Transaction ID"
                                    value={checkId}
                                    onChange={(e) => {
                                        setCheckId(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase());
                                        setCheckStatus(null);
                                        setCheckError("");
                                    }}
                                    maxLength={12}
                                />
                                <button
                                    className="gidpg__check-btn"
                                    onClick={handleCheckStatus}
                                    disabled={checkLoading}
                                >
                                    {checkLoading ? <span className="gidpg__spinner" /> : "Check"}
                                </button>
                            </div>
                            {checkError && <p className="gidpg__check-error">{checkError}</p>}
                            {checkStatus && (
                                <div className={`gidpg__check-result gidpg__check-result--${checkStatus}`}>
                                    <span className="gidpg__check-result-icon">
                                        {checkStatus === "pending" ? "⏳" : checkStatus === "approved" ? "✅" : "❌"}
                                    </span>
                                    <div>
                                        <span className="gidpg__check-result-label">Status</span>
                                        <span className="gidpg__check-result-value">
                                            {checkStatus.charAt(0).toUpperCase() + checkStatus.slice(1)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default GetId;