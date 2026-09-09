'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export default function Dialog({ open, onClose, title, description, children, size = 'md', footer }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full bg-white border border-slate-200/90 rounded-2xl shadow-modal',
          'animate-fade-in overflow-hidden',
          sizeClasses[size]
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold font-heading text-slate-900">{title}</h2>
            {description && (
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        {children && (
          <div className="p-5 space-y-4 text-slate-700">{children}</div>
        )}

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'success' | 'warning';
  loading?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', confirmVariant = 'primary', loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Dialog>
  );
}
