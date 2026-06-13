import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const logAdminAction = async (action, opts = {}) => {
    try {
        const adminId = String(
            localStorage.getItem("userId") || "UNKNOWN"
        ).toUpperCase();
        const adminName = localStorage.getItem("userName") || adminId;
        if (!action) {
            return;
        }
        await addDoc(collection(db, "adminLogs"), {
            adminId,
            adminName,
            action: String(action).substring(0, 100),
            targetId: opts.targetId || "",
            details: String(opts.details || "").substring(0, 500),
            timestamp: serverTimestamp(),
        });
    } catch (err) {
        console.error("logAdminAction failed:", err);
    }
};