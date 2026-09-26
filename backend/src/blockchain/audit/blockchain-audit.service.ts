import { fabricClient, InMemoryLedgerRecord, BlockchainTransactionResult } from '../fabric/fabric-client';
import { hashDocumentBuffer } from '../hashing/document-hash';
import { hashFaceImage } from '../hashing/face-hash';

export interface RecordDocumentHashParams {
  caseId: string;
  docId: string;
  fileName: string;
  docType: string;
  fileBuffer?: Buffer;
  sha256Hash?: string;
  actorId: string;
  actorRole?: string;
  ocrConfidence?: number;
  tamperResult?: any;
  details?: Record<string, any>;
}

export interface RecordFaceVerificationAuditParams {
  caseId: string;
  actorId: string;
  actorRole?: string;
  docFaceBuffer?: Buffer;
  docFaceHash?: string;
  selfieFaceBuffer?: Buffer;
  selfieFaceHash?: string;
  matchScore: number;
  distance?: number;
  threshold?: number;
  status: 'MATCH' | 'MISMATCH' | 'INCONCLUSIVE';
  phase?: string;
  livenessScore?: number;
  antiSpoofResult?: 'REAL' | 'SPOOF' | 'UNKNOWN';
  notes?: string;
  documentHashes?: any[];
  details?: Record<string, any>;
}

export class BlockchainAuditService {
  /**
   * Record a general case lifecycle phase audit onto Hyperledger Fabric ledger
   */
  public async recordCasePhase(params: {
    caseId: string;
    action: string;
    phase: string;
    actorId: string;
    actorRole?: string;
    documentHashes?: any[];
    faceVerification?: any;
    details?: Record<string, any>;
  }): Promise<{ record: InMemoryLedgerRecord; txResult: BlockchainTransactionResult }> {
    return await fabricClient.submitCaseAuditTransaction({
      caseId: params.caseId,
      action: params.action,
      phase: params.phase,
      actorId: params.actorId,
      actorRole: params.actorRole || 'OFFICER',
      documentHashes: params.documentHashes || [],
      faceVerification: params.faceVerification,
      details: params.details || {},
    });
  }

  /**
   * Record Document SHA-256 Hash onto Blockchain
   */
  public async recordDocumentHash(
    params: RecordDocumentHashParams
  ): Promise<{ record: InMemoryLedgerRecord; txResult: BlockchainTransactionResult }> {
    let sha256 = params.sha256Hash;
    let byteSize = 0;

    if (params.fileBuffer) {
      const hashRes = hashDocumentBuffer(params.fileBuffer, params.fileName);
      sha256 = hashRes.sha256Hash;
      byteSize = hashRes.byteSize;
    }

    if (!sha256) {
      throw new Error('Either fileBuffer or sha256Hash must be provided.');
    }

    const docHashRecord = {
      documentId: params.docId,
      fileName: params.fileName,
      docType: params.docType,
      sha256Hash: sha256,
      fileSize: byteSize || undefined,
      uploadedAt: new Date().toISOString(),
      ocrConfidence: params.ocrConfidence,
      tamperDetected: params.tamperResult?.isTampered || false,
    };

    return await fabricClient.submitCaseAuditTransaction({
      caseId: params.caseId,
      action: 'DOCUMENT_HASH_RECORDED',
      phase: 'DOCUMENT_INGESTION',
      actorId: params.actorId,
      actorRole: params.actorRole || 'OFFICER',
      documentHashes: [docHashRecord],
      details: {
        ...(params.details || {}),
        documentId: params.docId,
        fileName: params.fileName,
        docType: params.docType,
        sha256Hash: sha256,
        tamperResult: params.tamperResult || null,
      },
    });
  }

  /**
   * Record Face Verification Proof onto Blockchain for the case
   */
  public async recordFaceVerificationAudit(
    params: RecordFaceVerificationAuditParams
  ): Promise<{ record: InMemoryLedgerRecord; txResult: BlockchainTransactionResult }> {
    let docFaceHash = params.docFaceHash;
    let selfieFaceHash = params.selfieFaceHash;

    if (params.docFaceBuffer && !docFaceHash) {
      docFaceHash = hashFaceImage(params.docFaceBuffer).imageHash;
    }
    if (params.selfieFaceBuffer && !selfieFaceHash) {
      selfieFaceHash = hashFaceImage(params.selfieFaceBuffer).imageHash;
    }

    const faceRecord = {
      verificationId: `FACE-${Date.now()}`,
      docFaceHash: docFaceHash || 'UNKNOWN_DOC_FACE_HASH',
      selfieFaceHash: selfieFaceHash || 'UNKNOWN_SELFIE_HASH',
      match: params.status === 'MATCH',
      similarityScore: params.matchScore,
      distance: params.distance || 0,
      threshold: params.threshold || 0.6,
      livenessScore: params.livenessScore,
      antiSpoofResult: params.antiSpoofResult || 'REAL',
      verifiedAt: new Date().toISOString(),
      phase: params.phase || 'FACE_VERIFICATION_PHASE',
      status: params.status,
      notes: params.notes,
    };

    return await fabricClient.submitCaseAuditTransaction({
      caseId: params.caseId,
      action: 'FACE_VERIFICATION_PERFORMED',
      phase: params.phase || 'FACE_VERIFICATION_PHASE',
      actorId: params.actorId,
      actorRole: params.actorRole || 'OFFICER',
      documentHashes: params.documentHashes || [],
      faceVerification: faceRecord,
      details: {
        ...(params.details || {}),
        similarityScore: params.matchScore,
        matchStatus: params.status,
        docFaceHash,
        selfieFaceHash,
        antiSpoofResult: params.antiSpoofResult,
      },
    });
  }

  /**
   * Query full case audit trail with all document hashes and face verification proofs
   */
  public async getCaseAuditTrail(caseId: string) {
    return await fabricClient.queryCaseAuditTrail(caseId);
  }

  /**
   * Verify case chain SHA-256 cryptographic integrity
   */
  public async verifyCaseIntegrity(caseId: string) {
    return await fabricClient.verifyCaseIntegrity(caseId);
  }

  /**
   * Get single audit record
   */
  public async getAuditRecordById(id: string) {
    return await fabricClient.queryAuditRecordById(id);
  }

  /**
   * Get all audit records across all cases
   */
  public async getAllAuditRecords() {
    return await fabricClient.queryAllAuditRecords();
  }
}

export const blockchainAuditService = new BlockchainAuditService();
