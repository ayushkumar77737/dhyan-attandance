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

            {/* Decorative orbs */}
            <div className="am-orb am-orb-1" />
            <div className="am-orb am-orb-2" />
            <div className="am-orb am-orb-3" />

            {/* 🔙 Back */}
            <button
                className="absence-management-back-btn"
                onClick={() => navigate("/admin-dashboard")}
            >
                <span className="am-back-arrow">←</span>
                <span>Back</span>
            </button>

            <div className="absence-management-card">

                {/* Header strip */}
                <div className="am-header">
                    <div className="am-header-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                    </div>
                    <div>
                        <h2 className="absence-management-title">Absence Management</h2>
                        <p className="am-subtitle">{requests.length} record{requests.length !== 1 ? "s" : ""} found</p>
                    </div>
                </div>

                {/* ✅ EXPORT BUTTON */}
                <button
                    className="absence-management-export-btn"
                    onClick={exportToExcel}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export to Excel
                </button>

                {requests.length === 0 ? (
                    <div className="am-empty-state">
                        <div className="am-empty-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                        </div>
                        <p className="absence-management-no-data">No requests found</p>
                    </div>
                ) : (

                    <div className="am-table-wrapper">
                        <table className="absence-management-table">

                            <thead>
                                <tr>
                                    <th>
                                        <span className="th-inner">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                                            ID No
                                        </span>
                                    </th>
                                    <th>
                                        <span className="th-inner">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                            Name
                                        </span>
                                    </th>
                                    <th>
                                        <span className="th-inner">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                                            Date
                                        </span>
                                    </th>
                                    <th>
                                        <span className="th-inner">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                            Reason
                                        </span>
                                    </th>
                                    <th>
                                        <span className="th-inner">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                                            Status
                                        </span>
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {requests.map((item, index) => (
                                    <tr key={item.id} style={{ animationDelay: `${index * 0.05}s` }}>

                                        <td>
                                            <span className="am-id-badge">{item.userId}</span>
                                        </td>
                                        <td>
                                            <div className="am-name-cell">
                                                <div className="am-avatar">
                                                    {item.name?.charAt(0)?.toUpperCase() || "?"}
                                                </div>
                                                <span>{item.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="am-date">{item.date}</span>
                                        </td>
                                        <td>
                                            <span className="am-reason">{item.reason}</span>
                                        </td>
                                        <td>
                                            <span className={`absence-management-status ${item.status?.toLowerCase()}`}>
                                                <span className="am-status-dot" />
                                                {item.status}
                                            </span>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>

                        </table>
                    </div>

                )}

            </div>

        </div>
    );
}

export default AbsenceManagement;