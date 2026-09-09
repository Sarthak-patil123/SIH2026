"""National ID document processor (Aadhaar, PAN, Voter ID).

Accepts a national ID document image, runs the common OCR pipeline,
identifies the specific ID subtype, extracts structured fields using
specialized rules, and prepares the structured LLM extraction payload.
"""
from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Any, Literal, Union
import numpy as np

from core.logger import get_logger
from ocr.engine import run_ocr
from ocr.extractors import extract_aadhaar, extract_pan, extract_voter_id
from ocr.shared import classify_document
from preprocessing import preprocess

logger = get_logger(__name__)

NationalIdType = Literal["aadhaar", "pan", "voter_id", "auto"]


def process_national_id(
    image_input: Union[str, bytes, Path, np.ndarray],
    *,
    id_type: NationalIdType = "auto",
    use_llm: bool = True,
) -> dict[str, Any]:
    """Process a National ID document through the OCR pipeline.

    Args:
        image_input: File path, bytes, Path, or numpy BGR array.
        id_type: 'aadhaar' | 'pan' | 'voter_id' | 'auto'.
        use_llm: Whether to invoke downstream LLM extraction (currently disabled).

    Returns:
        Dictionary of extracted fields, quality assessment, and subtype.
    """
    if isinstance(image_input, np.ndarray):
        img = image_input
        warnings = []
    else:
        pre = preprocess(image_input)
        img = pre.image
        warnings = list(pre.warnings)

    ocr_regions = run_ocr(img)

    # Auto-classify subtype if requested
    detected_subtype = id_type
    if id_type == "auto":
        clf = classify_document(ocr_regions)
        if clf.document_type in ("aadhaar", "pan", "voter_id"):
            detected_subtype = clf.document_type
        else:
            detected_subtype = "aadhaar"  # Default fallback for national ID

    fields: dict[str, Any] = {}
    if detected_subtype == "aadhaar":
        res = extract_aadhaar(ocr_regions)
        fields = {k: v for k, v in asdict(res).items() if v is not None}
    elif detected_subtype == "pan":
        res = extract_pan(ocr_regions)
        fields = {k: v for k, v in asdict(res).items() if v is not None}
    elif detected_subtype == "voter_id":
        res = extract_voter_id(ocr_regions)
        fields = {k: v for k, v in asdict(res).items() if v is not None}

    llm_payload = _get_llm_payload(detected_subtype, ocr_regions, fields, enabled=use_llm)

    return {
        "status": "success",
        "document_type": "national_id",
        "subtype": detected_subtype,
        "country": "IND",
        "fields": fields,
        "quality_warnings": warnings,
        "raw_ocr_count": len(ocr_regions),
        "llm_extraction": llm_payload,
    }


def _get_llm_payload(subtype: str, ocr_regions: list, fields: dict, enabled: bool) -> dict:
    schemas = {
        "aadhaar": {
            "aadhaar_number": "12-digit UID",
            "name": "string",
            "date_of_birth": "DD/MM/YYYY or YYYY",
            "gender": "MALE | FEMALE | TRANSGENDER",
            "address": "string",
            "pincode": "6-digit code",
        },
        "pan": {
            "pan_number": "10-character alphanumeric",
            "name": "string",
            "father_name": "string",
            "date_of_birth": "DD/MM/YYYY",
        },
        "voter_id": {
            "epic_number": "alphanumeric EPIC",
            "name": "string",
            "relation_name": "string",
            "gender": "MALE | FEMALE",
            "date_of_birth": "string",
        },
    }
    target_schema = schemas.get(subtype, {})
    if not enabled:
        return {
            "status": "disabled",
            "message": "LLM extraction is inactive per architecture specification.",
            "target_schema": target_schema,
            "prompt_template": f"Extract {subtype.upper()} fields from OCR tokens into JSON format.",
            "result": fields,
        }
    try:
        from llm_parser import parse_document_with_llm
        return {
            "status": "success",
            "result": parse_document_with_llm(ocr_regions, "national_id"),
            "target_schema": target_schema,
        }
    except Exception as exc:
        return {"status": "error", "error": str(exc), "result": fields}
