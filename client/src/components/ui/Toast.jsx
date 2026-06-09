import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const ToastContext = createContext(null);

let toastCounter = 0;

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), 4200);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.id]);

  return (
    <div className={`toast toast-${toast.type}`} role={toast.type === "error" ? "alert" : "status"}>
      <p className="toast-message">{toast.message}</p>
      <button
        aria-label="Dismiss notification"
        className="toast-dismiss"
        onClick={() => onDismiss(toast.id)}
        type="button"
      >
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((message, type = "success") => {
    const trimmed = message?.trim?.() ?? message;
    if (!trimmed) {
      return;
    }

    const id = ++toastCounter;
    setToasts((current) => [...current, { id, message: trimmed, type }]);
  }, []);

  const toast = useMemo(
    () => ({
      success: (message) => push(message, "success"),
      error: (message) => push(message, "error"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-live="polite" className="toast-viewport">
        {toasts.map((item) => (
          <ToastItem key={item.id} onDismiss={dismiss} toast={item} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const toast = useContext(ToastContext);

  if (!toast) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return toast;
}
