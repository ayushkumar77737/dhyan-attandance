import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

import "./EditUser.css";

function EditUser() {
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

    const { id } = useParams();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [userId, setUserId] = useState("");

    useEffect(() => {
        fetchUser();
    }, [id]);

    const fetchUser = async () => {

        try {

            const docRef = doc(db, "users", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {

                const data = docSnap.data();

                setName(data.name || "");
                setUserId(data.id || id);

            } else {
                alert("User not found");
            }

        } catch (error) {
            console.log("Fetch Error:", error);
        }

    };

    const handleUpdate = async () => {

        if (!name.trim() || !userId.trim()) {
            alert("Please fill all fields");
            return;
        }

        try {

            const oldRef = doc(db, "users", id);
            const newRef = doc(db, "users", userId);

            await setDoc(newRef, {
                name: name.trim(),
                email: `${userId}@dhyan.com`,
                id: userId,
                role: "user"
            });

            if (userId !== id) {
                await deleteDoc(oldRef);
            }

            alert("User Updated Successfully");

            navigate("/all-users");

        } catch (error) {

            console.log("Update Error:", error);
            alert("Error updating user");

        }

    };

    return (

        <div className="edit-container">

            {/* Top Left Back Button */}
            <button
                className="back-btn"
                onClick={() => navigate("/all-users")}
            >
                ← Back
            </button>

            <div className="edit-card">

                <h2 className="edit-title">Edit User</h2>

                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                />

                <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="User ID"
                />

                <button
                    className="update-btn"
                    onClick={handleUpdate}
                >
                    Update User
                </button>

            </div>

        </div>

    );
}

export default EditUser;