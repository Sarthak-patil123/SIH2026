import axios from "axios";
import { config } from "../../config/env";
import { OcrVerificationResponse, DocumentType } from "./ocr.types";

/**
 * HTTP client for the AI service /ocr/extract endpoint.
 * Wraps multipart upload and typed response deserialization.
 * Uses native Node 18+ FormData and Blob to avoid external form-data dependency.
 */
export class OcrClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? config.aiServiceUrl ?? "http://localhost:8000").replace(/\/$/, "");
  }

  /**
   * POST /ocr/extract
   * Runs the full OCR + layout detection + field extraction pipeline on a document image.
   *
   * @param fileBuffer   Raw image bytes (JPEG/PNG/PDF)
   * @param filename     Original filename (used for Content-Disposition)
   * @param docType      Optional hint for the classifier; pass null to auto-detect
   */
  async extract(
    fileBuffer: Buffer,
    filename: string,
    docType?: DocumentType | null
  ): Promise<OcrVerificationResponse> {
    const formData = new FormData();
    formData.append(
      "document",
      new Blob([fileBuffer as any]),
      filename || "document.jpg"
    );
    if (docType) {
      formData.append("doc_type", docType);
    }

    const response = await axios.post<OcrVerificationResponse>(
      `${this.baseUrl}/ocr/extract`,
      formData
    );
    return response.data;
  }
}

export const ocrClient = new OcrClient();
