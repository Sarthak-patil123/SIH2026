import axios from "axios";
import { config } from "../../config/env";
import { FaceCompareResponse, FaceVerifyResponse } from "./face.types";

/**
 * HTTP client for the AI service /biometrics endpoints.
 * Uses native Node 18+ FormData and Blob to avoid external form-data dependency.
 */
export class FaceClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? config.aiServiceUrl ?? "http://localhost:8000").replace(/\/$/, "");
  }

  /**
   * POST /biometrics/verify
   * Accepts a document image + selfie image.
   * Extracts the portrait from the document via YOLO and runs ArcFace 1:1 comparison.
   *
   * @param documentBuffer  Document image bytes (passport, ID card, etc.)
   * @param documentFilename
   * @param selfieBuffer    Live selfie image bytes
   * @param selfieFilename
   */
  async verifyDocumentFace(
    documentBuffer: Buffer,
    documentFilename: string,
    selfieBuffer: Buffer,
    selfieFilename: string
  ): Promise<FaceVerifyResponse> {
    const formData = new FormData();
    formData.append(
      "document",
      new Blob([documentBuffer as any]),
      documentFilename || "document.jpg"
    );
    formData.append(
      "selfie",
      new Blob([selfieBuffer as any]),
      selfieFilename || "selfie.jpg"
    );

    const response = await axios.post<FaceVerifyResponse>(
      `${this.baseUrl}/biometrics/verify`,
      formData
    );
    return response.data;
  }

  /**
   * POST /biometrics/compare-faces
   * Direct face-to-face comparison — accepts any two face images (no document parsing).
   *
   * @param image1Buffer  First face image bytes
   * @param image1Filename
   * @param image2Buffer  Second face image bytes
   * @param image2Filename
   */
  async compareFaces(
    image1Buffer: Buffer,
    image1Filename: string,
    image2Buffer: Buffer,
    image2Filename: string
  ): Promise<FaceCompareResponse> {
    const formData = new FormData();
    formData.append(
      "image1",
      new Blob([image1Buffer as any]),
      image1Filename || "face1.jpg"
    );
    formData.append(
      "image2",
      new Blob([image2Buffer as any]),
      image2Filename || "face2.jpg"
    );

    const response = await axios.post<FaceCompareResponse>(
      `${this.baseUrl}/biometrics/compare-faces`,
      formData
    );
    return response.data;
  }
}

export const faceClient = new FaceClient();
