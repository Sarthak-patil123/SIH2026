import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export default function Card({ children, className, padding = 'md', hover = false }: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'bg-white border border-slate-200/90 rounded-card shadow-card',
        paddingClasses[padding],
        hover && 'transition-all duration-200 hover:shadow-card-hover hover:border-slate-300',
        className
      )}
    >
      {children}
    </div>
  );
}

// ── Card sub-components ────────────────────────────────────────
export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('font-heading text-sm font-semibold text-slate-900 tracking-tight', className)}>
      {children}
    </h3>
  );
}

export function CardSubtitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-xs text-slate-500 mt-0.5', className)}>
      {children}
    </p>
  );
}

export function CardDivider({ className }: { className?: string }) {
  return <div className={cn('border-t border-slate-100 my-4', className)} />;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-xs text-slate-500', className)}>
      {children}
    </div>
  );
}
