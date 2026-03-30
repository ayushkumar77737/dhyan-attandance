import React, { useState, useEffect } from "react";
import "./SubmitReason.css";

import { auth, db } from "../firebase/firebase";
import {
  addDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function SubmitReason() {

  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const id = user.email.split("@")[0].toUpperCase();
        setUserId(id);
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

    if (!date || !reason) {
      setMessage("Please fill all fields");
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
        setMessage("You already submitted reason for this date!");
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

      setMessage("Reason submitted successfully!");
      setType("success");
      setDate("");
      setReason("");

      setTimeout(() => navigate("/user-dashboard"), 1500);

    } catch (error) {
      console.error(error);
      setMessage("Error submitting reason");
      setType("error");
    }

    setLoading(false);
  };

  return (
    <div className="submit-reason-page">

      <button
        className="reason-back-btn"
        onClick={() => navigate("/user-dashboard")}
      >
        ← Back
      </button>

      <div className="reason-card">

        <div className="reason-card-badge">📋 Absence Request</div>
        <h2>Submit Absence Reason</h2>
        <p className="reason-subtitle">Fill in the details below and we'll review your request</p>

        {message && (
          <div className={`reason-message ${type}`}>
            {type === "success" ? "✓" : "✕"} {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="reason-form">

          <div className="reason-group">
            <label>Date of Absence</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="reason-group">
            <label>Reason</label>
            <textarea
              placeholder="Describe your reason clearly..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <button
            className="reason-submit-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" /> Submitting...</>
            ) : (
              <>Submit Request →</>
            )}
          </button>

        </form>

      </div>

    </div>
  );
}

export default SubmitReason;