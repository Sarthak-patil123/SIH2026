"""
Extractor for Indian Driving Licences (DL).

Fields: DL number, name, relation (S/D/W of), date of birth, date of issue,
validity date, address, blood group, class of vehicle (COV).

Indian DL layouts vary a great deal by issuing state/RTO and are frequently
bilingual (Hindi/English and regional scripts). Extraction is therefore
label- and format-driven rather than positional.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from ocr.engine import TextRegion
from ocr.shared.validator import (
    find_label_value,
    find_visual_field,
    find_visual_value_near,
    find_visual_value_right,
)
from ocr.shared.validators import normalize_dl

_DATE_RE = re.compile(r"\b(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4})\b")

_BLOOD_GROUP_RE = re.compile(
    r"\b(AB|A|B|O)\s*"
    r"(\+VE|-VE|\+|-|POS(?:ITIVE)?|NEG(?:ATIVE)?)"
    r"(?![A-Z])",
    re.IGNORECASE,
)

_COV_TOKENS = [
    "MCWOG", "MCWG", "MCEX50CC", "MGV", "HGMV", "HMV", "HPMV", "LMV-NT",
    "LMV-TR", "LMV", "TRANS", "TRACTOR", "ERIG", "ROAD ROLLER", "MC", "FVG",
    "PSV", "3WT", "3WNT", "INVCRG",
]

_NAME_LABELS = ["NAME", "HOLDER S NAME", "HOLDERS NAME", "HOLDER NAME"]
_RELATION_LABELS = [
    "SON DAUGHTER WIFE OF",
    "S D W OF",
    "S O",
    "D O",
    "W O",
    "C O",
    "SON OF",
    "DAUGHTER OF",
    "WIFE OF",
    "FATHER",
    "GUARDIAN",
]
_DOB_LABELS = ["DATE OF BIRTH", "DOB", "BIRTH"]
_DOI_LABELS = ["DATE OF ISSUE", "ISSUE DATE", "DOI", "ISSUE"]
_VALIDITY_LABELS = [
    "VALID TILL",
    "VALID UPTO",
    "VALID UNTIL",
    "VALIDITY",
    "DATE OF EXPIRY",
    "EXPIRY",
]
_VALIDITY_NT_LABELS = [
    "VALIDITY NT",
    "VALID TILL NT",
    "NON TRANSPORT",
    "NT",
]
_VALIDITY_TR_LABELS = [
    "VALIDITY TR",
    "VALID TILL TR",
    "TRANSPORT",
    "TR",
]
_BLOOD_GROUP_LABELS = ["BLOOD GROUP", "BG", "BLOOD"]
_COV_LABELS = [
    "CLASS OF VEHICLE",
    "CLASS OF VEHICLES",
    "COV",
    "CL OF VEH",
    "AUTHORISATION TO DRIVE",
    "AUTHORIZATION TO DRIVE",
]
_PRESENT_ADDRESS_LABELS = [
    "PRESENT ADDRESS",
    "CURRENT ADDRESS",
    "TEMPORARY ADDRESS",
    "TEMP ADDRESS",
]
_PERMANENT_ADDRESS_LABELS = ["PERMANENT ADDRESS", "PERM ADDRESS"]
_GENERIC_ADDRESS_LABELS = ["ADDRESS", "ADD", "ADDR"]


@dataclass
class DrivingLicenceFields:
    dl_number: Optional[str] = None
    name: Optional[str] = None
    date_of_birth: Optional[str] = None
    issue_date: Optional[str] = None
    validity_date: Optional[str] = None
    address: Optional[str] = None
    relation_name: Optional[str] = None
    blood_group: Optional[str] = None
    class_of_vehicle: Optional[str] = None
    validity_date_transport: Optional[str] = None


def _find_dl_number(regions: list[TextRegion]) -> Optional[str]:
    for region in regions:
        m = re.search(
            r"(?:LICEN[CS]E\s*NO|DL\s*NO|DL)[\s.:\-]*([A-Z]{2}[ -]?[0-9]{2}[ -]?[0-9]{4}[ -]?[0-9]{5,8})",
            region.text,
            re.IGNORECASE,
        )
        if m:
            return m.group(1).strip().replace(" ", "")
        dl = normalize_dl(region.text)
        if dl:
            return dl

    ordered = sorted(
        regions,
        key=lambda r: (
            round(min(p[1] for p in r.bbox) / 20),
            min(p[0] for p in r.bbox),
        ),
    )
    for i, region in enumerate(ordered):
        top = min(p[1] for p in region.bbox)
        bottom = max(p[1] for p in region.bbox)
        height = max(bottom - top, 1)
        combined = region.text
        for nxt in ordered[i + 1 : i + 4]:
            n_top = min(p[1] for p in nxt.bbox)
            n_bottom = max(p[1] for p in nxt.bbox)
            overlap = min(bottom, n_bottom) - max(top, n_top)
            if overlap < height * 0.4:
                continue
            combined += " " + nxt.text
            dl = normalize_dl(combined)
            if dl:
                return dl
    return None


def _first_date(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    m = _DATE_RE.search(text)
    return m.group(1) if m else None


def _labelled_date(
    regions: list[TextRegion],
    labels: list[str],
    *,
    label_region: Optional[TextRegion] = None,
) -> Optional[str]:
    # 1. Inline check on any region containing label + date
    for r in regions:
        for lbl in labels:
            if re.search(rf"\b{re.escape(lbl)}\b", r.text, re.IGNORECASE):
                dt = _first_date(r.text)
                if dt:
                    return dt

    if label_region is None:
        label_region = find_visual_field(regions, labels)
    if label_region is None:
        return None

    self_date = _first_date(label_region.text)
    if self_date:
        return self_date

    value = find_visual_value_right(regions, label_region) or find_visual_value_near(
        regions, label_region
    )
    if value is not None:
        return _first_date(value.text)
    return None


def _find_validity_date(regions: list[TextRegion]) -> tuple[Optional[str], Optional[str]]:
    nt_label = find_visual_field(regions, _VALIDITY_NT_LABELS)
    tr_label = find_visual_field(regions, _VALIDITY_TR_LABELS)
    generic_label = find_visual_field(regions, _VALIDITY_LABELS)

    transport = _labelled_date(regions, _VALIDITY_TR_LABELS, label_region=tr_label)

    primary = None
    if nt_label is not None:
        primary = _labelled_date(regions, _VALIDITY_NT_LABELS, label_region=nt_label)
    if primary is None and generic_label is not None and generic_label is not tr_label:
        primary = _labelled_date(regions, _VALIDITY_LABELS, label_region=generic_label)

    if primary is None and transport is not None:
        primary = transport

    # Fallback: check for "Validity : <DATE>" inline
    if primary is None:
        primary = _labelled_date(regions, _VALIDITY_LABELS)

    return primary, transport


_ALL_LABEL_WORDS = frozenset(
    word
    for label_set in (
        _NAME_LABELS,
        _RELATION_LABELS,
        _DOB_LABELS,
        _DOI_LABELS,
        _VALIDITY_LABELS,
        _VALIDITY_NT_LABELS,
        _VALIDITY_TR_LABELS,
        _BLOOD_GROUP_LABELS,
        _COV_LABELS,
        _PRESENT_ADDRESS_LABELS,
        _PERMANENT_ADDRESS_LABELS,
        _GENERIC_ADDRESS_LABELS,
    )
    for word in label_set
)


def _is_known_label(text: str) -> bool:
    norm = re.sub(r"[^A-Z0-9]+", " ", text.upper()).strip()
    return norm in _ALL_LABEL_WORDS


def _looks_like_value(text: str) -> bool:
    cleaned = text.strip()
    return len(re.sub(r"[^A-Za-z]", "", cleaned)) >= 2


def _find_name(regions: list[TextRegion]) -> Optional[str]:
    # 1. Inline check: Name : <Value>
    for r in regions:
        m = re.search(r"\bNAME\s*[:\-]?\s*([A-Z\s]{3,35})\b", r.text, re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            if _looks_like_value(val) and not _is_known_label(val):
                return val

    value = find_label_value(regions, _NAME_LABELS)
    if value and _looks_like_value(value) and not _is_known_label(value):
        return value.strip()
    return None


def _find_relation(regions: list[TextRegion]) -> Optional[str]:
    # 1. Inline check: S/W/D : <Value>
    for r in regions:
        m = re.search(r"\b(?:S/W/D|S/D/W|S/O|D/O|W/O|FATHER)\s*[:\-]?\s*([A-Z\s]{3,35})\b", r.text, re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            if _looks_like_value(val) and not _is_known_label(val):
                return val

    value = find_label_value(regions, _RELATION_LABELS)
    if value and _looks_like_value(value) and not _is_known_label(value):
        return value.strip()
    return None


def _normalise_blood_group(text: str) -> Optional[str]:
    upper = text.upper()
    if re.search(r"BLOOD|GROUP|\bBG\b", upper):
        return None
    m = _BLOOD_GROUP_RE.search(upper)
    if not m:
        return None
    group = m.group(1)
    suffix = m.group(2)
    sign = "+" if suffix[0] in "+P" or suffix.upper().startswith("POS") else "-"
    return f"{group}{sign}"


def _find_blood_group(regions: list[TextRegion]) -> Optional[str]:
    label = find_visual_field(regions, _BLOOD_GROUP_LABELS)
    if label is not None:
        for candidate_text in (
            getattr(find_visual_value_right(regions, label), "text", "") or "",
            getattr(find_visual_value_near(regions, label), "text", "") or "",
            label.text,
        ):
            bg = _normalise_blood_group(candidate_text)
            if bg:
                return bg
    return None


def _find_class_of_vehicle(regions: list[TextRegion]) -> Optional[str]:
    label = find_visual_field(regions, _COV_LABELS)
    if label is not None:
        value = find_visual_value_right(regions, label) or find_visual_value_near(
            regions, label
        )
        if value is not None:
            tokens = _extract_cov_tokens(value.text)
            if tokens:
                return ", ".join(tokens)

    found: list[str] = []
    for region in regions:
        for tok in _extract_cov_tokens(region.text):
            if tok not in found:
                found.append(tok)
    return ", ".join(found) if found else None


def _extract_cov_tokens(text: str) -> list[str]:
    upper = re.sub(r"\s+", " ", text.upper())
    found: list[str] = []
    for tok in _COV_TOKENS:
        if re.search(rf"(?<![A-Z0-9-]){re.escape(tok)}(?![A-Z0-9])", upper):
            if not any(tok in existing for existing in found):
                found.append(tok)
    return found


def _collect_address_block(
    regions: list[TextRegion], label: TextRegion
) -> Optional[str]:
    label_bottom = max(p[1] for p in label.bbox)
    label_top = min(p[1] for p in label.bbox)
    label_left = min(p[0] for p in label.bbox)

    lines: list[tuple[int, int, str]] = []

    inline = find_visual_value_right(regions, label)
    if inline is not None and not _is_other_label(inline.text):
        lines.append((label_top, min(p[0] for p in inline.bbox), inline.text.strip()))

    candidates: list[tuple[int, int, str]] = []
    for region in regions:
        if region is label or region is inline:
            continue
        top = min(p[1] for p in region.bbox)
        left = min(p[0] for p in region.bbox)
        if top <= label_bottom - 5 or top - label_bottom > 220:
            continue
        if abs(left - label_left) > 320:
            continue
        text = region.text.strip()
        if len(text) < 2:
            continue
        candidates.append((top, left, text))

    candidates.sort(key=lambda x: (x[0], x[1]))
    stop_y: Optional[int] = None
    for top, _left, text in candidates:
        if _is_other_label(text):
            stop_y = top
            break
    for top, left, text in candidates:
        if stop_y is not None and top >= stop_y:
            continue
        lines.append((top, left, text))

    if not lines:
        return None

    lines.sort(key=lambda x: (x[0], x[1]))
    seen: set[str] = set()
    ordered: list[str] = []
    for _, _, text in lines:
        if text not in seen:
            seen.add(text)
            ordered.append(text)
    return ", ".join(ordered[:6])


_OTHER_LABEL_HINTS = [
    "DL NO",
    "LICENCE NO",
    "LICENSE NO",
    "NAME",
    "DATE OF BIRTH",
    "DOB",
    "DATE OF ISSUE",
    "VALID",
    "VALIDITY",
    "BLOOD GROUP",
    "CLASS OF VEHICLE",
    "COV",
    "SIGNATURE",
    "ISSUING AUTHORITY",
    "AUTHORITY",
]


def _is_other_label(text: str) -> bool:
    upper = re.sub(r"[^A-Z0-9]+", " ", text.upper()).strip()
    padded = f" {upper} "
    return any(f" {hint} " in padded for hint in _OTHER_LABEL_HINTS)


def _find_address(regions: list[TextRegion]) -> Optional[str]:
    for label_set in (
        _PRESENT_ADDRESS_LABELS,
        _PERMANENT_ADDRESS_LABELS,
        _GENERIC_ADDRESS_LABELS,
    ):
        label = find_visual_field(regions, label_set)
        if label is None:
            continue
        block = _collect_address_block(regions, label)
        if block:
            return block
    return None


def extract_driving_licence(regions: list[TextRegion]) -> DrivingLicenceFields:
    fields = DrivingLicenceFields()
    fields.dl_number = _find_dl_number(regions)
    fields.name = _find_name(regions)
    fields.relation_name = _find_relation(regions)
    fields.date_of_birth = _labelled_date(regions, _DOB_LABELS)
    fields.issue_date = _labelled_date(regions, _DOI_LABELS)
    primary_validity, transport_validity = _find_validity_date(regions)
    fields.validity_date = primary_validity
    fields.validity_date_transport = transport_validity
    fields.blood_group = _find_blood_group(regions)
    fields.class_of_vehicle = _find_class_of_vehicle(regions)
    fields.address = _find_address(regions)
    return fields
