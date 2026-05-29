import React, { useEffect, useState } from "react";
import "./Directory.css";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useTranslation } from "react-i18next";

function Directory() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState("all");

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
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {

            if (!user || !user.email) {
                navigate("/");
                return;
            }

            const id = user.email
                .split("@")[0]
                .toUpperCase();

            const userRef = doc(db, "users", id);

            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                navigate("/");
                return;
            }

            const userData = userSnap.data();

            // Block admin access
            if (userData.role === "admin") {
                navigate("/admin-dashboard");
                return;
            }

            await fetchUsers();

        });

        return () => unsubscribe();

    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const snap = await getDocs(collection(db, "users"));
            const list = [];
            snap.forEach((docItem) => {
                const data = docItem.data();
                if (data.deleted !== true) {
                    list.push({
                        id: data.id || docItem.id,
                        name: data.name || "—",
                        role: data.role || "user",
                        email: data.email || "",
                    });
                }
            });
            list.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
            setUsers(list);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = users.filter((u) => {
        const q = search.toLowerCase();
        const matchSearch =
            u.name.toLowerCase().includes(q) ||
            u.id.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q);
        const matchRole = filterRole === "all" || u.role === filterRole;
        return matchSearch && matchRole;
    });

    const getInitials = (name) =>
        name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

    const getRoleColor = (role) => {
        if (role === "admin") return "diry__role-admin";
        return "diry__role-user";
    };

    return (
        <div className="diry__page">

            {/* Orbs */}
            <div className="diry__orb diry__orb-1" />
            <div className="diry__orb diry__orb-2" />

            <div className="diry__inner">

                {/* Back */}
                <button className="diry__back" onClick={() => navigate(-1)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    {t("back")}
                </button>

                {/* Header */}
                <div className="diry__header">
                    <div className="diry__header-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="diry__title">{t("directory") || "Directory"}</h1>
                        <p className="diry__sub">
                            {loading
                                ? t("loading")
                                : `${filtered.length} ${filtered.length === 1 ? t("member") : t("members")}`}
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="diry__controls">
                    <div className="diry__search-wrap">
                        <svg className="diry__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            className="diry__search"
                            type="text"
                            placeholder={t("searchByNameOrId")}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button className="diry__search-clear" onClick={() => setSearch("")}>✕</button>
                        )}
                    </div>
                    <div className="diry__filter-tabs">
                        {["all", "user", "admin"].map((role) => (
                            <button
                                key={role}
                                className={`diry__tab ${filterRole === role ? "diry__tab-active" : ""}`}
                                onClick={() => setFilterRole(role)}
                            >
                                {role === "all" ? t("all") : role === "user" ? t("user") : t("adminLabel")}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="diry__loading">
                        <div className="diry__loader" />
                        <p>{t("loadingMembers")}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="diry__empty">
                        <span className="diry__empty-icon">📭</span>
                        <p>{t("noMembersFound")}</p>
                    </div>
                ) : (
                    <div className="diry__grid">
                        {filtered.map((user, i) => (
                            <div
                                className="diry__card"
                                key={user.id}
                                style={{ animationDelay: `${i * 0.04}s` }}
                            >
                                <div className={`diry__avatar diry__avatar-${(i % 6) + 1}`}>
                                    {getInitials(user.name)}
                                </div>
                                <div className="diry__card-info">
                                    <span className="diry__card-name">{user.name}</span>
                                    <span className="diry__card-id">{user.id}</span>
                                </div>
                                <span className={`diry__role-badge ${getRoleColor(user.role)}`}>
                                    {user.role}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}

export default Directory;