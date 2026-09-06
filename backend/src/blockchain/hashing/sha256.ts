import crypto from "crypto";

export function calculateSha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}
