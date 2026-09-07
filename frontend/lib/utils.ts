import { CaseStatus, RiskLevel, AlertSeverity, AlertType } from '@/types';

// ── Class name merger ──────────────────────────────────────────
export function cn(...classes: (string | undefined | null | false | 0)[]) {
  return classes.filter(Boolean).join(' ');
}

// ── Date formatters ────────────────────────────────────────────
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// ── File size formatter ────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ── Hash truncation ────────────────────────────────────────────
export function truncateHash(hash: string, chars = 8): string {
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

// ── Status display helpers ─────────────────────────────────────
export function getCaseStatusLabel(status: CaseStatus): string {
  const labels: Record<CaseStatus, string> = {
    PENDING: 'Pending',
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    FLAGGED: 'Flagged',
  };
  return labels[status];
}

export function getCaseStatusClasses(status: CaseStatus): string {
  const map: Record<CaseStatus, string> = {
    APPROVED: 'bg-success/20 text-success border border-success/30',
    PENDING: 'bg-info/20 text-info border border-info/30',
    UNDER_REVIEW: 'bg-warning/20 text-warning border border-warning/30',
    FLAGGED: 'bg-danger/20 text-danger border border-danger/30',
    REJECTED: 'bg-danger/20 text-danger border border-danger/30',
  };
  return map[status];
}

export function getRiskLevelClasses(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    LOW: 'bg-success/20 text-success',
    MEDIUM: 'bg-warning/20 text-warning',
    HIGH: 'bg-danger/20 text-danger',
  };
  return map[level];
}

export function getRiskScoreColor(score: number): string {
  if (score <= 30) return 'text-success';
  if (score <= 60) return 'text-warning';
  return 'text-danger';
}

export function getConfidenceClasses(confidence: number): string {
  if (confidence >= 85) return 'text-success';
  if (confidence >= 65) return 'text-warning';
  return 'text-danger';
}

export function getConfidenceBgClasses(confidence: number): string {
  if (confidence >= 85) return 'bg-success';
  if (confidence >= 65) return 'bg-warning';
  return 'bg-danger';
}

export function getFaceResultClasses(status: 'MATCH' | 'REVIEW' | 'NO_MATCH'): string {
  const map = {
    MATCH: 'bg-success/20 text-success border border-success/30',
    REVIEW: 'bg-warning/20 text-warning border border-warning/30',
    NO_MATCH: 'bg-danger/20 text-danger border border-danger/30',
  };
  return map[status];
}

export function getAlertSeverityClasses(severity: AlertSeverity): string {
  const map: Record<AlertSeverity, string> = {
    LOW: 'bg-info/20 text-info border border-info/30',
    MEDIUM: 'bg-warning/20 text-warning border border-warning/30',
    HIGH: 'bg-danger/20 text-danger border border-danger/30',
    CRITICAL: 'bg-danger/30 text-danger border border-danger/50',
  };
  return map[severity];
}

export function getAlertTypeLabel(type: AlertType): string {
  const labels: Record<AlertType, string> = {
    FACE_MISMATCH: 'Face Mismatch',
    OCR_INCONSISTENCY: 'OCR Inconsistency',
    EXPIRED_DOCUMENT: 'Expired Document',
    TAMPERING_DETECTED: 'Tampering Detected',
    CROSS_DOCUMENT_MISMATCH: 'Cross-Document Mismatch',
    SUSPICIOUS_IDENTITY: 'Suspicious Identity',
  };
  return labels[type];
}

export function getDocTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    PASSPORT: 'Passport',
    NATIONAL_ID: 'National ID',
    VISA_STAMP: 'Visa Stamp',
    DRIVING_LICENSE: 'Driving License',
    DOB_PROOF: 'Date of Birth Proof',
  };
  return labels[type] ?? type;
}

// ── Initials generator ─────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
