export interface DocumentRecord {
  id: string;
  hash: string;
  type: string;
}

export interface LLMVerificationOptions {
  llmModel?: string;
  llmApiBase?: string;
  llmApiKey?: string;
}

export interface PassportVerificationResponse {
  request_id: string;
  timestamp: string;
  document_type: "passport";
  verification_status: "VERIFIED" | "REVIEW_REQUIRED" | "REJECTED";
  document_data: {
    passport_number: string | null;
    surname: string | null;
    given_names: string | null;
    full_name: string | null;
    nationality: string | null;
    date_of_birth: string | null;
    sex: string | null;
    date_of_issue?: string | null;
    date_of_expiry?: string | null;
    issuing_authority?: string | null;
    flexible_fields?: Record<string, any>;
    confidence_score?: number;
    notes?: string;
  };
  biometric_verification: {
    status: string;
    match_score: number;
    decision_threshold?: number;
    is_match: boolean;
    doc_face_detected?: boolean;
    live_face_detected?: boolean;
    diagnostics?: string[];
  };
  ocr_summary: {
    lines_detected: number;
    confidence_mean: number;
  };
  execution_time_ms: number;
}

export interface DocumentVerificationResponse {
  request_id: string;
  timestamp: string;
  document_type: string;
  extracted_data: Record<string, any>;
  ocr_confidence: number;
}
