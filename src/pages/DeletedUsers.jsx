import React, { useEffect, useState } from "react";
import "./DeletedUsers.css";
import { logAdminAction } from "../utils/logAdminAction";
import { db, auth } from "../firebase/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

import { useTranslation } from "react-i18next";

function DeletedUsers() {

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

  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  const checkAdmin = async () => {

    const currentUser = auth.currentUser;

    if (!currentUser) {
      navigate("/");
      return;
    }

    try {

      const userRef = doc(db, "users", localStorage.getItem("userId"));
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

      fetchDeletedUsers();

    } catch (error) {
      console.log(error);
      navigate("/");
    }
  };

  const fetchDeletedUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    const deletedList = querySnapshot.docs
      .map((docItem) => ({ docId: docItem.id, ...docItem.data() }))
      .filter(user =>
        user.deleted === true &&
        user.role !== "admin"
      );
    setUsers(deletedList);
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  const restoreUser = async (id) => {
    try {
      if (!id) {
        return;
      }
      await updateDoc(doc(db, "users", id), { deleted: false });
      await logAdminAction("restore_user", {
        targetId: id,
        details: t("logRestoredUser", { id }),
      });
      fetchDeletedUsers();
    } catch (error) {
      console.log(error);
    }
  };

  const exportExcel = () => {
    if (users.length === 0) {
      alert(t("noDeletedUsersExport"));
      return;
    }
    const exportData = users.map(user => ({
      ID: user.id,
      Name: user.name || "-"
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Deleted Users");
    XLSX.writeFile(workbook, "DeletedUsers.xlsx");
  };

  return (
    <div className="deleted-container">

      <div className="du-orb du-orb-1" />
      <div className="du-orb du-orb-2" />
      <div className="du-orb du-orb-3" />

      <div className="deleted-header">

        <button
          className="back-btn"
          onClick={() => navigate("/admin-dashboard")}
        >
          <span className="back-arrow">←</span>
          <span>{t("back")}</span>
        </button>

        <button
          className="export-btn"
          onClick={exportExcel}
        >
          <span className="export-icon">↓</span>
          {t("exportExcel")}
        </button>

      </div>

      <div className="du-title-block">
        <div className="du-eyebrow">{t("adminPanel")}</div>
        <h1 className="deleted-title">
          {t("deletedUsers")}
        </h1>
        <div className="du-title-underline" />
      </div>

      <div className="du-stats-strip">
        <div className="du-stat-pill">
          <span className="du-stat-icon">🗑️</span>
          <span className="du-stat-label">{t("totalDeleted")}</span>
          <span className="du-stat-value">{users.length}</span>
        </div>
      </div>

      <div className="deleted-card">
        <div className="du-table-wrapper">
          <table className="deleted-table">

            <thead>
              <tr>
                <th><span className="th-inner">{t("id")}</span></th>
                <th><span className="th-inner">{t("name")}</span></th>
                <th><span className="th-inner">{t("action")}</span></th>
              </tr>
            </thead>

            <tbody>

              {users.length === 0 ? (
                <tr>
                  <td colSpan="3" className="no-data">
                    <span className="du-no-data-icon">📭</span>
                    <p>{t("noDeletedUsersFound")}</p>
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.docId} style={{ animationDelay: `${index * 0.05}s` }}>

                    <td>
                      <span className="du-id-badge">{user.id}</span>
                    </td>

                    <td>
                      <span className="du-name-cell">
                        <span className="du-avatar">
                          {(user.name || "?").charAt(0).toUpperCase()}
                        </span>
                        {user.name || "-"}
                      </span>
                    </td>

                    <td>
                      <button
                        className="restore-btn"
                        onClick={() => restoreUser(user.docId)}
                      >
                        ↩ {t("restore")}
                      </button>
                    </td>

                  </tr>
                ))
              )}

            </tbody>

          </table>
        </div>
      </div>

    </div>
  );
}

export default DeletedUsers;