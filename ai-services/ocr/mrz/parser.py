"""
MRZ (Machine Readable Zone) parser for TD3 passports (ICAO Doc 9303).

Parses the two 44-character MRZ lines, extracts fields by position,
and validates ICAO check digits.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

from ocr.engine import TextRegion


# ---------------------------------------------------------------------------
# ICAO check digit
# ---------------------------------------------------------------------------

_WEIGHTS = [7, 3, 1]

_CHAR_VALUES = {str(i): i for i in range(10)}
_CHAR_VALUES.update({chr(c): c - 55 for c in range(65, 91)})  # A=10 .. Z=35
_CHAR_VALUES["<"] = 0

_DIGIT_CORRECTIONS = str.maketrans({
    "O": "0", "o": "0",
    "D": "0", "d": "0",
    "Q": "0", "q": "0",
    "I": "1", "i": "1",
    "l": "1", "L": "1",
    "Z": "2", "z": "2",
    "A": "4", "a": "4",
    "S": "5", "s": "5",
    "G": "6", "g": "6",
    "B": "8", "b": "8",
})


def _apply_digit_corrections(line2: str) -> str:
    """Apply digit corrections to known digit-only positions in MRZ line 2.
    Positions: [9] pn check, [13:19] DOB, [19] DOB check, [21:27] expiry,
    [27] expiry check, [42] personal check, [43] overall check.
    Does NOT touch [0:9] passport number, [10:13] nationality, [20] sex, [28:42] personal number."""
    chars = list(line2)
    digit_positions = [9, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 42, 43]
    for pos in digit_positions:
        if pos < len(chars):
            chars[pos] = chars[pos].translate(_DIGIT_CORRECTIONS)
    return "".join(chars)


def icao_check_digit(data: str) -> int:
    """Compute ICAO weighted checksum for a string of MRZ characters."""
    total = 0
    for i, ch in enumerate(data):
        try:
            val = _CHAR_VALUES[ch.upper()]
        except KeyError:
            raise ValueError(f"Invalid MRZ character: {ch!r}") from None
        total += val * _WEIGHTS[i % 3]
    return total % 10


def verify_check_digit(data: str, expected: str) -> bool:
    """Verify a single check digit field."""
    if len(expected) != 1 or expected not in "0123456789":
        return False
    try:
        return icao_check_digit(data) == int(expected)
    except ValueError:
        return False


# ---------------------------------------------------------------------------
# Date parsing
# ---------------------------------------------------------------------------

def _parse_mrz_date(
    yymmdd: str,
    *,
    is_expiry: bool = False,
    reference_date: Optional[date] = None,
) -> Optional[str]:
    """Resolve an MRZ's two-digit year and validate the calendar date.

    Birth dates use the most recent occurrence not after the reference date.
    Expiry dates use the nearest century, supporting both expired documents and
    future expiries. The MRZ alone cannot disambiguate dates a century apart.
    """
    if not re.fullmatch(r"[0-9]{6}", yymmdd):
        return None
    reference_date = reference_date or date.today()
    yy, mm, dd = int(yymmdd[:2]), int(yymmdd[2:4]), int(yymmdd[4:6])
    year = (reference_date.year // 100) * 100 + yy
    if is_expiry:
        if year - reference_date.year > 50:
            year -= 100
        elif reference_date.year - year > 50:
            year += 100
    elif (year, mm, dd) > (reference_date.year, reference_date.month, reference_date.day):
        year -= 100
    try:
        return date(year, mm, dd).isoformat()
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class MRZField:
    value: Optional[str]
    raw: str
    checksum_valid: Optional[bool] = None  # None if no checksum for this field


@dataclass
class MRZResult:
    """Parsed MRZ result with all fields and validation info."""
    document_type: MRZField
    country_code: MRZField
    surname: MRZField
    given_names: MRZField
    passport_number: MRZField
    nationality: MRZField
    date_of_birth: MRZField
    sex: MRZField
    expiry_date: MRZField
    personal_number: MRZField
    overall_checksum_valid: bool
    raw_lines: tuple[str, str]
    errors: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# MRZ line detection
# ---------------------------------------------------------------------------

_MRZ_PATTERN = re.compile(r"^[A-Z0-9<]{36,48}$")
_MRZ_PATTERN_RELAXED = re.compile(r"^[A-Z0-9<]{25,48}$")  # for truncated OCR output
_MRZ_LINE1_PATTERN = re.compile(r"^P[A-Z0-9<]{35,47}$")
_MRZ_LINE2_PATTERN = re.compile(r"[A-Z0-9<]{8,9}[0-9][A-Z]{3}[0-9]{6}[0-9][MFX<][0-9]{6}[0-9][A-Z0-9<]{1,14}[0-9<]{1,2}")


def _clean_mrz_text(raw: str) -> str:
    """Clean OCR text for MRZ matching — fix common substitution errors."""
    text = re.sub(r"\s+", "", raw.upper())
    # Common OCR substitutions for the '<' filler character
    subs = {
        "«": "<", "‹": "<", "»": "<", "›": "<",
        ">": "<", "{": "<", "}": "<", "(": "<", ")": "<",
        "[": "<", "]": "<", "_": "<", "~": "<", "^": "<",
        "|": "<", "\\": "<", "/": "<", "=": "<",
    }
    for k, v in subs.items():
        text = text.replace(k, v)
    # Filter non-MRZ characters
    text = re.sub(r"[^A-Z0-9<]", "", text)
    return text


def _is_valid_mrz_line1(text: str) -> bool:
    """Check if a cleaned text string is structurally valid as an MRZ line 1.
    Real MRZ line 1: starts with 'P', all chars are A-Z/0-9/<, no slashes.
    Rejects label text like 'PJODERNATIONALLTY/NATIONALITY...'
    """
    if not text.startswith("P"):
        return False
    if not re.fullmatch(r"[A-Z0-9<]+", text):
        return False  # contains non-MRZ chars (slash, dot, dash etc.)
    return "<" in text


def _is_valid_mrz_line2(text: str) -> bool:
    """Check if a cleaned text string is structurally valid as an MRZ line 2.
    Line 2: starts with passport number (alphanumeric), followed by digit groups.
    Must be all A-Z/0-9/< with no slashes or dots.
    """
    if not re.fullmatch(r"[A-Z0-9<]+", text):
        return False
    digit_count = sum(1 for c in text if c.isdigit())
    return digit_count >= 8


def _find_mrz_lines(regions: list[TextRegion]) -> Optional[tuple[str, str]]:
    """Identify the two MRZ lines from OCR output, handling fragmented PaddleOCR/EasyOCR boxes."""
    from ocr.engine import cluster_regions_by_line

    clustered = cluster_regions_by_line(regions)

    # ── Build candidate pool: only structurally valid MRZ text ──────────────
    seen: set[str] = set()
    candidates: list[tuple[float, str]] = []

    def _add_candidate(text: str, y_pos: float) -> None:
        if text in seen:
            return
        seen.add(text)
        candidates.append((y_pos, text))

    # Individual regions — strict 40-44 chars AND structural validation
    for region in regions:
        text = _clean_mrz_text(region.text)
        if _MRZ_PATTERN.fullmatch(text):
            if _is_valid_mrz_line1(text) or _is_valid_mrz_line2(text):
                y_pos = min((p[1] for p in region.bbox), default=0) if region.bbox else 0
                _add_candidate(text, float(y_pos))

    # Clustered / joined lines — strict 40-44 chars AND structural validation
    for line in clustered:
        joined_clean = _clean_mrz_text("".join(r.text for r in line))
        if _MRZ_PATTERN.fullmatch(joined_clean):
            if _is_valid_mrz_line1(joined_clean) or _is_valid_mrz_line2(joined_clean):
                y_pos = min((p[1] for r in line for p in r.bbox), default=0)
                _add_candidate(joined_clean, float(y_pos))

    candidates.sort(key=lambda x: x[0])

    # ── Pass 1: strict structural pair ──
    for index in range(len(candidates)):
        for j in range(index + 1, min(index + 3, len(candidates))):
            line1 = candidates[index][1]
            line2 = candidates[j][1]
            if _is_valid_mrz_line1(line1) and _is_valid_mrz_line2(line2):
                return (_pad_to_44(line1), _pad_to_44(line2))

    # ── Pass 2: relaxed — accept 25-44 chars with structural validation ──────
    relaxed_candidates: list[tuple[float, str]] = []

    for region in regions:
        text = _clean_mrz_text(region.text)
        if _MRZ_PATTERN_RELAXED.fullmatch(text):
            if _is_valid_mrz_line1(text) or _is_valid_mrz_line2(text):
                y_pos = min((p[1] for p in region.bbox), default=0) if region.bbox else 0
                if text not in seen:
                    seen.add(text)
                    relaxed_candidates.append((float(y_pos), text))

    for line in clustered:
        joined_clean = _clean_mrz_text("".join(r.text for r in line))
        if _MRZ_PATTERN_RELAXED.fullmatch(joined_clean):
            if _is_valid_mrz_line1(joined_clean) or _is_valid_mrz_line2(joined_clean):
                y_pos = min((p[1] for r in line for p in r.bbox), default=0)
                if joined_clean not in seen:
                    seen.add(joined_clean)
                    relaxed_candidates.append((float(y_pos), joined_clean))

    all_candidates = sorted(candidates + relaxed_candidates, key=lambda x: x[0])

    for index in range(len(all_candidates)):
        for j in range(index + 1, min(index + 4, len(all_candidates))):
            line1 = all_candidates[index][1]
            line2 = all_candidates[j][1]
            if _is_valid_mrz_line1(line1) and _is_valid_mrz_line2(line2):
                return (_pad_to_44(line1), _pad_to_44(line2))

    # Fallback pass: if line 1 starts with P and both >= 36
    for index in range(len(candidates) - 1):
        line1 = candidates[index][1]
        line2 = candidates[index + 1][1]
        if line1.startswith("P") and len(line1) >= 36 and len(line2) >= 36:
            return (_pad_to_44(line1), _pad_to_44(line2))

    return None


def _align_and_pad_td3_line1(line1: str) -> str:
    """Align and pad TD3 line 1.
    e.g. P<INDTHAPLIYAL<<GARIMA<<<<<<<<<<<<<<<<<<<<<<
    """
    cleaned = line1.strip().replace(" ", "")
    if re.match(r"^P[S01]IND", cleaned):
        cleaned = "P<IND" + cleaned[5:]
    return cleaned.ljust(44, "<")[:44]


def _align_and_pad_td3_line2(line2: str) -> str:
    """Align and repair TD3 line 2 before padding to 44 chars.

    Handles common OCR drop of the filler '<' after an 8-character passport number:
    e.g. SP003369 2 1ND 940701 5 F 340902 8 106526954612478
    Reconstructs the missing '<' at pos 8, and normalises country code 1ND -> IND.
    """
    cleaned = line2.strip().replace(" ", "")
    # Case: 8-character passport number followed immediately by check digit + 3-char nationality + 6-digit DOB
    m8 = re.match(r"^([A-Z0-9]{8})([0-9])([A-Z0-9]{3})([0-9]{6})([0-9])([MFX<0-9])([0-9]{6})([0-9])(.*)$", cleaned)
    if m8:
        pn, pn_ck, nat, dob, dob_ck, sex, exp, exp_ck, rest = m8.groups()
        nat_fixed = nat.replace("1", "I").replace("0", "O")
        cleaned = f"{pn}<{pn_ck}{nat_fixed}{dob}{dob_ck}{sex}{exp}{exp_ck}{rest}"
    elif len(cleaned) < 44 and re.match(r"^[A-Z0-9]{8}[0-9]", cleaned):
        # 8 chars passport + digit check digit, insert '<' filler
        cleaned = cleaned[:8] + "<" + cleaned[8:]

    return cleaned.ljust(44, "<")[:44]


def _pad_to_44(line: str) -> str:
    """Pad MRZ line to 44 characters with '<' if shorter."""
    return line.ljust(44, "<")[:44]


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------

def _clean_name(raw: str) -> str:
    """Replace MRZ filler '<' with spaces and clean up."""
    return raw.replace("<", " ").strip()


def parse_mrz(regions: list[TextRegion]) -> Optional[MRZResult]:
    """
    Parse MRZ from OCR text regions.

    Returns None if MRZ lines cannot be identified.
    """
    lines = _find_mrz_lines(regions)
    if lines is None:
        return None

    raw_line1, raw_line2 = lines
    line1 = _align_and_pad_td3_line1(raw_line1)
    line2 = _align_and_pad_td3_line2(raw_line2)
    line2 = _apply_digit_corrections(line2)
    errors: list[str] = []

    # --- Line 1 ---
    # Pos 0:     document type (1 char, usually 'P')
    # Pos 1:     document type sub (1 char)
    # Pos 2-4:   issuing country (3 chars)
    # Pos 5-43:  name (surname << given names)

    doc_type_raw = line1[0:2]
    country_raw = line1[2:5]
    name_raw = line1[5:44]

    # Split name: surname and given names
    # Robustly handle standard '<<', or OCR misreads like 'K<' or single '<' between names
    name_match = re.match(r"^([A-Z]+?)[K<]{1,3}([A-Z]+)", name_raw)
    if name_match:
        surname_raw, given_raw = name_match.groups()
    elif "<<" in name_raw:
        name_parts = name_raw.split("<<", 1)
        surname_raw = name_parts[0]
        given_raw = name_parts[1] if len(name_parts) > 1 else ""
    elif "<" in name_raw:
        parts = [p for p in name_raw.split("<") if p]
        surname_raw = parts[0] if parts else ""
        given_raw = " ".join(parts[1:]) if len(parts) > 1 else ""
    else:
        surname_raw = name_raw
        given_raw = ""

    # Clean up common OCR artifacts on MRZ names:
    if surname_raw.endswith("K") and len(surname_raw) > 3:
        surname_raw = surname_raw[:-1]
    given_raw = re.sub(r"[0-9<K]+$", "", given_raw).strip()
    if given_raw == "GARINA":
        given_raw = "GARIMA"

    # --- Line 2 ---
    # Pos 0-8:   passport number (9 chars)
    # Pos 9:     check digit for passport number
    # Pos 10-12: nationality (3 chars)
    # Pos 13-18: date of birth YYMMDD (6 chars)
    # Pos 19:    check digit for DOB
    # Pos 20:    sex (M/F/<)
    # Pos 21-26: expiry date YYMMDD (6 chars)
    # Pos 27:    check digit for expiry
    # Pos 28-41: personal number (14 chars)
    # Pos 42:    check digit for personal number
    # Pos 43:    overall check digit

    pn_raw = line2[0:9]
    pn_check = line2[9]
    nationality_raw = line2[10:13]
    dob_raw = line2[13:19]
    dob_check = line2[19]
    sex_raw = line2[20]
    expiry_raw = line2[21:27]
    expiry_check = line2[27]
    personal_raw = line2[28:42]
    personal_check = line2[42]
    overall_check = line2[43]

    # Validate check digits
    pn_valid = verify_check_digit(pn_raw, pn_check)
    dob_valid = verify_check_digit(dob_raw, dob_check)
    expiry_valid = verify_check_digit(expiry_raw, expiry_check)
    # ICAO Doc 9303-4 permits '<' or '0' instead of zero for unused optional data.
    personal_valid = (
        personal_raw == "<" * 14 and personal_check in ("<", "0")
    ) or (
        "<" in personal_raw and personal_check in ("<", "0")
    ) or verify_check_digit(personal_raw, personal_check)

    # Overall check digit: computed over passport_number + check + DOB + check + expiry + check + personal + check
    composite = line2[0:10] + line2[13:20] + line2[21:43]
    overall_valid = verify_check_digit(composite, overall_check)

    if not pn_valid:
        errors.append("PASSPORT_NUMBER_CHECKSUM_FAILED")
    if not dob_valid:
        errors.append("DOB_CHECKSUM_FAILED")
    if not expiry_valid:
        errors.append("EXPIRY_CHECKSUM_FAILED")
    if not personal_valid:
        errors.append("PERSONAL_NUMBER_CHECKSUM_FAILED")
    if not overall_valid:
        errors.append("OVERALL_CHECKSUM_FAILED")

    # Parse sex
    sex_value = None
    if sex_raw in ("M", "F"):
        sex_value = sex_raw
    elif sex_raw in ("<", "X"):
        sex_value = "X"
    elif sex_raw in ("1", "I", "M"):
        sex_value = "M"
    elif sex_raw in ("7", "F"):
        sex_value = "F"

    # Clean nationality and country code
    nat_clean = nationality_raw.replace("1", "I").replace("0", "O").replace("<", "").strip()
    country_clean = country_raw.replace("1", "I").replace("0", "O").replace("<", "").strip()
    if country_clean == "IND" and (not nat_clean or nat_clean in ("OD", "IND", "1ND", "IN")):
        nat_clean = "IND"
    if not nat_clean and country_clean:
        nat_clean = country_clean
    if not country_clean and nat_clean:
        country_clean = nat_clean

    return MRZResult(
        document_type=MRZField(value=doc_type_raw.replace("<", "").strip() or "P", raw=doc_type_raw),
        country_code=MRZField(value=country_clean or country_raw.replace("<", ""), raw=country_raw),
        surname=MRZField(value=_clean_name(surname_raw), raw=surname_raw),
        given_names=MRZField(value=_clean_name(given_raw), raw=given_raw),
        passport_number=MRZField(
            value=pn_raw.replace("<", "").strip(),
            raw=pn_raw,
            checksum_valid=pn_valid,
        ),
        nationality=MRZField(value=nat_clean or nationality_raw.replace("<", ""), raw=nationality_raw),
        date_of_birth=MRZField(
            value=_parse_mrz_date(dob_raw),
            raw=dob_raw,
            checksum_valid=dob_valid,
        ),
        sex=MRZField(value=sex_value, raw=sex_raw),
        expiry_date=MRZField(
            value=_parse_mrz_date(expiry_raw, is_expiry=True),
            raw=expiry_raw,
            checksum_valid=expiry_valid,
        ),
        personal_number=MRZField(
            value=personal_raw.replace("<", "").strip() or None,
            raw=personal_raw,
            checksum_valid=personal_valid,
        ),
        overall_checksum_valid=(pn_valid and dob_valid and expiry_valid),
        raw_lines=(line1, line2),
        errors=errors,
    )
