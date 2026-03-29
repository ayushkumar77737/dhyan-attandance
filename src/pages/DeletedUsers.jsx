import React, { useEffect, useState } from "react";
import "./DeletedUsers.css";

import { db } from "../firebase/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

function DeletedUsers() {

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

  const fetchDeletedUsers = async () => {

    const querySnapshot = await getDocs(collection(db, "users"));

    const deletedList = querySnapshot.docs
      .map((docItem) => ({
        docId: docItem.id,
        ...docItem.data()
      }))
      .filter(user => user.deleted === true);

    setUsers(deletedList);

  };

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

  // RESTORE USER
  const restoreUser = async (id) => {

    try {

      await updateDoc(doc(db, "users", id), {
        deleted: false
      });

      fetchDeletedUsers();

    } catch (error) {
      console.log(error);
    }

  };

  // EXPORT EXCEL
  const exportExcel = () => {

    if (users.length === 0) {
      alert("No deleted users to export");
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

      {/* Decorative Orbs */}
      <div className="du-orb du-orb-1" />
      <div className="du-orb du-orb-2" />
      <div className="du-orb du-orb-3" />

      {/* Header */}
      <div className="deleted-header">

        <button
          className="back-btn"
          onClick={() => navigate("/admin-dashboard")}
        >
          <span className="back-arrow">←</span>
          <span>Back</span>
        </button>

        <button
          className="export-btn"
          onClick={exportExcel}
        >
          <span className="export-icon">↓</span>
          Export Excel
        </button>

      </div>

      {/* Title Block */}
      <div className="du-title-block">
        <div className="du-eyebrow">Admin Panel</div>
        <h1 className="deleted-title">
          Deleted <span className="du-accent">Users</span>
        </h1>
        <div className="du-title-underline" />
      </div>

      {/* Stats Pill */}
      <div className="du-stats-strip">
        <div className="du-stat-pill">
          <span className="du-stat-icon">🗑️</span>
          <span className="du-stat-label">Total Deleted</span>
          <span className="du-stat-value">{users.length}</span>
        </div>
      </div>

      {/* Card */}
      <div className="deleted-card">

        <div className="du-table-wrapper">
          <table className="deleted-table">

            <thead>
              <tr>
                <th><span className="th-inner">ID</span></th>
                <th><span className="th-inner">Name</span></th>
                <th><span className="th-inner">Action</span></th>
              </tr>
            </thead>

            <tbody>

              {users.length === 0 ? (

                <tr>
                  <td colSpan="3" className="no-data">
                    <span className="du-no-data-icon">📭</span>
                    <p>No Deleted Users Found</p>
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
                        ↩ Restore
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