import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const logAdminAction = async (action, opts = {}) => {
    try {
        const adminId = (localStorage.getItem("userId") || "UNKNOWN").toUpperCase();
        const adminName = localStorage.getItem("userName") || adminId;

        await addDoc(collection(db, "adminLogs"), {
            adminId,
            adminName,
            action,
            targetId: opts.targetId || "",
            details: opts.details || "",
            timestamp: serverTimestamp(),
        });
    } catch (err) {
        console.error("logAdminAction failed:", err);
    }
};