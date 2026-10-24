import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { auth, db } from "../firebase/firebase";
import PasskeyManager from "../components/PasskeyManager";
import "./AdminSecurity.css";

/* Admin Profile → Security. Admins manage passkeys for THEIR OWN account only;
   the server (api/auth/passkey.js) enforces that independently of this page. */
function AdminSecurity() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate("/"); return; }
      try {
        const snap = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid), limit(1)));
        if (snap.empty || snap.docs[0].data().role !== "admin") { navigate("/"); return; }
        setReady(true);
      } catch (err) {
        console.error(err);
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="asec__page" data-theme={theme}>
      <header className="asec__header">
        <h1 className="asec__title">{t("passkey.admin.title")}</h1>
        <p className="asec__subtitle">{t("passkey.admin.subtitle")}</p>
      </header>
      {ready && <PasskeyManager theme={theme} role="admin" />}
    </div>
  );
}

export default AdminSecurity;