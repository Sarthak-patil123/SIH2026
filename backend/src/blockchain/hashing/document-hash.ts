import fs from "fs";
import { calculateSha256 } from "./sha256";

export function hashDocumentFile(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return calculateSha256(fileBuffer);
}
