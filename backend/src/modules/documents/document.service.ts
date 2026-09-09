import axios from "axios";
import { config } from "../../config/env";
import {
  DocumentVerificationResponse,
  LLMVerificationOptions,
  PassportVerificationResponse,
} from "./document.types";

export class DocumentService {
  private readonly aiBaseUrl: string;

  constructor() {
    this.aiBaseUrl = config.aiServiceUrl || "http://localhost:8000";
  }

  /**
   * Passport Verification: Passes passport image and live face image to AI service.
   * Returns parsed passport identity data and ArcFace 1:1 biometric verification match.
   */
  async verifyPassport(
    passportBuffer: Buffer,
    passportFilename: string,
    faceBuffer: Buffer,
    faceFilename: string,
    options?: LLMVerificationOptions
  ): Promise<PassportVerificationResponse> {
    const formData = new FormData();
    formData.append(
      "passport",
      new Blob([passportBuffer]),
      passportFilename || "passport.jpg"
    );
    formData.append(
      "face",
      new Blob([faceBuffer]),
      faceFilename || "live_face.jpg"
    );

    if (options?.llmModel) formData.append("llm_model", options.llmModel);
    if (options?.llmApiBase) formData.append("llm_api_base", options.llmApiBase);
    if (options?.llmApiKey) formData.append("llm_api_key", options.llmApiKey);

    const response = await axios.post<PassportVerificationResponse>(
      `${this.aiBaseUrl}/verify/passport`,
      formData
    );
    return response.data;
  }

  /**
   * Visa Verification: Runs PaddleOCR and passes to VISA LLM Parser.
   */
  async verifyVisa(
    fileBuffer: Buffer,
    filename: string,
    options?: LLMVerificationOptions
  ): Promise<DocumentVerificationResponse> {
    const formData = new FormData();
    formData.append("visa", new Blob([fileBuffer]), filename || "visa.jpg");

    if (options?.llmModel) formData.append("llm_model", options.llmModel);
    if (options?.llmApiBase) formData.append("llm_api_base", options.llmApiBase);
    if (options?.llmApiKey) formData.append("llm_api_key", options.llmApiKey);

    const response = await axios.post<DocumentVerificationResponse>(
      `${this.aiBaseUrl}/verify/visa`,
      formData
    );
    return response.data;
  }

  /**
   * Driving Licence Verification: Runs PaddleOCR and passes to Driving Licence LLM Parser.
   */
  async verifyDrivingLicence(
    fileBuffer: Buffer,
    filename: string,
    options?: LLMVerificationOptions
  ): Promise<DocumentVerificationResponse> {
    const formData = new FormData();
    formData.append(
      "driving_licence",
      new Blob([fileBuffer]),
      filename || "driving_licence.jpg"
    );

    if (options?.llmModel) formData.append("llm_model", options.llmModel);
    if (options?.llmApiBase) formData.append("llm_api_base", options.llmApiBase);
    if (options?.llmApiKey) formData.append("llm_api_key", options.llmApiKey);

    const response = await axios.post<DocumentVerificationResponse>(
      `${this.aiBaseUrl}/verify/driving-licence`,
      formData
    );
    return response.data;
  }

  /**
   * National ID Verification: Runs PaddleOCR and passes to National ID LLM Parser.
   * Handles Aadhaar, PAN, Voter ID, SSN, Emirates ID, Cedula, etc.
   */
  async verifyNationalId(
    fileBuffer: Buffer,
    filename: string,
    options?: LLMVerificationOptions
  ): Promise<DocumentVerificationResponse> {
    const formData = new FormData();
    formData.append(
      "national_id",
      new Blob([fileBuffer]),
      filename || "national_id.jpg"
    );

    if (options?.llmModel) formData.append("llm_model", options.llmModel);
    if (options?.llmApiBase) formData.append("llm_api_base", options.llmApiBase);
    if (options?.llmApiKey) formData.append("llm_api_key", options.llmApiKey);

    const response = await axios.post<DocumentVerificationResponse>(
      `${this.aiBaseUrl}/verify/national-id`,
      formData
    );
    return response.data;
  }

  /**
   * DOB Proof Verification: Runs PaddleOCR and passes to DOB Proof LLM Parser.
   * Handles Birth Certificates, School Leaving Certificates, Municipal Records.
   */
  async verifyDobProof(
    fileBuffer: Buffer,
    filename: string,
    options?: LLMVerificationOptions
  ): Promise<DocumentVerificationResponse> {
    const formData = new FormData();
    formData.append(
      "dob_proof",
      new Blob([fileBuffer]),
      filename || "dob_proof.jpg"
    );

    if (options?.llmModel) formData.append("llm_model", options.llmModel);
    if (options?.llmApiBase) formData.append("llm_api_base", options.llmApiBase);
    if (options?.llmApiKey) formData.append("llm_api_key", options.llmApiKey);

    const response = await axios.post<DocumentVerificationResponse>(
      `${this.aiBaseUrl}/verify/dob-proof`,
      formData
    );
    return response.data;
  }
}

export const documentService = new DocumentService();
