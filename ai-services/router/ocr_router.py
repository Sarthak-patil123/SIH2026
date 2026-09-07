"""POST /ocr/extract — Document OCR, layout detection, and field extraction."""
from __future__ import annotations

import base64
import time
import uuid
from datetime import datetime, timezone
from typing import Literal

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from core.exceptions import ImageQualityError, PipelineError
from core.logger import get_logger
from layout import detect_fields, build_regions, crop_region
from ocr import run_ocr
from ocr.mrz import extract_mrz
from ocr.shared import classify_document
from ocr.extractors import (
    extract_aadhaar, extract_driving_licence, extract_pan, extract_voter_id,
)
from preprocessing import preprocess
from schemas.response import (
    BoundingBox, DocumentMetadata, ExtractedData, FieldValue,
    LayoutCoordinates, MRZChecksums, MRZData, MRZFields,
    OCRTextBlock, PipelineSummary, QualityAssessment, VerificationResponse,
)

router = APIRouter(prefix="/ocr", tags=["OCR"])
logger = get_logger(__name__)


def _bbox_to_rect(bbox: list[list[int]]) -> list[int]:
    """Convert RapidOCR quadrilateral bbox to [x1,y1,x2,y2] rectangle."""
    xs = [p[0] for p in bbox]
    ys = [p[1] for p in bbox]
    return [min(xs), min(ys), max(xs), max(ys)]


def _img_to_b64(img: np.ndarray) -> str:
    """Encode numpy BGR image to base64 JPEG string."""
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buf).decode()


@router.post("/extract", response_model=VerificationResponse)
async def extract_document(
    document: UploadFile = File(..., description="Document image"),
    doc_type: Literal["passport", "national_id", "driving_license", "dob_proof"] | None = Form(None),
) -> dict:
    """
    Pipeline:
    1. Preprocess image (quality check + perspective correction)
    2. YOLO layout detection (photo, signature, mrz, text bboxes)
    3. OCR full image → TextRegion list
    4. Auto-classify document type if not provided
    5. MRZ extraction (if mrz region detected)
    6. Field extraction by document type
    7. Assemble and return VerificationResponse
    """
    t_start = time.monotonic()
    request_id = str(uuid.uuid4())

    image_bytes = await document.read()

    # ── Step 1: Preprocess ────────────────────────────────────────────────────
    try:
        pre = preprocess(image_bytes)
    except ImageQualityError as e:
        raise HTTPException(status_code=400, detail={"error": str(e), "request_id": request_id})

    img = pre.image
    h, w = img.shape[:2]
    warnings = list(pre.warnings)

    # Extract blur score from warnings if present (format: "BLUR_SCORE:xx.xx")
    blur_score = 0.0
    for w_msg in warnings:
        if w_msg.startswith("BLUR_SCORE:"):
            try:
                blur_score = float(w_msg.split(":", 1)[1])
            except (ValueError, IndexError):
                pass

    quality = QualityAssessment(
        passed=True,
        blur_score=blur_score,
        glare_detected="GLARE_DETECTED" in warnings,
        glare_ratio=0.0,
        warnings=warnings,
        errors=[],
    )

    # ── Step 2: Layout detection ──────────────────────────────────────────────
    try:
        detections = detect_fields(img)
    except Exception as exc:
        logger.warning(f"Layout detection failed: {exc}")
        detections = []
    regions_map = build_regions(img, detections)

    def _region_bbox(key: str) -> BoundingBox | None:
        if key not in regions_map:
            return None
        bbox = regions_map[key]
        crop = crop_region(img, bbox)
        conf = next((d[5] for d in detections if d[0] == key and len(d) > 5), 0.9) if detections else 0.0
        return BoundingBox(
            bounding_box=list(bbox),
            confidence=conf,
            image_base64=_img_to_b64(crop),
        )

    layout_coords = LayoutCoordinates(
        photo=_region_bbox("photo"),
        signature=_region_bbox("signature"),
        mrz_region=_region_bbox("mrz"),
    )

    layout_conf_mean = (
        sum(d[5] for d in detections if len(d) > 5) / len(detections) if detections else 0.0
    )

    # ── Step 3: Full-image OCR ────────────────────────────────────────────────
    try:
        ocr_regions = run_ocr(img)
    except Exception as exc:
        logger.warning(f"OCR failed: {exc}")
        ocr_regions = []

    ocr_blocks = [
        OCRTextBlock(text=r.text, polygon=r.bbox, confidence=r.confidence)
        for r in ocr_regions
    ]
    ocr_conf_mean = (
        sum(r.confidence for r in ocr_regions) / len(ocr_regions) if ocr_regions else 0.0
    )

    # ── Step 4: Auto-classify if doc_type not provided ────────────────────────
    # Normalise spelling: classifier uses British 'driving_licence',
    # API form field accepts American 'driving_license'. Canonicalise to 'driving_licence'
    # internally and expose whichever was provided to the user.
    if doc_type is None:
        classification = classify_document(ocr_regions)
        detected_type = classification.document_type
    else:
        # Normalise user-supplied type to match classifier output spelling
        detected_type = doc_type
    # Unify spelling variants internally so extractor dispatch is correct
    _normalised_type = detected_type.replace("driving_license", "driving_licence")

    # ── Step 5: MRZ extraction (passports and MRZ-bearing ID cards) ──────────
    mrz_data: MRZData | None = None
    if "mrz" in regions_map:
        mrz_crop = crop_region(img, regions_map["mrz"], pad_ratio=0.0)
        try:
            mrz_result = extract_mrz(mrz_crop)
        except Exception:
            mrz_result = None

        if mrz_result is not None:
            if hasattr(mrz_result, "passport_number"):
                # TD3 Passport format
                doc_num = getattr(mrz_result.passport_number, "value", None)
                surname = getattr(mrz_result.surname, "value", None)
                given_names = getattr(mrz_result.given_names, "value", None)
                nationality = getattr(mrz_result.nationality, "value", None)
                dob = getattr(mrz_result.date_of_birth, "value", None)
                sex = getattr(mrz_result.sex, "value", None)
                exp = getattr(mrz_result.expiry_date, "value", None)
                personal_num = getattr(getattr(mrz_result, "personal_number", None), "value", None)
                country_code = getattr(getattr(mrz_result, "country_code", None), "value", None)

                doc_valid = getattr(mrz_result.passport_number, "checksum_valid", False)
                dob_valid = getattr(mrz_result.date_of_birth, "checksum_valid", False)
                exp_valid = getattr(mrz_result.expiry_date, "checksum_valid", False)
                personal_valid = getattr(getattr(mrz_result, "personal_number", None), "checksum_valid", None)
                composite_valid = getattr(mrz_result, "overall_checksum_valid", False)
                all_valid = getattr(mrz_result, "overall_checksum_valid", False)
                raw_lines = list(mrz_result.raw_lines) if mrz_result.raw_lines else []
                mrz_type = "TD3"
            else:
                # TD1 / Travel MRZ (National ID Cards, Visas)
                f_dict = getattr(mrz_result, "fields", {}) or {}
                c_dict = getattr(mrz_result, "checks", {}) or {}
                doc_num = f_dict.get("document_number") or f_dict.get("card_number") or f_dict.get("uscis_number")
                surname = f_dict.get("surname")
                given_names = f_dict.get("given_names")
                nationality = f_dict.get("nationality")
                dob = f_dict.get("date_of_birth")
                sex = f_dict.get("sex")
                exp = f_dict.get("expiry_date")
                personal_num = f_dict.get("personal_number") or f_dict.get("card_number")
                country_code = f_dict.get("country_code")

                doc_valid = c_dict.get("document_number_checksum", False)
                dob_valid = c_dict.get("date_of_birth_checksum", False)
                exp_valid = c_dict.get("expiry_date_checksum", False)
                personal_valid = True
                composite_valid = c_dict.get("composite_checksum", False)
                all_valid = c_dict.get("mrz_checksums_valid", False)
                raw_lines = f_dict.get("mrz_raw") or []
                mrz_type = "TD1"

            mrz_data = MRZData(
                is_valid_format=True,
                mrz_type=mrz_type,
                raw_lines=raw_lines,
                fields=MRZFields(
                    document_number=doc_num,
                    surname=surname,
                    given_names=given_names,
                    nationality=nationality,
                    date_of_birth=dob,
                    sex=sex,
                    expiry_date=exp,
                    personal_number=personal_num,
                    country_code=country_code,
                ),
                checksums=MRZChecksums(
                    document_number=doc_valid,
                    date_of_birth=dob_valid,
                    expiry_date=exp_valid,
                    personal_number=personal_valid,
                    composite=composite_valid,
                    all_valid=all_valid,
                ),
                confidence=1.0 if all_valid else 0.6,
            )

    # ── Step 6: Document field extraction ────────────────────────────────────
    rule_fields: dict[str, FieldValue] = {}

    def _fields_from_dataclass(obj, conf: float, source: str) -> dict[str, FieldValue]:
        """Convert a dataclass result into FieldValue dict, skipping None/False/empty."""
        out: dict[str, FieldValue] = {}
        for fname in obj.__dataclass_fields__:
            v = getattr(obj, fname, None)
            if v is not None and v is not False and v != "":
                out[fname] = FieldValue(value=str(v), confidence=conf, source=source)
        return out

    # Passport / national_id with MRZ → populate from MRZ first
    if _normalised_type in ("passport", "national_id") and mrz_data and mrz_data.fields:
        f = mrz_data.fields
        for key, val in f.model_dump().items():
            if val:
                rule_fields[key] = FieldValue(value=val, confidence=mrz_data.confidence, source="mrz")

    # Driving licence — use normalised type to catch both spellings
    if _normalised_type == "driving_licence":
        try:
            dl = extract_driving_licence(ocr_regions)
            rule_fields.update(_fields_from_dataclass(dl, 0.8, "ocr"))
        except Exception as exc:  # noqa: BLE001
            logger.warning("DL extractor failed: %s", exc)

    elif _normalised_type in ("national_id", "pan", "aadhaar", "voter_id") and not rule_fields:
        # Try Aadhaar first, then PAN, then Voter ID (most specific to least)
        try:
            aad = extract_aadhaar(ocr_regions)
            rule_fields.update(_fields_from_dataclass(aad, 0.8, "ocr"))
        except Exception as exc:
            logger.warning("Aadhaar extractor failed: %s", exc)

        if not rule_fields:
            try:
                pan = extract_pan(ocr_regions)
                rule_fields.update(_fields_from_dataclass(pan, 0.8, "ocr"))
            except Exception as exc:
                logger.warning("PAN extractor failed: %s", exc)

        if not rule_fields:
            try:
                voter = extract_voter_id(ocr_regions)
                rule_fields.update(_fields_from_dataclass(voter, 0.8, "ocr"))
            except Exception as exc:
                logger.warning("Voter ID extractor failed: %s", exc)

    # dob_proof — no dedicated extractor; return raw OCR blocks only
    # (LLM layer downstream handles unstructured extraction for this doc type)

    # ── Step 7: Assemble response ─────────────────────────────────────────────
    elapsed_ms = (time.monotonic() - t_start) * 1000
    overall_conf = round((ocr_conf_mean * 0.35) + (layout_conf_mean * 0.15) + 0.5, 3)

    # Populate country from MRZ if available
    doc_country: str | None = None
    if mrz_data and mrz_data.fields and mrz_data.fields.country_code:
        doc_country = mrz_data.fields.country_code

    return VerificationResponse(
        request_id=request_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        document_metadata=DocumentMetadata(
            detected_type=detected_type or "unknown",
            document_country=doc_country,
            normalized_dimensions={"width": w, "height": h},
        ),
        quality_assessment=quality,
        layout_coordinates=layout_coords,
        extracted_data=ExtractedData(
            mrz=mrz_data,
            ocr_text_blocks=ocr_blocks,
            rule_extracted_fields=rule_fields,
        ),
        pipeline_summary=PipelineSummary(
            overall_confidence=overall_conf,
            ocr_confidence_mean=round(ocr_conf_mean, 4),
            layout_confidence_mean=round(layout_conf_mean, 4),
            execution_time_ms=round(elapsed_ms, 1),
        ),
    ).model_dump()
