import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { fetchAccessConfig, canAccess } from "../utils/accessControl";

export default function RequireAccess({ pageId, children }) {
    const navigate = useNavigate();
    const [ok, setOk] = useState(false);

    useEffect(() => {
        let active = true;
        (async () => {
            const userId = localStorage.getItem("userId");
            if (!auth.currentUser || !userId) { navigate("/"); return; }
            try {
                const snap = await getDoc(doc(db, "users", userId));
                if (!snap.exists() || snap.data().role !== "admin") { navigate("/"); return; }
                const config = await fetchAccessConfig();
                if (!active) return;
                if (canAccess(config, pageId, userId)) setOk(true);
                else navigate("/admin-dashboard");
            } catch (e) { console.error(e); navigate("/"); }
        })();
        return () => { active = false; };
    }, [pageId, navigate]);

    return ok ? children : null;
}