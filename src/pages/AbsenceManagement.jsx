import React, { useEffect, useState } from "react";
import "./AbsenceManagement.css";
import { logAdminAction } from "../utils/logAdminAction";
import { db, auth } from "../firebase/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    getDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { useTranslation } from "react-i18next";

function AbsenceManagement() {

    const { t } = useTranslation();

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

    const [showEditModal, setShowEditModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState("");
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

            fetchRequests();

        } catch (error) {
            console.error(error);
            navigate("/");
        }
    };

    useEffect(() => {
        checkAdmin();
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

    const updateStatus = async (id, newStatus) => {
        try {
            if (
                newStatus !== "pending" &&
                newStatus !== "approved" &&
                newStatus !== "rejected"
            ) {
                return;
            }
            await updateDoc(
                doc(db, "absenceRequests", id),
                {
                    status: newStatus,
                    updatedBy: localStorage.getItem("userId"),
                    updatedAt: new Date().toISOString()
                }
            );
            await logAdminAction("update_absence", {
                targetId: id,
                details: t("logUpdatedAbsence", { status: newStatus }),
            });
            fetchRequests();
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const openEditModal = (item) => {
        setEditItem(item);
        setSelectedStatus(item.status?.toLowerCase());
        setShowEditModal(true);
    };

    const saveEditModal = async () => {
        if (
            selectedStatus !== "pending" &&
            selectedStatus !== "approved" &&
            selectedStatus !== "rejected"
        ) {
            return;
        }
        if (editItem && selectedStatus) {
            await updateStatus(editItem.id, selectedStatus);
            setShowEditModal(false);
            setEditItem(null);
        }
    };

    const deleteRequest = async () => {
        if (!editItem) return;
        try {
            await deleteDoc(doc(db, "absenceRequests", editItem.id));
            await logAdminAction("delete_absence", {
                targetId: editItem.userId || editItem.id,
                details: t("logDeletedAbsence", { name: editItem.name }),
            });
            setShowEditModal(false);
            setEditItem(null);
            fetchRequests();
        } catch (error) {
            console.error("Error deleting request:", error);
        }
    };

    const exportToExcel = () => {
        if (requests.length === 0) {
            alert(t("noDataToExport"));
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
        <div className="absence-management-page" data-theme={theme}>

            <div className="am-orb am-orb-1" />
            <div className="am-orb am-orb-2" />
            <div className="am-orb am-orb-3" />

            <button
                className="absence-management-back-btn"
                onClick={() => navigate("/admin-dashboard")}
            >
                <span>←</span> {t("back")}
            </button>

            <div className="am-title-block">
                <span className="am-eyebrow">{t("adminPanel")}</span>
                <h2 className="absence-management-title">
                    {t("absenceManagement")}
                </h2>
                <p className="am-subtitle">{t("absenceSubtitle")}</p>
            </div>

            <div className="am-stats-strip">
                <div className="am-stat-pill">
                    <span className="am-stat-icon">📋</span>
                    <span className="am-stat-label">{t("total")}</span>
                    <span className="am-stat-value">{requests.length}</span>
                </div>
                <div className="am-stat-pill">
                    <span className="am-stat-icon">⏳</span>
                    <span className="am-stat-label">{t("pending")}</span>
                    <span className="am-stat-value am-pending-val">{pendingCount}</span>
                </div>
                <div className="am-stat-pill">
                    <span className="am-stat-icon">✅</span>
                    <span className="am-stat-label">{t("approved")}</span>
                    <span className="am-stat-value am-approved-val">{approvedCount}</span>
                </div>
                <div className="am-stat-pill">
                    <span className="am-stat-icon">❌</span>
                    <span className="am-stat-label">{t("rejected")}</span>
                    <span className="am-stat-value am-rejected-val">{rejectedCount}</span>
                </div>
            </div>

            <div className="absence-management-card">

                <div className="am-card-toolbar">
                    <span className="am-record-count">
                        {requests.length} {t("records")}
                    </span>
                    <button
                        className="absence-management-export-btn"
                        onClick={exportToExcel}
                    >
                        <span>⬇</span> {t("exportToExcel")}
                    </button>
                </div>

                {requests.length === 0 ? (
                    <div className="absence-management-no-data">
                        <span className="am-no-data-icon">📭</span>
                        <p>{t("noRequestsFound")}</p>
                    </div>
                ) : (
                    <div className="am-table-wrapper">
                        <table className="absence-management-table">

                            <thead>
                                <tr>
                                    <th>{t("idNo")}</th>
                                    <th>{t("name")}</th>
                                    <th>{t("date")}</th>
                                    <th>{t("reason")}</th>
                                    <th>{t("status")}</th>
                                    <th>{t("actions")}</th>
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

                                        <td>
                                            <div className="am-action-btns">
                                                {item.status?.toLowerCase() === "pending" && (
                                                    <>
                                                        <button
                                                            className="am-approve-btn"
                                                            onClick={() => updateStatus(item.id, "approved")}
                                                        >
                                                            ✓ {t("approve")}
                                                        </button>
                                                        <button
                                                            className="am-reject-btn"
                                                            onClick={() => updateStatus(item.id, "rejected")}
                                                        >
                                                            ✗ {t("reject")}
                                                        </button>
                                                    </>
                                                )}
                                                {(item.status?.toLowerCase() === "approved" || item.status?.toLowerCase() === "rejected") && (
                                                    <button
                                                        className="am-edit-btn"
                                                        onClick={() => openEditModal(item)}
                                                    >
                                                        ✎ {t("edit")}
                                                    </button>
                                                )}
                                            </div>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>

                        </table>
                    </div>
                )}

            </div>

            {showEditModal && editItem && (
                <div className="am-modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="am-modal" onClick={(e) => e.stopPropagation()}>

                        <div className="am-modal-header">
                            <h3>✎ {t("editStatus")}</h3>
                            <button
                                className="am-modal-close"
                                onClick={() => setShowEditModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="am-modal-info">
                            <p><span>👤</span> {editItem.name} ({editItem.userId})</p>
                            <p><span>📅</span> {editItem.date}</p>
                            <p><span>📝</span> {editItem.reason}</p>
                        </div>

                        <p className="am-modal-label">{t("status")}:</p>

                        <div className="am-modal-options">
                            <button
                                className={`am-modal-opt pending ${selectedStatus === "pending" ? "active" : ""}`}
                                onClick={() => setSelectedStatus("pending")}
                            >
                                ⏳ {t("pending")}
                            </button>
                            <button
                                className={`am-modal-opt approved ${selectedStatus === "approved" ? "active" : ""}`}
                                onClick={() => setSelectedStatus("approved")}
                            >
                                ✅ {t("approved")}
                            </button>
                            <button
                                className={`am-modal-opt rejected ${selectedStatus === "rejected" ? "active" : ""}`}
                                onClick={() => setSelectedStatus("rejected")}
                            >
                                ❌ {t("rejected")}
                            </button>
                        </div>

                        <div className="am-modal-footer">
                            <button
                                className="am-modal-cancel"
                                onClick={() => setShowEditModal(false)}
                            >
                                {t("cancel")}
                            </button>
                            <button
                                className="am-modal-save"
                                onClick={saveEditModal}
                            >
                                💾 {t("save")}
                            </button>
                            <button className="am-modal-delete" onClick={deleteRequest}>
                                🗑️ {t("delete")}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default AbsenceManagement;