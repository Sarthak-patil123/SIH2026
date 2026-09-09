"""Passport document processor.

Accepts a passport document image (file path, bytes, or numpy array),
runs the common OCR pipeline (preprocessing -> YOLO layout -> PaddleOCR),
performs TD3 MRZ parsing with ICAO checksum validation, visual biodata field
extraction, cross-validation, and prepares structured LLM extraction.
"""
from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Any, Union
import numpy as np

from core.logger import get_logger
from layout import detect_fields, build_regions, crop_region
from ocr.engine import run_ocr
from ocr.extractors.passport import extract_passport
from ocr.mrz import extract_mrz, parse_mrz, parse_travel_mrz
from ocr.shared.validator import validate
from preprocessing import preprocess
from preprocessing.preprocessor import _load_image

logger = get_logger(__name__)


def process_passport(
    image_input: Union[str, bytes, Path, np.ndarray],
    *,
    use_llm: bool = True,
) -> dict[str, Any]:
    """Process a passport image through the OCR and MRZ pipeline.

    Args:
        image_input: File path, raw bytes, Path, or numpy BGR array.
        use_llm: Whether to invoke downstream LLM extraction (currently disabled).

    Returns:
        Structured dictionary containing extracted fields, MRZ data,
        quality metrics, and layout regions.
    """
    # 1. Image loading & Preprocessing
    raw_img = _load_image(image_input)
    warnings: list[str] = []

    # Run OCR on raw image first (native pixels preserve fine fonts, check digits and chevrons best)
    try:
        raw_ocr_regions = run_ocr(raw_img)
        raw_mrz = parse_mrz(raw_ocr_regions) or parse_travel_mrz(raw_ocr_regions)
    except Exception as exc:
        logger.debug("Raw image OCR/MRZ trial failed: %s", exc)
        raw_ocr_regions = []
        raw_mrz = None

    if isinstance(image_input, np.ndarray):
        img = image_input
    else:
        pre = preprocess(image_input)
        img = pre.image
        warnings = list(pre.warnings)

    h, w = img.shape[:2]

    # 2. YOLO Layout Detection
    try:
        detections = detect_fields(img)
        regions_map = build_regions(img, detections)
    except Exception as exc:
        logger.warning("Passport layout detection failed: %s", exc)
        detections = []
        regions_map = {}

    # 3. Choose best OCR regions (prefer raw if valid MRZ or high text confidence)
    mrz_result = raw_mrz
    if raw_mrz is not None or (len(raw_ocr_regions) >= 4 and sum(r.confidence for r in raw_ocr_regions) / len(raw_ocr_regions) >= 0.85):
        ocr_regions = raw_ocr_regions
    else:
        ocr_regions = run_ocr(img)

    # 4. MRZ Extraction fallback (prefer cropped MRZ region if isolated by YOLO)
    if mrz_result is None and "mrz" in regions_map:
        mrz_crop = crop_region(img, regions_map["mrz"], pad_ratio=0.0)
        try:
            mrz_result = extract_mrz(mrz_crop)
        except Exception as exc:
            logger.warning("MRZ extraction on crop failed: %s", exc)

    if mrz_result is None:
        try:
            mrz_result = parse_mrz(ocr_regions) or parse_travel_mrz(ocr_regions)
        except Exception as exc:
            logger.warning("MRZ parsing fallback on ocr_regions failed: %s", exc)

    # 5. Visual field extraction
    visual_fields = extract_passport(ocr_regions)

    # 6. Cross-validation
    validation = validate(mrz_result if hasattr(mrz_result, "passport_number") else None, ocr_regions)

    # 7. Merge fields (MRZ takes precedence for core biodata, visual for supplementary)
    fields: dict[str, Any] = {}
    if mrz_result and hasattr(mrz_result, "passport_number"):
        fields["passport_number"] = mrz_result.passport_number.value
        fields["surname"] = mrz_result.surname.value
        fields["given_names"] = mrz_result.given_names.value
        fields["nationality"] = mrz_result.nationality.value
        fields["date_of_birth"] = mrz_result.date_of_birth.value
        fields["sex"] = mrz_result.sex.value
        fields["expiry_date"] = mrz_result.expiry_date.value
        fields["personal_number"] = getattr(getattr(mrz_result, "personal_number", None), "value", None)
        fields["country_code"] = getattr(getattr(mrz_result, "country_code", None), "value", None)

    # Visual field supplements (supplement missing MRZ fields or supplementary like place_of_birth, place_of_issue, date_of_issue)
    for k, v in asdict(visual_fields).items():
        if v and (k not in fields or not fields[k]):
            fields[k] = v

    # Harmonize nationality and country code
    if not fields.get("nationality") and fields.get("country_code"):
        fields["nationality"] = fields["country_code"]
    if not fields.get("country_code") and fields.get("nationality"):
        fields["country_code"] = fields["nationality"]

    # 8. LLM Extraction Interface (Inactive in Phase 1)
    llm_payload = _get_llm_payload(ocr_regions, fields, enabled=use_llm)

    mrz_dict = None
    if mrz_result and hasattr(mrz_result, "passport_number"):
        mrz_fields = {
            "passport_number": mrz_result.passport_number.value,
            "surname": mrz_result.surname.value,
            "given_names": mrz_result.given_names.value,
            "nationality": mrz_result.nationality.value,
            "country_code": getattr(getattr(mrz_result, "country_code", None), "value", None),
            "date_of_birth": mrz_result.date_of_birth.value,
            "sex": mrz_result.sex.value,
            "expiry_date": mrz_result.expiry_date.value,
            "personal_number": getattr(getattr(mrz_result, "personal_number", None), "value", None),
        }
        mrz_dict = {
            "type": "TD3",
            "is_valid": mrz_result.overall_checksum_valid,
            "raw_lines": list(mrz_result.raw_lines) if mrz_result.raw_lines else [],
            "fields": mrz_fields,
            "checksums": {
                "passport_number": mrz_result.passport_number.checksum_valid,
                "date_of_birth": mrz_result.date_of_birth.checksum_valid,
                "expiry_date": mrz_result.expiry_date.checksum_valid,
                "overall_valid": mrz_result.overall_checksum_valid,
            },
        }
    elif mrz_result and hasattr(mrz_result, "fields"):
        mrz_dict = {
            "type": getattr(mrz_result, "document_type", "TD1"),
            "is_valid": getattr(mrz_result, "checks", {}).get("mrz_checksums_valid", True),
            "raw_lines": getattr(mrz_result, "fields", {}).get("mrz_raw", []),
            "fields": getattr(mrz_result, "fields", {}),
            "checksums": getattr(mrz_result, "checks", {}),
        }

    return {
        "status": "success",
        "document_type": "passport",
        "fields": fields,
        "mrz": mrz_dict,
        "validation": {
            "confidence": validation.confidence,
            "errors": validation.errors,
            "warnings": validation.warnings,
        },
        "quality_warnings": warnings,
        "layout_regions": list(regions_map.keys()),
        "raw_ocr_count": len(ocr_regions),
        "llm_extraction": llm_payload,
    }


def _get_llm_payload(ocr_regions: list, rule_fields: dict, enabled: bool) -> dict:
    """Prepares the schema and prompt for LLM extraction (currently inactive)."""
    schema = {
        "passport_number": "string",
        "surname": "string",
        "given_names": "string",
        "nationality": "string",
        "date_of_birth": "YYYY-MM-DD",
        "place_of_birth": "string",
        "sex": "M | F | X",
        "date_of_issue": "YYYY-MM-DD",
        "place_of_issue": "string",
        "expiry_date": "YYYY-MM-DD",
    }
    if not enabled:
        return {
            "status": "disabled",
            "message": "LLM extraction is inactive per architecture specification.",
            "target_schema": schema,
            "prompt_template": "Extract passport identity fields from OCR tokens into JSON schema.",
            "result": rule_fields,
        }
    try:
        from llm_parser import parse_document_with_llm
        return {
            "status": "success",
            "result": parse_document_with_llm(ocr_regions, "passport"),
            "target_schema": schema,
        }
    except Exception as exc:
        return {"status": "error", "error": str(exc), "result": rule_fields}
