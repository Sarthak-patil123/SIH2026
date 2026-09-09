/**
 * Face verification types — mirrors the AI service biometric API responses.
 * Keep in sync with ai-services/biometrics/ and ai-services/router/biometric_router.py.
 */

export type BiometricStatus = "VERIFIED" | "REVIEW_REQUIRED" | "REJECTED" | "FAILED";

/**
 * Response from POST /biometrics/compare-faces
 */
export interface FaceCompareResponse {
  status: "success" | "error";
  match_status: BiometricStatus;
  is_match: boolean;
  match_score: number;
  similarity_percent: number;
  decision_threshold: number;
  face1_detected: boolean;
  face2_detected: boolean;
  face1_crop_base64: string;
  face2_crop_base64: string;
  diagnostics: string[];
  raw_result?: FaceVerifyRaw;
  error?: string;
}

/**
 * Raw internal face verification result (nested inside FaceCompareResponse.raw_result)
 */
export interface FaceVerifyRaw {
  status: BiometricStatus;
  is_match: boolean;
  match_score: number;
  decision_threshold: number;
  doc_face_detected: boolean;
  live_face_detected: boolean;
  doc_face_bbox?: [number, number, number, number] | null;
  live_face_bbox?: [number, number, number, number] | null;
  diagnostics: string[];
}

/**
 * Response from POST /biometrics/verify
 * Used for document + selfie comparison with auto portrait extraction.
 */
export interface FaceVerifyResponse {
  status: BiometricStatus;
  is_match: boolean;
  match_score: number;
  decision_threshold: number;
  doc_face_detected: boolean;
  live_face_detected: boolean;
  doc_face_bbox?: [number, number, number, number] | null;
  live_face_bbox?: [number, number, number, number] | null;
  diagnostics: string[];
  error?: string;
}

/** @deprecated Use FaceVerifyResponse or FaceCompareResponse. Kept for backward compatibility. */
export interface FaceResult {
  match: boolean;
  similarity: number;
  livenessScore: number;
}
