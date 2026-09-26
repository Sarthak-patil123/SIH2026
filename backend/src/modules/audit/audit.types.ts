export interface DocumentHashPayload {
  documentId?: string;
  fileName: string;
  docType: string;
  sha256Hash: string;
  fileSize?: number;
  ocrConfidence?: number;
  tamperDetected?: boolean;
}

export interface FaceVerificationPayload {
  docFaceHash: string;
  selfieFaceHash: string;
  match: boolean;
  similarityScore: number;
  distance?: number;
  threshold?: number;
  livenessScore?: number;
  antiSpoofResult?: 'REAL' | 'SPOOF' | 'UNKNOWN';
  phase?: string;
  status: 'MATCH' | 'MISMATCH' | 'INCONCLUSIVE';
  notes?: string;
}

export interface AuditRecordPayload {
  caseId: string;
  action: string;
  phase?: string;
  actorId?: string;
  actorRole?: string;
  documentHashes?: DocumentHashPayload[];
  faceVerification?: FaceVerificationPayload;
  details?: Record<string, any>;
}

export interface DocumentHashInput {
  caseId: string;
  documentId?: string;
  fileName: string;
  docType: string;
  sha256Hash?: string;
  actorId?: string;
  ocrConfidence?: number;
  tamperResult?: any;
  details?: Record<string, any>;
}

export interface FaceVerificationInput {
  caseId: string;
  docFaceHash?: string;
  selfieFaceHash?: string;
  matchScore: number;
  distance?: number;
  threshold?: number;
  status: 'MATCH' | 'MISMATCH' | 'INCONCLUSIVE';
  phase?: string;
  livenessScore?: number;
  antiSpoofResult?: 'REAL' | 'SPOOF' | 'UNKNOWN';
  notes?: string;
  actorId?: string;
  details?: Record<string, any>;
}

export interface AuditLogItem {
  id: string;
  caseId: string;
  action: string;
  actorId: string;
  details: any;
  eventHash: string;
  txId?: string | null;
  blockNumber?: number | null;
  createdAt: Date;
}
