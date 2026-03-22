import React, { useEffect, useState } from "react";
import "./AbsenceManagement.css";

import { db } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

/* ✅ Excel Imports */
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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
            const usersSnap = await getDocs(collection(db, "users"));
            const userMap = {};

            usersSnap.forEach((doc) => {
                userMap[doc.id] = doc.data().name;
            });

            const reqSnap = await getDocs(collection(db, "absenceRequests"));

            let list = [];

            reqSnap.forEach((docItem) => {
                const data = docItem.data();

                let extractedUserId = data.userId;

                if (!extractedUserId && docItem.id.includes("_")) {
                    extractedUserId = docItem.id.split("_")[0];
                }

                list.push({
                    id: docItem.id,
                    userId: extractedUserId,
                    name: userMap[extractedUserId] || "Unknown",
                    date: data.date,
                    reason: data.reason,
                    status: data.status
                });
            });

            list.sort((a, b) => new Date(b.date) - new Date(a.date));

            setRequests(list);

        } catch (error) {
            console.error("Error fetching requests:", error);
        }
    };

    /* ✅ EXPORT TO EXCEL FUNCTION */
    const exportToExcel = () => {

        if (requests.length === 0) {
            alert("No data to export");
            return;
        }

        const excelData = requests.map((item) => ({
            "User ID": item.userId,
            "Name": item.name,
            "Date": item.date,
            "Reason": item.reason,
            "Status": item.status
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, "Absence Data");

        const excelBuffer = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array"
        });

        const fileData = new Blob([excelBuffer], {
            type: "application/octet-stream"
        });

        saveAs(fileData, "Absence_Requests.xlsx");
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

                {/* ✅ EXPORT BUTTON */}
                <button
                    className="absence-management-export-btn"
                    onClick={exportToExcel}
                >
                    Export to Excel
                </button>

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