import React, { useEffect, useMemo, useState } from "react";
import "./AllUsers.css";
import { logAdminAction } from "../utils/logAdminAction";
import { db, auth } from "../firebase/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import * as XLSX from "xlsx";

import { useTranslation } from "react-i18next";

/* ------------------------------------------------------------------ */
/* Inline icons (presentational only)                                 */
/* ------------------------------------------------------------------ */
const icons = {
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  sheet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9.5" y1="12.5" x2="14.5" y2="17.5" /><line x1="14.5" y1="12.5" x2="9.5" y2="17.5" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7.5" /><line x1="21" y1="21" x2="16.8" y2="16.8" />
    </svg>
  ),
  filter: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  chevronLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  sort: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 8 12 4 16 8" /><polyline points="16 16 12 20 8 16" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <polyline points="3 7 12 13.5 21 7" />
    </svg>
  ),
  pencil: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
};

/* Decorative dotted grid used in the page corners */
const Dots = ({ className }) => (
  <svg className={`alu-dots ${className}`} viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {[...Array(6)].map((_, r) =>
      [...Array(6)].map((_, c) => (
        <circle key={`${r}-${c}`} cx={7 + c * 15} cy={7 + r * 15} r="3" fill="currentColor" />
      ))
    )}
  </svg>
);

/* "All users" is represented by 0 so it can live in the same <select> */
const PAGE_SIZE_ALL = 0;

function AllUsers() {

  const { t } = useTranslation();

  useEffect(() => {
    const disableRightClick = (e) => e.preventDefault();
    const disableInspectKeys = (e) => {
      if (e.key === "F12") e.preventDefault();
      if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase()))
        e.preventDefault();
      if (e.ctrlKey && e.key.toUpperCase() === "U")
        e.preventDefault();
    };
    document.addEventListener("contextmenu", disableRightClick);
    document.addEventListener("keydown", disableInspectKeys);
    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableInspectKeys);
    };
  }, []);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme] = useState(() => localStorage.getItem("dashTheme") || "dark");
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("asc");
  const [pageSize, setPageSize] = useState(PAGE_SIZE_ALL);
  const [page, setPage] = useState(1);

  const navigate = useNavigate();

  const checkAdmin = async () => {

    const currentUser = auth.currentUser;

    if (!currentUser) {
      navigate("/");
      return;
    }

    try {

      const userRef = doc(db, "users", localStorage.getItem("userId"));
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        navigate("/");
        return;
      }

      const userData = userSnap.data();

      if (
        userData.role !== "admin" ||
        userData.uid !== auth.currentUser.uid
      ) {
        navigate("/");
        return;
      }

      fetchUsers();

    } catch (error) {
      console.log(error);
      navigate("/");
    }
  };

  const fetchUsers = async () => {

    if (!auth.currentUser) {
      navigate("/");
      return;
    }

    try {
      setLoading(true);

      /* Profile photos live in `profiles/{ID}.profileImage` — the Cloudinary
         secure_url written by uploadProfileImage(). Build a lookup first,
         then attach each URL to its user below. */
      const imageMap = {};
      try {
        const profileSnap = await getDocs(collection(db, "profiles"));
        profileSnap.forEach((p) => {
          const pd = p.data();
          const key = String(p.id || "").toUpperCase();
          if (pd.profileImage) imageMap[key] = pd.profileImage;
        });
      } catch (e) {
        // Photos are optional — fall back to initials rather than failing.
        console.warn("AllUsers: could not load profile images —", e);
      }

      const querySnapshot = await getDocs(collection(db, "users"));

      const userList = querySnapshot.docs
        .map((docItem) => ({
          docId: docItem.id,
          ...docItem.data()
        }))
        .filter(user =>
          user.deleted !== true &&
          user.role !== "admin"
        )
        .map((user) => ({
          ...user,
          image:
            imageMap[String(user.id || user.docId).toUpperCase()] ||
            user.profileImage ||
            "",
        }));

      setUsers(userList);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  /* any change to the query or page size puts you back on page one —
     otherwise you can end up stranded on an empty page 4 of 2 */
  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  /* ---------------- filter → sort → paginate ---------------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      String(u.name || "").toLowerCase().includes(q) ||
      String(u.id || "").toLowerCase().includes(q) ||
      String(u.email || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const totalPages = pageSize === PAGE_SIZE_ALL
    ? 1
    : Math.max(1, Math.ceil(sorted.length / pageSize));

  const safePage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    if (pageSize === PAGE_SIZE_ALL) return sorted;
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, pageSize, safePage]);

  const rangeFrom = sorted.length === 0 ? 0 : (pageSize === PAGE_SIZE_ALL ? 1 : (safePage - 1) * pageSize + 1);
  const rangeTo = pageSize === PAGE_SIZE_ALL ? sorted.length : Math.min(safePage * pageSize, sorted.length);

  /* Export what's on screen — filtered and sorted — rather than the raw
     collection, so the file matches what the admin is looking at. */
  const exportToExcel = () => {
    const data = sorted.map((user) => ({
      Name: user.name || "-",
      ID: user.id,
      Email: user.email,
      Status: user.disabled === true ? "Inactive" : "Active",
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `AllUsers_${date}.xlsx`);
  };

  const openDeleteModal = (id) => {
    setSelectedUser(id);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await updateDoc(doc(db, "users", selectedUser), {
        deleted: true,
        deletedBy: localStorage.getItem("userId"),
        deletedAt: new Date().toISOString()
      });
      await logAdminAction("delete_user", {
        targetId: selectedUser,
        details: t("logDeletedUser", { id: selectedUser }),
      });
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      console.log(error);
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/edit-user/${id}`);
  };

  /* Two-tone heading. Rather than hard-coding an "All" + "Users" split
     (which breaks the moment a language reorders the words), take the
     translated string and tint its final word. */
  const titleFull = (t("allUsers") || "All Users").trim();
  const titleWords = titleFull.split(/\s+/);
  const titleAccent = titleWords.length > 1 ? titleWords.pop() : titleFull;
  const titleLead = titleWords.length ? titleWords.join(" ") : "";

  const SortHead = ({ label, colKey }) => (
    <button
      type="button"
      className={`alu-th-btn ${sortKey === colKey ? "alu-th-btn--active" : ""}`}
      onClick={() => toggleSort(colKey)}
      data-dir={sortKey === colKey ? sortDir : undefined}
    >
      {label}
      <span className="alu-sort-icon">{icons.sort}</span>
    </button>
  );

  return (
    <div className="users-container" data-theme={theme}>

      <Dots className="alu-dots--tl" />
      <Dots className="alu-dots--br" />

      {/* ============================ HEADER ============================ */}
      <div className="alu-header">
        <button className="alu-back" onClick={() => navigate("/admin-dashboard")}>
          <span className="alu-back-icon">{icons.back}</span>
          {t("back")}
        </button>

        <div className="alu-head-center">
          <span className="alu-eyebrow">
            <span className="alu-eyebrow-icon">{icons.users}</span>
            {t("userManagement") || "User Management"}
          </span>
          <h1 className="alu-title">
            {titleLead && <span className="alu-title-lead">{titleLead} </span>}
            <span className="alu-title-accent">{titleAccent}</span>
          </h1>
          <p className="alu-subtitle">
            {t("allUsersSubtitle") || "Manage and view all registered users in the system."}
          </p>
          <span className="alu-rule" aria-hidden="true" />
        </div>

        <button className="alu-export" onClick={exportToExcel}>
          <span className="alu-btn-icon">{icons.sheet}</span>
          {t("exportExcel")}
        </button>
      </div>

      {/* ============================= PANEL ============================ */}
      <div className="alu-panel">

        <div className="alu-toolbar">
          <div className="alu-search">
            <span className="alu-search-icon">{icons.search}</span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                if (/^[A-Z0-9@]*$/.test(value)) setSearch(value);
              }}
              placeholder={t("searchByNameIdEmail") || "Search by name, ID or email…"}
            />
            {search && (
              <button
                type="button"
                className="alu-search-clear"
                onClick={() => setSearch("")}
                aria-label={t("cancel")}
              >
                ✕
              </button>
            )}
          </div>

          <div className="alu-filter">
            <span className="alu-filter-icon">{icons.filter}</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label={t("allUsers")}
            >
              <option value={PAGE_SIZE_ALL}>{t("allUsers")}</option>
              <option value={10}>{t("perPageCount", { count: 10 })}</option>
              <option value={25}>{t("perPageCount", { count: 25 })}</option>
              <option value={50}>{t("perPageCount", { count: 50 })}</option>
            </select>
            <span className="alu-filter-chevron">{icons.chevronDown}</span>
          </div>
        </div>

        <div className="alu-table">
          <div className="alu-thead">
            <span><SortHead label={t("name")} colKey="name" /></span>
            <span><SortHead label={t("id")} colKey="id" /></span>
            <span><SortHead label={t("email")} colKey="email" /></span>
            <span className="alu-th-plain">{t("actions")}</span>
          </div>

          {loading ? (
            <div className="alu-empty">
              <span className="alu-spinner" />
            </div>
          ) : paged.length === 0 ? (
            <div className="alu-empty">
              <span className="alu-empty-icon">{icons.inbox}</span>
              <p className="alu-empty-title">{t("noUsersFound") || "No users found"}</p>
            </div>
          ) : (
            paged.map((user) => {
              const inactive = user.disabled === true;
              return (
                <div key={user.docId} className="alu-row">

                  <div className="alu-cell alu-cell--name">
                    <span className="alu-avatar">
                      {getInitials(user.name)}
                      {user.image ? (
                        <img
                          className="alu-avatar-img"
                          src={user.image}
                          alt={user.name || user.id}
                          loading="lazy"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      ) : null}
                    </span>
                    <span className="alu-name-text">
                      <span className="alu-name">{user.name || "-"}</span>
                      <span className={`alu-status ${inactive ? "alu-status--off" : ""}`}>
                        <span className="alu-status-dot" />
                        {inactive ? (t("inactive") || "Inactive") : (t("active") || "Active")}
                      </span>
                    </span>
                  </div>

                  <div className="alu-cell alu-cell--id">
                    <span className="alu-id-chip">{user.id}</span>
                  </div>

                  <div className="alu-cell alu-cell--email">
                    <span className="alu-email-icon">{icons.mail}</span>
                    <span className="alu-email-text">{user.email}</span>
                  </div>

                  <div className="alu-cell alu-cell--actions">
                    <button className="alu-act alu-act--edit" onClick={() => handleEdit(user.id)}>
                      <span className="alu-btn-icon">{icons.pencil}</span>
                      {t("edit")}
                    </button>
                    <button className="alu-act alu-act--delete" onClick={() => openDeleteModal(user.docId)}>
                      <span className="alu-btn-icon">{icons.trash}</span>
                      {t("delete")}
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* ---------------------------- FOOTER --------------------------- */}
        <div className="alu-footer">
          <div className="alu-total">
            <span className="alu-total-icon">{icons.users}</span>
            <div className="alu-total-text">
              <span className="alu-total-label">{t("totalUsers")}</span>
              <span className="alu-total-num">{sorted.length}</span>
              <span className="alu-total-range">
                {t("showingRange", {
                  from: rangeFrom,
                  to: rangeTo,
                  total: sorted.length,
                }) || `Showing ${rangeFrom} to ${rangeTo} of ${sorted.length}`}
              </span>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="alu-pager">
              <button
                className="alu-page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                aria-label={t("previousPage") || "Previous page"}
              >
                {icons.chevronLeft}
              </button>

              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`alu-page-btn ${safePage === i + 1 ? "alu-page-btn--active" : ""}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}

              <button
                className="alu-page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                aria-label={t("nextPage") || "Next page"}
              >
                {icons.chevronRight}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================= MODAL ============================ */}
      {showModal && (
        <div className="alu-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="alu-modal" onClick={(e) => e.stopPropagation()}>
            <span className="alu-modal-icon">{icons.alert}</span>
            <h3>{t("deleteUser")}</h3>
            <p>{t("deleteConfirmMsg")}</p>

            <div className="alu-modal-buttons">
              <button className="alu-cancel" onClick={() => setShowModal(false)} disabled={deleting}>
                {t("cancel")}
              </button>
              <button className="alu-confirm" onClick={confirmDelete} disabled={deleting}>
                {deleting ? <span className="alu-spinner alu-spinner--sm" /> : icons.trash}
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AllUsers;