export interface BlockchainAuditEvent {
  eventId: string;
  caseId: string;
  documentHash: string;
  eventHash: string;
  actorId: string;
  action: string;
  timestamp: string;
  transactionId?: string;
}
