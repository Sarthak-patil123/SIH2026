"""Driving Licence document processor.

Accepts an Indian Driving Licence document image, runs the common OCR pipeline,
extracts driving licence fields (DL number, holder name, validity dates, RTO,
class of vehicle), validates the licence number, and prepares LLM extraction.
"""
from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Any, Union
import numpy as np

from core.logger import get_logger
from ocr.engine import run_ocr
from ocr.extractors.driving_licence import extract_driving_licence
from ocr.shared.validators import is_valid_dl, normalize_dl
from preprocessing import preprocess

logger = get_logger(__name__)


def process_driving_license(
    image_input: Union[str, bytes, Path, np.ndarray],
    *,
    use_llm: bool = True,
) -> dict[str, Any]:
    """Process a driving licence image through the OCR pipeline.

    Args:
        image_input: File path, bytes, Path, or numpy BGR array.
        use_llm: Whether to invoke downstream LLM extraction (currently disabled).

    Returns:
        Structured dictionary of extracted DL fields, validation flags, and quality.
    """
    if isinstance(image_input, np.ndarray):
        img = image_input
        warnings = []
    else:
        pre = preprocess(image_input)
        img = pre.image
        warnings = list(pre.warnings)

    ocr_regions = run_ocr(img)

    dl_fields = extract_driving_licence(ocr_regions)
    fields = {k: v for k, v in asdict(dl_fields).items() if v is not None}

    # Verify DL number format
    dl_number = fields.get("dl_number")
    dl_valid = False
    if dl_number:
        dl_valid = is_valid_dl(dl_number)

    llm_payload = _get_llm_payload(ocr_regions, fields, enabled=use_llm)

    return {
        "status": "success",
        "document_type": "driving_license",
        "country": "IND",
        "fields": fields,
        "is_valid_format": dl_valid,
        "quality_warnings": warnings,
        "raw_ocr_count": len(ocr_regions),
        "llm_extraction": llm_payload,
    }


def _get_llm_payload(ocr_regions: list, fields: dict, enabled: bool) -> dict:
    schema = {
        "dl_number": "state code + RTO + serial number",
        "name": "string",
        "relation_name": "father / husband / guardian name",
        "date_of_birth": "DD/MM/YYYY",
        "issue_date": "DD/MM/YYYY",
        "validity_date": "DD/MM/YYYY",
        "class_of_vehicle": "e.g. LMV, MCWG",
        "blood_group": "string",
        "address": "string",
    }
    if not enabled:
        return {
            "status": "disabled",
            "message": "LLM extraction is inactive per architecture specification.",
            "target_schema": schema,
            "prompt_template": "Extract Driving Licence fields from OCR tokens into JSON format.",
            "result": fields,
        }
    try:
        from llm_parser import parse_document_with_llm
        return {
            "status": "success",
            "result": parse_document_with_llm(ocr_regions, "driving_licence"),
            "target_schema": schema,
        }
    except Exception as exc:
        return {"status": "error", "error": str(exc), "result": fields}
