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
    extract_aadhaar, extract_driving_licence, extract_pan, extract_voter_id, extract_passport,
)
from llm_parser import parse_document_with_llm
from preprocessing import preprocess
from preprocessing.preprocessor import _load_image
from schemas.response import (
    BoundingBox, DocumentMetadata, ExtractedData, FieldValue,
    LayoutCoordinates, MRZChecksums, MRZData, MRZFields,
    OCRTextBlock, PipelineSummary, QualityAssessment, VerificationResponse,
)

router = APIRouter(prefix="/ocr", tags=["OCR"])
logger = get_logger(__name__)


def _bbox_to_rect(bbox: list[list[int]]) -> list[int]:
    """Convert PaddleOCR quadrilateral bbox to [x1,y1,x2,y2] rectangle."""
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
    doc_type: str | None = Form(None, description="passport | national_id | driving_license | dob_proof | visa | aadhaar | pan | auto"),
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
        conf = next((d[5] for d in detections if d[0] == key and len(d) > 5), 0.0) if detections else 0.0
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
        raw_ocr_regions = run_ocr(_load_image(image_bytes))
        if len(raw_ocr_regions) >= 4 and sum(r.confidence for r in raw_ocr_regions) / len(raw_ocr_regions) >= 0.85:
            ocr_regions = raw_ocr_regions
        else:
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
    if not doc_type or doc_type.strip().lower() in ("auto", "auto_detect", "unknown", "none"):
        classification = classify_document(ocr_regions)
        detected_type = classification.document_type
    else:
        # Normalise user-supplied type to match classifier output spelling
        detected_type = doc_type
    # Unify spelling variants internally so extractor dispatch is correct
    _normalised_type = detected_type.replace("driving_license", "driving_licence")

    # ── Step 5: MRZ extraction (passports and MRZ-bearing ID cards) ──────────
    mrz_data: MRZData | None = None
    mrz_result = None
    if "mrz" in regions_map:
        mrz_crop = crop_region(img, regions_map["mrz"], pad_ratio=0.0)
        try:
            mrz_result = extract_mrz(mrz_crop)
        except Exception:
            mrz_result = None

    if mrz_result is None and ocr_regions:
        from ocr.mrz.parser import parse_mrz
        from ocr.mrz.travel_mrz import parse_travel_mrz
        try:
            mrz_result = parse_mrz(ocr_regions) or parse_travel_mrz(ocr_regions)
        except Exception as exc:
            logger.debug("Full-image MRZ fallback error: %s", exc)

    if mrz_result is None:
        try:
            mrz_result = extract_mrz(img)
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

    def _get_region_confidence(val_str: str) -> float:
        """Find the real neural OCR confidence of the text region containing the value."""
        if not val_str or not ocr_regions:
            return round(float(ocr_conf_mean if ocr_conf_mean > 0 else 0.88), 3)
        val_clean = str(val_str).lower().replace(" ", "").replace("-", "").replace("/", "")
        best_conf = None
        for r in ocr_regions:
            r_text = r.text.lower().replace(" ", "").replace("-", "").replace("/", "")
            if val_clean in r_text or r_text in val_clean:
                if best_conf is None or r.confidence > best_conf:
                    best_conf = r.confidence
        if best_conf is not None:
            return round(float(best_conf), 3)
        return round(float(ocr_conf_mean if ocr_conf_mean > 0 else 0.88), 3)

    def _fields_from_dataclass(obj, default_conf: float, source: str) -> dict[str, FieldValue]:
        """Convert a dataclass result into FieldValue dict, using genuine OCR region confidence."""
        out: dict[str, FieldValue] = {}
        for fname in obj.__dataclass_fields__:
            v = getattr(obj, fname, None)
            if v is not None and v is not False and v != "":
                v_str = str(v)
                real_conf = _get_region_confidence(v_str)
                out[fname] = FieldValue(value=v_str, confidence=real_conf, source=source)
        return out

    # Passport / national_id with MRZ → populate from MRZ first
    # Passport / national_id with MRZ → populate from MRZ first
    if _normalised_type in ("passport", "national_id") and mrz_data and mrz_data.fields:
        f = mrz_data.fields
        for key, val in f.model_dump().items():
            if val:
                rule_fields[key] = FieldValue(value=val, confidence=mrz_data.confidence, source="mrz")

    # If passport, supplement visual fields from the biodata page (place of birth, issue date, etc.)
    if _normalised_type == "passport":
        try:
            pass_visual = extract_passport(ocr_regions)
            visual_dict = _fields_from_dataclass(pass_visual, 0.8, "ocr")
            for k, fv in visual_dict.items():
                if k not in rule_fields:  # Don't overwrite MRZ validated fields
                    rule_fields[k] = fv
        except Exception as exc:
            logger.warning("Passport visual extractor failed: %s", exc)

    # Driving licence — use normalised type to catch both spellings
    elif _normalised_type in ("driving_licence", "driving_license"):
        try:
            dl = extract_driving_licence(ocr_regions)
            rule_fields.update(_fields_from_dataclass(dl, 0.85, "ocr"))
        except Exception as exc:  # noqa: BLE001
            logger.warning("DL extractor failed: %s", exc)

    elif _normalised_type == "visa":
        try:
            from ocr.visa.processor import process_visa
            visa_res = process_visa(img)
            for k, v in (visa_res.get("fields") or {}).items():
                if v:
                    real_conf = _get_region_confidence(str(v))
                    rule_fields[k] = FieldValue(value=str(v), confidence=real_conf, source="ocr")
        except Exception as exc:
            logger.warning("Visa extractor failed: %s", exc)

    elif _normalised_type == "dob_proof":
        try:
            from ocr.dob_proof.processor import process_dob_proof
            dob_res = process_dob_proof(img)
            for k, v in (dob_res.get("fields") or {}).items():
                if v:
                    real_conf = _get_region_confidence(str(v))
                    rule_fields[k] = FieldValue(value=str(v), confidence=real_conf, source="ocr")
        except Exception as exc:
            logger.warning("DOB Proof extractor failed: %s", exc)

    elif _normalised_type in ("national_id", "pan", "aadhaar", "voter_id") and not rule_fields:
        # Try Aadhaar first, then PAN, then Voter ID (most specific to least)
        try:
            aad = extract_aadhaar(ocr_regions)
            rule_fields.update(_fields_from_dataclass(aad, 0.85, "ocr"))
        except Exception as exc:
            logger.warning("Aadhaar extractor failed: %s", exc)

        if not rule_fields or not any(k in rule_fields for k in ("aadhaar_number", "aadhaar_last4")):
            try:
                pan = extract_pan(ocr_regions)
                pan_fields = _fields_from_dataclass(pan, 0.85, "ocr")
                if "pan_number" in pan_fields:
                    rule_fields = pan_fields
            except Exception as exc:
                logger.warning("PAN extractor failed: %s", exc)

        if not rule_fields:
            try:
                voter = extract_voter_id(ocr_regions)
                rule_fields.update(_fields_from_dataclass(voter, 0.85, "ocr"))
            except Exception as exc:
                logger.warning("Voter ID extractor failed: %s", exc)

    # Fallback cascade: if document type was unknown or extractor produced no fields,
    # try all standard extractors to identify document from its fields
    if not rule_fields:
        # 1. Try Driving Licence
        try:
            dl = extract_driving_licence(ocr_regions)
            dl_dict = _fields_from_dataclass(dl, 0.85, "ocr")
            if "dl_number" in dl_dict or ("name" in dl_dict and "date_of_birth" in dl_dict):
                rule_fields.update(dl_dict)
                detected_type = "driving_license"
                _normalised_type = "driving_licence"
        except Exception:
            pass

        # 2. Try PAN
        if not rule_fields:
            try:
                pan = extract_pan(ocr_regions)
                pan_dict = _fields_from_dataclass(pan, 0.85, "ocr")
                if "pan_number" in pan_dict:
                    rule_fields.update(pan_dict)
                    detected_type = "pan"
                    _normalised_type = "pan"
            except Exception:
                pass

        # 3. Try Aadhaar
        if not rule_fields:
            try:
                aad = extract_aadhaar(ocr_regions)
                aad_dict = _fields_from_dataclass(aad, 0.85, "ocr")
                if "aadhaar_number" in aad_dict or "aadhaar_last4" in aad_dict:
                    rule_fields.update(aad_dict)
                    detected_type = "aadhaar"
                    _normalised_type = "aadhaar"
            except Exception:
                pass

        # 4. Try Voter ID
        if not rule_fields:
            try:
                voter = extract_voter_id(ocr_regions)
                voter_dict = _fields_from_dataclass(voter, 0.85, "ocr")
                if "epic_number" in voter_dict or ("gender" in voter_dict and "name" in voter_dict):
                    rule_fields.update(voter_dict)
                    detected_type = "voter_id"
                    _normalised_type = "voter_id"
            except Exception:
                pass

        # 5. Try Visa
        if not rule_fields:
            try:
                from ocr.visa.processor import process_visa
                visa_res = process_visa(img)
                v_fields = visa_res.get("fields") or {}
                if any(k in v_fields for k in ("visa_number", "passport_number", "visa_type")):
                    for k, v in v_fields.items():
                        if v:
                            rule_fields[k] = FieldValue(value=str(v), confidence=_get_region_confidence(str(v)), source="ocr")
                    detected_type = "visa"
                    _normalised_type = "visa"
            except Exception:
                pass

        # 6. Try DOB Proof
        if not rule_fields:
            try:
                from ocr.dob_proof.processor import process_dob_proof
                dob_res = process_dob_proof(img)
                dob_f = dob_res.get("fields") or {}
                if any(k in dob_f for k in ("date_of_birth", "registration_number")):
                    for k, v in dob_f.items():
                        if v:
                            rule_fields[k] = FieldValue(value=str(v), confidence=_get_region_confidence(str(v)), source="ocr")
                    detected_type = "dob_proof"
                    _normalised_type = "dob_proof"
            except Exception:
                pass

    # ── Step 6b: LLM Structured Extraction ────────────────────────────────────
    # For non-passport documents (visa, driving licence, national ID, dob proof),
    # invoke llm_parser to produce aligned structured JSON and supplement fields.
    llm_structured: dict | None = None
    if _normalised_type != "passport":
        try:
            llm_structured = parse_document_with_llm(ocr_regions, _normalised_type)
            if llm_structured and isinstance(llm_structured, dict):
                conf_score = float(llm_structured.get("confidence_score", 0.8))
                for k, v in llm_structured.items():
                    if (
                        k not in ("is_llm_parsed", "raw_lines_count", "extraction_method", "notes", "flexible_fields")
                        and v is not None
                        and v != ""
                        and k not in rule_fields
                    ):
                        rule_fields[k] = FieldValue(value=str(v), confidence=conf_score, source="llm")

                # Attach any detected flexible fields
                flex = llm_structured.get("flexible_fields", {})
                if isinstance(flex, dict):
                    for fk, fv in flex.items():
                        if fv is not None and fv != "" and fk not in rule_fields:
                            rule_fields[fk] = FieldValue(value=str(fv), confidence=conf_score * 0.9, source="llm")
        except Exception as exc:
            logger.warning("LLM parser pipeline integration warning: %s", exc)

    # ── Step 7: Assemble response ─────────────────────────────────────────────
    elapsed_ms = (time.monotonic() - t_start) * 1000
    overall_conf = round((ocr_conf_mean * 0.35) + (layout_conf_mean * 0.15) + 0.5, 3)

    # Populate country from MRZ if available, or infer from document type
    doc_country: str | None = None
    if mrz_data and mrz_data.fields and mrz_data.fields.country_code:
        doc_country = mrz_data.fields.country_code
    elif _normalised_type in ("aadhaar", "pan", "driving_licence", "voter_id"):
        doc_country = "IND"

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
            structured_data=llm_structured,
        ),
        pipeline_summary=PipelineSummary(
            overall_confidence=overall_conf,
            ocr_confidence_mean=round(ocr_conf_mean, 4),
            layout_confidence_mean=round(layout_conf_mean, 4),
            execution_time_ms=round(elapsed_ms, 1),
        ),
    ).model_dump()
