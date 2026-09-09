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
from ocr.shared.validator import find_label_value, parse_date_comprehensive
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

_VISA_NO_LABELS = [
    "ETA NUMBER", "ETA NO", "APPLICATION ID", "APPLICATION NO",
    "VISA NO", "VISA NUMBER", "CONTROL NO", "DOCUMENT NO", "REGISTRATION NO", "VISA NO."
]
_PASSPORT_NO_LABELS = [
    "PASSPORT NUMBER", "PASSPORT NO", "PASSPORT NO.", "PPT NO", "PASSPORT / TRAVEL DOC",
    "PASSPORT", "TRAVEL DOCUMENT"
]
_ENTRIES_LABELS = [
    "NUMBER OF ENTRIES", "NO OF ENTRIES", "NO. OF ENTRIES", "ENTRIES PERMITTED", "ENTRIES"
]
_VISA_TYPE_LABELS = [
    "ETA FOR", "VISA TYPE", "TYPE OF VISA", "TYPE", "CLASS", "CATEGORY", "VISA CLASS", "SUBCLASS"
]
_SURNAME_LABELS = [
    "RNAME AND GIVEN NAME", "SURNAME AND GIVEN NAME", "SURNAME", "NAME OF HOLDER", "FAMILY NAME", "HOLDER S NAME", "HOLDER NAME", "FULL NAME"
]
_GIVEN_NAMES_LABELS = [
    "GIVEN NAMES", "GIVEN NAME", "FIRST NAME", "FORENAMES", "PRENOMS"
]
_NATIONALITY_LABELS = [
    "NATIONALITY", "CITIZENSHIP", "COUNTRY OF NATIONALITY"
]
_DOB_LABELS = [
    "DATE OF BIRTH", "BIRTH DATE", "DOB"
]
_GENDER_LABELS = [
    "GENDER", "SEX"
]
_ISSUE_DATE_LABELS = [
    "ETA ISSUE DATE", "ISSUE DATE", "DATE OF ISSUE", "VALID FROM", "ISSUED ON",
    "DATE OF SSUE", "OF SSUE"
]
_EXPIRY_DATE_LABELS = [
    "FIRST ENTRY MUST BE ON OR BEFORE", "E-VISA EXPIRY DATE", "EXPIRY DATE",
    "DATE OF EXPIRY", "DATE OKEXPIRY", "EXPIRATION DATE", "VALID UNTIL", "EXPIRES ON"
]
_AUTHORITY_LABELS = [
    "ISSUING AUTHORITY", "ISSUED AT", "POST", "AUTHORITY", "EMBASSY", "CONSULATE", "BUREAU OF IMMIGRATION"
]


def process_visa(
    image_input: Union[str, bytes, Path, np.ndarray],
    *,
    use_llm: bool = True,
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

    # 1. Try MRV parsing (MRV-A or MRV-B)
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

    # 2. Document / ETA Number
    if "document_number" not in fields or not fields["document_number"]:
        v_num = find_label_value(ocr_regions, _VISA_NO_LABELS)
        if v_num and v_num.upper().strip() not in ("APPLICATION STATUS", "GRANTED", "REJECTED", "STATUS", "NUMBER", "NO"):
            fields["document_number"] = v_num.strip()
        else:
            for r in ocr_regions:
                m_eta = re.search(r"\bETA\s*(?:Number|No)?\s*[:\-—]?\s*([A-Z0-9]{6,16})\b", r.text, re.I)
                if m_eta and m_eta.group(1).upper() not in ("NUMBER", "NO", "APPLICATION"):
                    fields["document_number"] = m_eta.group(1)
                    break
                m_app = re.search(r"\b(?:Application\s*ID|App\s*ID)\s*[:\-—]?\s*([A-Z0-9]{8,16})\b", r.text, re.I)
                if m_app and m_app.group(1).upper() not in ("STATUS", "APPLICATION"):
                    fields["document_number"] = m_app.group(1)
                    break

    if fields.get("document_number"):
        if fields["document_number"].upper().strip() in ("STATUS", "APPLICATION STATUS", "GRANTED", "REJECTED", "APPLICATION", "NO", "NUMBER"):
            fields.pop("document_number", None)

    # 3. Passport Number
    if "passport_number" not in fields or not fields["passport_number"]:
        p_num = find_label_value(ocr_regions, _PASSPORT_NO_LABELS)
        if p_num:
            p_clean = re.sub(r"[^A-Z0-9]", "", p_num.upper())
            fields["passport_number"] = p_clean if 5 <= len(p_clean) <= 12 else p_num.strip()

    if fields.get("passport_number"):
        p = fields["passport_number"].upper()
        if any(w in p for w in ("REGISTRATION", "REQUIRED", "NUMBER", "PASSPORT", "SPECIAL", "TOURIST", "VISA")) or not any(ch.isdigit() for ch in p):
            fields.pop("passport_number", None)

    # 4. Names
    if "surname" not in fields or not fields["surname"]:
        s_name = find_label_value(ocr_regions, _SURNAME_LABELS)
        if s_name:
            fields["surname"] = s_name.strip()

    if "given_names" not in fields or not fields["given_names"]:
        g_name = find_label_value(ocr_regions, _GIVEN_NAMES_LABELS)
        if g_name:
            fields["given_names"] = g_name.strip()

    # 5. Nationality
    if "nationality" not in fields or not fields["nationality"]:
        nat = find_label_value(ocr_regions, _NATIONALITY_LABELS)
        if nat:
            fields["nationality"] = nat.strip()

    # 6. Date of Birth & Gender
    if "date_of_birth" not in fields or not fields["date_of_birth"]:
        dob = find_label_value(ocr_regions, _DOB_LABELS)
        if dob:
            dob_parsed = parse_date_comprehensive(dob)
            if dob_parsed:
                fields["date_of_birth"] = dob_parsed

    if "gender" not in fields or not fields["gender"]:
        g = find_label_value(ocr_regions, _GENDER_LABELS)
        if g:
            g_clean = g.strip().upper()
            if g_clean in ("MALE", "M"):
                fields["gender"] = "M"
            elif g_clean in ("FEMALE", "F"):
                fields["gender"] = "F"
            else:
                fields["gender"] = g_clean

    # 7. Entries & Visa Type
    entries = find_label_value(ocr_regions, _ENTRIES_LABELS)
    if entries:
        fields["entries"] = entries.strip()
    else:
        for r in ocr_regions:
            u = r.text.upper().strip()
            if u in ("MULTIPLE", "SINGLE", "DOUBLE", "TRIPLE"):
                fields["entries"] = u.capitalize()
                break

    v_type = find_label_value(ocr_regions, _VISA_TYPE_LABELS)
    if v_type:
        fields["visa_type"] = v_type.strip()
    else:
        for r in ocr_regions:
            m_v = re.search(r"(e-Tourist Visa|Tourist Visa|Business Visa|Medical Visa|Conference Visa|Student Visa|Transit Visa)", r.text, re.I)
            if m_v:
                fields["visa_type"] = m_v.group(1).strip()
                break
        if not fields.get("visa_type"):
            for r in ocr_regions:
                u = r.text.upper().strip()
                if "TOURIST" in u or u == "T":
                    fields["visa_type"] = "Tourist"
                    break
                elif "BUSINESS" in u:
                    fields["visa_type"] = "Business"
                    break

    # 8. Issue & Expiry Dates
    raw_issue = find_label_value(ocr_regions, _ISSUE_DATE_LABELS)
    if raw_issue:
        fields["issue_date"] = parse_date_comprehensive(raw_issue) or raw_issue.strip()

    raw_exp = find_label_value(ocr_regions, _EXPIRY_DATE_LABELS)
    if raw_exp:
        fields["expiry_date"] = parse_date_comprehensive(raw_exp) or raw_exp.strip()

    # Date fallback: if dates missing, collect all valid dates from regions
    if not fields.get("issue_date") or not fields.get("expiry_date"):
        found_dates = []
        for r in ocr_regions:
            if any(w in r.text.upper() for w in ("1949", "CONVENTION", "HTTP", "WWW", "COVID", "TEL", "HOTLINE")):
                continue
            d = parse_date_comprehensive(r.text)
            if d and d not in found_dates:
                found_dates.append(d)
        found_dates.sort()
        if len(found_dates) >= 2:
            if not fields.get("issue_date"):
                fields["issue_date"] = found_dates[0]
            if not fields.get("expiry_date"):
                fields["expiry_date"] = found_dates[-1]
        elif len(found_dates) == 1:
            if not fields.get("issue_date"):
                fields["issue_date"] = found_dates[0]

    # 9. Issuing authority / Country
    auth = find_label_value(ocr_regions, _AUTHORITY_LABELS)
    if auth:
        fields["issuing_post"] = auth.strip()
    else:
        for r in ocr_regions:
            if "BUREAU OF IMMIGRATION" in r.text.upper():
                fields["issuing_post"] = "Bureau of Immigration, India"
                break
            if "REPUBLIC OF INDIA" in r.text.upper() or "GOVERNMENT OF INDIA" in r.text.upper():
                fields["issuing_post"] = fields.get("issuing_post") or "Government of India"

    country = None
    if travel_mrz and travel_mrz.issuing_country:
        country = travel_mrz.issuing_country
    else:
        all_text = " ".join(r.text.upper() for r in ocr_regions)
        if "INDIA" in all_text:
            country = "IND"
        elif "DANMARK" in all_text or "DENMARK" in all_text:
            country = "DNK"
        elif "PHILIPPINES" in all_text:
            country = "PHL"

    llm_payload = _get_llm_payload(ocr_regions, fields, enabled=use_llm)

    return {
        "status": "success",
        "document_type": "visa",
        "country": country,
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
    try:
        from llm_parser import parse_document_with_llm
        return {
            "status": "success",
            "result": parse_document_with_llm(ocr_regions, "visa"),
            "target_schema": schema,
        }
    except Exception as exc:
        return {"status": "error", "error": str(exc), "result": fields}
