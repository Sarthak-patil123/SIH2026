"""Date of Birth (DOB) Proof document processor.

Handles Birth Certificates, Secondary School Leaving Certificates (SSLC/10th),
and official birth registration documents.
Accepts an image, runs preprocessing and PaddleOCR, extracts candidate details,
DOB, parents' names, and registration numbers, and prepares LLM extraction.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Union
import numpy as np

from core.logger import get_logger
from ocr.engine import run_ocr
from ocr.shared.validator import find_label_value, find_visual_field, parse_date_comprehensive
from preprocessing import preprocess

logger = get_logger(__name__)

_DATE_RE = re.compile(
    r"\b("
    r"\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}|"
    r"\d{4}[/.\-]\d{1,2}[/.\-]\d{1,2}|"
    r"\d{1,2}[/.\-\s](?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[/.\-\s]\d{2,4}"
    r")\b",
    re.IGNORECASE,
)

_DOB_LABELS = [
    "DATE OF BIRTH", "DOB", "BORN ON", "BIRTH DATE", "DATE OF BIRTH IN WORDS",
    "जन्म तिथि", "जन्म दिनांक",
]
_NAME_LABELS = [
    "NAME OF CHILD", "NAME", "NAME OF STUDENT", "NAME OF CANDIDATE", "FULL NAME",
    "बालक का नाम", "नाम",
]
_FATHER_LABELS = [
    "NAME OF FATHER", "FATHER S NAME", "FATHERS NAME", "FATHER NAME", "पिता का नाम",
]
_MOTHER_LABELS = [
    "NAME OF MOTHER", "MOTHER S NAME", "MOTHERS NAME", "MOTHER NAME", "माता का नाम",
]
_GENDER_LABELS = [
    "SEX", "GENDER", "लिंग",
]
_REG_NO_LABELS = [
    "REGISTRATION NO", "REGISTRATION NUMBER", "CERTIFICATE NO", "CERTIFICATE NUMBER",
    "ROLL NO", "REGN NO", "पंजीकरण संख्या", "क्रमांक",
]
_ISSUE_DATE_LABELS = [
    "DATE OF ISSUE", "ISSUE DATE", "DATE OF REGISTRATION", "REGISTRATION DATE",
    "जारी करने की तिथि", "पंजीकरण दिनांक",
]
_PLACE_OF_BIRTH_LABELS = [
    "PLACE OF BIRTH", "BIRTH PLACE", "HOSPITAL NAME", "जन्म स्थान",
]
_AUTHORITY_LABELS = [
    "ISSUING AUTHORITY", "REGISTRAR", "MUNICIPAL CORPORATION", "GRAM PANCHAYAT",
]


def process_dob_proof(
    image_input: Union[str, bytes, Path, np.ndarray],
    *,
    use_llm: bool = True,
) -> dict[str, Any]:
    """Process a DOB proof document (Birth Certificate / Class X Certificate).

    Args:
        image_input: File path, bytes, Path, or numpy BGR array.
        use_llm: Whether to invoke downstream LLM extraction (currently disabled).

    Returns:
        Structured dictionary of extracted DOB fields, confidence, and quality metrics.
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

    # Extract date of birth
    raw_dob = find_label_value(ocr_regions, _DOB_LABELS)
    if raw_dob:
        fields["date_of_birth"] = parse_date_comprehensive(raw_dob) or raw_dob.strip()
    else:
        # Fallback: look for dates in whole text
        for r in ocr_regions:
            if any(h in r.text.upper() for h in ("DOB", "BIRTH", "BORN")):
                parsed = parse_date_comprehensive(r.text)
                if parsed:
                    fields["date_of_birth"] = parsed
                    break

    # Extract name
    name_val = find_label_value(ocr_regions, _NAME_LABELS)
    if name_val:
        fields["name"] = name_val.strip()

    # Extract father and mother names
    father_val = find_label_value(ocr_regions, _FATHER_LABELS)
    if father_val:
        fields["father_name"] = father_val.strip()

    mother_val = find_label_value(ocr_regions, _MOTHER_LABELS)
    if mother_val:
        fields["mother_name"] = mother_val.strip()

    # Gender
    gender_val = find_label_value(ocr_regions, _GENDER_LABELS)
    if gender_val:
        g_clean = gender_val.strip().upper()
        if "MALE" in g_clean or g_clean == "M" or "पुरुष" in g_clean:
            fields["gender"] = "M"
        elif "FEMALE" in g_clean or g_clean == "F" or "महिला" in g_clean:
            fields["gender"] = "F"
        else:
            fields["gender"] = g_clean

    # Registration / certificate number
    reg_val = find_label_value(ocr_regions, _REG_NO_LABELS)
    if reg_val:
        fields["registration_number"] = reg_val.strip()

    # Date of issue / registration
    doi_val = find_label_value(ocr_regions, _ISSUE_DATE_LABELS)
    if doi_val:
        fields["issue_date"] = parse_date_comprehensive(doi_val) or doi_val.strip()

    # Place of birth
    pob_val = find_label_value(ocr_regions, _PLACE_OF_BIRTH_LABELS)
    if pob_val:
        fields["place_of_birth"] = pob_val.strip()

    # Issuing authority
    auth_val = find_label_value(ocr_regions, _AUTHORITY_LABELS)
    if auth_val:
        fields["issuing_authority"] = auth_val.strip()

    llm_payload = _get_llm_payload(ocr_regions, fields, enabled=use_llm)

    return {
        "status": "success",
        "document_type": "dob_proof",
        "fields": fields,
        "quality_warnings": warnings,
        "raw_ocr_count": len(ocr_regions),
        "llm_extraction": llm_payload,
    }


def _get_llm_payload(ocr_regions: list, fields: dict, enabled: bool) -> dict:
    schema = {
        "document_subtype": "Birth Certificate | 10th Marks Sheet | School Leaving Certificate",
        "name": "string",
        "date_of_birth": "DD/MM/YYYY",
        "date_of_birth_words": "string",
        "father_name": "string",
        "mother_name": "string",
        "registration_number": "string",
        "place_of_birth": "string",
        "issuing_authority": "string",
        "issue_date": "DD/MM/YYYY",
    }
    if not enabled:
        return {
            "status": "disabled",
            "message": "LLM extraction is inactive per architecture specification.",
            "target_schema": schema,
            "prompt_template": "Extract Birth / DOB proof fields from semi-structured certificate tokens.",
            "result": fields,
        }
    try:
        from llm_parser import parse_document_with_llm
        return {
            "status": "success",
            "result": parse_document_with_llm(ocr_regions, "dob_proof"),
            "target_schema": schema,
        }
    except Exception as exc:
        return {"status": "error", "error": str(exc), "result": fields}
