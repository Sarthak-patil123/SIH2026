/**
 * OCR types — mirrors the `VerificationResponse` schema from the AI service.
 * Keep in sync with ai-services/schemas/response.py.
 */

export type DocumentType =
  | "passport"
  | "visa"
  | "national_id"
  | "driving_licence"
  | "driving_license"
  | "aadhaar"
  | "pan"
  | "voter_id"
  | "dob_proof"
  | "unknown";

export interface FieldValue {
  value: string | null;
  confidence: number;
  source: "mrz" | "ocr" | "llm" | "derived";
}

export interface BoundingBox {
  bounding_box: [number, number, number, number]; // [x1, y1, x2, y2]
  confidence: number;
  image_base64?: string | null;
}

export interface LayoutCoordinates {
  photo?: BoundingBox | null;
  signature?: BoundingBox | null;
  mrz_region?: BoundingBox | null;
}

export interface MRZChecksums {
  document_number: boolean;
  date_of_birth: boolean;
  expiry_date: boolean;
  personal_number?: boolean | null;
  composite: boolean;
  all_valid: boolean;
}

export interface MRZFields {
  document_number?: string | null;
  surname?: string | null;
  given_names?: string | null;
  nationality?: string | null;
  date_of_birth?: string | null;
  sex?: string | null;
  expiry_date?: string | null;
  personal_number?: string | null;
  country_code?: string | null;
}

export interface MRZData {
  is_valid_format: boolean;
  mrz_type?: "TD1" | "TD2" | "TD3" | "MRV_A" | "MRV_B" | null;
  raw_lines: string[];
  fields: MRZFields;
  checksums?: MRZChecksums | null;
  confidence: number;
}

export interface OCRTextBlock {
  text: string;
  polygon: [number, number][][];
  confidence: number;
}

export interface ExtractedData {
  mrz?: MRZData | null;
  ocr_text_blocks: OCRTextBlock[];
  rule_extracted_fields: Record<string, FieldValue>;
  structured_data?: Record<string, unknown> | null;
}

export interface QualityAssessment {
  passed: boolean;
  blur_score: number;
  glare_detected: boolean;
  glare_ratio: number;
  warnings: string[];
  errors: string[];
}

export interface DocumentMetadata {
  detected_type: DocumentType;
  document_country?: string | null;
  orientation_applied_degrees: number;
  normalized_dimensions: { width: number; height: number };
}

export interface PipelineSummary {
  overall_confidence: number;
  ocr_confidence_mean: number;
  layout_confidence_mean: number;
  execution_time_ms: number;
}

/**
 * Root response type returned by POST /ocr/extract on the AI service.
 */
export interface OcrVerificationResponse {
  request_id: string;
  timestamp: string;
  document_metadata: DocumentMetadata;
  quality_assessment: QualityAssessment;
  layout_coordinates: LayoutCoordinates;
  extracted_data: ExtractedData;
  biometric_verification?: unknown | null;
  pipeline_summary: PipelineSummary;
}

/** Slim alias for backward compatibility with older code that used OcrResult */
export type OcrResult = OcrVerificationResponse;
