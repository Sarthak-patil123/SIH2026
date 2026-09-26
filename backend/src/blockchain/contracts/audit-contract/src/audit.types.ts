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
  docFaceHash: string;
  selfieFaceHash: string;
  match: boolean;
  similarityScore: number;
  distance: number;
  threshold: number;
  livenessScore?: number;
  antiSpoofResult?: 'REAL' | 'SPOOF' | 'UNKNOWN';
  verifiedAt: string;
  phase: string;
  status: 'MATCH' | 'MISMATCH' | 'INCONCLUSIVE';
  notes?: string;
}

export interface CaseAuditRecord {
  id: string;
  caseId: string;
  action: string;
  phase: string;
  actorId: string;
  actorRole: string;
  timestamp: string;
  documentHashes: DocumentHashRecord[];
  faceVerification?: FaceVerificationRecord;
  eventHash: string;
  previousHash: string;
  txId: string;
  blockNumber: number;
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
