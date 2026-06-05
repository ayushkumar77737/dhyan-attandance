import React, { useEffect, useState } from "react";
import "./AllUsers.css";
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

function AllUsers() {

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
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

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

      if (userData.role !== "admin") {
        navigate("/");
        return;
      }

      fetchUsers();

    } catch (error) {
      console.log(error);
      navigate("/");
    }
  };

  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    const userList = querySnapshot.docs
      .map((docItem) => ({
        docId: docItem.id,
        ...docItem.data()
      }))
      .filter(user =>
        user.deleted !== true &&
        user.role !== "admin"
      );
    setUsers(userList);
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  const exportToExcel = () => {
    const data = users.map((user) => ({
      Name: user.name || "-",
      ID: user.id,
      Email: user.email
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `AllUsers_${date}.xlsx`);
  };

  const openDeleteModal = (id) => {
    setSelectedUser(id);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    try {
      await updateDoc(doc(db, "users", selectedUser), { deleted: true });
      await logAdminAction("delete_user", {
        targetId: selectedUser,
        details: t("logDeletedUser", { id: selectedUser }),
      });
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      console.log(error);
    }
  };

  const handleEdit = (id) => {
    navigate(`/edit-user/${id}`);
  };

  return (
    <div className="users-container">
      <div className="users-header">

        <button
          className="back-btn"
          onClick={() => navigate("/admin-dashboard")}
        >
          ← {t("back")}
        </button>

        <button
          className="export-btn"
          onClick={exportToExcel}
        >
          {t("exportExcel")}
        </button>

      </div>

      <h1 className="users-title">{t("allUsers")}</h1>

      <div className="users-card">
        <table className="users-table">

          <thead>
            <tr>
              <th>{t("name")}</th>
              <th>{t("id")}</th>
              <th>{t("email")}</th>
              <th>{t("actions")}</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.docId}>
                <td>{user.name || "-"}</td>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td className="action-buttons">

                  <button
                    className="edit-btn"
                    onClick={() => handleEdit(user.id)}
                  >
                    {t("edit")}
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => openDeleteModal(user.docId)}
                  >
                    {t("delete")}
                  </button>

                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {showModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">

            <h3>{t("deleteUser")}</h3>
            <p>{t("deleteConfirmMsg")}</p>

            <div className="modal-buttons">

              <button
                className="cancel-btn"
                onClick={() => setShowModal(false)}
              >
                {t("cancel")}
              </button>

              <button
                className="confirm-delete-btn"
                onClick={confirmDelete}
              >
                {t("delete")}
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AllUsers;