import React from "react";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from "react-icons/fa";
import { useTranslation } from "../../i18n/useTranslation";
import "./toast.css";

/**
 * Lightweight in-app toast system (Bayan Space identity).
 * Replaces window.alert() across publish / edit / delete flows.
 * RTL + dark-mode aware via CSS variables from styles/variables.css.
 */
const ToastContext = React.createContext(null);

const noopToast = {
  success: () => null,
  error: () => null,
  warning: () => null,
  info: () => null,
  dismiss: () => null,
};

export const useToast = () => {
  const ctx = React.useContext(ToastContext);
  // Graceful no-op fallback so components render in isolation (tests, storybook)
  return ctx || noopToast;
};

const ICONS = {
  success: FaCheckCircle,
  error: FaExclamationCircle,
  warning: FaExclamationCircle,
  info: FaInfoCircle,
};

let toastSeq = 0;

export const ToastProvider = ({ children }) => {
  const { t } = useTranslation();
  const [toasts, setToasts] = React.useState([]);
  const timersRef = React.useRef(new Map());

  const dismiss = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = React.useCallback(
    (rawMessage, { type = "info", duration = 3500 } = {}) => {
      // Data contract: a toast message must end up as renderable text.
      // Callers occasionally pass the API payload object itself — coerce
      // instead of storing a non-string that would crash rendering.
      const message =
        typeof rawMessage === "string" || typeof rawMessage === "number"
          ? rawMessage
          : rawMessage?.message ?? rawMessage?.error ?? "";
      if (!message) return null;
      const id = ++toastSeq;
      setToasts((prev) => [...prev.slice(-3), { id, message: String(message), type }]);
      if (duration > 0) {
        const timer = window.setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  const api = React.useMemo(
    () => ({
      success: (msg, opts) => push(msg, { ...opts, type: "success" }),
      error: (msg, opts) => push(msg, { ...opts, type: "error", duration: opts?.duration ?? 4500 }),
      warning: (msg, opts) => push(msg, { ...opts, type: "warning" }),
      info: (msg, opts) => push(msg, { ...opts, type: "info" }),
      dismiss,
    }),
    [push, dismiss]
  );

  React.useEffect(() => () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="region" aria-label={t("aria.notifications")}>
        {toasts.map((toast) => {
          // IMPORTANT: the callback param must NOT be named `t` — it shadowed
          // the translation function and turned `aria-label={t("toast.close")}`
          // into a call on the toast object (TypeError: e is not a function),
          // crashing the whole tree the instant any toast rendered.
          if (!toast || typeof toast !== "object" || toast.id == null) return null;
          const Icon = ICONS[toast.type] || FaInfoCircle;
          return (
            <div key={toast.id} className={`toast toast--${toast.type}`} role="status">
              <Icon className="toast-icon" aria-hidden="true" />
              <span className="toast-message">{toast.message}</span>
              <button
                type="button"
                className="toast-close"
                onClick={() => dismiss(toast.id)}
                aria-label={t("toast.close")}
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
