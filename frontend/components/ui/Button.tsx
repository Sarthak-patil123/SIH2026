'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success' | 'warning';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 shadow-subtle active:bg-blue-800',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-subtle active:bg-slate-100',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 shadow-subtle active:bg-rose-800',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-subtle active:bg-emerald-800',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-500 shadow-subtle active:bg-amber-700',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent',
  outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200',
};

const sizeClasses: Record<Size, string> = {
  xs: 'px-2.5 py-1 text-xs rounded-md font-medium',
  sm: 'px-3 py-1.5 text-xs rounded-lg font-medium',
  md: 'px-4 py-2 text-sm rounded-lg font-medium',
  lg: 'px-5 py-2.5 text-sm rounded-lg font-semibold',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1 focus:ring-offset-white',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className="w-4 h-4 flex items-center justify-center">{iconRight}</span>
      )}
    </button>
  );
}
