import React, { useEffect, useState } from "react";
import "./DeletedUsers.css";

import { db } from "../firebase/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

function DeletedUsers() {

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

    if(users.length === 0){
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

      <div className="deleted-header">

        <button
          className="back-btn"
          onClick={() => navigate("/admin-dashboard")}
        >
          ← Back
        </button>

        <button
          className="export-btn"
          onClick={exportExcel}
        >
          Export Excel
        </button>

      </div>

      <h1 className="deleted-title">Deleted Users</h1>

      <div className="deleted-card">

        <table className="deleted-table">

          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {users.length === 0 ? (

              <tr>
                <td colSpan="3" className="no-data">
                  No Deleted Users
                </td>
              </tr>

            ) : (

              users.map((user) => (

                <tr key={user.docId}>

                  <td>{user.id}</td>
                  <td>{user.name || "-"}</td>

                  <td>
                    <button
                      className="restore-btn"
                      onClick={() => restoreUser(user.docId)}
                    >
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

  );
}

export default DeletedUsers;