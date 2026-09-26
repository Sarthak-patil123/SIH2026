/**
 * Hyperledger Fabric Chaincode Data Types
 * SIH2026 - Fake Identity Screening & Blockchain Audit System
 */

export interface DocumentHashRecord {
  documentId: string;
  fileName: string;
  docType: string;
  sha256Hash: string;
  fileSize?: number;
  uploadedAt: string;
  ocrConfidence?: number;
  tamperDetected?: boolean;
}

export interface FaceVerificationRecord {
  verificationId: string;
  docFaceHash: string;       // SHA-256 hash of document portrait crop
  selfieFaceHash: string;    // SHA-256 hash of live selfie capture
  match: boolean;
  similarityScore: number;   // 0.0 - 100.0 or 0.0 - 1.0
  distance: number;          // Cosine / Euclidean distance
  threshold: number;
  livenessScore?: number;
  antiSpoofResult?: 'REAL' | 'SPOOF' | 'UNKNOWN';
  verifiedAt: string;
  phase: string;             // e.g. "PHASE_1_PRIMARY_FACE", "PHASE_2_SECONDARY_FACE", "FINAL_FACE_COMPARISON"
  status: 'MATCH' | 'MISMATCH' | 'INCONCLUSIVE';
  notes?: string;
}

export interface CaseAuditRecord {
  id: string;
  caseId: string;
  action: string;            // e.g. "CASE_CREATED", "DOCUMENT_HASHED", "FACE_VERIFIED", "RISK_ASSESSED", "DECISION_MADE"
  phase: string;             // Current lifecycle phase
  actorId: string;
  actorRole: string;         // "OFFICER" | "ADMIN" | "SYSTEM"
  timestamp: string;
  documentHashes: DocumentHashRecord[];
  faceVerification?: FaceVerificationRecord;
  eventHash: string;         // SHA-256 hash of (previousHash + action + timestamp + details + docHashes)
  previousHash: string;      // SHA-256 hash of previous event block for this case
  txId: string;              // Fabric Transaction ID
  blockNumber: number;       // Fabric Block sequence number
  details?: Record<string, any>;
}

export interface CaseAuditTrailSummary {
  caseId: string;
  totalEvents: number;
  chainValid: boolean;
  genesisHash: string;
  latestHash: string;
  documentHashes: DocumentHashRecord[];
  faceVerifications: FaceVerificationRecord[];
  auditRecords: CaseAuditRecord[];
}
