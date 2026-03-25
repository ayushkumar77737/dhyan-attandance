import React, { useEffect, useState } from "react";
import "./MyNotifications.css";

import { db, auth } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function MyNotifications() {

    const [notifications, setNotifications] = useState([]);
    const navigate = useNavigate();

    /* Disable Inspect */
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

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(auth, async (user) => {

            if (!user) return;

            const email = user.email;
            const id = email.split("@")[0].toUpperCase();

            const snapshot = await getDocs(collection(db, "notifications"));

            let list = [];

            snapshot.forEach((doc) => {
                const data = doc.data();

                const docUserId = data.userId?.toUpperCase();

                // ✅ FIXED CONDITION (handles missing userId too)
                if (!docUserId || docUserId === "ALL" || docUserId === id) {
                    list.push({
                        message: data.message || "No message",
                        createdAt: data.createdAt
                            ? data.createdAt.toDate().toLocaleString()
                            : "No Date"
                    });
                }
            });

            // ✅ Safe sorting
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setNotifications(list);

        });

        return () => unsubscribe();

    }, []);

    return (

        <div className="my-notifications-page">

            <div className="my-notifications-container">

                <div className="my-notifications-header">
                    <button onClick={() => navigate("/user-dashboard")} className="back-btn">
                        Back
                    </button>
                    <h1>My Notifications</h1>
                    <div style={{ width: "60px" }}></div> {/* spacer */}
                </div>

                {notifications.length === 0 ? (
                    <p className="no-data">No notifications available</p>
                ) : (
                    <div className="notification-list">
                        {notifications.map((item, index) => (
                            <div key={index} className="notification-card">
                                <p>{item.message}</p>
                                <span>{item.createdAt}</span>
                            </div>
                        ))}
                    </div>
                )}

            </div>

        </div>

    );

}

export default MyNotifications;