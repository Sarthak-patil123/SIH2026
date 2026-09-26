import fs from 'fs';
import { calculateSha256 } from './sha256';

export interface DocumentHashResult {
  sha256Hash: string;
  byteSize: number;
  fileName: string;
  hashedAt: string;
}

/**
 * Hash a file from filesystem path
 */
export function hashDocumentFile(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return calculateSha256(fileBuffer);
}

/**
 * Hash in-memory file buffer (e.g. from Multer upload)
 */
export function hashDocumentBuffer(buffer: Buffer, fileName: string = 'document'): DocumentHashResult {
  const hash = calculateSha256(buffer);
  return {
    sha256Hash: hash,
    byteSize: buffer.length,
    fileName,
    hashedAt: new Date().toISOString(),
  };
}

/**
 * Verify if a document buffer matches an expected SHA-256 hash
 */
export function verifyDocumentHash(buffer: Buffer, expectedHash: string): boolean {
  const actualHash = calculateSha256(buffer);
  return actualHash.toLowerCase() === expectedHash.toLowerCase();
}

/**
 * Compute Merkle root of multiple document hashes
 */
export function computeDocumentMerkleRoot(documentHashes: string[]): string {
  if (!documentHashes || documentHashes.length === 0) {
    return calculateSha256('EMPTY_DOCUMENT_SET');
  }
  if (documentHashes.length === 1) {
    return documentHashes[0];
  }

  let currentLevel = [...documentHashes];
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(calculateSha256(currentLevel[i] + currentLevel[i + 1]));
      } else {
        // Duplicate odd element to pair
        nextLevel.push(calculateSha256(currentLevel[i] + currentLevel[i]));
      }
    }
    currentLevel = nextLevel;
  }

  return currentLevel[0];
}
