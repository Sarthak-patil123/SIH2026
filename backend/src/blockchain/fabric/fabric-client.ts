import crypto from 'crypto';
import { fabricConfig } from './fabric-config';
import { calculateSha256 } from '../hashing/sha256';
import { hashAuditEvent } from '../hashing/event-hash';

export interface BlockchainTransactionResult {
  txId: string;
  blockNumber: number;
  eventHash: string;
  previousHash: string;
  timestamp: string;
  status: 'COMMITTED' | 'FAILED';
  channel: string;
  chaincode: string;
}

export interface InMemoryLedgerRecord {
  id: string;
  caseId: string;
  action: string;
  phase: string;
  actorId: string;
  actorRole: string;
  timestamp: string;
  documentHashes: any[];
  faceVerification?: any;
  eventHash: string;
  previousHash: string;
  txId: string;
  blockNumber: number;
  details?: Record<string, any>;
}

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export class FabricClient {
  private static instance: FabricClient;
  private isConnected: boolean = false;
  private currentBlockNumber: number = 18270; // Simulated enterprise block height
  private ledgerStore: Map<string, InMemoryLedgerRecord[]> = new Map();
  private auditIndex: Map<string, InMemoryLedgerRecord> = new Map();

  private constructor() {
    this.initializeLedger();
  }

  public static getInstance(): FabricClient {
    if (!FabricClient.instance) {
      FabricClient.instance = new FabricClient();
    }
    return FabricClient.instance;
  }

  private initializeLedger(): void {
    console.info('[FabricClient] Initialized Hyperledger Fabric Client Manager (Channel: %s, Chaincode: %s)',
      fabricConfig.channelName,
      fabricConfig.chaincodeName
    );
    this.isConnected = true;
  }

  /**
   * Submit Case Audit Transaction to Hyperledger Fabric Ledger
   */
  public async submitCaseAuditTransaction(params: {
    id?: string;
    caseId: string;
    action: string;
    phase?: string;
    actorId: string;
    actorRole?: string;
    documentHashes?: any[];
    faceVerification?: any;
    details?: Record<string, any>;
  }): Promise<{ record: InMemoryLedgerRecord; txResult: BlockchainTransactionResult }> {
    const {
      caseId,
      action,
      phase = 'GENERAL',
      actorId,
      actorRole = 'OFFICER',
      documentHashes = [],
      faceVerification = null,
      details = {},
    } = params;

    const caseRecords = this.ledgerStore.get(caseId) || [];
    const previousHash = caseRecords.length > 0
      ? caseRecords[caseRecords.length - 1].eventHash
      : GENESIS_HASH;

    const timestamp = new Date().toISOString();
    const txId = '0x' + crypto.randomBytes(32).toString('hex');
    this.currentBlockNumber += 1;
    const blockNumber = this.currentBlockNumber;

    const eventHash = hashAuditEvent({
      caseId,
      action,
      phase,
      actorId,
      timestamp,
      documentHashes,
      faceVerification,
      details,
      previousHash,
    });

    const sequenceNumber = (caseRecords.length + 1).toString().padStart(6, '0');
    const recordId = params.id || `AUDIT-${caseId}-${sequenceNumber}`;

    const record: InMemoryLedgerRecord = {
      id: recordId,
      caseId,
      action,
      phase,
      actorId,
      actorRole,
      timestamp,
      documentHashes,
      faceVerification: faceVerification || undefined,
      eventHash,
      previousHash,
      txId,
      blockNumber,
      details,
    };

    // Commit to in-memory ledger state store
    caseRecords.push(record);
    this.ledgerStore.set(caseId, caseRecords);
    this.auditIndex.set(recordId, record);

    const txResult: BlockchainTransactionResult = {
      txId,
      blockNumber,
      eventHash,
      previousHash,
      timestamp,
      status: 'COMMITTED',
      channel: fabricConfig.channelName,
      chaincode: fabricConfig.chaincodeName,
    };

    return { record, txResult };
  }

  /**
   * Query full case audit trail from blockchain
   */
  public async queryCaseAuditTrail(caseId: string): Promise<{
    caseId: string;
    totalEvents: number;
    chainValid: boolean;
    genesisHash: string;
    latestHash: string;
    documentHashes: any[];
    faceVerifications: any[];
    auditRecords: InMemoryLedgerRecord[];
  }> {
    const records = this.ledgerStore.get(caseId) || [];

    const allDocHashes: any[] = [];
    const allFaceVerifications: any[] = [];

    records.forEach((rec) => {
      if (rec.documentHashes && Array.isArray(rec.documentHashes)) {
        allDocHashes.push(...rec.documentHashes);
      }
      if (rec.faceVerification) {
        allFaceVerifications.push(rec.faceVerification);
      }
    });

    // Check SHA-256 chain integrity
    let isChainValid = true;
    for (let i = 0; i < records.length; i++) {
      const expectedPrev = i === 0 ? GENESIS_HASH : records[i - 1].eventHash;
      if (records[i].previousHash !== expectedPrev) {
        isChainValid = false;
        break;
      }
    }

    return {
      caseId,
      totalEvents: records.length,
      chainValid: isChainValid,
      genesisHash: records.length > 0 ? records[0].eventHash : GENESIS_HASH,
      latestHash: records.length > 0 ? records[records.length - 1].eventHash : GENESIS_HASH,
      documentHashes: allDocHashes,
      faceVerifications: allFaceVerifications,
      auditRecords: records,
    };
  }

  /**
   * Verify cryptographic SHA-256 integrity of a case's audit chain
   */
  public async verifyCaseIntegrity(caseId: string): Promise<{
    caseId: string;
    valid: boolean;
    totalEvents: number;
    latestHash: string;
    tampered: boolean;
    verifiedAt: string;
  }> {
    const summary = await this.queryCaseAuditTrail(caseId);
    let recalculatedMatch = true;

    for (let i = 0; i < summary.auditRecords.length; i++) {
      const rec = summary.auditRecords[i];
      const prevHash = i === 0 ? GENESIS_HASH : summary.auditRecords[i - 1].eventHash;

      if (rec.previousHash !== prevHash) {
        recalculatedMatch = false;
        break;
      }

      const expectedHash = hashAuditEvent({
        caseId: rec.caseId,
        action: rec.action,
        phase: rec.phase,
        actorId: rec.actorId,
        timestamp: rec.timestamp,
        documentHashes: rec.documentHashes,
        faceVerification: rec.faceVerification || null,
        details: rec.details,
        previousHash: rec.previousHash,
      });

      if (expectedHash !== rec.eventHash) {
        recalculatedMatch = false;
        break;
      }
    }

    return {
      caseId,
      valid: recalculatedMatch && summary.chainValid,
      totalEvents: summary.totalEvents,
      latestHash: summary.latestHash,
      tampered: !recalculatedMatch,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Query single audit record by record ID
   */
  public async queryAuditRecordById(auditId: string): Promise<InMemoryLedgerRecord | null> {
    return this.auditIndex.get(auditId) || null;
  }

  /**
   * Query all audit records across cases
   */
  public async queryAllAuditRecords(): Promise<InMemoryLedgerRecord[]> {
    return Array.from(this.auditIndex.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Check connection status
   */
  public isReady(): boolean {
    return this.isConnected;
  }
}

export const fabricClient = FabricClient.getInstance();
