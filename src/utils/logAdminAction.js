import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Records an admin action into the `adminLogs` collection,
 * which powers the Admin Activity Monitor page.
 *
 * @param {string} action    e.g. "create_user", "delete_feedback", "update_profile", "toggle_status"
 * @param {object} opts
 * @param {string} [opts.targetId]  the entity affected (e.g. "A101")
 * @param {string} [opts.details]   human-readable note (e.g. "Disabled account")
 *
 * The current admin is read from localStorage (set at login).
 * Categorisation (Create/Update/Delete/Auth/Other) is automatic
 * based on the action string, so just name the action descriptively.
 */
export const logAdminAction = async (action, opts = {}) => {
    try {
        const adminId = (localStorage.getItem("userId") || "UNKNOWN").toUpperCase();
        const adminName = localStorage.getItem("userName") || adminId;

        await addDoc(collection(db, "adminLogs"), {
            adminId,
            adminName,
            action,                       // e.g. "create_user"
            targetId: opts.targetId || "",
            details: opts.details || "",
            timestamp: serverTimestamp(),
        });
    } catch (err) {
        // Never block the main action if logging fails
        console.error("logAdminAction failed:", err);
    }
};