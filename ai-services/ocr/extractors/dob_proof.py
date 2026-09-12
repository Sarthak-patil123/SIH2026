"""Rule-based extractor for DOB Proof documents (Birth Certificates, School Leaving Certificates).

Provides deterministic regex extraction across English, Hindi (Devanagari), and
common bilingual Municipal Corporation formats (MCD, BMC, GHMC, BBMP, etc.).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

from ocr.engine import TextRegion


@dataclass
class DOBProofFields:
    proof_subtype: str = "birth_certificate"
    name: Optional[str] = None
    date_of_birth: Optional[str] = None
    date_of_birth_raw: Optional[str] = None
    gender: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    registration_number: Optional[str] = None
    registration_date: Optional[str] = None
    place_of_birth: Optional[str] = None
    issuing_authority: Optional[str] = None
    issue_date: Optional[str] = None
    raw_lines: list[str] = field(default_factory=list)


def _clean_str(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    cleaned = re.sub(r"^[^\w]+|[^\w]+$", "", val.strip())
    # Remove leading colons, hyphens, slashes
    cleaned = re.sub(r"^[\s:/\-\.]+", "", cleaned).strip()
    return cleaned if len(cleaned) >= 2 else None


def _clean_name(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    # If contains bilingual slash e.g. "मीरा शर्मा / MEERA SHARMA", extract English part or clean both
    if "/" in val:
        parts = [p.strip() for p in val.split("/") if p.strip()]
        # Prefer the Latin name if present
        latin_parts = [p for p in parts if re.search(r"[A-Za-z]{2,}", p)]
        if latin_parts:
            val = latin_parts[-1]
        else:
            val = parts[-1]
    cleaned = re.sub(r"[^A-Za-z\u0900-\u097F\s\.\-']", "", val).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned if len(cleaned) >= 2 else None


def _normalize_date(date_str: str) -> Optional[str]:
    """Convert DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD to ISO format (YYYY-MM-DD)."""
    if not date_str:
        return None
    clean = date_str.strip().replace(".", "/").replace("-", "/")
    parts = clean.split("/")
    if len(parts) == 3:
        p1, p2, p3 = parts[0].strip(), parts[1].strip(), parts[2].strip()
        if len(p1) == 4:  # YYYY/MM/DD
            return f"{p1}-{p2.zfill(2)}-{p3.zfill(2)}"
        if len(p3) == 4:  # DD/MM/YYYY
            return f"{p3}-{p2.zfill(2)}-{p1.zfill(2)}"
    return date_str.strip()


def extract_dob_proof(regions: list[TextRegion]) -> DOBProofFields:
    """Extract structured fields from OCR regions for DOB proof documents."""
    lines = [r.text.strip() for r in regions if r.text and r.text.strip()]
    full_text = " \n ".join(lines)
    result = DOBProofFields(raw_lines=lines)

    # Detect subtype
    lower_text = full_text.lower()
    if any(k in lower_text for k in ("school leaving", "transfer certificate", "matriculation", "marksheet", "mark sheet")):
        result.proof_subtype = "school_leaving_certificate"
    else:
        result.proof_subtype = "birth_certificate"

    # All dates in document
    date_regex = re.compile(r"\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{4}[/.-]\d{1,2}[/.-]\d{1,2})\b")
    all_dates = date_regex.findall(full_text)

    # 1. Date of Birth extraction (specific label matching)
    dob_match = re.search(
        r"(?:जन्म\s*तिथि\s*[\/\-]?\s*Date\s*of\s*Birth|Date\s*of\s*Birth|DOB|D\.O\.B|Born\s*on|जन्म\s*तिथि)[\s\:\-\/]*[\:\-]?\s*([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{4})",
        full_text,
        re.IGNORECASE,
    )
    if dob_match:
        raw_dob = dob_match.group(1).strip()
        result.date_of_birth_raw = raw_dob
        result.date_of_birth = _normalize_date(raw_dob)
    elif all_dates:
        # Fallback to first detected date if in birth certificate
        result.date_of_birth_raw = all_dates[0]
        result.date_of_birth = _normalize_date(all_dates[0])

    # 2. Registration Date
    reg_date_match = re.search(
        r"(?:पंजीकरण\s*की\s*तिथि\s*[\/\-]?\s*Date\s*of\s*Registration|Date\s*of\s*Registration|Registration\s*Date|पंजीकरण\s*की\s*तिथि)[\s\:\-\/]*[\:\-]?\s*([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{4})",
        full_text,
        re.IGNORECASE,
    )
    if reg_date_match:
        raw_reg = reg_date_match.group(1).strip()
        result.registration_date = _normalize_date(raw_reg)
        result.issue_date = result.registration_date
    elif len(all_dates) > 1 and result.date_of_birth_raw != all_dates[1]:
        result.registration_date = _normalize_date(all_dates[1])
        result.issue_date = result.registration_date

    # 3. Registration Number
    reg_no_match = re.search(
        r"(?:पंजीकरण\s*संख्या\s*[\/\-]?\s*Registration\s*No|Registration\s*No|Regn?\s*No|Certificate\s*No|पंजीकरण\s*संख्या)[\s\:\.\-\/]*[\:\-]?\s*([A-Z0-9\/\-]{4,25})",
        full_text,
        re.IGNORECASE,
    )
    if reg_no_match:
        result.registration_number = _clean_str(reg_no_match.group(1))

    # 4. Full Name (Child / Holder)
    name_match = re.search(
        r"(?:पूरा\s*नाम\s*[\/\-]?\s*Full\s*Name|Full\s*Name|Child'?s?\s*Name|Name\s*of\s*Child|पूरा\s*नाम)[\s\:\-\/]*[\:\-]\s*([^\n\r\:\;]{2,60})",
        full_text,
        re.IGNORECASE,
    )
    if name_match:
        candidate = name_match.group(1).strip()
        candidate = re.split(r"(?:जन्म\s*तिथि|Date\s*of\s*Birth|पिता|Father|स्थान|Place)", candidate, flags=re.IGNORECASE)[0]
        result.name = _clean_name(candidate)

    # 5. Gender
    gender_match = re.search(
        r"(?:लिंग\s*[\/\-]?\s*Gender|Gender|Sex|लिंग)[\s\:\-\/]*[\:\-]?\s*([^\n\r\:\;]{2,30})",
        full_text,
        re.IGNORECASE,
    )
    if gender_match:
        g = gender_match.group(1).upper()
        if "महिला" in g or "FEMALE" in g or "GIRL" in g:
            result.gender = "FEMALE"
        elif "पुरुष" in g or "MALE" in g or "BOY" in g:
            result.gender = "MALE"

    # 6. Father's Name
    father_match = re.search(
        r"(?:पिता\s*का\s*नाम\s*[\/\-]?\s*Father'?s?\s*Name|Father'?s?\s*Name|पिता\s*का\s*नाम)[\s\:\-\/]*[\:\-]\s*([^\n\r\:\;]{2,60})",
        full_text,
        re.IGNORECASE,
    )
    if father_match:
        candidate = father_match.group(1).strip()
        candidate = re.split(r"(?:माता|Mother|पंजीकरण|Registration)", candidate, flags=re.IGNORECASE)[0]
        result.father_name = _clean_name(candidate)

    # 7. Mother's Name
    mother_match = re.search(
        r"(?:माता\s*का\s*नाम\s*[\/\-]?\s*Mother'?s?\s*Name|Mother'?s?\s*Name|माता\s*का\s*नाम)[\s\:\-\/]*[\:\-]\s*([^\n\r\:\;]{2,60})",
        full_text,
        re.IGNORECASE,
    )
    if mother_match:
        candidate = mother_match.group(1).strip()
        candidate = re.split(r"(?:पंजीकरण|Registration|हस्ताक्षर|Signature)", candidate, flags=re.IGNORECASE)[0]
        result.mother_name = _clean_name(candidate)

    # 8. Place of Birth
    place_match = re.search(
        r"(?:जन्म\s*स्थान\s*[\/\-]?\s*Place\s*of\s*Birth|Place\s*of\s*Birth|जन्म\s*स्थान)[\s\:\-\/]*[\:\-]\s*([^\n\r\:\;]{2,50})",
        full_text,
        re.IGNORECASE,
    )
    if place_match:
        candidate = place_match.group(1).strip()
        candidate = re.split(r"(?:लिंग|Gender|Sex)", candidate, flags=re.IGNORECASE)[0]
        result.place_of_birth = _clean_name(candidate)

    # 9. Issuing Authority
    if "MUNICIPAL CORPORATION OF DELHI" in full_text.upper() or "MCD" in full_text.upper():
        result.issuing_authority = "MUNICIPAL CORPORATION OF DELHI"
    elif "BRIHANMUMBAI MAHANAGARPALIKA" in full_text.upper() or "BMC" in full_text.upper():
        result.issuing_authority = "BRIHANMUMBAI MUNICIPAL CORPORATION"
    elif "GOVERNMENT OF INDIA" in full_text.upper():
        result.issuing_authority = "GOVERNMENT OF INDIA"

    return result
