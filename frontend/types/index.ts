// =============================================================
// IDVerify — Shared TypeScript Types
// Matches Prisma schema exactly. All frontend types defined here.
// =============================================================

export type Role = 'OFFICER' | 'ADMIN';

export type CaseStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'FLAGGED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type DocType =
  | 'PASSPORT'
  | 'NATIONAL_ID'
  | 'VISA_STAMP'
  | 'DRIVING_LICENSE'
  | 'DOB_PROOF';

export type AlertType =
  | 'FACE_MISMATCH'
  | 'OCR_INCONSISTENCY'
  | 'EXPIRED_DOCUMENT'
  | 'TAMPERING_DETECTED'
  | 'CROSS_DOCUMENT_MISMATCH'
  | 'SUSPICIOUS_IDENTITY';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AuditAction =
  | 'CASE_CREATED'
  | 'DOCUMENT_UPLOADED'
  | 'OCR_COMPLETED'
  | 'FACE_VERIFICATION'
  | 'CASE_FLAGGED'
  | 'ADMIN_REVIEW_STARTED'
  | 'ADMIN_DECISION'
  | 'CASE_APPROVED'
  | 'CASE_REJECTED'
  | 'CASE_ESCALATED';

export type AdminDecision = 'APPROVE' | 'REJECT' | 'ESCALATE';

// ── Entities ──────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId: string;
  department: string;
  username: string;
  accountStatus: 'ACTIVE' | 'INACTIVE';
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
}

export interface OCRField {
  label: string;
  value: string;
  confidence: number; // 0–100
  manuallyModified?: boolean;
}

export interface OCRData {
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  overallConfidence: number;
  fields: OCRField[];
  warnings?: string[];
}

export interface FaceResult {
  status: 'MATCH' | 'REVIEW' | 'NO_MATCH';
  similarity: number;  // 0–100
  liveness: number;    // 0–100
  processedAt: string;
}

export interface TamperResult {
  status: 'CLEAN' | 'SUSPICIOUS' | 'TAMPERED';
  confidence: number;
  details?: string;
}

export interface Document {
  id: string;
  caseId: string;
  fileName: string;
  fileUrl: string;
  docType: DocType;
  sha256Hash: string;
  ocrData?: OCRData;
  tamperResult?: TamperResult;
  faceResult?: FaceResult;
  fileSize: number; // bytes
  createdAt: string;
}

export interface Case {
  id: string;
  caseNumber: string; // e.g. SSB-1025
  title: string;
  status: CaseStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  officerId: string;
  officerName: string;
  applicantName?: string;
  applicantDob?: string;
  documents: Document[];
  flagReason?: string;
  officerObservations?: string;
  adminDecision?: AdminDecision;
  adminDecisionReason?: string;
  adminDecisionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  caseId: string;
  caseNumber: string;
  officerId: string;
  officerName: string;
  alertType: AlertType;
  severity: AlertSeverity;
  reason: string;
  status: 'PENDING' | 'REVIEWED' | 'DISMISSED';
  detectedAt: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  caseId: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  details: Record<string, unknown>;
  eventHash: string;
  txId?: string;
  blockNumber?: number;
  createdAt: string;
}

// ── Auth ──────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// ── Notification ──────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  read: boolean;
  createdAt: string;
  href?: string;
}
