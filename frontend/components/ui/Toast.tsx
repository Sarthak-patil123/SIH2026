'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-emerald-600" />,
  error: <XCircle size={16} className="text-rose-600" />,
  warning: <AlertTriangle size={16} className="text-amber-600" />,
  info: <Info size={16} className="text-blue-600" />,
};

const typeClasses: Record<ToastType, string> = {
  success: 'border-l-4 border-l-emerald-500',
  error: 'border-l-4 border-l-rose-500',
  warning: 'border-l-4 border-l-amber-500',
  info: 'border-l-4 border-l-blue-500',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => showToast({ type: 'success', title, message }), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast({ type: 'error', title, message }), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast({ type: 'warning', title, message }), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast({ type: 'info', title, message }), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-84 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 p-4 bg-white border border-slate-200/90 rounded-xl shadow-dropdown animate-fade-in',
              typeClasses[toast.type]
            )}
          >
            <span className="mt-0.5 flex-shrink-0">{icons[toast.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900">{toast.title}</p>
              {toast.message && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside <ToastProvider>');
  return ctx;
}
