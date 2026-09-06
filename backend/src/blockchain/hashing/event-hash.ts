import { calculateSha256 } from "./sha256";

export function hashAuditEvent(payload: object): string {
  return calculateSha256(JSON.stringify(payload));
}
