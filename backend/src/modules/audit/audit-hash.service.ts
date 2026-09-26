import { calculateSha256, calculateDoubleSha256 } from '../../blockchain/hashing/sha256';
import { hashDocumentBuffer, verifyDocumentHash, computeDocumentMerkleRoot } from '../../blockchain/hashing/document-hash';
import { hashFaceImage, hashFaceEmbedding, generateFaceVerificationProofHash } from '../../blockchain/hashing/face-hash';
import { hashAuditEvent, verifyEventHash } from '../../blockchain/hashing/event-hash';

export class AuditHashService {
  public calculateSha256(data: Buffer | string | object): string {
    return calculateSha256(data);
  }

  public calculateDoubleSha256(data: Buffer | string | object): string {
    return calculateDoubleSha256(data);
  }

  public hashDocument(buffer: Buffer, fileName: string = 'document') {
    return hashDocumentBuffer(buffer, fileName);
  }

  public verifyDocument(buffer: Buffer, expectedHash: string): boolean {
    return verifyDocumentHash(buffer, expectedHash);
  }

  public computeMerkleRoot(hashes: string[]): string {
    return computeDocumentMerkleRoot(hashes);
  }

  public hashFace(buffer: Buffer) {
    return hashFaceImage(buffer);
  }

  public hashFaceEmbedding(embedding: number[] | Float32Array) {
    return hashFaceEmbedding(embedding);
  }

  public generateFaceProof(params: {
    docFaceHash: string;
    selfieFaceHash: string;
    similarityScore: number;
    distance: number;
    match: boolean;
    timestamp: string;
  }) {
    return generateFaceVerificationProofHash(params);
  }

  public hashEvent(payload: any) {
    return hashAuditEvent(payload);
  }

  public verifyEvent(payload: any, recordedHash: string): boolean {
    return verifyEventHash(payload, recordedHash);
  }
}

export const auditHashService = new AuditHashService();
