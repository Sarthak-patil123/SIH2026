import { FaceClient } from "./face.client";
import { FaceCompareResponse, FaceVerifyResponse } from "./face.types";

/**
 * Service layer for biometric face verification operations.
 * Wraps FaceClient — add retry logic, audit logging, or result caching here if needed.
 */
export class FaceService {
  private readonly client: FaceClient;

  constructor(client?: FaceClient) {
    this.client = client ?? new FaceClient();
  }

  /**
   * Verify a face against a document portrait (document + selfie pair).
   * The AI service automatically extracts the portrait region via YOLO.
   */
  async verifyDocumentFace(
    documentBuffer: Buffer,
    documentFilename: string,
    selfieBuffer: Buffer,
    selfieFilename: string
  ): Promise<FaceVerifyResponse> {
    return this.client.verifyDocumentFace(
      documentBuffer,
      documentFilename,
      selfieBuffer,
      selfieFilename
    );
  }

  /**
   * Direct face-to-face comparison (no document parsing).
   */
  async compareFaces(
    image1Buffer: Buffer,
    image1Filename: string,
    image2Buffer: Buffer,
    image2Filename: string
  ): Promise<FaceCompareResponse> {
    return this.client.compareFaces(
      image1Buffer,
      image1Filename,
      image2Buffer,
      image2Filename
    );
  }
}

export const faceService = new FaceService();
