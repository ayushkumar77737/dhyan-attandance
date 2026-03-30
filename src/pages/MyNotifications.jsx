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

            <button onClick={() => navigate("/user-dashboard")} className="back-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Back
            </button>

            <div className="my-notifications-container">

                <div className="my-notifications-header">
                    <div className="header-title-group">
                        <div className="header-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </div>
                        <h1>Notifications</h1>
                    </div>
                    <div className="header-count">
                        {notifications.length > 0 && (
                            <span className="count-badge">{notifications.length}</span>
                        )}
                    </div>
                </div>

                <div className="divider" />

                {notifications.length === 0 ? (
                    <div className="no-data-wrapper">
                        <div className="no-data-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </div>
                        <p className="no-data">No notifications yet</p>
                        <span className="no-data-sub">You're all caught up!</span>
                    </div>
                ) : (
                    <div className="notification-list">
                        {notifications.map((item, index) => (
                            <div
                                key={index}
                                className="notification-card"
                                style={{ animationDelay: `${index * 60}ms` }}
                            >
                                <div className="card-dot" />
                                <div className="card-content">
                                    <p>{item.message}</p>
                                    <span>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        {item.createdAt}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>

        </div>

    );

}

export default MyNotifications;