import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  listPasskeys,
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  renamePasskey,
  removePasskey,
  totpStepUp,
  passkeysSupported,
  cancelPasskeyPrompt,
  defaultPasskeyLabel,
  passkeyErrorKey,
} from "../utils/passkey";
import usePasskeyStepUp from "../hooks/usePasskeyStepUp";
import "./PasskeyManager.css";

/* ------------------------------------------------------------------ */
/* Icons                                                              */
/* ------------------------------------------------------------------ */
const Fingerprint = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 10.5v3.2a7 7 0 0 0 1.2 3.9" />
    <path d="M9 9.6a3.6 3.6 0 0 1 6.1 2.6c0 2 .3 3.4 1 4.6" />
    <path d="M6.4 12.2a5.9 5.9 0 0 1 2-4.9" />
    <path d="M9.2 19.4A8.8 8.8 0 0 1 8 15.2v-3a4 4 0 0 1 .3-1.6" />
    <path d="M4.6 8.4a8.6 8.6 0 0 1 13.6-1.6" />
    <path d="M19.6 9.6c.3 1 .4 1.9.4 2.8 0 1.9.1 3.4.6 4.6" />
  </svg>
);
const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.7 12.3 21 2M17 6l3 3M14.5 8.5l2 2" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

const formatDate = (ms, lang) => {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleDateString(lang || undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return new Date(ms).toDateString();
  }
};

/* ------------------------------------------------------------------ */
/* Accessible modal shell                                             */
/* ------------------------------------------------------------------ */
export function PasskeyModal({ title, onClose, children, theme = "dark", busy = false }) {
  const { t } = useTranslation();
  const titleId = useId();
  const boxRef = useRef(null);
  const latest = useRef({ busy, onClose });
  useEffect(() => {
    latest.current = { busy, onClose };
  });

  // mount-only: focus the first field, trap Tab, Escape closes, restore focus on close
  useEffect(() => {
    const prev = document.activeElement;
    const first = boxRef.current?.querySelector("input, button:not([data-close])");
    first?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !latest.current.busy) latest.current.onClose();
      if (e.key === "Tab" && boxRef.current) {
        const items = [...boxRef.current.querySelectorAll("button, input, [tabindex]:not([tabindex='-1'])")].filter((el) => !el.disabled);
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, []);

  return (
    <div className="pkm-overlay" data-theme={theme} onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="pkm-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={boxRef}>
        <div className="pkm-modal-head">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="pkm-icon-btn" data-close onClick={onClose} disabled={busy} aria-label={t("passkey.manage.close")}>
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step-up: authenticator code, or an existing passkey                */
/* ------------------------------------------------------------------ */
export function StepUpFields({ allowPasskey, busy, onSubmitCode, onUsePasskey, submitLabel, error }) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const inputId = useId();

  return (
    <form
      className="pkm-stepup"
      onSubmit={(e) => { e.preventDefault(); if (/^\d{6}$/.test(code)) onSubmitCode(code); }}
    >
      <p className="pkm-muted">{t("passkey.stepUp.intro")}</p>
      <label htmlFor={inputId} className="pkm-label">{t("passkey.stepUp.codeLabel")}</label>
      <input
        id={inputId}
        className="pkm-input pkm-input--code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder={t("passkey.stepUp.codePlaceholder")}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        disabled={busy}
        aria-invalid={!!error}
      />
      {error && <p className="pkm-error" role="alert">{error}</p>}
      <button type="submit" className="pkm-btn pkm-btn--primary" disabled={busy || code.length !== 6}>
        {busy ? t("passkey.manage.working") : submitLabel}
      </button>
      {allowPasskey && (
        <button type="button" className="pkm-btn pkm-btn--ghost" onClick={onUsePasskey} disabled={busy}>
          <Fingerprint /> {t("passkey.stepUp.usePasskey")}
        </button>
      )}
    </form>
  );
}

/* ================================================================== */
/* Main component                                                     */
/* ================================================================== */
export default function PasskeyManager({ theme = "dark", role = "user" }) {
  const { t, i18n } = useTranslation();
  const supported = passkeysSupported();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [passkeys, setPasskeys] = useState([]);
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [maxPasskeys, setMaxPasskeys] = useState(10);
  const [notice, setNotice] = useState(null); // { type: "success" | "error", text }

  // add flow
  const [adding, setAdding] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [addLabel, setAddLabel] = useState("");
  const [addPending, setAddPending] = useState(null);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState("");

  // rename
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);

  // remove
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const labelInputId = useId();

  // pre-fetched passkey re-auth for the add / remove dialogs
  const stepUpWithPasskey = usePasskeyStepUp(
    supported && passkeys.length > 0 && ((adding && addStep === 1) || !!removing)
  );

  const flash = (type, text) => {
    setNotice({ type, text });
    if (type === "success") setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 5000);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await listPasskeys();
      setPasskeys(data.passkeys || []);
      setMfaEnabled(data.mfaEnabled !== false);
      setMaxPasskeys(data.maxPasskeys || 10);
    } catch (err) {
      setLoadError(t(passkeyErrorKey(err)));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { refresh(); }, [refresh]);

  /* ---------------- add ---------------- */

  const openAdd = () => {
    setNotice(null);
    setAddLabel(defaultPasskeyLabel());
    setAddStep(1);
    setAddPending(null);
    setAddError("");
    setAdding(true);
  };

  const closeAdd = useCallback(() => {
    cancelPasskeyPrompt();
    setAdding(false);
    setAddBusy(false);
  }, []);

  const startAdd = async (stepUpFactory) => {
    setAddBusy(true);
    setAddError("");
    try {
      const stepUp = await stepUpFactory();
      const pending = await beginPasskeyRegistration(stepUp);
      setAddPending(pending);
      setAddStep(2);
    } catch (err) {
      setAddError(t(passkeyErrorKey(err)));
    } finally {
      setAddBusy(false);
    }
  };

  // Called straight from the button click so the browser keeps the user gesture.
  const createPasskey = async () => {
    setAddBusy(true);
    setAddError("");
    try {
      await finishPasskeyRegistration(addPending, addLabel);
      setAdding(false);
      flash("success", t("passkey.manage.registered"));
      refresh();
    } catch (err) {
      const expired = ["CHALLENGE_EXPIRED", "CHALLENGE_USED", "CHALLENGE_INVALID"].includes(err?.code);
      setAddError(t(passkeyErrorKey(err)));
      if (expired || err?.code !== "CANCELLED") {
        // a challenge is single-use: anything other than a cancel needs a fresh one
        setAddStep(1);
        setAddPending(null);
      }
    } finally {
      setAddBusy(false);
    }
  };

  /* ---------------- rename ---------------- */

  const saveRename = async (credentialId) => {
    const value = renameValue.trim();
    if (!value) return;
    setRenameBusy(true);
    try {
      const { passkey } = await renamePasskey(credentialId, value);
      setPasskeys((list) => list.map((p) => (p.credentialId === credentialId ? { ...p, label: passkey.label } : p)));
      setRenamingId(null);
      flash("success", t("passkey.manage.renamed"));
    } catch (err) {
      flash("error", t(passkeyErrorKey(err)));
    } finally {
      setRenameBusy(false);
    }
  };

  /* ---------------- remove ---------------- */

  const confirmRemove = async (stepUpFactory) => {
    setRemoveBusy(true);
    setRemoveError("");
    try {
      const stepUp = await stepUpFactory();
      await removePasskey(removing.credentialId, stepUp);
      setRemoving(null);
      flash("success", t("passkey.manage.removed"));
      refresh();
    } catch (err) {
      setRemoveError(t(passkeyErrorKey(err)));
    } finally {
      setRemoveBusy(false);
    }
  };

  const closeRemove = useCallback(() => {
    cancelPasskeyPrompt();
    setRemoving(null);
  }, []);

  /* ---------------- render ---------------- */

  const count = passkeys.length;
  const atLimit = count >= maxPasskeys;

  return (
    <section className="pkm" data-theme={theme} aria-labelledby="pkm-title">
      <div className="pkm-head">
        <span className="pkm-head-icon"><Fingerprint /></span>
        <div>
          <p className="pkm-eyebrow">{t("passkey.manage.sectionTitle")}</p>
          <h2 id="pkm-title" className="pkm-title">{t("passkey.manage.title")}</h2>
        </div>
      </div>

      <p className="pkm-muted">{t("passkey.manage.intro")}</p>

      <div className="pkm-live" aria-live="polite">
        {notice && (
          <p className={notice.type === "success" ? "pkm-success" : "pkm-error"} role={notice.type === "error" ? "alert" : "status"}>
            {notice.text}
          </p>
        )}
      </div>

      {loading ? (
        <p className="pkm-muted pkm-row-center"><span className="pkm-spinner" aria-hidden="true" />{t("passkey.manage.loading")}</p>
      ) : loadError ? (
        <div className="pkm-row-center">
          <p className="pkm-error" role="alert">{loadError}</p>
          <button type="button" className="pkm-btn pkm-btn--ghost" onClick={refresh}>{t("passkey.manage.retry")}</button>
        </div>
      ) : (
        <>
          <div className={`pkm-status ${count ? "is-on" : "is-off"}`}>
            <span className="pkm-status-dot" aria-hidden="true" />
            <span>{count ? t("passkey.manage.statusOn", { count }) : t("passkey.manage.statusOff")}</span>
          </div>

          {!supported && <p className="pkm-warn">{t("passkey.manage.unsupported")}</p>}
          {!mfaEnabled && <p className="pkm-warn">{t("passkey.errors.MFA_NOT_ENABLED")}</p>}

          {count > 0 && (
            <ul className="pkm-list">
              {passkeys.map((p) => (
                <li key={p.credentialId} className="pkm-item">
                  <span className="pkm-item-icon"><KeyIcon /></span>
                  <div className="pkm-item-body">
                    {renamingId === p.credentialId ? (
                      <form className="pkm-rename" onSubmit={(e) => { e.preventDefault(); saveRename(p.credentialId); }}>
                        <label className="pkm-sr-only" htmlFor={`rn-${p.credentialId}`}>{t("passkey.manage.labelField")}</label>
                        <input
                          id={`rn-${p.credentialId}`}
                          className="pkm-input"
                          value={renameValue}
                          maxLength={40}
                          autoFocus
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Escape") setRenamingId(null); }}
                          disabled={renameBusy}
                        />
                        <button type="submit" className="pkm-btn pkm-btn--primary pkm-btn--sm" disabled={renameBusy || !renameValue.trim()}>{t("passkey.manage.save")}</button>
                        <button type="button" className="pkm-btn pkm-btn--ghost pkm-btn--sm" onClick={() => setRenamingId(null)} disabled={renameBusy}>{t("passkey.manage.cancel")}</button>
                      </form>
                    ) : (
                      <p className="pkm-item-name">
                        {p.label}
                        {p.backedUp && <span className="pkm-chip">{t("passkey.manage.synced")}</span>}
                      </p>
                    )}
                    <p className="pkm-item-meta">
                      {t("passkey.manage.created", { date: formatDate(p.createdAt, i18n.language) })}
                      {" · "}
                      {p.lastUsedAt
                        ? t("passkey.manage.lastUsed", { date: formatDate(p.lastUsedAt, i18n.language) })
                        : t("passkey.manage.neverUsed")}
                    </p>
                  </div>
                  {renamingId !== p.credentialId && (
                    <div className="pkm-item-actions">
                      <button
                        type="button"
                        className="pkm-btn pkm-btn--ghost pkm-btn--sm"
                        onClick={() => { setRenamingId(p.credentialId); setRenameValue(p.label); }}
                        aria-label={`${t("passkey.manage.rename")}: ${p.label}`}
                      >
                        {t("passkey.manage.rename")}
                      </button>
                      <button
                        type="button"
                        className="pkm-btn pkm-btn--danger pkm-btn--sm"
                        onClick={() => { setRemoveError(""); setRemoving(p); }}
                        aria-label={`${t("passkey.manage.remove")}: ${p.label}`}
                      >
                        {t("passkey.manage.remove")}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="pkm-btn pkm-btn--primary pkm-add"
            onClick={openAdd}
            disabled={!supported || !mfaEnabled || atLimit}
          >
            <Fingerprint />
            {count ? t("passkey.manage.addAnother") : t("passkey.manage.setUp")}
          </button>
          {atLimit && <p className="pkm-muted">{t("passkey.errors.LIMIT_REACHED")}</p>}

          <p className="pkm-note">
            {role === "admin" ? t("passkey.manage.recoveryNoteAdmin") : t("passkey.manage.recoveryNote")}
          </p>
        </>
      )}

      {/* ---------------- add modal ---------------- */}
      {adding && (
        <PasskeyModal title={t("passkey.add.title")} onClose={closeAdd} theme={theme} busy={addBusy}>
          {addStep === 1 ? (
            <>
              <label htmlFor={labelInputId} className="pkm-label">{t("passkey.manage.labelField")}</label>
              <input
                id={labelInputId}
                className="pkm-input"
                maxLength={40}
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                disabled={addBusy}
              />
              <p className="pkm-hint">{t("passkey.manage.labelHint")}</p>
              <StepUpFields
                allowPasskey={supported && count > 0}
                busy={addBusy}
                error={addError}
                submitLabel={t("passkey.add.continue")}
                onSubmitCode={(code) => startAdd(async () => totpStepUp(code))}
                onUsePasskey={() => startAdd(stepUpWithPasskey)}
              />
            </>
          ) : (
            <div className="pkm-step2">
              <span className="pkm-big-icon"><Fingerprint /></span>
              <p className="pkm-muted">{t("passkey.add.step2Text")}</p>
              {addError && <p className="pkm-error" role="alert">{addError}</p>}
              <button type="button" className="pkm-btn pkm-btn--primary" onClick={createPasskey} disabled={addBusy}>
                {addBusy ? t("passkey.add.waiting") : t("passkey.add.create")}
              </button>
            </div>
          )}
        </PasskeyModal>
      )}

      {/* ---------------- remove modal ---------------- */}
      {removing && (
        <PasskeyModal title={t("passkey.remove.title")} onClose={closeRemove} theme={theme} busy={removeBusy}>
          <p className="pkm-muted">{t("passkey.remove.text", { label: removing.label })}</p>
          {count === 1 && <p className="pkm-warn">{t("passkey.remove.lastWarning")}</p>}
          <StepUpFields
            allowPasskey={supported}
            busy={removeBusy}
            error={removeError}
            submitLabel={t("passkey.remove.confirm")}
            onSubmitCode={(code) => confirmRemove(async () => totpStepUp(code))}
            onUsePasskey={() => confirmRemove(stepUpWithPasskey)}
          />
        </PasskeyModal>
      )}
    </section>
  );
}