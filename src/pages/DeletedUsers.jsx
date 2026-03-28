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

      {/* Decorative orbs */}
      <div className="du-orb du-orb-1" />
      <div className="du-orb du-orb-2" />
      <div className="du-orb du-orb-3" />

      <div className="deleted-header">

        <button
          className="back-btn"
          onClick={() => navigate("/admin-dashboard")}
        >
          <span className="du-back-arrow">←</span>
          <span>Back</span>
        </button>

        <button
          className="export-btn"
          onClick={exportExcel}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Excel
        </button>

      </div>

      <div className="deleted-card">

        {/* Title — inside card ✅ */}
        <div className="du-title-row">
          <div className="du-title-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </div>
          <div>
            <h1 className="deleted-title">Deleted Users</h1>
            <p className="du-subtitle">{users.length} user{users.length !== 1 ? "s" : ""} deleted</p>
          </div>
        </div>

        <div className="du-table-wrapper">
          <table className="deleted-table">

            <thead>
              <tr>
                <th>
                  <span className="du-th-inner">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                    ID
                  </span>
                </th>
                <th>
                  <span className="du-th-inner">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    Name
                  </span>
                </th>
                <th>
                  <span className="du-th-inner">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                    Action
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>

              {users.length === 0 ? (

                <tr>
                  <td colSpan="3">
                    <div className="du-empty-state">
                      <div className="du-empty-icon">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </div>
                      <p className="no-data">No Deleted Users</p>
                    </div>
                  </td>
                </tr>

              ) : (

                users.map((user, index) => (

                  <tr key={user.docId} style={{ animationDelay: `${index * 0.05}s` }}>

                    <td>
                      <span className="du-id-badge">{user.id}</span>
                    </td>

                    <td>
                      <div className="du-name-cell">
                        <div className="du-avatar">
                          {user.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span>{user.name || "-"}</span>
                      </div>
                    </td>

                    <td>
                      <button
                        className="restore-btn"
                        onClick={() => restoreUser(user.docId)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
                        </svg>
                        Restore
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