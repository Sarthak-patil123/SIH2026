import { calculateSha256 } from './sha256';

export interface AuditEventPayload {
  caseId: string;
  action: string;
  phase: string;
  actorId: string;
  timestamp: string;
  documentHashes?: any[];
  faceVerification?: any;
  details?: Record<string, any>;
  previousHash?: string;
}

/**
 * Deterministically compute event SHA-256 hash chaining to previousHash
 */
export function hashAuditEvent(payload: AuditEventPayload): string {
  const normalized = {
    caseId: payload.caseId,
    action: payload.action,
    phase: payload.phase || 'GENERAL',
    actorId: payload.actorId || 'SYSTEM',
    timestamp: payload.timestamp,
    documentHashes: payload.documentHashes || [],
    faceVerification: payload.faceVerification || null,
    details: payload.details || {},
    previousHash: payload.previousHash || '0000000000000000000000000000000000000000000000000000000000000000',
  };

  return calculateSha256(normalized);
}

/**
 * Verify event hash integrity
 */
export function verifyEventHash(payload: AuditEventPayload, recordedEventHash: string): boolean {
  const computed = hashAuditEvent(payload);
  return computed.toLowerCase() === recordedEventHash.toLowerCase();
}
