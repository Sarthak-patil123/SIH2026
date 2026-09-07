import React from 'react';
import { cn } from '@/lib/utils';

// ── Input ──────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export default function Input({
  label, error, hint, leftIcon, rightIcon, containerClassName, className, id, ...props
}: InputProps) {
  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          className={cn(
            'w-full bg-navy-700 border text-slate-100 rounded-md px-3 py-2 text-sm',
            'placeholder-slate-500 transition-colors duration-150',
            'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
            error ? 'border-danger' : 'border-navy-600 hover:border-navy-500',
            leftIcon ? 'pl-9' : '',
            rightIcon ? 'pr-9' : '',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// ── Textarea ───────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export function Textarea({ label, error, containerClassName, className, id, ...props }: TextareaProps) {
  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          'w-full bg-navy-700 border text-slate-100 rounded-md px-3 py-2 text-sm',
          'placeholder-slate-500 transition-colors duration-150 resize-none',
          'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
          error ? 'border-danger' : 'border-navy-600 hover:border-navy-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// ── Select ─────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, containerClassName, className, id, options, placeholder, ...props }: SelectProps) {
  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'w-full bg-navy-700 border text-slate-100 rounded-md px-3 py-2 text-sm',
          'transition-colors duration-150 cursor-pointer',
          'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
          error ? 'border-danger' : 'border-navy-600 hover:border-navy-500',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-navy-700">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
