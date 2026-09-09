"""Pydantic v2 response models — implements the JSON schema from pipeline_architecture.md §5.1."""
from __future__ import annotations
from typing import Literal
from pydantic import BaseModel


class QualityAssessment(BaseModel):
    passed: bool
    blur_score: float
    glare_detected: bool
    glare_ratio: float
    warnings: list[str] = []
    errors: list[str] = []


class BoundingBox(BaseModel):
    """Bounding box for a detected layout region."""
    bounding_box: list[int]           # [x1, y1, x2, y2]
    confidence: float
    image_base64: str | None = None   # base64-encoded JPEG crop


class LayoutCoordinates(BaseModel):
    photo: BoundingBox | None = None
    signature: BoundingBox | None = None
    mrz_region: BoundingBox | None = None


class MRZChecksums(BaseModel):
    document_number: bool = False
    date_of_birth: bool = False
    expiry_date: bool = False
    personal_number: bool | None = None
    composite: bool = False
    all_valid: bool = False


class MRZFields(BaseModel):
    document_number: str | None = None
    surname: str | None = None
    given_names: str | None = None
    nationality: str | None = None
    date_of_birth: str | None = None
    sex: str | None = None
    expiry_date: str | None = None
    personal_number: str | None = None
    country_code: str | None = None


class MRZData(BaseModel):
    is_valid_format: bool
    mrz_type: Literal["TD1", "TD2", "TD3", "MRV_A", "MRV_B"] | None = None
    raw_lines: list[str] = []
    fields: MRZFields = MRZFields()
    checksums: MRZChecksums | None = None
    confidence: float = 0.0


class OCRTextBlock(BaseModel):
    """A single detected text region from PaddleOCR."""
    text: str
    polygon: list[list[int]]   # [[x,y],[x,y],[x,y],[x,y]] — quadrilateral
    confidence: float


class FieldValue(BaseModel):
    """A single extracted field with provenance for LLM consumption."""
    value: str | None = None
    confidence: float = 0.0
    source: Literal["mrz", "ocr", "llm", "derived"] = "ocr"   # which sub-pipeline provided this


class ExtractedData(BaseModel):
    mrz: MRZData | None = None
    ocr_text_blocks: list[OCRTextBlock] = []
    rule_extracted_fields: dict[str, FieldValue] = {}
    structured_data: dict[str, Any] | None = None


class BiometricVerification(BaseModel):
    status: Literal["VERIFIED", "REVIEW_REQUIRED", "REJECTED", "FAILED"]
    match_score: float
    decision_threshold: float
    doc_face_detected: bool
    doc_face_bbox: list[int] | None = None
    live_face_detected: bool
    live_face_bbox: list[int] | None = None
    diagnostics: list[str] = []


class DocumentMetadata(BaseModel):
    # Includes all types emitted by the auto-classifier (document_classifier.py)
    # plus user-supplied types via the form field.
    detected_type: str   # e.g. passport|national_id|driving_license|driving_licence|aadhaar|pan|voter_id|dob_proof|unknown
    document_country: str | None = None
    orientation_applied_degrees: int = 0
    normalized_dimensions: dict[str, int] = {}


class PipelineSummary(BaseModel):
    overall_confidence: float
    ocr_confidence_mean: float
    layout_confidence_mean: float
    execution_time_ms: float


class VerificationResponse(BaseModel):
    """Root response model. The full output of one pipeline run."""
    request_id: str
    timestamp: str                        # ISO 8601
    document_metadata: DocumentMetadata
    quality_assessment: QualityAssessment
    layout_coordinates: LayoutCoordinates
    extracted_data: ExtractedData
    biometric_verification: BiometricVerification | None = None
    pipeline_summary: PipelineSummary
