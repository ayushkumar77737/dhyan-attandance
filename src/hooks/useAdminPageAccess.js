import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

/**
 * useAdminPageAccess
 * ------------------
 * Call this at the top of any admin page component.
 * Pass the exact key from DASHBOARD_PAGES (e.g. "addUser", "adminLogs").
 *
 * What it does:
 *  1. Reads settings/appSettings.adminPageAccess from Firestore
 *  2. If mode === "all"      → allow (do nothing)
 *  3. If mode === "selected" → check if current admin's UID is in adminIds
 *     - If NOT in list       → redirect to /admin-dashboard with a blocked flag
 *     - If in list           → allow
 *
 * Returns { checking: boolean } so you can show a spinner while verifying.
 *
 * Usage:
 *   const { checking } = useAdminPageAccess("addUser");
 *   if (checking) return <div className="page-checking" />;
 */
export default function useAdminPageAccess(pageKey) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const currentUserId = localStorage.getItem("userId");
        if (!currentUserId) { navigate("/"); return; }

        const ref = doc(db, "settings", "appSettings");
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          // No settings doc yet → default is "all admins allowed"
          setChecking(false);
          return;
        }

        const pageAccess = snap.data().adminPageAccess || {};
        const rule = pageAccess[pageKey];

        if (!rule || rule.mode === "all") {
          // All admins allowed
          setChecking(false);
          return;
        }

        if (rule.mode === "selected") {
          const allowed = Array.isArray(rule.adminIds) && rule.adminIds.includes(currentUserId);
          if (!allowed) {
            // Redirect back to dashboard — access denied
            navigate("/admin-dashboard", { state: { accessDenied: true, page: pageKey } });
            return;
          }
        }

        setChecking(false);
      } catch (e) {
        console.error("useAdminPageAccess error:", e);
        setChecking(false); // fail open — don't block on Firestore errors
      }
    })();
  }, [pageKey, navigate]);

  return { checking };
}