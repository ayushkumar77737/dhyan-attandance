import React, { useEffect, useState } from "react";
import "./AllProfiles.css";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

function AllProfiles() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [profiles, setProfiles] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedProfile, setSelectedProfile] = useState(null);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: "",
        fatherHusbandName: "",
        phoneNumber: "",
        email: "",
        dob: "",
        address: ""
    });
    const [editLoading, setEditLoading] = useState(false);

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
        fetchProfiles();
        return () => {
            document.removeEventListener("contextmenu", disableRightClick);
            document.removeEventListener("keydown", disableInspectKeys);
        };
    }, []);

    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(
            profiles.filter(
                (p) =>
                    p.name?.toLowerCase().includes(q) ||
                    p.idNo?.toLowerCase().includes(q) ||
                    p.email?.toLowerCase().includes(q) ||
                    p.phoneNumber?.includes(q)
            )
        );
    }, [search, profiles]);

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const snap = await getDocs(collection(db, "profiles"));
            const data = [];
            snap.forEach((doc) => data.push({ docId: doc.id, ...doc.data() }));
            data.sort((a, b) => (a.idNo || "").localeCompare(b.idNo || ""));
            setProfiles(data);
            setFiltered(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        const headers = ["ID No", "Name", "Father/Husband Name", "Phone", "Phone Type", "Email", "Date of Birth", "Address"];
        const rows = filtered.map((p) => [
            p.idNo || "",
            p.name || "",
            p.fatherHusbandName || "",
            p.phoneNumber || "",
            p.phoneType || "",
            p.email || "",
            p.dob || "",
            `"${(p.address || "").replace(/"/g, '""')}"`,
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `all-profiles-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const openEdit = () => {
        setEditForm({
            name: selectedProfile.name || "",
            fatherHusbandName: selectedProfile.fatherHusbandName || "",
            phoneNumber: selectedProfile.phoneNumber || "",
            email: selectedProfile.email || "",
            dob: selectedProfile.dob || "",
            address: selectedProfile.address || ""
        });
        setShowEditModal(true);
    };

    const saveEdit = async () => {
        if (!editForm.name.trim() || !editForm.address.trim()) return;
        try {
            setEditLoading(true);
            await updateDoc(doc(db, "profiles", selectedProfile.docId), {
                name: editForm.name.trim(),
                fatherHusbandName: editForm.fatherHusbandName.trim(),
                phoneNumber: editForm.phoneNumber.trim(),
                email: editForm.email.trim(),
                dob: editForm.dob.trim(),
                address: editForm.address.trim()
            });
            // also sync name to users collection
            await updateDoc(doc(db, "users", selectedProfile.docId), {
                name: editForm.name.trim()
            });
            // update local state so UI reflects immediately
            const updated = { ...selectedProfile, ...editForm };
            setProfiles((prev) => prev.map((p) => p.docId === selectedProfile.docId ? updated : p));
            setFiltered((prev) => prev.map((p) => p.docId === selectedProfile.docId ? updated : p));
            setSelectedProfile(updated);
            setShowEditModal(false);
        } catch (err) {
            console.error(err);
        } finally {
            setEditLoading(false);
        }
    };

    const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "?");

    const avatarPalette = [
        ["#1e40af", "#3b82f6"],
        ["#6d28d9", "#a78bfa"],
        ["#be185d", "#f472b6"],
        ["#065f46", "#34d399"],
        ["#92400e", "#fbbf24"],
        ["#991b1b", "#f87171"],
        ["#0e7490", "#22d3ee"],
        ["#3f6212", "#84cc16"],
    ];
    const getGradient = (id) => {
        const pair = avatarPalette[(id?.charCodeAt(0) || 0) % avatarPalette.length];
        return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
    };

    return (
        <div className="allprf__page">

            {/* Ambient background orbs */}
            <div className="allprf__orb allprf__orb--1" />
            <div className="allprf__orb allprf__orb--2" />

            {/* Back */}
            <button className="allprf__back-btn" onClick={() => navigate("/admin-dashboard")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("back")}
            </button>

            {/* Header */}
            <div className="allprf__header">
                <div className="allprf__eyebrow">
                    <span className="allprf__eyebrow-dot" />
                    <span>{t("allProfiles")}</span>
                </div>
                <h1 className="allprf__title">{t("allProfiles")}</h1>
                <p className="allprf__subtitle">
                    <span className="allprf__count-pill">{filtered.length}</span>
                    &nbsp;{t("profilesFound") || "profiles found"}
                </p>
            </div>

            {/* Controls */}
            <div className="allprf__controls">
                <div className="allprf__search-wrap">
                    <svg className="allprf__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="allprf__search-input"
                        type="text"
                        placeholder={t("searchProfiles") || "Search by name, ID, email..."}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="allprf__search-clear" onClick={() => setSearch("")}>✕</button>
                    )}
                </div>
                <button className="allprf__export-btn" onClick={exportCSV}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {t("export") || "Export CSV"}
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <div className="allprf__loading">
                    <div className="allprf__loader">
                        <div className="allprf__loader-ring" />
                        <div className="allprf__loader-ring allprf__loader-ring--inner" />
                        <div className="allprf__loader-core" />
                    </div>
                    <p className="allprf__loading-text">{t("loading")}</p>
                </div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
                <div className="allprf__empty">
                    <div className="allprf__empty-icon">👤</div>
                    <p>{t("noDataAvailable") || "No profiles found"}</p>
                </div>
            )}

            {/* Grid */}
            {!loading && filtered.length > 0 && (
                <div className="allprf__grid">
                    {filtered.map((profile, index) => (
                        <div
                            key={profile.docId}
                            className="allprf__card"
                            style={{ animationDelay: `${index * 40}ms` }}
                            onClick={() => setSelectedProfile(profile)}
                        >
                            <div className="allprf__card-shine" />
                            <div className="allprf__card-avatar" style={{ background: getGradient(profile.idNo) }}>
                                {getInitial(profile.name)}
                            </div>
                            <div className="allprf__card-body">
                                <h3 className="allprf__card-name">{profile.name}</h3>
                                <span className="allprf__card-id"># {profile.idNo}</span>
                                <span className="allprf__card-phone">{profile.phoneNumber}</span>
                            </div>
                            <div className="allprf__card-chevron">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {selectedProfile && (
                <div className="allprf__overlay" onClick={() => setSelectedProfile(null)}>
                    <div className="allprf__modal" onClick={(e) => e.stopPropagation()}>

                        <div className="allprf__modal-topbar" style={{ background: getGradient(selectedProfile.idNo) }} />

                        <button className="allprf__modal-close" onClick={() => setSelectedProfile(null)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>

                        {/* Edit button */}
                        <button className="allprf__modal-edit-btn" onClick={openEdit}>
                            ✎ {t("edit")}
                        </button>

                        <div className="allprf__modal-hero">
                            <div className="allprf__modal-avatar" style={{ background: getGradient(selectedProfile.idNo) }}>
                                {getInitial(selectedProfile.name)}
                            </div>
                            <h2 className="allprf__modal-name">{selectedProfile.name}</h2>
                            <div className="allprf__modal-id-pill">{selectedProfile.idNo}</div>
                        </div>

                        <div className="allprf__modal-divider" />

                        <div className="allprf__modal-rows">

                            <div className="allprf__modal-row">
                                <span className="allprf__modal-row-icon">🪪</span>
                                <div className="allprf__modal-row-content">
                                    <span className="allprf__modal-row-label">{t("idNo")}</span>
                                    <span className="allprf__modal-row-value">{selectedProfile.idNo}</span>
                                </div>
                            </div>

                            <div className="allprf__modal-row">
                                <span className="allprf__modal-row-icon">👤</span>
                                <div className="allprf__modal-row-content">
                                    <span className="allprf__modal-row-label">{t("fullName")}</span>
                                    <span className="allprf__modal-row-value">{selectedProfile.name}</span>
                                </div>
                            </div>

                            <div className="allprf__modal-row">
                                <span className="allprf__modal-row-icon">👨‍👩‍👦</span>
                                <div className="allprf__modal-row-content">
                                    <span className="allprf__modal-row-label">{t("fatherHusbandName")}</span>
                                    <span className="allprf__modal-row-value">{selectedProfile.fatherHusbandName || "—"}</span>
                                </div>
                            </div>

                            <div className="allprf__modal-row">
                                <span className="allprf__modal-row-icon">📞</span>
                                <div className="allprf__modal-row-content">
                                    <span className="allprf__modal-row-label">{t("phoneNumberLabel")}</span>
                                    <span className="allprf__modal-row-value">{selectedProfile.phoneNumber}</span>
                                </div>
                            </div>

                            <div className="allprf__modal-row">
                                <span className="allprf__modal-row-icon">📱</span>
                                <div className="allprf__modal-row-content">
                                    <span className="allprf__modal-row-label">{t("phoneType")}</span>
                                    <span className={`allprf__phone-badge allprf__phone-badge--${selectedProfile.phoneType === "WhatsApp" ? "wa" : "kp"}`}>
                                        {selectedProfile.phoneType === "WhatsApp" ? `📲 ${t("whatsapp")}` : `📵 ${t("keypad")}`}
                                    </span>
                                </div>
                            </div>

                            <div className="allprf__modal-row">
                                <span className="allprf__modal-row-icon">📧</span>
                                <div className="allprf__modal-row-content">
                                    <span className="allprf__modal-row-label">{t("emailIdLabel")}</span>
                                    <span className="allprf__modal-row-value">{selectedProfile.email || "—"}</span>
                                </div>
                            </div>

                            {selectedProfile.dob && (
                                <div className="allprf__modal-row">
                                    <span className="allprf__modal-row-icon">🎂</span>
                                    <div className="allprf__modal-row-content">
                                        <span className="allprf__modal-row-label">{t("dateOfBirth")}</span>
                                        <span className="allprf__modal-row-value">{selectedProfile.dob}</span>
                                    </div>
                                </div>
                            )}

                            <div className="allprf__modal-row allprf__modal-row--full">
                                <span className="allprf__modal-row-icon">🏠</span>
                                <div className="allprf__modal-row-content">
                                    <span className="allprf__modal-row-label">{t("address")}</span>
                                    <span className="allprf__modal-row-value">{selectedProfile.address || "—"}</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="allprf__edit-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="allprf__edit-modal" onClick={(e) => e.stopPropagation()}>

                        <div className="allprf__edit-header">
                            <h3>✎ {t("edit")} {t("myProfile")}</h3>
                            <button className="allprf__edit-close" onClick={() => setShowEditModal(false)}>✕</button>
                        </div>

                        <div className="allprf__edit-field">
                            <label>{t("fullName")}</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                placeholder={t("fullName")}
                            />
                        </div>

                        <div className="allprf__edit-field">
                            <label>{t("fatherHusbandName")}</label>
                            <input
                                type="text"
                                value={editForm.fatherHusbandName}
                                onChange={(e) => setEditForm({ ...editForm, fatherHusbandName: e.target.value })}
                                placeholder={t("fatherHusbandName")}
                            />
                        </div>

                        <div className="allprf__edit-field">
                            <label>{t("phoneNumberLabel")}</label>
                            <input
                                type="text"
                                value={editForm.phoneNumber}
                                onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                                placeholder={t("phoneNumberLabel")}
                            />
                        </div>

                        <div className="allprf__edit-field">
                            <label>{t("emailIdLabel")}</label>
                            <input
                                type="text"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                placeholder={t("emailIdLabel")}
                            />
                        </div>

                        <div className="allprf__edit-field">
                            <label>{t("dateOfBirth")}</label>
                            <input
                                type="date"
                                value={editForm.dob}
                                onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                            />
                        </div>

                        <div className="allprf__edit-field">
                            <label>{t("address")}</label>
                            <textarea
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                placeholder={t("address")}
                            />
                        </div>

                        <div className="allprf__edit-footer">
                            <button className="allprf__edit-cancel" onClick={() => setShowEditModal(false)}>
                                {t("cancel")}
                            </button>
                            <button className="allprf__edit-save" onClick={saveEdit} disabled={editLoading}>
                                {editLoading ? `⏳ ${t("loading")}` : `💾 ${t("save")}`}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default AllProfiles;