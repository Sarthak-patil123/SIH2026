export class FabricConnectionError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(`[FabricConnectionError] ${message}`);
    this.name = 'FabricConnectionError';
  }
}

export class FabricEndorsementError extends Error {
  constructor(message: string, public readonly txId?: string) {
    super(`[FabricEndorsementError] ${message} (txId: ${txId || 'unknown'})`);
    this.name = 'FabricEndorsementError';
  }
}

export class BlockchainIntegrityError extends Error {
  constructor(message: string, public readonly details?: any) {
    super(`[BlockchainIntegrityError] ${message}`);
    this.name = 'BlockchainIntegrityError';
  }
}
