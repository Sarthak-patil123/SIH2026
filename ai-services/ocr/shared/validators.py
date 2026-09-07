"""
Format and checksum validators for Indian KYC document identifiers.

Kept separate from the passport MRZ checksum (core/mrz_parser.icao_check_digit)
because these documents use different identifier schemes:

  * PAN     — fixed alphanumeric format (no checksum that is publicly verifiable)
  * Aadhaar — 12 digits, last digit a Verhoeff checksum over the first 11
  * EPIC    — 3 letters + 7 digits (Voter ID)
  * DL      — state code + RTO + year + serial (format varies; loose check)
  * NREGA   — state-prefixed hierarchical job-card number (format only)
"""

from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# PAN — Permanent Account Number
# Format: 5 letters + 4 digits + 1 letter, e.g. ABCDE1234F.
# The 4th letter encodes holder type (P=individual, C=company, ...).
# ---------------------------------------------------------------------------

_PAN_RE = re.compile(
    r"(?<![A-Z0-9])(?:[A-Z][ \t-]*){5}(?:[0-9][ \t-]*){4}[A-Z](?![A-Z0-9])"
)
_PAN_HOLDER_TYPES = set("ABCFGHLJPTK")


def _extract_identifier(text: str, pattern: re.Pattern[str]) -> str | None:
    """Extract a whole identifier, allowing OCR spaces and printed hyphens.

    Matching before removing separators preserves token boundaries, so an
    overlong identifier cannot be silently truncated into a valid one.
    """
    match = pattern.search(text.upper())
    return re.sub(r"[ \t-]", "", match.group(0)) if match else None


_TO_LETTER = str.maketrans({"0": "O", "1": "I", "2": "Z", "8": "B", "5": "S"})
_TO_DIGIT = str.maketrans({"O": "0", "D": "0", "Q": "0", "I": "1", "L": "1", "Z": "2", "B": "8", "S": "5"})


def normalize_pan(text: str) -> str | None:
    """Extract a PAN-shaped token from noisy OCR text, or None."""
    extracted = _extract_identifier(text, _PAN_RE)
    if extracted:
        return extracted

    # OCR character repair for candidate 10-char tokens
    cleaned = re.sub(r"[ \t-]", "", text.upper())
    for candidate in re.findall(r"\b[A-Z0-9]{10}\b", cleaned):
        # Letters in positions 0..4 and 9; digits in 5..8
        repaired = (
            candidate[0:5].translate(_TO_LETTER)
            + candidate[5:9].translate(_TO_DIGIT)
            + candidate[9:10].translate(_TO_LETTER)
        )
        if re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", repaired) and repaired[3] in _PAN_HOLDER_TYPES:
            return repaired

    return None


def is_valid_pan(text: str) -> bool:
    pan = normalize_pan(text)
    if pan is None:
        return False
    return pan[3] in _PAN_HOLDER_TYPES


# ---------------------------------------------------------------------------
# EPIC — Voter ID (Elector's Photo Identity Card)
# Format: 3 letters + 7 digits, e.g. ABC1234567.
# ---------------------------------------------------------------------------

_EPIC_RE = re.compile(
    r"(?<![A-Z0-9])(?:[A-Z][ \t-]*){3}(?:[0-9][ \t-]*){6}[0-9](?![A-Z0-9])"
)


def normalize_epic(text: str) -> str | None:
    return _extract_identifier(text, _EPIC_RE)


def is_valid_epic(text: str) -> bool:
    return normalize_epic(text) is not None


# ---------------------------------------------------------------------------
# Driving Licence
# Format varies by state, but most follow: 2-letter state code, 2-digit RTO,
# optional space, then 11 to 13 digits (often YYYY + 7-digit serial), e.g.
#   MH1220110012345, DL0420110149646, HR-06 19850034761.
# We accept a loose shape (11 to 15 digits) and surface the compact form.
# ---------------------------------------------------------------------------

_DL_RE = re.compile(
    r"(?<![A-Z0-9])(?:[A-Z][ \t-]*){2}(?:[0-9][ \t-]*){10,14}[0-9](?![A-Z0-9])"
)


def normalize_dl(text: str) -> str | None:
    return _extract_identifier(text, _DL_RE)


def is_valid_dl(text: str) -> bool:
    return normalize_dl(text) is not None


# ---------------------------------------------------------------------------
# NREGA / MGNREGA job-card number
# State-issued identifiers vary in component widths, but the common public
# form is a two-letter state prefix followed by at least three numeric
# hierarchy components, for example RJ-27-001-002-0008147/00.
# ---------------------------------------------------------------------------

_NREGA_JOB_CARD_RE = re.compile(
    r"^[A-Z]{2}-[0-9]{1,10}(?:[-/][0-9]{1,10}){2,7}$"
)


def normalize_nrega_job_card(text: str) -> str | None:
    """Return a canonical NREGA job-card number, or ``None``.

    This is a conservative shape check, not an issuer lookup or authenticity
    check. OCR character correction belongs in the extractor, where it can be
    applied only to a labelled job-card-number candidate.
    """
    compact = text.upper().strip()
    compact = compact.replace("–", "-").replace("—", "-")
    compact = re.sub(r"\s+", "", compact)
    return compact if _NREGA_JOB_CARD_RE.fullmatch(compact) else None


def is_valid_nrega_job_card(text: str) -> bool:
    return normalize_nrega_job_card(text) is not None


# ---------------------------------------------------------------------------
# Aadhaar — 12 digits, 12th digit is a Verhoeff checksum over the first 11.
# ---------------------------------------------------------------------------

# Verhoeff algorithm tables (dihedral group D5).
_VERHOEFF_D = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    (1, 2, 3, 4, 0, 6, 7, 8, 9, 5),
    (2, 3, 4, 0, 1, 7, 8, 9, 5, 6),
    (3, 4, 0, 1, 2, 8, 9, 5, 6, 7),
    (4, 0, 1, 2, 3, 9, 5, 6, 7, 8),
    (5, 9, 8, 7, 6, 0, 4, 3, 2, 1),
    (6, 5, 9, 8, 7, 1, 0, 4, 3, 2),
    (7, 6, 5, 9, 8, 2, 1, 0, 4, 3),
    (8, 7, 6, 5, 9, 3, 2, 1, 0, 4),
    (9, 8, 7, 6, 5, 4, 3, 2, 1, 0),
)

_VERHOEFF_P = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    (1, 5, 7, 6, 2, 8, 3, 0, 9, 4),
    (5, 8, 0, 3, 7, 9, 6, 1, 4, 2),
    (8, 9, 1, 6, 0, 4, 3, 5, 2, 7),
    (9, 4, 5, 3, 1, 2, 6, 8, 7, 0),
    (4, 2, 8, 6, 5, 7, 3, 9, 0, 1),
    (2, 7, 9, 3, 8, 0, 6, 4, 1, 5),
    (7, 0, 4, 6, 9, 1, 3, 2, 5, 8),
)


def verhoeff_validate(number: str) -> bool:
    """True if the digit string passes the Verhoeff checksum (check digit included)."""
    if not number.isascii() or not number.isdigit():
        return False
    c = 0
    for i, digit in enumerate(reversed(number)):
        c = _VERHOEFF_D[c][_VERHOEFF_P[i % 8][int(digit)]]
    return c == 0


_AADHAAR_DIGITS_RE = re.compile(r"\b([0-9]{4})[ \t]*([0-9]{4})[ \t]*([0-9]{4})\b")


def extract_aadhaar_number(text: str) -> str | None:
    """Find a 12-digit Aadhaar number in text and return it grouped 'XXXX XXXX XXXX'."""
    match = _AADHAAR_DIGITS_RE.search(text)
    if not match:
        return None
    return f"{match.group(1)} {match.group(2)} {match.group(3)}"


def is_valid_aadhaar(text: str) -> bool:
    grouped = extract_aadhaar_number(text)
    if grouped is None:
        return False
    digits = grouped.replace(" ", "")
    # Aadhaar never starts with 0 or 1.
    if digits[0] in "01":
        return False
    return verhoeff_validate(digits)
