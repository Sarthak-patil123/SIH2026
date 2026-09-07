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

    return fields
