"""Visa document processor.

Handles travel visas (MRV-A, MRV-B sticker visas, e-Visas).
Runs preprocessing, PaddleOCR, MRV parsing with checksum verification,
visual field extraction, and prepares LLM extraction.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Union
import numpy as np

from core.logger import get_logger
from ocr.engine import run_ocr
from ocr.mrz.travel_mrz import parse_travel_mrz
from ocr.shared.validator import find_label_value
from preprocessing import preprocess

logger = get_logger(__name__)

_DATE_RE = re.compile(r"\b(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4})\b")

_VISA_NO_LABELS = ["VISA NO", "VISA NUMBER", "CONTROL NO", "DOCUMENT NO"]
_PASSPORT_NO_LABELS = ["PASSPORT NO", "PASSPORT NUMBER", "PPT NO"]
_ENTRIES_LABELS = ["ENTRIES", "NO OF ENTRIES", "NUMBER OF ENTRIES"]
_VISA_TYPE_LABELS = ["VISA TYPE", "TYPE", "CLASS", "CATEGORY"]
_SURNAME_LABELS = ["SURNAME", "NAME", "FAMILY NAME"]
_GIVEN_NAMES_LABELS = ["GIVEN NAMES", "GIVEN NAME", "FIRST NAME"]
_NATIONALITY_LABELS = ["NATIONALITY", "CITIZENSHIP"]
_ISSUE_DATE_LABELS = ["ISSUE DATE", "DATE OF ISSUE", "VALID FROM"]
_EXPIRY_DATE_LABELS = ["EXPIRY DATE", "EXPIRATION DATE", "VALID UNTIL"]
_AUTHORITY_LABELS = ["ISSUED AT", "POST", "AUTHORITY", "EMBASSY", "CONSULATE"]


def process_visa(
    image_input: Union[str, bytes, Path, np.ndarray],
    *,
    use_llm: bool = False,
) -> dict[str, Any]:
    """Process a Visa image through the OCR and MRZ pipeline.

    Args:
        image_input: File path, bytes, Path, or numpy BGR array.
        use_llm: Whether to invoke downstream LLM extraction (currently disabled).

    Returns:
        Structured dictionary of extracted visa fields, MRV data, and quality.
    """
    if isinstance(image_input, np.ndarray):
        img = image_input
        warnings = []
    else:
        pre = preprocess(image_input)
        img = pre.image
        warnings = list(pre.warnings)

    ocr_regions = run_ocr(img)

    fields: dict[str, Any] = {}

    # Try MRV parsing (MRV-A or MRV-B)
    travel_mrz = parse_travel_mrz(ocr_regions)
    mrz_data = None
    if travel_mrz and travel_mrz.document_type == "visa":
        mrz_data = {
            "type": "MRV",
            "issuing_country": travel_mrz.issuing_country,
            "fields": travel_mrz.fields,
            "checks": travel_mrz.checks,
            "errors": travel_mrz.errors,
        }
        for k, v in travel_mrz.fields.items():
            if v:
                fields[k] = v

    # Supplement with visual labels
    if "document_number" not in fields or not fields["document_number"]:
        v_num = find_label_value(ocr_regions, _VISA_NO_LABELS)
        if v_num:
            fields["document_number"] = v_num.strip()

    if "passport_number" not in fields or not fields["passport_number"]:
        p_num = find_label_value(ocr_regions, _PASSPORT_NO_LABELS)
        if p_num:
            fields["passport_number"] = p_num.strip()

    if "surname" not in fields or not fields["surname"]:
        s_name = find_label_value(ocr_regions, _SURNAME_LABELS)
        if s_name:
            fields["surname"] = s_name.strip()

    if "given_names" not in fields or not fields["given_names"]:
        g_name = find_label_value(ocr_regions, _GIVEN_NAMES_LABELS)
        if g_name:
            fields["given_names"] = g_name.strip()

    entries = find_label_value(ocr_regions, _ENTRIES_LABELS)
    if entries:
        fields["entries"] = entries.strip()

    v_type = find_label_value(ocr_regions, _VISA_TYPE_LABELS)
    if v_type:
        fields["visa_type"] = v_type.strip()

    raw_issue = find_label_value(ocr_regions, _ISSUE_DATE_LABELS)
    if raw_issue:
        m = _DATE_RE.search(raw_issue)
        fields["issue_date"] = m.group(1) if m else raw_issue.strip()

    raw_exp = find_label_value(ocr_regions, _EXPIRY_DATE_LABELS)
    if raw_exp:
        m = _DATE_RE.search(raw_exp)
        fields["expiry_date"] = m.group(1) if m else raw_exp.strip()

    auth = find_label_value(ocr_regions, _AUTHORITY_LABELS)
    if auth:
        fields["issuing_post"] = auth.strip()

    llm_payload = _get_llm_payload(ocr_regions, fields, enabled=use_llm)

    return {
        "status": "success",
        "document_type": "visa",
        "fields": fields,
        "mrz": mrz_data,
        "quality_warnings": warnings,
        "raw_ocr_count": len(ocr_regions),
        "llm_extraction": llm_payload,
    }


def _get_llm_payload(ocr_regions: list, fields: dict, enabled: bool) -> dict:
    schema = {
        "visa_number": "string",
        "passport_number": "string",
        "surname": "string",
        "given_names": "string",
        "nationality": "string",
        "visa_type": "string",
        "entries": "M | S | D",
        "issue_date": "YYYY-MM-DD",
        "expiry_date": "YYYY-MM-DD",
        "issuing_post": "string",
    }
    if not enabled:
        return {
            "status": "disabled",
            "message": "LLM extraction is inactive per architecture specification.",
            "target_schema": schema,
            "prompt_template": "Extract Visa sticker fields from OCR tokens into JSON format.",
            "result": fields,
        }
    return {"status": "unimplemented"}
