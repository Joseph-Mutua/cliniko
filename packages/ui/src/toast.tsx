import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";

type ToastTone = "info" | "success" | "error";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastInput = {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastContextValue = {
  pushToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider(props: PropsWithChildren<{}>) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((input: ToastInput) => {
    const toast: Toast = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      message: input.message,
      tone: input.tone ?? "info",
    };
    setToasts((current: Toast[]) => [...current, toast]);

    const duration = input.durationMs ?? 2800;
    setTimeout(() => {
      setToasts((current: Toast[]) => current.filter((item: Toast) => item.id !== toast.id));
    }, duration);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {props.children}
      <div className="cc-toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((toast: Toast) => (
          <div key={toast.id} className={`cc-toast tone-${toast.tone}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
