import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const SUPER_ADMIN_ID = "ADMIN1";

export const CONTROLLABLE_PAGES = [
    { id: "addUser", path: "/add-user", labelKey: "addUser" },
    { id: "addAdmin", path: "/add-admin", labelKey: "addAdmin" },
    { id: "markAttendance", path: "/mark-attendance", labelKey: "markAttendance" },
    { id: "smartAttendance", path: "/smart-attendance", labelKey: "smartAttendance" },
    { id: "allUsers", path: "/all-users", labelKey: "allUsers" },
    { id: "allAdmins", path: "/all-admins", labelKey: "allAdmins" },
    { id: "attendanceReport", path: "/attendance-report", labelKey: "attendanceReport" },
    { id: "userPercentage", path: "/user-percentage", labelKey: "percentageReport" },
    { id: "absenceManagement", path: "/absence-management", labelKey: "absenceManagement" },
    { id: "leavesRequest", path: "/leaves-request", labelKey: "leavesRequest" },
    { id: "notifications", path: "/notifications", labelKey: "notifications" },
    { id: "trackTicket", path: "/track-ticket", labelKey: "trackTicket" },
    { id: "profileRegistration", path: "/profile-registration", labelKey: "profileRegistration" },
    { id: "toggleStatus", path: "/toggle-status", labelKey: "toggleStatus" },
    { id: "sessionFeedbacks", path: "/session-feedbacks", labelKey: "sessionFeedbacks" },
    { id: "allProfiles", path: "/all-profiles", labelKey: "allProfiles" },
    { id: "activityLogs", path: "/activity-logs", labelKey: "activityLogs" },
    { id: "userActivities", path: "/user-activities", labelKey: "userActivities" },
    { id: "adminLogs", path: "/admin-logs", labelKey: "adminLogs" },
    { id: "idRequests", path: "/id-requests", labelKey: "idRequests" },
    { id: "contactSettings", path: "/contact-settings", labelKey: "contactSettings" },
    { id: "blockedAccounts", path: "/blocked-accounts", labelKey: "blockedAccounts.label" },
    { id: "deletedUsers", path: "/deleted-users", labelKey: "deletedUsers" },
    { id: "contactMessages", path: "/contact-messages", labelKey: "contactMessages" },
];

const accessDocRef = () => doc(db, "settings", "accessControl");

export const fetchAccessConfig = async () => {
    const snap = await getDoc(accessDocRef());
    return snap.exists() ? snap.data() : {};
};

export const saveAccessConfig = async (config) => {
    await setDoc(accessDocRef(), config, { merge: true });
};

export const canAccess = (config, pageId, adminId) => {
    if (!adminId) return false;
    if (adminId.toUpperCase() === SUPER_ADMIN_ID) return true;
    const entry = config?.[pageId];
    if (!entry || entry.mode === "all") return true;
    return Array.isArray(entry.admins) &&
        entry.admins.map((a) => a.toUpperCase()).includes(adminId.toUpperCase());
};

export const canAccessPath = (config, path, adminId) => {
    const page = CONTROLLABLE_PAGES.find((p) => p.path === path);
    if (!page) return true;
    return canAccess(config, page.id, adminId);
};