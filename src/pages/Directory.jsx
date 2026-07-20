import React, { useEffect, useState } from "react";
import "./Directory.css";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useTranslation } from "react-i18next";

/* ---------------- inline icons (presentational only) ---------------- */
const IdIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <circle cx="8.5" cy="11" r="2" />
        <path d="M14 10h4M14 13.5h4M6 15.5h5" />
    </svg>
);

const PersonIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4" />
        <path d="M12 14c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z" />
    </svg>
);

const ShieldIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2 4 5v6.09c0 4.67 3.13 8.64 8 9.91 4.87-1.27 8-5.24 8-9.91V5l-8-3z" />
    </svg>
);

const FooterShield = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M12 2.5 4.5 5.2v5.6c0 4.3 2.9 8 7.5 9.2 4.6-1.2 7.5-4.9 7.5-9.2V5.2L12 2.5z" />
        <path d="m12 8 1 2.1 2.3.2-1.75 1.5.55 2.2L12 14.7l-2.05 1.3.55-2.2L8.75 12.3l2.3-.2L12 8z" fill="currentColor" stroke="none" />
    </svg>
);

const LeafDecor = () => (
    <svg className="diry__leaf" width="190" viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M96 258C70 210 44 172 40 120C36 70 56 34 96 6" stroke="#86c98f" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
        <path d="M96 40C70 44 48 60 42 92C74 96 92 78 96 40Z" fill="#a7dbaf" />
        <path d="M96 40C122 44 144 60 150 92C118 96 100 78 96 40Z" fill="#8fd09a" />
        <path d="M84 108C60 114 42 132 40 162C68 162 84 142 84 108Z" fill="#9ad5a4" />
        <path d="M92 150C72 156 58 174 58 200C82 198 94 180 92 150Z" fill="#b6e2bd" />
    </svg>
);

const TeamArt = () => (
    <svg className="diry__footer-art" width="100" height="48" viewBox="0 0 100 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M24 12a28 20 0 0 1 52 0" stroke="#c7cede" strokeWidth="1.6" strokeDasharray="2 5" strokeLinecap="round" />
        <g><circle cx="24" cy="30" r="6.5" fill="#0d9488" /><path d="M13 46a11 9 0 0 1 22 0z" fill="#0d9488" /></g>
        <g><circle cx="76" cy="30" r="6.5" fill="#7c3aed" /><path d="M65 46a11 9 0 0 1 22 0z" fill="#7c3aed" /></g>
        <g><circle cx="50" cy="26" r="8" fill="#2563eb" /><path d="M37 47a13 11 0 0 1 26 0z" fill="#2563eb" /></g>
    </svg>
);

function Directory() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");

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

            if (userData.uid !== user.uid) {
                navigate("/");
                return;
            }

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
                if (
                    data.deleted !== true &&
                    data.disabled !== true
                ) {
                    list.push({
                        id: data.id || docItem.id,
                        name: data.name || "—",
                        role: data.role || "user",
                        email: "",
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
            false;
        const matchRole = filterRole === "all" || u.role === filterRole;
        return matchSearch && matchRole;
    });

    const getInitials = (name) =>
        name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

    return (
        <div className="diry__page" data-theme={theme}>

            {/* decorations */}
            <div className="diry__orb diry__orb-1" />
            <div className="diry__orb diry__orb-2" />
            <div className="diry__dots" />
            <LeafDecor />
            <div className="diry__float-search">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            </div>

            <div className="diry__inner">

                <button className="diry__back" onClick={() => navigate(-1)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    {t("back")}
                </button>

                <div className="diry__header">
                    <div className="diry__header-icon">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

                <div className="diry__controls">
                    <div className="diry__search-wrap">
                        <svg className="diry__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        {filtered.map((user, i) => {
                            const accent = (i % 6) + 1;
                            const isAdmin = user.role === "admin";
                            return (
                                <div
                                    className={`diry__card diry__accent-${accent}`}
                                    key={user.id}
                                    style={{ animationDelay: `${i * 0.05}s` }}
                                >
                                    <span className="diry__card-blob" aria-hidden="true" />

                                    <div className="diry__card-top">
                                        <div className="diry__avatar">
                                            {getInitials(user.name)}
                                        </div>
                                        <div className="diry__card-info">
                                            <span className="diry__card-name">{user.name}</span>
                                            <span className="diry__card-id">
                                                <IdIcon />
                                                {user.id}
                                            </span>
                                        </div>
                                        <span className="diry__card-chip">
                                            {isAdmin ? <ShieldIcon size={16} /> : <PersonIcon size={16} />}
                                        </span>
                                    </div>

                                    <span className="diry__role-badge">
                                        {isAdmin ? <ShieldIcon size={12} /> : <PersonIcon size={12} />}
                                        {user.role}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>

            <footer className="diry__footer">
                <div className="diry__footer-content">
                    <div className="diry__footer-icon">
                        <FooterShield />
                    </div>
                    <div className="diry__footer-text">
                        <span className="diry__footer-title">
                            {t("connectedTeam") || "Connected Team, Stronger Together"}
                        </span>
                        <span className="diry__footer-sub">
                            {t("connectedTeamSub") || "Easily find and connect with team members."}
                        </span>
                    </div>
                </div>
                <TeamArt />
            </footer>
        </div>
    );
}

export default Directory;