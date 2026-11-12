import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { generateId } from '@/lib/utils';

export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = generateId('toast');
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      setTimeout(() => {
        dismissToast(id);
      }, 4500);
    },
    [dismissToast],
  );

  return (
    <ToastContext.Provider value={{ pushToast, dismissToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="sp-card flex items-start gap-3 border-border-strong bg-bg-elevated p-3.5 shadow-soft"
          >
            {toast.variant === 'success' && (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-success" />
            )}
            {toast.variant === 'warning' && (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-warning" />
            )}
            {toast.variant === 'error' && (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-error" />
            )}
            {toast.variant === 'info' && (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-secondary" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-text-secondary">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
              className="rounded p-1 text-text-muted hover:bg-bg-surface hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
