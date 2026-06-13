import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browser = "Unknown";
    if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("OPR") || ua.includes("Opera")) browser = "Opera";

    let device = "Desktop";
    if (/Mobi|Android|iPhone|iPad/i.test(ua)) device = "Mobile";

    return `${browser} / ${device}`;
};

const getIPAddress = async () => {
    try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        return data.ip || "—";
    } catch {
        return "—";
    }
};

export const logLogin = async (userId, userName) => {
    try {
        const ip = "Hidden";
        const browser = getBrowserInfo();
        await addDoc(collection(db, "activityLogs"), {
            userId: String(userId).toUpperCase(),
            userName: userName || userId,
            action: "login",
            loginTime: serverTimestamp(),
            logoutTime: null,
            lastActive: serverTimestamp(),
            timestamp: serverTimestamp(),
            browser: browser.substring(0, 50),
            ipAddress: ip,
            loginClientTime: Date.now(),
        });
    } catch (err) {
        console.error("logLogin error:", err);
    }
};

export const logLogout = async (userId) => {
    try {
        if (!userId) {
            return;
        }
        const safeUserId = String(userId).toUpperCase();
        const q = query(
            collection(db, "activityLogs"),
            where("userId", "==", safeUserId),
            where("action", "==", "login"),
            where("logoutTime", "==", null)
        );
        const snap = await getDocs(q);

        const now = Date.now();
        const updates = snap.docs
            .filter((docSnap) => {
                const clientTime = docSnap.data().loginClientTime;
                if (!clientTime) return true;
                return (now - clientTime) > 3000;
            })
            .map((docSnap) =>
                updateDoc(doc(db, "activityLogs", docSnap.id), {
                    logoutTime: serverTimestamp(),
                    lastActive: serverTimestamp(),
                    action: "logout",
                })
            );

        await Promise.all(updates);
    } catch (err) {
        console.error("logLogout error:", err);
    }
};