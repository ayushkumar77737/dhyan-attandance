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
        if (!action) {
            return;
        }
        await addDoc(collection(db, "userLogs"), {
            userId,
            action: String(action).substring(0, 100),
            details: String(extra.details || "").substring(0, 500),
            target: String(extra.target || "").substring(0, 100),
            timestamp: serverTimestamp(),
        });
    } catch (err) {
        // logging should never break the user flow
        console.error("logUserAction failed:", err);
    }
};