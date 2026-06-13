import React, { useEffect, useState } from "react";
import "./AllAdmins.css";
import { useNavigate } from "react-router-dom";

import { db, auth } from "../firebase/firebase";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";

import { useTranslation } from "react-i18next";
import useAutoLogout from "../hooks/useAutoLogout";

import logo from "../assets/logo2.png";

function AllAdmins() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    useAutoLogout();

    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const checkAdmin = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) { navigate("/"); return; }
        try {
            const userRef = doc(db, "users", localStorage.getItem("userId"));
            const userSnap = await getDoc(userRef);
            if (
                !userSnap.exists() ||
                userSnap.data().role !== "admin" ||
                userSnap.data().uid !== auth.currentUser.uid
            ) {
                navigate("/");
                return;
            }
        } catch (err) { console.error(err); navigate("/"); }
    };

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const snap = await getDocs(collection(db, "users"));
            const list = [];
            snap.forEach((docItem) => {
                const data = docItem.data();
                if (data.role === "admin" && data.deleted !== true) {
                    list.push({
                        docId: docItem.id,
                        id: String(data.id || docItem.id).toUpperCase(),
                        name: String(data.name || "—").substring(0, 50),
                        email: data.email || "—",
                        phone: data.phone || data.mobile || "—",
                    });
                }
            });
            list.sort((a, b) => a.name.localeCompare(b.name));
            setAdmins(list);
        } catch (err) {
            console.error(err);
            setAdmins([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const disableRightClick = (e) => e.preventDefault();
        const disableInspectKeys = (e) => {
            if (e.key === "F12") e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase()))
                e.preventDefault();
            if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
        };
        document.addEventListener("contextmenu", disableRightClick);
        document.addEventListener("keydown", disableInspectKeys);
        checkAdmin();
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    useEffect(() => {
        checkAdmin();
        fetchAdmins();
    }, []);

    const filtered = admins.filter((a) => {
        const q = String(search || "").trim().toLowerCase();
        if (!q) return true;
        return (
            a.name.toLowerCase().includes(q) ||
            a.email.toLowerCase().includes(q) ||
            String(a.id).toLowerCase().includes(q)
        );
    });

    const initial = (name) => (name && name !== "—" ? name.charAt(0).toUpperCase() : "A");

    return (
        <div className="alladm-container">
            <div className="alladm-header">
                <div className="alladm-header-left">
                    <img src={logo} alt="Logo" className="alladm-logo" />
                    <div className="alladm-header-text">
                        <p className="alladm-portal-label">{t("appTitle")}</p>
                        <h1 className="alladm-title">{t("allAdmins")}</h1>
                    </div>
                </div>
                <button className="alladm-back-btn" onClick={() => navigate("/admin-dashboard")}>
                    ← {t("back")}
                </button>
            </div>

            <div className="alladm-toolbar">
                <div className="alladm-count">
                    {t("totalAdmins")}: <span>{admins.length}</span>
                </div>
                <input
                    type="text"
                    className="alladm-search"
                    placeholder={t("searchAdmins")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="alladm-spinner-wrap"><div className="alladm-spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="alladm-empty"><span>📭</span>{t("noAdminsFound")}</div>
            ) : (
                <div className="alladm-grid">
                    {filtered.map((a) => (
                        <div className="alladm-card" key={a.docId} onClick={() => navigate(`/edit-admin/${a.docId}`)}>
                            <div className="alladm-avatar">{initial(a.name)}</div>
                            <div className="alladm-card-body">
                                <p className="alladm-name">{a.name}</p>
                                <p className="alladm-id">ID: {a.id}</p>
                                <p className="alladm-meta">{a.email}</p>
                                <p className="alladm-meta">{a.phone}</p>
                            </div>
                            <span className="alladm-role-badge">{t("adminLabel")}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AllAdmins;