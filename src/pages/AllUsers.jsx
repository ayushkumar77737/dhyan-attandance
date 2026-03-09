import React, { useEffect, useState } from "react";
import "./AllUsers.css";

import { db } from "../firebase/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import * as XLSX from "xlsx"; // Excel Library

function AllUsers() {

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

  const fetchUsers = async () => {

    const querySnapshot = await getDocs(collection(db, "users"));
    const userList = [];

    querySnapshot.forEach((docItem) => {

      const data = docItem.data();

      if (!data.deleted) {
        userList.push({
          id: docItem.id,
          ...data
        });
      }

    });

    setUsers(userList);

  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // EXPORT EXCEL
  const exportToExcel = () => {

    const data = users.map((user) => ({
      Name: user.name || "-",
      ID: user.id,
      Email: user.email
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

    const date = new Date().toISOString().slice(0,10);

    XLSX.writeFile(workbook, `AllUsers_${date}.xlsx`);

  };

  // OPEN MODAL
  const openDeleteModal = (id) => {
    setSelectedUser(id);
    setShowModal(true);
  };

  // DELETE USER
  const confirmDelete = async () => {

    try {

      await updateDoc(doc(db, "users", selectedUser), {
        deleted: true
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

      {/* Header */}
      <div className="users-header">

        <button
          className="back-btn"
          onClick={() => navigate("/admin-dashboard")}
        >
          ← Back
        </button>

        <button
          className="export-btn"
          onClick={exportToExcel}
        >
          Export Excel
        </button>

      </div>

      <h1 className="users-title">All Users</h1>

      <div className="users-card">

        <table className="users-table">

          <thead>
            <tr>
              <th>Name</th>
              <th>ID</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {users.map((user) => (
              <tr key={user.id}>

                <td>{user.name || "-"}</td>
                <td>{user.id}</td>
                <td>{user.email}</td>

                <td className="action-buttons">

                  <button
                    className="edit-btn"
                    onClick={() => handleEdit(user.id)}
                  >
                    Edit
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => openDeleteModal(user.id)}
                  >
                    Delete
                  </button>

                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

      {/* DELETE MODAL */}
      {showModal && (

        <div className="delete-modal-overlay">

          <div className="delete-modal">

            <h3>Delete User</h3>
            <p>Are you sure you want to delete this user?</p>

            <div className="modal-buttons">

              <button
                className="cancel-btn"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button
                className="confirm-delete-btn"
                onClick={confirmDelete}
              >
                Delete
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );
}

export default AllUsers;