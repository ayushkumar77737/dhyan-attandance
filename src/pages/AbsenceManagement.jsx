import React, { useEffect, useState } from "react";
import "./AbsenceManagement.css";

import { db } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { useTranslation } from "react-i18next"; // ← ADD

function AbsenceManagement() {

    const { t } = useTranslation(); // ← ADD

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

    const exportToExcel = () => {
        if (requests.length === 0) {
            alert(t("noDataToExport")); // ← CHANGED
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
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const fileData = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(fileData, "Absence_Requests.xlsx");
    };

    const pendingCount = requests.filter(r => r.status?.toLowerCase() === "pending").length;
    const approvedCount = requests.filter(r => r.status?.toLowerCase() === "approved").length;
    const rejectedCount = requests.filter(r => r.status?.toLowerCase() === "rejected").length;

    return (
        <div className="absence-management-page">

            {/* Decorative orbs */}
            <div className="am-orb am-orb-1" />
            <div className="am-orb am-orb-2" />
            <div className="am-orb am-orb-3" />

            {/* Back Button */}
            <button
                className="absence-management-back-btn"
                onClick={() => navigate("/admin-dashboard")}
            >
                <span>←</span> {t("back")} {/* ← CHANGED */}
            </button>

            {/* Title Block */}
            <div className="am-title-block">
                <span className="am-eyebrow">{t("adminPanel")}</span> {/* ← CHANGED */}
                <h2 className="absence-management-title">
                    {t("absenceManagement")} {/* ← CHANGED */}
                </h2>
                <p className="am-subtitle">{t("absenceSubtitle")}</p> {/* ← CHANGED */}
            </div>

            {/* Stats Strip */}
            <div className="am-stats-strip">

                <div className="am-stat-pill">
                    <span className="am-stat-icon">📋</span>
                    <span className="am-stat-label">{t("total")}</span> {/* ← CHANGED */}
                    <span className="am-stat-value">{requests.length}</span>
                </div>

                <div className="am-stat-pill">
                    <span className="am-stat-icon">⏳</span>
                    <span className="am-stat-label">{t("pending")}</span> {/* ← CHANGED */}
                    <span className="am-stat-value am-pending-val">{pendingCount}</span>
                </div>

                <div className="am-stat-pill">
                    <span className="am-stat-icon">✅</span>
                    <span className="am-stat-label">{t("approved")}</span> {/* ← CHANGED */}
                    <span className="am-stat-value am-approved-val">{approvedCount}</span>
                </div>

                <div className="am-stat-pill">
                    <span className="am-stat-icon">❌</span>
                    <span className="am-stat-label">{t("rejected")}</span> {/* ← CHANGED */}
                    <span className="am-stat-value am-rejected-val">{rejectedCount}</span>
                </div>

            </div>

            {/* Card */}
            <div className="absence-management-card">

                {/* Toolbar */}
                <div className="am-card-toolbar">
                    <span className="am-record-count">
                        {requests.length} {t("records")} {/* ← CHANGED */}
                    </span>
                    <button
                        className="absence-management-export-btn"
                        onClick={exportToExcel}
                    >
                        <span>⬇</span> {t("exportToExcel")} {/* ← CHANGED */}
                    </button>
                </div>

                {requests.length === 0 ? (
                    <div className="absence-management-no-data">
                        <span className="am-no-data-icon">📭</span>
                        <p>{t("noRequestsFound")}</p> {/* ← CHANGED */}
                    </div>
                ) : (
                    <div className="am-table-wrapper">
                        <table className="absence-management-table">

                            <thead>
                                <tr>
                                    <th>{t("idNo")}</th>     {/* ← CHANGED */}
                                    <th>{t("name")}</th>     {/* ← CHANGED */}
                                    <th>{t("date")}</th>     {/* ← CHANGED */}
                                    <th>{t("reason")}</th>   {/* ← CHANGED */}
                                    <th>{t("status")}</th>   {/* ← CHANGED */}
                                </tr>
                            </thead>

                            <tbody>
                                {requests.map((item, index) => (
                                    <tr key={item.id} style={{ animationDelay: `${index * 0.04}s` }}>

                                        <td>
                                            <span className="am-id-chip">{item.userId}</span>
                                        </td>

                                        <td>
                                            <span className="am-name-cell">
                                                <span className="am-avatar">
                                                    {item.name?.charAt(0).toUpperCase()}
                                                </span>
                                                {item.name}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="am-date-chip">{item.date}</span>
                                        </td>

                                        <td className="am-reason-cell">{item.reason}</td>

                                        <td>
                                            <span className={`absence-management-status ${item.status?.toLowerCase()}`}>
                                                {item.status?.toLowerCase() === "pending" && "⏳ "}
                                                {item.status?.toLowerCase() === "approved" && "✅ "}
                                                {item.status?.toLowerCase() === "rejected" && "❌ "}
                                                {item.status?.toLowerCase() === "pending" && t("pending")}
                                                {item.status?.toLowerCase() === "approved" && t("approved")}
                                                {item.status?.toLowerCase() === "rejected" && t("rejected")}
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