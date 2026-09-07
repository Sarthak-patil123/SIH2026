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
from ocr.mrz import extract_mrz
from ocr.shared.validator import validate
from preprocessing import preprocess
from preprocessing.preprocessor import _load_image

logger = get_logger(__name__)


def process_passport(
    image_input: Union[str, bytes, Path, np.ndarray],
    *,
    use_llm: bool = False,
) -> dict[str, Any]:
    """Process a passport image through the OCR and MRZ pipeline.

    Args:
        image_input: File path, raw bytes, Path, or numpy BGR array.
        use_llm: Whether to invoke downstream LLM extraction (currently disabled).

    Returns:
        Structured dictionary containing extracted fields, MRZ data,
        quality metrics, and layout regions.
    """
    # 1. Preprocessing
    if isinstance(image_input, np.ndarray):
        img = image_input
        warnings = []
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

    # 3. OCR on full image
    ocr_regions = run_ocr(img)

    # 4. MRZ Extraction (prefer cropped MRZ region if isolated by YOLO)
    mrz_result = None
    if "mrz" in regions_map:
        mrz_crop = crop_region(img, regions_map["mrz"], pad_ratio=0.0)
        try:
            mrz_result = extract_mrz(mrz_crop)
        except Exception as exc:
            logger.warning("MRZ extraction on crop failed: %s", exc)

    if mrz_result is None:
        # Fallback: run MRZ extraction on full image text regions
        try:
            mrz_result = extract_mrz(img)
        except Exception:
            pass

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

    # Visual field supplements
    for k, v in asdict(visual_fields).items():
        if v and (k not in fields or not fields[k]):
            fields[k] = v

    # 8. LLM Extraction Interface (Inactive in Phase 1)
    llm_payload = _get_llm_payload(ocr_regions, fields, enabled=use_llm)

    mrz_dict = None
    if mrz_result and hasattr(mrz_result, "passport_number"):
        mrz_dict = {
            "type": "TD3",
            "is_valid": mrz_result.overall_checksum_valid,
            "raw_lines": list(mrz_result.raw_lines) if mrz_result.raw_lines else [],
            "checksums": {
                "passport_number": mrz_result.passport_number.checksum_valid,
                "date_of_birth": mrz_result.date_of_birth.checksum_valid,
                "expiry_date": mrz_result.expiry_date.checksum_valid,
                "overall_valid": mrz_result.overall_checksum_valid,
            },
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
    return {"status": "unimplemented"}
