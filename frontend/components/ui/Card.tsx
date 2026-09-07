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
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'bg-navy-800 border border-navy-600 rounded-lg',
        paddingClasses[padding],
        hover && 'transition-shadow duration-150 hover:shadow-card-hover hover:border-navy-500',
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
    <h3 className={cn('text-sm font-semibold text-slate-200 uppercase tracking-wide', className)}>
      {children}
    </h3>
  );
}

export function CardDivider() {
  return <div className="border-t border-navy-600 my-4" />;
}
