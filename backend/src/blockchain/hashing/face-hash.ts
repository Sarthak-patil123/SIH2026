import { calculateSha256 } from './sha256';

export interface FaceBiometricHash {
  imageHash: string;         // SHA-256 of raw image buffer
  embeddingHash?: string;    // SHA-256 of ArcFace embedding vector
  descriptor: string;        // Short cryptographic fingerprint
  hashedAt: string;
}

/**
 * Compute cryptographic SHA-256 hash of a face image buffer
 */
export function hashFaceImage(buffer: Buffer): FaceBiometricHash {
  const imageHash = calculateSha256(buffer);
  return {
    imageHash,
    descriptor: `FACE-${imageHash.slice(0, 12).toUpperCase()}`,
    hashedAt: new Date().toISOString(),
  };
}

/**
 * Compute cryptographic SHA-256 hash of a 512-d ArcFace embedding vector
 */
export function hashFaceEmbedding(embedding: number[] | Float32Array): string {
  const normArray = Array.from(embedding).map((v) => Number(v.toFixed(6)));
  return calculateSha256(JSON.stringify(normArray));
}

/**
 * Generate a combined Face Verification cryptographic proof hash
 */
export function generateFaceVerificationProofHash(params: {
  docFaceHash: string;
  selfieFaceHash: string;
  similarityScore: number;
  distance: number;
  match: boolean;
  timestamp: string;
}): string {
  const payload = {
    docFaceHash: params.docFaceHash,
    selfieFaceHash: params.selfieFaceHash,
    similarityScore: Number(params.similarityScore.toFixed(4)),
    distance: Number(params.distance.toFixed(4)),
    match: params.match,
    timestamp: params.timestamp,
  };
  return calculateSha256(payload);
}
