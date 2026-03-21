import React, { useEffect, useState } from "react";
import "./AbsenceManagement.css";

import { db } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function AbsenceManagement() {

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
    const [requests, setRequests] = useState([]);

    useEffect(() => {
        fetchRequests();
    }, []);

    /* 📥 Fetch Requests + Users */
    const fetchRequests = async () => {

        try {
            /* 🔹 Fetch users */
            const usersSnap = await getDocs(collection(db, "users"));
            const userMap = {};

            usersSnap.forEach((doc) => {
                userMap[doc.id] = doc.data().name;
            });

            /* 🔹 Fetch absence requests */
            const reqSnap = await getDocs(collection(db, "absenceRequests"));

            let list = [];

            reqSnap.forEach((docItem) => {
                const data = docItem.data();

                /* 🔥 Extract userId from docId if needed */
                let extractedUserId = data.userId;

                if (!extractedUserId && docItem.id.includes("_")) {
                    extractedUserId = docItem.id.split("_")[0];
                }

                list.push({
                    id: docItem.id, // A101_2026-03-20
                    userId: extractedUserId,
                    name: userMap[extractedUserId] || "Unknown",
                    date: data.date,
                    reason: data.reason,
                    status: data.status
                });
            });

            /* 🔹 Sort latest first */
            list.sort((a, b) => new Date(b.date) - new Date(a.date));

            setRequests(list);

        } catch (error) {
            console.error("Error fetching requests:", error);
        }
    };

    return (
        <div className="absence-management-page">

            {/* 🔙 Back */}
            <button
                className="absence-management-back-btn"
                onClick={() => navigate("/admin-dashboard")}
            >
                ← Back
            </button>

            <div className="absence-management-card">

                <h2 className="absence-management-title">
                    Absence Management
                </h2>

                {requests.length === 0 ? (
                    <p className="absence-management-no-data">
                        No requests found
                    </p>
                ) : (

                    <table className="absence-management-table">

                        <thead>
                            <tr>
                                <th>ID No</th>
                                <th>Name</th>
                                <th>Date</th>
                                <th>Reason</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>

                            {requests.map((item) => (
                                <tr key={item.id}>

                                    {/* ✅ Always show userId correctly */}
                                    <td>{item.userId}</td>

                                    <td>{item.name}</td>
                                    <td>{item.date}</td>
                                    <td>{item.reason}</td>

                                    <td>
                                        <span
                                            className={`absence-management-status ${item.status?.toLowerCase()}`}
                                        >
                                            {item.status}
                                        </span>
                                    </td>

                                </tr>
                            ))}

                        </tbody>

                    </table>

                )}

            </div>

        </div>
    );
}

export default AbsenceManagement;