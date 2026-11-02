import React from "react";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from "react-icons/fa";
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
    (message, { type = "info", duration = 3500 } = {}) => {
      if (!message) return null;
      const id = ++toastSeq;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
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
      <div className="toast-stack" role="region" aria-label="Notifications">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || FaInfoCircle;
          return (
            <div key={t.id} className={`toast toast--${t.type}`} role="status">
              <Icon className="toast-icon" aria-hidden="true" />
              <span className="toast-message">{t.message}</span>
              <button
                type="button"
                className="toast-close"
                onClick={() => dismiss(t.id)}
                aria-label="إغلاق الإشعار"
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
