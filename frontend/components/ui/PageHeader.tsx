import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, actions, badge, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2', className)}>
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
