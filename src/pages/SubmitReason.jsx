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

        <div className="reason-card-header">
          <div className="reason-header-content">
            <div className="reason-card-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6" /><path d="M9 16h4" /></svg>
              {t("absenceRequest")}
            </div>
            <h2>{t("submitAbsenceReason")}</h2>
            <p className="reason-subtitle">{t("reasonSubtitle")}</p>
          </div>

          <div className="reason-header-art" aria-hidden="true">
            <svg viewBox="0 0 170 140" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* leaves */}
              <path d="M40 118c-14-6-22-20-20-36 16 2 28 14 30 30-3 3-7 5-10 6z" fill="rgba(20,184,166,0.16)" />
              <path d="M132 118c14-6 22-20 20-36-16 2-28 14-30 30 3 3 7 5 10 6z" fill="rgba(20,184,166,0.12)" />
              {/* calendar body */}
              <rect className="sr-cal-body" x="34" y="30" width="74" height="70" rx="10" fill="rgba(20,184,166,0.12)" stroke="#2dd4cf" strokeWidth="3" />
              <path d="M34 40a10 10 0 0 1 10-10h54a10 10 0 0 1 10 10v6H34z" fill="#0ea5a0" />
              <line x1="52" y1="22" x2="52" y2="36" stroke="#0ea5a0" strokeWidth="5" strokeLinecap="round" />
              <line x1="90" y1="22" x2="90" y2="36" stroke="#0ea5a0" strokeWidth="5" strokeLinecap="round" />
              {/* calendar grid dots */}
              <g fill="#2dd4cf">
                <rect x="46" y="58" width="9" height="9" rx="2" opacity="0.55" />
                <rect x="62" y="58" width="9" height="9" rx="2" opacity="0.55" />
                <rect x="78" y="58" width="9" height="9" rx="2" opacity="0.55" />
                <rect x="46" y="74" width="9" height="9" rx="2" opacity="0.55" />
                <rect x="62" y="74" width="9" height="9" rx="2" opacity="0.55" />
              </g>
              {/* clock */}
              <circle className="sr-clock-face" cx="118" cy="86" r="26" fill="#0b1a1f" stroke="#2dd4cf" strokeWidth="3" />
              <circle cx="118" cy="86" r="26" fill="rgba(20,184,166,0.14)" />
              <path className="sr-clock-hands" d="M118 70v16l11 7" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* sparkles */}
              <path d="M150 44l1.6 4.4 4.4 1.6-4.4 1.6L150 56l-1.6-4.4-4.4-1.6 4.4-1.6z" fill="#34d399" />
              <path d="M28 54l1.2 3.3 3.3 1.2-3.3 1.2L28 64l-1.2-3.3-3.3-1.2 3.3-1.2z" fill="#2dd4cf" opacity="0.8" />
              <circle cx="140" cy="24" r="2.5" fill="#2dd4cf" opacity="0.7" />
            </svg>
          </div>
        </div>

        <div className="reason-card-body">

          {message && (
            <div className={`reason-message ${type}`}>
              {type === "success" ? "✓" : "✕"} {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="reason-form">

            <div className="reason-field">
              <div className="reason-field-icon reason-field-icon--teal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
              </div>
              <div className="reason-field-main">
                <label>{t("dateOfAbsence")} <span className="reason-req">*</span></label>
                <input
                  type="date"
                  value={date}
                  max={getTodayString()}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="reason-field">
              <div className="reason-field-icon reason-field-icon--violet">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 10h.01" /><path d="M12 10h.01" /><path d="M16 10h.01" /></svg>
              </div>
              <div className="reason-field-main">
                <label>{t("reason")} <span className="reason-req">*</span></label>
                <div className="reason-textarea-wrap">
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
                  <span className="reason-counter">{reason.length}/500</span>
                </div>
              </div>
            </div>

            <div className="reason-note">
              <div className="reason-note-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <div className="reason-note-text">
                <span className="reason-note-title">{t("reasonImportantTitle") || "Your request is important to us"}</span>
                <span className="reason-note-sub">{t("reasonImportantSub") || "All requests are confidential and will be reviewed by the appropriate authority."}</span>
              </div>
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

            <div className="reason-secure">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              {t("reasonSecureNote") || "Your information is secure and encrypted"}
            </div>

          </form>

        </div>

      </div>

    </div>
  );
}

export default SubmitReason;