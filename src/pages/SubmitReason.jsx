import React, { useState, useEffect } from "react";
import "./SubmitReason.css";

import { auth, db } from "../firebase/firebase";
import { addDoc, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";
import { logUserAction } from "../utils/logUserAction";

function SubmitReason() {

  const { t } = useTranslation();
  const navigate = useNavigate();

  const getTodayString = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [userId, setUserId] = useState("");
  const [date, setDate] = useState(getTodayString);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("");
  const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {

        const id = String(
          user.email?.split("@")[0] || ""
        ).toUpperCase();

        const userRef = doc(db, "users", id);

        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          navigate("/");
          return;
        }

        const userData = userSnap.data();

        if (
          userData.role === "admin" &&
          userData.uid === auth.currentUser.uid
        ) {
          navigate("/admin-dashboard");
          return;
        }

        setUserId(id);

      } else {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, []);

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

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId || !date || !reason.trim()) {
      if (reason.trim().length < 10) {
        setMessage(t("reasonTooShort"));
        setType("error");
        return;
      }

      if (reason.trim().length > 500) {
        setMessage(t("reasonTooLong"));
        setType("error");
        return;
      }
      setMessage(t("fillAllFields"));
      setType("error");
      return;
    }
    const today = getTodayString();

    if (date > today) {
      setMessage(t("futureDateNotAllowed"));
      setType("error");
      return;
    }

    setLoading(true);

    try {
      const q = query(
        collection(db, "absenceRequests"),
        where("userId", "==", userId),
        where("date", "==", date)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setMessage(t("reasonAlreadySubmitted"));
        setType("error");
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "absenceRequests"), {
        userId,
        date,
        reason,
        status: "Pending",
        createdAt: new Date()
      });
      await logUserAction("submit_absence", { details: t("uaSubmitAbsenceDetail", { date }) });
      setMessage(t("reasonSubmittedSuccess"));
      setType("success");
      setDate(getTodayString());
      setReason("");

      setTimeout(() => navigate("/user-dashboard"), 1500);

    } catch (error) {
      console.error(error);
      setMessage(t("errorSubmittingReason"));
      setType("error");
    }

    setLoading(false);
  };

  return (
    <div className="submit-reason-page" data-theme={theme}>

      <button
        className="reason-back-btn"
        onClick={() => navigate("/user-dashboard")}
      >
        ← {t("back")}
      </button>

      <div className="reason-card">

        <div className="reason-card-badge">📋 {t("absenceRequest")}</div>
        <h2>{t("submitAbsenceReason")}</h2>
        <p className="reason-subtitle">{t("reasonSubtitle")}</p>

        {message && (
          <div className={`reason-message ${type}`}>
            {type === "success" ? "✓" : "✕"} {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="reason-form">

          <div className="reason-group">
            <label>{t("dateOfAbsence")}</label>
            <input
              type="date"
              value={date}
              max={getTodayString()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="reason-group">
            <label>{t("reason")}</label>
            <textarea
              maxLength={500}
              placeholder={t("reasonPlaceholder")}
              value={reason}
              onChange={(e) =>
                setReason(
                  e.target.value.replace(/[<>]/g, "")
                )
              }
            />
          </div>

          <button
            className="reason-submit-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" /> {t("submitting")}</>
            ) : (
              <>{t("submitRequest")} →</>
            )}
          </button>

        </form>

      </div>

    </div>
  );
}

export default SubmitReason;