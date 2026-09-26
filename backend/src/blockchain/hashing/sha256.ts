import crypto from 'crypto';

/**
 * Standard SHA-256 calculation for Buffer, string, or arbitrary object payload.
 */
export function calculateSha256(data: Buffer | string | object): string {
  const hash = crypto.createHash('sha256');
  if (Buffer.isBuffer(data)) {
    hash.update(data);
  } else if (typeof data === 'string') {
    hash.update(data, 'utf8');
  } else {
    // Sort keys deterministically for canonical JSON representation
    hash.update(deterministicStringify(data), 'utf8');
  }
  return hash.digest('hex');
}

/**
 * Deterministic JSON stringifier to ensure canonical SHA-256 hashing
 */
export function deterministicStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => deterministicStringify(item)).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const entries = keys.map((key) => {
    return JSON.stringify(key) + ':' + deterministicStringify(obj[key]);
  });
  return '{' + entries.join(',') + '}';
}

/**
 * Double SHA-256 hash (SHA-256d) for high-integrity proof seals
 */
export function calculateDoubleSha256(data: Buffer | string | object): string {
  const firstPass = crypto.createHash('sha256');
  if (Buffer.isBuffer(data)) {
    firstPass.update(data);
  } else if (typeof data === 'string') {
    firstPass.update(data, 'utf8');
  } else {
    firstPass.update(deterministicStringify(data), 'utf8');
  }
  const digest = firstPass.digest();
  return crypto.createHash('sha256').update(digest).digest('hex');
}
