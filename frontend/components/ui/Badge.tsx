import React from 'react';
import { cn } from '@/lib/utils';
import { CaseStatus, RiskLevel } from '@/types';
import { getCaseStatusClasses, getCaseStatusLabel, getRiskLevelClasses } from '@/lib/utils';

// ── Generic Badge ──────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline';
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide',
        variant === 'outline' && 'bg-transparent',
        className
      )}
    >
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
  return (
    <Badge className={cn(getCaseStatusClasses(status), className)}>
      {getCaseStatusLabel(status)}
    </Badge>
  );
}

// ── Risk Badge ─────────────────────────────────────────────────
interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide',
        getRiskLevelClasses(level),
        className
      )}
    >
      {level}
    </span>
  );
}

// ── Alert Severity Badge ───────────────────────────────────────
type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const severityClasses: Record<Severity, string> = {
  LOW: 'bg-info/20 text-info border border-info/30',
  MEDIUM: 'bg-warning/20 text-warning border border-warning/30',
  HIGH: 'bg-danger/20 text-danger border border-danger/30',
  CRITICAL: 'bg-danger/30 text-danger border border-danger/50',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge className={severityClasses[severity]}>
      {severity}
    </Badge>
  );
}

// ── Role Badge ─────────────────────────────────────────────────
export function RoleBadge({ role }: { role: 'OFFICER' | 'ADMIN' }) {
  return (
    <Badge className={role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}>
      {role}
    </Badge>
  );
}
