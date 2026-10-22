import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../firebase/firebase";
import i18n from "../i18n";

/* ------------------------------------------------------------------ */
/* One place that writes to the `notifications` collection.            */
/*                                                                     */
/* Each document stores a translation KEY + params, not just a         */
/* finished sentence, so MyNotifications can show it in the READER's   */
/* language. (Before, a notification written by an admin was saved in  */
/* the admin's language.) `message` keeps an English copy for older    */
/* screens — e.g. the dashboard's recent list — that only read it.     */
/*                                                                     */
/*   to      user id ("A101"), an array of ids, or "ALL" (broadcast)   */
/*   type    leave | absence | ticket | concern | announcement |       */
/*           timetable | profile | experience                          */
/*   key     translation key of the message                            */
/*   params  values for the key's {{placeholders}}                     */
/*   titleKey optional translation key shown as a bold title           */
/*   link    page to open on tap — defaults per type (NOTIF_LINKS)     */
/*                                                                     */
/* Never throws: a failed notification must not undo the admin action  */
/* that triggered it, so errors are only logged.                       */
/* ------------------------------------------------------------------ */

export const NOTIF_LINKS = {
    leave: "/my-requests",
    absence: "/my-requests",
    ticket: "/ticketing-support",
    concern: "/raise-concern",
    announcement: "/announcements",
    timetable: "/dhyan-timetable",
    profile: "/my-digital-id",
    experience: "/share-experience",
};

const BATCH_LIMIT = 450; /* Firestore allows 500 writes per batch */

export async function sendNotification({ to, type, key, params = {}, titleKey, link } = {}) {
    try {
        const ids = [...new Set(
            (Array.isArray(to) ? to : [to])
                .map((x) => String(x || "").trim().toUpperCase())
                .filter(Boolean)
        )];
        if (!ids.length || !key) return;

        const base = {
            type: type || "general",
            msgKey: key,
            msgParams: params,
            message: i18n.t(key, { ...params, lng: "en" }),
            link: link || NOTIF_LINKS[type] || "",
            createdAt: serverTimestamp(),
            read: false,
        };
        if (titleKey) {
            base.titleKey = titleKey;
            base.title = i18n.t(titleKey, { lng: "en" });
        }

        for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
            const batch = writeBatch(db);
            ids.slice(i, i + BATCH_LIMIT).forEach((userId) => {
                batch.set(doc(collection(db, "notifications")), { ...base, userId });
            });
            await batch.commit();
        }
    } catch (err) {
        console.warn("sendNotification failed:", err);
    }
}