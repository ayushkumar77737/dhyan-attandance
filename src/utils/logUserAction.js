import { db, auth } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Logs an action performed by the currently logged-in user to the `userLogs` collection.
 *
 * @param {string} action  - machine key for the action, e.g. "mark_attendance",
 *                           "update_profile", "submit_absence", "raise_ticket",
 *                           "share_experience".
 * @param {object} extra   - optional fields: { details, target }
 *
 * Usage:
 *   await logUserAction("submit_absence", { details: "Absence reason for 2026-06-08" });
 */
export const logUserAction = async (action, extra = {}) => {
    try {
        const currentUser = auth.currentUser;
        const userId =
            (currentUser?.email ? currentUser.email.split("@")[0].toUpperCase() : null) ||
            (localStorage.getItem("userId") || "").toUpperCase() ||
            "UNKNOWN";

        await addDoc(collection(db, "userLogs"), {
            userId,
            action,
            details: extra.details || "",
            target: extra.target || "",
            timestamp: serverTimestamp(),
        });
    } catch (err) {
        // logging should never break the user flow
        console.error("logUserAction failed:", err);
    }
};