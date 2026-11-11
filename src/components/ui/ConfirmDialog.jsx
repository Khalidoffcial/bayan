import React, { useEffect, useRef } from "react";
import { TriangleAlert as FaExclamationTriangle } from "lucide-react";
import "./confirmDialog.css";

/**
 * In-app confirmation dialog — replaces window.confirm() for destructive
 * actions (delete post / discard draft). RTL + dark-mode aware.
 * Closes on Escape and on backdrop click (only when not busy).
 */
export const ConfirmDialog = ({
  isOpen,
  title = "تأكيد",
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !busy) onCancel?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, busy, onCancel]);

  useEffect(() => {
    if (isOpen && !busy) confirmBtnRef.current?.focus();
  }, [isOpen, busy]);

  if (!isOpen) return null;

  return (
    <div
      className="confirm-backdrop"
      onClick={() => {
        if (!busy) onCancel?.();
      }}
      role="presentation"
    >
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-icon-wrap">
          <FaExclamationTriangle className="confirm-icon" aria-hidden="true" />
        </div>
        <h3 className="confirm-title">{title}</h3>
        {message && <p className="confirm-message">{message}</p>}
        <div className="confirm-buttons">
          <button
            type="button"
            className="confirm-btn confirm-btn--cancel"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmBtnRef}
            className={`confirm-btn confirm-btn--${danger ? "danger" : "primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "جارٍ التنفيذ…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
