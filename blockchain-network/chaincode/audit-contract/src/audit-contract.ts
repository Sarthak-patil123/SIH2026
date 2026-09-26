import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import * as crypto from 'crypto';
import {
  CaseAuditRecord,
  CaseAuditTrailSummary,
  DocumentHashRecord,
  FaceVerificationRecord,
} from './audit.types';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

@Info({
  title: 'SIH2026 Audit Trail Contract',
  description: 'Immutable smart contract for case audit trails, document SHA-256 hashes, and biometric face verification proofs',
})
export class AuditContract extends Contract {
  constructor() {
    super('AuditContract');
  }

  /**
   * Initialize Ledger state
   */
  @Transaction()
  public async InitLedger(ctx: Context): Promise<void> {
    console.info('=== SIH2026 AuditContract Initialized ===');
  }

  /**
   * Calculate deterministic SHA-256 hash for audit record payload
   */
  private calculateSha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Helper to get latest event hash for a given case
   */
  private async getLatestCaseHash(ctx: Context, caseId: string): Promise<{ hash: string; count: number }> {
    const iterator = await ctx.stub.getStateByRange(`CASE~${caseId}~000000`, `CASE~${caseId}~999999`);
    let lastHash = GENESIS_HASH;
    let count = 0;

    let result = await iterator.next();
    while (!result.done) {
      if (result.value && result.value.value.toString()) {
        try {
          const record: CaseAuditRecord = JSON.parse(result.value.value.toString('utf8'));
          lastHash = record.eventHash;
          count++;
        } catch (e) {
          // ignore parsing error
        }
      }
      result = await iterator.next();
    }
    await iterator.close();
    return { hash: lastHash, count };
  }

  /**
   * Record a comprehensive Case Audit event with SHA-256 cryptographic chaining
   */
  @Transaction()
  public async RecordCaseAudit(ctx: Context, auditDataJson: string): Promise<string> {
    const input = JSON.parse(auditDataJson);
    const {
      id,
      caseId,
      action,
      phase,
      actorId,
      actorRole = 'OFFICER',
      timestamp = new Date().toISOString(),
      documentHashes = [],
      faceVerification = null,
      details = {},
    } = input;

    if (!caseId || !action) {
      throw new Error('caseId and action are mandatory fields.');
    }

    const txId = ctx.stub.getTxID();
    const { hash: previousHash, count } = await this.getLatestCaseHash(ctx, caseId);
    const sequenceNumber = (count + 1).toString().padStart(6, '0');

    // Deterministic payload hashing for eventHash
    const payloadToHash = JSON.stringify({
      caseId,
      action,
      phase: phase || 'GENERAL',
      actorId: actorId || 'SYSTEM',
      timestamp,
      documentHashes,
      faceVerification,
      details,
      previousHash,
    });
    const eventHash = this.calculateSha256(payloadToHash);

    const record: CaseAuditRecord = {
      id: id || `AUDIT-${caseId}-${sequenceNumber}`,
      caseId,
      action,
      phase: phase || 'GENERAL',
      actorId: actorId || 'SYSTEM',
      actorRole,
      timestamp,
      documentHashes,
      faceVerification: faceVerification || undefined,
      eventHash,
      previousHash,
      txId,
      blockNumber: count + 1,
      details,
    };

    const compositeKey = ctx.stub.createCompositeKey('CASE~AUDIT', [caseId, sequenceNumber]);
    await ctx.stub.putState(compositeKey, Buffer.from(JSON.stringify(record)));
    await ctx.stub.putState(`AUDIT_BY_ID~${record.id}`, Buffer.from(JSON.stringify(record)));

    // Emit blockchain event
    ctx.stub.setEvent('AuditRecorded', Buffer.from(JSON.stringify({
      caseId,
      action,
      txId,
      eventHash,
    })));

    return JSON.stringify(record);
  }

  /**
   * Record a document SHA-256 hash specifically
   */
  @Transaction()
  public async RecordDocumentHash(
    ctx: Context,
    caseId: string,
    docId: string,
    fileName: string,
    docType: string,
    sha256Hash: string,
    actorId: string,
    detailsJson: string = '{}'
  ): Promise<string> {
    const details = JSON.parse(detailsJson || '{}');
    const docRecord: DocumentHashRecord = {
      documentId: docId,
      fileName,
      docType,
      sha256Hash,
      uploadedAt: new Date().toISOString(),
      ocrConfidence: details.ocrConfidence,
      tamperDetected: details.tamperDetected,
    };

    const auditPayload = {
      caseId,
      action: 'DOCUMENT_HASH_RECORDED',
      phase: 'DOCUMENT_INGESTION',
      actorId: actorId || 'OFFICER',
      actorRole: 'OFFICER',
      documentHashes: [docRecord],
      details: {
        ...details,
        documentId: docId,
        fileName,
        docType,
        sha256Hash,
      },
    };

    return await this.RecordCaseAudit(ctx, JSON.stringify(auditPayload));
  }

  /**
   * Record full audit trail of case at face verification phase
   */
  @Transaction()
  public async RecordFaceVerificationAudit(
    ctx: Context,
    caseId: string,
    docFaceHash: string,
    selfieFaceHash: string,
    matchScore: number,
    status: 'MATCH' | 'MISMATCH' | 'INCONCLUSIVE',
    actorId: string,
    detailsJson: string = '{}'
  ): Promise<string> {
    const details = JSON.parse(detailsJson || '{}');
    const faceRecord: FaceVerificationRecord = {
      verificationId: `FACE-${Date.now()}`,
      docFaceHash,
      selfieFaceHash,
      match: status === 'MATCH',
      similarityScore: Number(matchScore),
      distance: details.distance || 0,
      threshold: details.threshold || 0.6,
      livenessScore: details.livenessScore,
      antiSpoofResult: details.antiSpoofResult || 'REAL',
      verifiedAt: new Date().toISOString(),
      phase: details.phase || 'FACE_VERIFICATION_PHASE',
      status,
      notes: details.notes,
    };

    const auditPayload = {
      caseId,
      action: 'FACE_VERIFICATION_PERFORMED',
      phase: details.phase || 'FACE_VERIFICATION_PHASE',
      actorId: actorId || 'OFFICER',
      actorRole: 'OFFICER',
      documentHashes: details.documentHashes || [],
      faceVerification: faceRecord,
      details: {
        ...details,
        docFaceHash,
        selfieFaceHash,
        similarityScore: matchScore,
        matchStatus: status,
      },
    };

    return await this.RecordCaseAudit(ctx, JSON.stringify(auditPayload));
  }

  /**
   * Retrieve full audit trail for a case
   */
  @Transaction(false)
  @Returns('string')
  public async GetCaseAuditTrail(ctx: Context, caseId: string): Promise<string> {
    const iterator = await ctx.stub.getStateByPartialCompositeKey('CASE~AUDIT', [caseId]);
    const records: CaseAuditRecord[] = [];
    const allDocHashes: DocumentHashRecord[] = [];
    const allFaceVerifications: FaceVerificationRecord[] = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value && result.value.value.toString()) {
        try {
          const record: CaseAuditRecord = JSON.parse(result.value.value.toString('utf8'));
          records.push(record);

          if (record.documentHashes && Array.isArray(record.documentHashes)) {
            allDocHashes.push(...record.documentHashes);
          }
          if (record.faceVerification) {
            allFaceVerifications.push(record.faceVerification);
          }
        } catch (e) {
          // ignore parse error
        }
      }
      result = await iterator.next();
    }
    await iterator.close();

    // Verify SHA-256 chain integrity
    let isChainValid = true;
    for (let i = 0; i < records.length; i++) {
      const expectedPrev = i === 0 ? GENESIS_HASH : records[i - 1].eventHash;
      if (records[i].previousHash !== expectedPrev) {
        isChainValid = false;
        break;
      }
    }

    const summary: CaseAuditTrailSummary = {
      caseId,
      totalEvents: records.length,
      chainValid: isChainValid,
      genesisHash: records.length > 0 ? records[0].eventHash : GENESIS_HASH,
      latestHash: records.length > 0 ? records[records.length - 1].eventHash : GENESIS_HASH,
      documentHashes: allDocHashes,
      faceVerifications: allFaceVerifications,
      auditRecords: records,
    };

    return JSON.stringify(summary);
  }

  /**
   * Verify cryptographic chain integrity of a case
   */
  @Transaction(false)
  @Returns('string')
  public async VerifyCaseChainIntegrity(ctx: Context, caseId: string): Promise<string> {
    const auditSummaryRaw = await this.GetCaseAuditTrail(ctx, caseId);
    const summary: CaseAuditTrailSummary = JSON.parse(auditSummaryRaw);

    let recalculatedMatch = true;
    const records = summary.auditRecords;

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const prevHash = i === 0 ? GENESIS_HASH : records[i - 1].eventHash;
      if (rec.previousHash !== prevHash) {
        recalculatedMatch = false;
        break;
      }

      const expectedPayload = JSON.stringify({
        caseId: rec.caseId,
        action: rec.action,
        phase: rec.phase,
        actorId: rec.actorId,
        timestamp: rec.timestamp,
        documentHashes: rec.documentHashes,
        faceVerification: rec.faceVerification || null,
        details: rec.details || {},
        previousHash: rec.previousHash,
      });

      const computedHash = this.calculateSha256(expectedPayload);
      if (computedHash !== rec.eventHash) {
        recalculatedMatch = false;
        break;
      }
    }

    return JSON.stringify({
      caseId,
      valid: recalculatedMatch && summary.chainValid,
      totalEvents: records.length,
      latestHash: summary.latestHash,
      tampered: !recalculatedMatch,
    });
  }

  /**
   * Get single audit record by ID
   */
  @Transaction(false)
  @Returns('string')
  public async GetAuditRecord(ctx: Context, auditId: string): Promise<string> {
    const recordBytes = await ctx.stub.getState(`AUDIT_BY_ID~${auditId}`);
    if (!recordBytes || recordBytes.length === 0) {
      throw new Error(`Audit record with ID ${auditId} does not exist`);
    }
    return recordBytes.toString('utf8');
  }

  /**
   * Get all audit records across cases (for admin monitoring)
   */
  @Transaction(false)
  @Returns('string')
  public async GetAllAuditRecords(ctx: Context): Promise<string> {
    const iterator = await ctx.stub.getStateByRange('AUDIT_BY_ID~', 'AUDIT_BY_ID~\uffff');
    const records: CaseAuditRecord[] = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value && result.value.value.toString()) {
        try {
          const record: CaseAuditRecord = JSON.parse(result.value.value.toString('utf8'));
          records.push(record);
        } catch (e) {
          // ignore
        }
      }
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(records);
  }
}
