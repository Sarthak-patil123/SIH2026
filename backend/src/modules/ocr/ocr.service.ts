import { OcrClient } from "./ocr.client";
import { OcrVerificationResponse, DocumentType } from "./ocr.types";

/**
 * Service layer for document OCR operations.
 * Thin wrapper around OcrClient; add caching, retry, or logging here if needed.
 */
export class OcrService {
  private readonly client: OcrClient;

  constructor(client?: OcrClient) {
    this.client = client ?? new OcrClient();
  }

  /**
   * Extract all fields from a document image via the AI OCR pipeline.
   *
   * @param fileBuffer  Raw image bytes
   * @param filename    Original filename
   * @param docType     Optional document type hint (auto-detected if omitted)
   */
  async extract(
    fileBuffer: Buffer,
    filename: string,
    docType?: DocumentType | null
  ): Promise<OcrVerificationResponse> {
    return this.client.extract(fileBuffer, filename, docType);
  }
}

export const ocrService = new OcrService();
