"""Visual field extractor for Passport biodata page.

Extracts fields directly visible on the page (Place of Birth, Date of Issue, Place of Issue,
Passport Number, Surname, Given Names, etc.) using label-value matching.
Works in combination with MRZ extraction.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from ocr.engine import TextRegion
from ocr.shared.validator import find_label_value, find_visual_field

_DATE_RE = re.compile(r"\b(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4})\b")

_PASSPORT_NO_LABELS = [
    "PASSPORT NO", "PASSPORT NUMBER", "PASSEPORT NO", "DOCUMENT NO",
]
_SURNAME_LABELS = [
    "SURNAME", "FAMILY NAME", "NOM", "APELLIDOS",
]
_GIVEN_NAMES_LABELS = [
    "GIVEN NAMES", "GIVEN NAME", "PRENOMS", "NOMBRES", "FORENAMES",
]
_NATIONALITY_LABELS = [
    "NATIONALITY", "NATIONALITE", "CITIZENSHIP",
]
_DOB_LABELS = [
    "DATE OF BIRTH", "BIRTH DATE", "DOB", "DATE DE NAISSANCE",
]
_POB_LABELS = [
    "PLACE OF BIRTH", "LIEU DE NAISSANCE", "BIRTH PLACE",
]
_SEX_LABELS = [
    "SEX", "SEXE", "GENDER",
]
_DOI_LABELS = [
    "DATE OF ISSUE", "ISSUE DATE", "DATE DE DELIVRANCE",
]
_POI_LABELS = [
    "PLACE OF ISSUE", "LIEU DE DELIVRANCE", "ISSUING AUTHORITY", "AUTHORITY",
]
_EXPIRY_LABELS = [
    "DATE OF EXPIRY", "EXPIRY DATE", "DATE D EXPIRATION", "VALID UNTIL",
]


@dataclass
class PassportVisualFields:
    passport_number: Optional[str] = None
    surname: Optional[str] = None
    given_names: Optional[str] = None
    nationality: Optional[str] = None
    date_of_birth: Optional[str] = None
    place_of_birth: Optional[str] = None
    sex: Optional[str] = None
    date_of_issue: Optional[str] = None
    place_of_issue: Optional[str] = None
    expiry_date: Optional[str] = None


def extract_passport(regions: list[TextRegion]) -> PassportVisualFields:
    """Extract visual fields from a passport biodata page."""
    fields = PassportVisualFields()

    fields.passport_number = find_label_value(regions, _PASSPORT_NO_LABELS)
    fields.surname = find_label_value(regions, _SURNAME_LABELS)
    fields.given_names = find_label_value(regions, _GIVEN_NAMES_LABELS)
    fields.nationality = find_label_value(regions, _NATIONALITY_LABELS)
    fields.place_of_birth = find_label_value(regions, _POB_LABELS)
    fields.place_of_issue = find_label_value(regions, _POI_LABELS)

    # Dates
    raw_dob = find_label_value(regions, _DOB_LABELS)
    if raw_dob:
        m = _DATE_RE.search(raw_dob)
        fields.date_of_birth = m.group(1) if m else raw_dob

    raw_doi = find_label_value(regions, _DOI_LABELS)
    if raw_doi:
        m = _DATE_RE.search(raw_doi)
        fields.date_of_issue = m.group(1) if m else raw_doi

    raw_exp = find_label_value(regions, _EXPIRY_LABELS)
    if raw_exp:
        m = _DATE_RE.search(raw_exp)
        fields.expiry_date = m.group(1) if m else raw_exp

    raw_sex = find_label_value(regions, _SEX_LABELS)
    if raw_sex:
        s = raw_sex.strip().upper()
        if "M" in s and "F" not in s:
            fields.sex = "M"
        elif "F" in s:
            fields.sex = "F"
        elif "X" in s:
            fields.sex = "X"

    # --- Semantic / Positional Fallbacks for cropped or non-labelled biodata pages ---
    from datetime import date as dt_date
    today = dt_date.today()

    # 1. Dates fallback
    if not (fields.date_of_birth and fields.date_of_issue and fields.expiry_date):
        found_dates: list[tuple[dt_date, str]] = []
        for r in regions:
            txt = r.text.strip()
            # Exclude MRZ lines
            if "<" in txt or len(txt) > 30:
                continue
            for m in _DATE_RE.finditer(txt):
                raw_d = m.group(1)
                norm_d = raw_d.replace(".", "/").replace("-", "/")
                parts = norm_d.split("/")
                if len(parts) == 3:
                    try:
                        d, m_val, y = int(parts[0]), int(parts[1]), int(parts[2])
                        if y < 100:
                            y += 2000 if y < 50 else 1900
                        parsed_dt = dt_date(y, m_val, d)
                        found_dates.append((parsed_dt, raw_d))
                    except Exception:
                        pass
        found_dates.sort(key=lambda x: x[0])
        for p_dt, s_val in found_dates:
            if p_dt < dt_date(today.year - 15, 1, 1) and not fields.date_of_birth:
                fields.date_of_birth = s_val
            elif p_dt <= today and not fields.date_of_issue:
                fields.date_of_issue = s_val
            elif p_dt > today and not fields.expiry_date:
                fields.expiry_date = s_val

    # 2. Passport number fallback
    if not fields.passport_number:
        for r in regions:
            txt = r.text.strip().replace(" ", "")
            if "<" in txt or len(txt) > 12:
                continue
            if re.fullmatch(r"[A-Z]{1,2}[0-9]{6,8}", txt):
                fields.passport_number = txt
                break

    _KNOWN_CITIES = {
        "DELHI", "MUMBAI", "CHENNAI", "KOLKATA", "COIMBATORE", "BANGALORE", "BENGALURU",
        "HYDERABAD", "CHANDIGARH", "AHMEDABAD", "PUNE", "LUCKNOW", "AMRITSAR", "BHOPAL",
        "BHUBANESWAR", "COCHIN", "KOCHI", "DEHRADUN", "GOA", "GUWAHATI", "JAIPUR",
        "JALANDHAR", "KOZHIKODE", "MADURAI", "MALAPPURAM", "NAGPUR", "PATNA", "RAIPUR",
        "RANCHI", "SHIMLA", "SRINAGAR", "SURAT", "THIRUVANANTHAPURAM", "TIRUCHIRAPPALLI",
        "VIJAYAWADA", "VISAKHAPATNAM", "LONDON", "PARIS", "BERLIN", "NEW YORK", "TORONTO",
    }

    # Find y coordinates for reference anchors
    dob_y: float | None = None
    doi_y: float | None = None
    pn_y: float | None = None

    for r in regions:
        t = r.text.strip()
        y_c = sum(p[1] for p in r.bbox) / 4.0 if r.bbox else 0.0
        if fields.date_of_birth and fields.date_of_birth in t:
            dob_y = y_c
        if fields.date_of_issue and fields.date_of_issue in t:
            doi_y = y_c
        if fields.passport_number and fields.passport_number in t:
            pn_y = y_c

    # 3. Place of birth & Place of issue fallback
    for r in regions:
        txt = r.text.strip()
        if "<" in txt or len(txt) > 30:
            continue
        y_c = sum(p[1] for p in r.bbox) / 4.0 if r.bbox else 0.0

        # POB often has comma e.g. "DELHI,DELHI" or "CITY, STATE"
        if not fields.place_of_birth and "," in txt and not re.search(r"\d", txt) and len(txt) >= 4:
            fields.place_of_birth = txt
        # POI: matches known city list or sits between DOB and DOI
        if not fields.place_of_issue and not re.search(r"\d", txt) and txt.isupper():
            if txt in _KNOWN_CITIES:
                fields.place_of_issue = txt
            elif dob_y is not None and doi_y is not None and dob_y < y_c < doi_y:
                if txt != fields.place_of_birth and len(txt) >= 4:
                    fields.place_of_issue = txt

    # 4. Names fallback (uppercase words strictly between passport number / top and DOB)
    if not (fields.surname and fields.given_names):
        name_candidates: list[str] = []
        for r in regions:
            txt = r.text.strip()
            if "<" in txt or re.search(r"\d", txt) or len(txt) < 3 or len(txt) > 30:
                continue
            y_c = sum(p[1] for p in r.bbox) / 4.0 if r.bbox else 0.0
            # Must be above DOB
            if dob_y is not None and y_c >= dob_y:
                continue
            # Must be below passport number if pn_y is known
            if pn_y is not None and y_c <= pn_y:
                continue
            if r.confidence < 0.85:
                continue
            if txt.isupper() and txt not in ("PASSPORT", "REPUBLIC", "UNION", "INDIA", "OFFICIAL", "GOVERNMENT", "NATIONALITY"):
                if txt not in (fields.place_of_birth, fields.place_of_issue):
                    name_candidates.append(txt)

        if len(name_candidates) >= 2:
            if not fields.surname:
                fields.surname = name_candidates[0]
            if not fields.given_names:
                fields.given_names = " ".join(name_candidates[1:])
        elif len(name_candidates) == 1 and not fields.surname:
            fields.surname = name_candidates[0]

    return fields
