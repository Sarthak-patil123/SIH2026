import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral' | 'warning';
  icon?: React.ReactNode;
  iconBg?: string;
  subtitle?: string;
  className?: string;
}

export default function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  iconBg = 'bg-slate-100 text-slate-700',
  subtitle,
  className,
}: StatCardProps) {
  const changeStyles = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    negative: 'bg-rose-50 text-rose-700 border-rose-200/80',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div
      className={cn(
        'bg-white border border-slate-200/90 rounded-card p-5 shadow-card transition-all duration-200 hover:shadow-card-hover hover:border-slate-300',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
            {value}
          </p>
        </div>
        {icon && (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-subtle', iconBg)}>
            {icon}
          </div>
        )}
      </div>

      {(change || subtitle) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
          {change && (
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border', changeStyles[changeType])}>
              {change}
            </span>
          )}
          {subtitle && (
            <span className="text-slate-400 truncate">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
