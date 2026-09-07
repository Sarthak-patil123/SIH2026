import React from 'react';
import { cn } from '@/lib/utils';
import { CaseStatus, RiskLevel } from '@/types';
import { getCaseStatusClasses, getCaseStatusLabel, getRiskLevelClasses } from '@/lib/utils';

// ── Generic Badge ──────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'dot';
  dotColor?: string;
}

export function Badge({ children, className, variant = 'default', dotColor }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        variant === 'outline' && 'bg-transparent',
        className
      )}
    >
      {variant === 'dot' && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColor || 'bg-current')} />
      )}
      {children}
    </span>
  );
}

// ── Status Badge ───────────────────────────────────────────────
interface StatusBadgeProps {
  status: CaseStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const dotColors: Record<CaseStatus, string> = {
    APPROVED: 'bg-emerald-500',
    PENDING: 'bg-slate-400',
    UNDER_REVIEW: 'bg-amber-500',
    FLAGGED: 'bg-rose-500',
    REJECTED: 'bg-rose-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        getCaseStatusClasses(status),
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[status])} />
      {getCaseStatusLabel(status)}
    </span>
  );
}

// ── Risk Badge ─────────────────────────────────────────────────
interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const dotColors: Record<RiskLevel, string> = {
    LOW: 'bg-emerald-500',
    MEDIUM: 'bg-amber-500',
    HIGH: 'bg-rose-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
        getRiskLevelClasses(level),
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[level])} />
      {level}
    </span>
  );
}

// ── Alert Severity Badge ───────────────────────────────────────
type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const severityClasses: Record<Severity, string> = {
  LOW: 'bg-blue-50 text-blue-700 border border-blue-200/80',
  MEDIUM: 'bg-amber-50 text-amber-700 border border-amber-200/80',
  HIGH: 'bg-rose-50 text-rose-700 border border-rose-200/80',
  CRITICAL: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
};

const severityDots: Record<Severity, string> = {
  LOW: 'bg-blue-500',
  MEDIUM: 'bg-amber-500',
  HIGH: 'bg-rose-500',
  CRITICAL: 'bg-rose-600',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        severityClasses[severity]
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', severityDots[severity])} />
      {severity}
    </span>
  );
}

// ── Role Badge ─────────────────────────────────────────────────
export function RoleBadge({ role }: { role: 'OFFICER' | 'ADMIN' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider',
        role === 'ADMIN'
          ? 'bg-purple-50 text-purple-700 border border-purple-200/80'
          : 'bg-blue-50 text-blue-700 border border-blue-200/80'
      )}
    >
      {role}
    </span>
  );
}
