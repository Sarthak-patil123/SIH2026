import { blockchainAuditService } from '../../blockchain/audit/blockchain-audit.service';
import { auditRepository } from './audit.repository';
import { auditHashService } from './audit-hash.service';
import {
  AuditRecordPayload,
  DocumentHashInput,
  FaceVerificationInput,
} from './audit.types';

export class AuditService {
  /**
   * Record a lifecycle event onto Hyperledger Fabric and Database
   */
  async recordCasePhaseAudit(payload: AuditRecordPayload) {
    const actorId = payload.actorId || 'SYSTEM';
    const actorRole = payload.actorRole || 'OFFICER';

    // 1. Submit to Hyperledger Fabric Blockchain
    const { record, txResult } = await blockchainAuditService.recordCasePhase({
      caseId: payload.caseId,
      action: payload.action,
      phase: payload.phase || 'GENERAL',
      actorId,
      actorRole,
      documentHashes: payload.documentHashes || [],
      faceVerification: payload.faceVerification,
      details: payload.details || {},
    });

    // 2. Persist in Database
    const dbLog = await auditRepository.createAuditLog({
      caseId: payload.caseId,
      action: payload.action,
      actorId,
      details: {
        ...(payload.details || {}),
        phase: payload.phase,
        documentHashes: payload.documentHashes,
        faceVerification: payload.faceVerification,
        blockchainProof: {
          txId: txResult.txId,
          blockNumber: txResult.blockNumber,
          eventHash: txResult.eventHash,
          previousHash: txResult.previousHash,
        },
      },
      eventHash: txResult.eventHash,
      txId: txResult.txId,
      blockNumber: txResult.blockNumber,
    });

    return {
      success: true,
      auditLogId: dbLog.id,
      blockchainRecord: record,
      txResult,
    };
  }

  /**
   * Anchor Document SHA-256 hash onto Blockchain
   */
  async recordDocumentHash(input: DocumentHashInput, fileBuffer?: Buffer) {
    const actorId = input.actorId || 'OFFICER';

    let sha256 = input.sha256Hash;
    if (fileBuffer) {
      sha256 = auditHashService.calculateSha256(fileBuffer);
    }

    if (!sha256) {
      throw new Error('Document SHA-256 hash or file buffer must be provided.');
    }

    const { record, txResult } = await blockchainAuditService.recordDocumentHash({
      caseId: input.caseId,
      docId: input.documentId || `DOC-${Date.now()}`,
      fileName: input.fileName,
      docType: input.docType,
      sha256Hash: sha256,
      actorId,
      ocrConfidence: input.ocrConfidence,
      tamperResult: input.tamperResult,
      details: input.details,
    });

    await auditRepository.createAuditLog({
      caseId: input.caseId,
      action: 'DOCUMENT_HASH_RECORDED',
      actorId,
      details: {
        documentId: input.documentId,
        fileName: input.fileName,
        docType: input.docType,
        sha256Hash: sha256,
        ocrConfidence: input.ocrConfidence,
        tamperResult: input.tamperResult,
        txId: txResult.txId,
        blockNumber: txResult.blockNumber,
      },
      eventHash: txResult.eventHash,
      txId: txResult.txId,
      blockNumber: txResult.blockNumber,
    });

    return {
      success: true,
      documentHash: sha256,
      blockchainRecord: record,
      txResult,
    };
  }

  /**
   * Record Full Audit Trail of Case at Face Verification Phase
   */
  async recordFaceVerificationAudit(
    input: FaceVerificationInput,
    docFaceBuffer?: Buffer,
    selfieFaceBuffer?: Buffer
  ) {
    const actorId = input.actorId || 'OFFICER';

    let docFaceHash = input.docFaceHash;
    let selfieFaceHash = input.selfieFaceHash;

    if (docFaceBuffer && !docFaceHash) {
      docFaceHash = auditHashService.hashFace(docFaceBuffer).imageHash;
    }
    if (selfieFaceBuffer && !selfieFaceHash) {
      selfieFaceHash = auditHashService.hashFace(selfieFaceBuffer).imageHash;
    }

    if (!docFaceHash) docFaceHash = auditHashService.calculateSha256(`DOC-FACE-${input.caseId}`);
    if (!selfieFaceHash) selfieFaceHash = auditHashService.calculateSha256(`SELFIE-FACE-${input.caseId}`);

    const { record, txResult } = await blockchainAuditService.recordFaceVerificationAudit({
      caseId: input.caseId,
      actorId,
      docFaceHash,
      selfieFaceHash,
      matchScore: input.matchScore,
      distance: input.distance,
      threshold: input.threshold,
      status: input.status,
      phase: input.phase || 'FACE_VERIFICATION_PHASE',
      livenessScore: input.livenessScore,
      antiSpoofResult: input.antiSpoofResult,
      notes: input.notes,
      details: input.details,
    });

    await auditRepository.createAuditLog({
      caseId: input.caseId,
      action: 'FACE_VERIFICATION_PERFORMED',
      actorId,
      details: {
        docFaceHash,
        selfieFaceHash,
        matchScore: input.matchScore,
        distance: input.distance,
        threshold: input.threshold,
        status: input.status,
        phase: input.phase || 'FACE_VERIFICATION_PHASE',
        livenessScore: input.livenessScore,
        antiSpoofResult: input.antiSpoofResult,
        txId: txResult.txId,
        blockNumber: txResult.blockNumber,
      },
      eventHash: txResult.eventHash,
      txId: txResult.txId,
      blockNumber: txResult.blockNumber,
    });

    return {
      success: true,
      faceProof: {
        docFaceHash,
        selfieFaceHash,
        matchScore: input.matchScore,
        status: input.status,
      },
      blockchainRecord: record,
      txResult,
    };
  }

  /**
   * Retrieve complete blockchain audit trail for a case
   */
  async getCaseAuditTrail(caseId: string) {
    const blockchainSummary = await blockchainAuditService.getCaseAuditTrail(caseId);
    const dbLogs = await auditRepository.findLogsByCaseId(caseId);

    return {
      caseId,
      totalEvents: blockchainSummary.totalEvents,
      chainValid: blockchainSummary.chainValid,
      genesisHash: blockchainSummary.genesisHash,
      latestHash: blockchainSummary.latestHash,
      documentHashes: blockchainSummary.documentHashes,
      faceVerifications: blockchainSummary.faceVerifications,
      blockchainAuditRecords: blockchainSummary.auditRecords,
      databaseAuditLogs: dbLogs,
    };
  }

  /**
   * Verify cryptographic chain integrity
   */
  async verifyCaseIntegrity(caseId: string) {
    return await blockchainAuditService.verifyCaseIntegrity(caseId);
  }

  /**
   * Get single audit record
   */
  async getAuditRecord(id: string) {
    return await blockchainAuditService.getAuditRecordById(id);
  }

  /**
   * Get all audit records across all cases
   */
  async getAllAuditRecords(limit: number = 100) {
    const blockchainRecords = await blockchainAuditService.getAllAuditRecords();
    const dbLogs = await auditRepository.findAllLogs(limit);

    return {
      totalBlockchainRecords: blockchainRecords.length,
      blockchainRecords: blockchainRecords.slice(0, limit),
      databaseLogs: dbLogs,
    };
  }
}

export const auditService = new AuditService();
