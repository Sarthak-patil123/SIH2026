"""
Cross-validates MRZ output against visual OCR fields and computes
a final confidence score.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional

try:
    from rapidfuzz import fuzz
except ImportError:
    import difflib

    class _FuzzFallback:
        @staticmethod
        def token_sort_ratio(s1: str, s2: str) -> float:
            t1 = " ".join(sorted(s1.split()))
            t2 = " ".join(sorted(s2.split()))
            return difflib.SequenceMatcher(None, t1, t2).ratio() * 100.0

    fuzz = _FuzzFallback()

from ocr.mrz.parser import MRZResult
from ocr.engine import TextRegion

# ---------------------------------------------------------------------------
# ISO 3166-1 alpha-3 country codes (subset — full list is ~249)
# ---------------------------------------------------------------------------

# fmt: off
_VALID_COUNTRY_CODES = {
    "AFG", "ALB", "DZA", "AND", "AGO", "ATG", "ARG", "ARM", "AUS", "AUT",
    "AZE", "BHS", "BHR", "BGD", "BRB", "BLR", "BEL", "BLZ", "BEN", "BTN",
    "BOL", "BIH", "BWA", "BRA", "BRN", "BGR", "BFA", "BDI", "KHM", "CMR",
    "CAN", "CPV", "CAF", "TCD", "CHL", "CHN", "COL", "COM", "COG", "COD",
    "CRI", "CIV", "HRV", "CUB", "CYP", "CZE", "DNK", "DJI", "DMA", "DOM",
    "ECU", "EGY", "SLV", "GNQ", "ERI", "EST", "SWZ", "ETH", "FJI", "FIN",
    "FRA", "GAB", "GMB", "GEO", "DEU", "GHA", "GRC", "GRD", "GTM", "GIN",
    "GNB", "GUY", "HTI", "HND", "HUN", "ISL", "IND", "IDN", "IRN", "IRQ",
    "IRL", "ISR", "ITA", "JAM", "JPN", "JOR", "KAZ", "KEN", "KIR", "PRK",
    "KOR", "KWT", "KGZ", "LAO", "LVA", "LBN", "LSO", "LBR", "LBY", "LIE",
    "LTU", "LUX", "MDG", "MWI", "MYS", "MDV", "MLI", "MLT", "MHL", "MRT",
    "MUS", "MEX", "FSM", "MDA", "MCO", "MNG", "MNE", "MAR", "MOZ", "MMR",
    "NAM", "NRU", "NPL", "NLD", "NZL", "NIC", "NER", "NGA", "MKD", "NOR",
    "OMN", "PAK", "PLW", "PAN", "PNG", "PRY", "PER", "PHL", "POL", "PRT",
    "QAT", "ROU", "RUS", "RWA", "KNA", "LCA", "VCT", "WSM", "SMR", "STP",
    "SAU", "SEN", "SRB", "SYC", "SLE", "SGP", "SVK", "SVN", "SLB", "SOM",
    "ZAF", "SSD", "ESP", "LKA", "SDN", "SUR", "SWE", "CHE", "SYR", "TWN",
    "TJK", "TZA", "THA", "TLS", "TGO", "TON", "TTO", "TUN", "TUR", "TKM",
    "TUV", "UGA", "UKR", "ARE", "GBR", "USA", "URY", "UZB", "VUT", "VEN",
    "VNM", "YEM", "ZMB", "ZWE",
    # Common MRZ-specific codes
    "D",  # Germany's "D<<" is exposed without fillers by the parser
    "GBD", "GBN", "GBO", "GBP", "GBS",  # British territories
    "XBA", "XIM", "XCC", "XOM", "XXA", "XXB", "XXC",  # special codes
    "UNO", "UNA",  # UN
    "EUE",  # EU
}
# fmt: on

_LABEL_HINTS = [
    "SURNAME",
    "GIVEN NAME",
    "NAME",
    "DATE",
    "BIRTH",
    "NATIONALITY",
    "PASSPORT",
    "SEX",
    "PLACE",
    "ISSUE",
    "EXPIRY",
    "EXPIRATION",
    "VALID",
    "COUNTRY",
    "CODE",
    "FATHER",
    "MOTHER",
    "SPOUSE",
    "ADDRESS",
    "FILE",
    "HEIGHT",
    "TAILLE",
    "PERSONAL",
    "SIGNATURE",
    "SIGNATUTE",
    "AUTHORITY",
    "AUTORITE",
    "PRENOMS",
    "KENNINAFT",
    "KENNITALA",
    "EIGINNOFN",
    "PJODERNI",
    "STJORNVALD",
]


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class ValidationResult:
    confidence: float  # 0.0 – 1.0
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def find_visual_field(
    regions: list[TextRegion],
    keywords: list[str],
) -> Optional[TextRegion]:
    """Find the best label match for the given keywords.

    OCR label text is noisy, so prefer exact phrase matches and longer, more
    specific keywords over generic substring matches.
    """
    normalised_keywords = [_normalise_label_text(keyword) for keyword in keywords]
    best_match: tuple[int, float, TextRegion] | None = None

    for region in regions:
        label_text = _normalise_label_text(region.text)
        if not label_text:
            continue

        for priority, keyword in enumerate(normalised_keywords):
            if not keyword:
                continue

            padded_label = f" {label_text} "
            padded_keyword = f" {keyword} "

            if label_text == keyword:
                score = 10_000 - priority
            elif padded_keyword in padded_label:
                score = (len(keyword) * 100) - priority
            else:
                continue

            if best_match is None or score > best_match[0] or (
                score == best_match[0] and region.confidence > best_match[1]
            ):
                best_match = (score, region.confidence, region)

    return best_match[2] if best_match else None


def find_label_row_left_edge(
    regions: list[TextRegion],
    label_region: TextRegion,
    *,
    max_prefix_chars: int = 5,
) -> int:
    """Leftmost x of the label *row*, absorbing short bilingual-prefix regions.

    Bilingual passports (Hindi/English, Arabic/English, Cyrillic/English, …)
    produce labels OCR'd as multiple regions on the same row, e.g.
    `"पिता / "` (often mis-OCR'd as "fe /") followed by
    `"Name of Father / Legal Guardian"`. Form values align to the leftmost
    edge of the bilingual block, not to the English region alone.

    Only short fragments (≤ `max_prefix_chars` alphanumeric characters) are
    absorbed — long same-row regions are usually values from adjacent fields
    in multi-column layouts (e.g. the Place-of-Issue value sitting on the same
    row as the Date-of-Issue label on the biodata page) and must NOT shift
    the label's effective left edge.
    """
    label_top = min(p[1] for p in label_region.bbox)
    label_bottom = max(p[1] for p in label_region.bbox)
    label_height = max(label_bottom - label_top, 1)
    leftmost = min(p[0] for p in label_region.bbox)

    for region in regions:
        if region is label_region:
            continue
        top = min(p[1] for p in region.bbox)
        bottom = max(p[1] for p in region.bbox)
        overlap = min(bottom, label_bottom) - max(top, label_top)
        if overlap < label_height * 0.5:
            continue
        left = min(p[0] for p in region.bbox)
        if left >= leftmost:
            continue
        alnum_len = len(re.sub(r"[^A-Za-z0-9]", "", region.text))
        if alnum_len > max_prefix_chars:
            continue
        leftmost = left

    return leftmost


_DATE_RE_COMPREHENSIVE = re.compile(
    r"(?<!\d)("
    r"\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}|"
    r"\d{4}[/.\-]\d{1,2}[/.\-]\d{1,2}|"
    r"\d{1,2}[/.\-\s](?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[/.\-\s]\d{2,4}|"
    r"(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[/.\-\s]\d{1,2}[,./\-\s]+\d{2,4}"
    r")\b",
    re.IGNORECASE,
)

_MONTH_MAP = {
    "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04", "MAY": "05", "JUN": "06",
    "JUL": "07", "AUG": "08", "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12",
}


def parse_date_comprehensive(text: Optional[str]) -> Optional[str]:
    """Extract and normalize any date representation into standard YYYY-MM-DD."""
    if not text:
        return None
    m = _DATE_RE_COMPREHENSIVE.search(text)
    if not m:
        return None
    raw = m.group(1).strip()
    # Named month: 28/OCT/2024, 21-JUN-2007, 18 Jan 1957
    m_alpha = re.match(r"^(\d{1,2})[/.\-\s]([A-Za-z]{3})[a-z]*[/.\-\s](\d{2,4})$", raw)
    if m_alpha:
        d, mon, y = m_alpha.groups()
        mon_num = _MONTH_MAP.get(mon.upper()[:3], "01")
        if len(y) == 2:
            y = f"20{y}" if int(y) < 50 else f"19{y}"
        return f"{y}-{mon_num}-{int(d):02d}"

    m_alpha2 = re.match(r"^([A-Za-z]{3})[a-z]*[/.\-\s](\d{1,2})[,./\-\s]+(\d{2,4})$", raw)
    if m_alpha2:
        mon, d, y = m_alpha2.groups()
        mon_num = _MONTH_MAP.get(mon.upper()[:3], "01")
        if len(y) == 2:
            y = f"20{y}" if int(y) < 50 else f"19{y}"
        return f"{y}-{mon_num}-{int(d):02d}"

    # Numeric formats
    parts = re.split(r"[/.\-]", raw)
    if len(parts) == 3:
        if len(parts[0]) == 4:  # YYYY-MM-DD
            y, m_str, d = parts
            return f"{y}-{int(m_str):02d}-{int(d):02d}"
        elif len(parts[2]) in (2, 4):  # DD-MM-YYYY
            d, m_str, y = parts
            if len(y) == 2:
                y = f"20{y}" if int(y) < 50 else f"19{y}"
            return f"{y}-{int(m_str):02d}-{int(d):02d}"
    return raw


def _looks_like_field_label(text: str) -> bool:
    """Heuristic to avoid treating the next label as a field value."""
    if not text or len(text.strip()) == 0:
        return True
    cleaned = text.strip()
    # Dates and values with digits/brackets are not labels
    if _DATE_RE_COMPREHENSIVE.search(cleaned):
        return False
    words = cleaned.split()
    if len(words) > 5 or len(cleaned) > 35:
        return False
    if text.count("/") >= 3:
        return True
    normalised = _normalise_label_text(text)
    padded = f" {normalised} "
    for hint in _LABEL_HINTS:
        if normalised == hint or normalised.startswith(f"{hint} ") or normalised.endswith(f" {hint}"):
            return True
        if f" {hint} " in padded and len(words) <= 3:
            return True
    return False


def extract_inline_value(text: str, keywords: list[str]) -> Optional[str]:
    """Check if the text region itself contains 'Keyword: Value' or 'Keyword<Value>'."""
    if not text:
        return None
    m_bracket = re.search(r"[<\[(]([A-Za-z0-9/\s\.\-]+)[>\])]", text)
    if m_bracket:
        candidate = m_bracket.group(1).strip()
        if candidate and not _looks_like_field_label(candidate):
            return candidate

    for kw in keywords:
        norm_kw = _normalise_label_text(kw)
        norm_text = _normalise_label_text(text)
        if norm_kw in norm_text:
            for delim in [":", " - ", "—", "–", " : "]:
                if delim in text:
                    parts = text.split(delim, 1)
                    val = parts[1].strip(" >:,-/|")
                    if val and len(val) >= 2 and not _looks_like_field_label(val):
                        return val
            pattern = re.compile(rf"^{re.escape(kw)}[\s:.\-—]+(.+)$", re.IGNORECASE)
            m = pattern.match(text.strip())
            if m:
                val = m.group(1).strip(" :,-/|")
                if val and len(val) >= 2 and not _looks_like_field_label(val):
                    return val
    return None


def find_visual_value_near(
    regions: list[TextRegion],
    label_region: TextRegion,
    max_y_distance: int = 110,
) -> Optional[TextRegion]:
    """Find the OCR region immediately below a label region."""
    label_bottom = max(p[1] for p in label_region.bbox)
    label_left = find_label_row_left_edge(regions, label_region)
    min_vertical_overlap = 10

    candidates = []
    for region in regions:
        if region is label_region or _looks_like_field_label(region.text):
            continue
        top = min(p[1] for p in region.bbox)
        left = min(p[0] for p in region.bbox)
        vertical_gap = top - label_bottom
        if -min_vertical_overlap <= vertical_gap < max_y_distance:
            x_distance = abs(left - label_left)
            if x_distance < 300:
                candidates.append((max(vertical_gap, 0) + x_distance * 0.3, region))

    if candidates:
        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]
    return None


def find_visual_value_right(
    regions: list[TextRegion],
    label_region: TextRegion,
    max_x_distance: int = 1200,
) -> Optional[TextRegion]:
    """Find the value region on the same row, immediately to the right of a label."""
    label_right = max(p[0] for p in label_region.bbox)
    label_top = min(p[1] for p in label_region.bbox)
    label_bottom = max(p[1] for p in label_region.bbox)
    label_height = max(label_bottom - label_top, 1)
    label_cy = (label_top + label_bottom) / 2.0

    candidates = []
    for region in regions:
        if region is label_region:
            continue
        top = min(p[1] for p in region.bbox)
        bottom = max(p[1] for p in region.bbox)
        reg_cy = (top + bottom) / 2.0
        reg_height = max(bottom - top, 1)

        overlap = min(bottom, label_bottom) - max(top, label_top)
        vert_dist = abs(label_cy - reg_cy)
        if overlap < label_height * 0.2 and vert_dist > max(label_height, reg_height) * 0.85:
            continue

        left = min(p[0] for p in region.bbox)
        gap = left - label_right
        if 0 <= gap < max_x_distance:
            if _looks_like_field_label(region.text):
                continue
            candidates.append((gap, region))

    if candidates:
        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]
    return None


def find_label_value(
    regions: list[TextRegion],
    labels: list[str],
    *,
    max_x_distance: int = 1200,
    max_y_distance: int = 110,
) -> Optional[str]:
    """Resolve a label to its value text, checking inline first, then right, then below."""
    label_region = find_visual_field(regions, labels)
    if label_region is None:
        return None

    inline = extract_inline_value(label_region.text, labels)
    if inline:
        return inline

    val_r = find_visual_value_right(regions, label_region, max_x_distance=max_x_distance)
    if val_r is not None:
        text = val_r.text.strip(" :,-/|")
        if text and not _looks_like_field_label(text):
            return text

    val_b = find_visual_value_near(regions, label_region, max_y_distance=max_y_distance)
    if val_b is not None:
        text = val_b.text.strip(" :,-/|")
        if text and not _looks_like_field_label(text):
            return text

    return None


def _parse_date_flexible(text: str) -> Optional[date]:
    """Try multiple date formats to parse a visual date field."""
    iso = parse_date_comprehensive(text)
    if iso:
        try:
            return date.fromisoformat(iso)
        except ValueError:
            pass
    text_clean = text.strip().replace("/", "-").replace(".", "-")
    formats = ["%Y-%m-%d", "%d-%m-%Y", "%d %b %Y", "%d %B %Y", "%Y%m%d"]
    for fmt in formats:
        try:
            return datetime.strptime(text_clean, fmt).date()
        except ValueError:
            continue
    return None


def _normalise_label_text(text: str) -> str:
    """Normalise OCR label text so phrase matching is less brittle."""
    text = text.upper()
    text = text.replace("&", " AND ")
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def validate(
    mrz: Optional[MRZResult],
    regions: list[TextRegion],
) -> ValidationResult:
    """
    Cross-validate MRZ fields against visual OCR regions and compute
    a final confidence score.

    Confidence = weighted average of:
      - MRZ checksum validity: 40%
      - Field cross-match: 30%
      - Individual field OCR confidence: 30%
    """
    errors: list[str] = []
    warnings: list[str] = []

    # --- MRZ checksum component (40%) ---
    if mrz is None:
        mrz_score = 0.0
        errors.append("MRZ_NOT_DETECTED")
    elif mrz.overall_checksum_valid:
        mrz_score = 1.0
    else:
        # Partial credit: count how many individual fields pass
        checks = [
            mrz.passport_number.checksum_valid,
            mrz.date_of_birth.checksum_valid,
            mrz.expiry_date.checksum_valid,
        ]
        passed = sum(1 for c in checks if c)
        mrz_score = passed / len(checks) * 0.7  # cap at 0.7 if overall fails

    # --- Cross-match component (30%) ---
    cross_matches = 0
    cross_total = 0

    if mrz is not None:
        # Name cross-match
        name_label = find_visual_field(regions, ["SURNAME", "FAMILY NAME", "LAST NAME", "NOM"])
        if name_label:
            name_value = find_visual_value_near(regions, name_label)
            if name_value and mrz.surname.value:
                cross_total += 1
                ratio = fuzz.token_sort_ratio(
                    mrz.surname.value.upper(),
                    name_value.text.upper(),
                )
                if ratio >= 85:
                    cross_matches += 1
                elif ratio >= 60:
                    cross_matches += 0.5
                    warnings.append("NAME_PARTIAL_MATCH")
                else:
                    warnings.append("NAME_MISMATCH")

        # DOB cross-match
        dob_label = find_visual_field(regions, ["DATE OF BIRTH", "BIRTH DATE", "DOB", "NAISSANCE"])
        if dob_label and mrz.date_of_birth.value:
            dob_value = find_visual_value_near(regions, dob_label)
            if dob_value:
                cross_total += 1
                visual_date = _parse_date_flexible(dob_value.text)
                if visual_date and str(visual_date) == mrz.date_of_birth.value:
                    cross_matches += 1
                else:
                    warnings.append("DOB_MISMATCH")

        # Expiry cross-match
        exp_label = find_visual_field(
            regions,
            ["DATE OF EXPIRY", "EXPIRY DATE", "DATE OF EXPIRATION", "EXPIRY", "EXPIRATION", "VALID UNTIL"],
        )
        if exp_label and mrz.expiry_date.value:
            exp_value = find_visual_value_near(regions, exp_label)
            if exp_value:
                cross_total += 1
                visual_date = _parse_date_flexible(exp_value.text)
                if visual_date and str(visual_date) == mrz.expiry_date.value:
                    cross_matches += 1
                else:
                    warnings.append("EXPIRY_DATE_MISMATCH")

        # Country code validation
        if mrz.country_code.value:
            code = mrz.country_code.value.upper()
            if code not in _VALID_COUNTRY_CODES:
                warnings.append(f"UNKNOWN_COUNTRY_CODE_{code}")

        # A correct checksum does not establish that a date exists. Unknown
        # date components are permitted as fillers, but impossible numeric
        # dates must not disappear silently when the parser returns None.
        parsed_dates: dict[str, date] = {}
        for name, field in (("DATE_OF_BIRTH", mrz.date_of_birth), ("EXPIRY_DATE", mrz.expiry_date)):
            if field.value is None:
                if re.fullmatch(r"[0-9<]{6}", field.raw) and "<" in field.raw:
                    warnings.append(f"INCOMPLETE_{name}")
                else:
                    errors.append(f"INVALID_{name}")
                continue
            try:
                parsed_dates[name] = date.fromisoformat(field.value)
            except ValueError:
                errors.append(f"INVALID_{name}")
        if len(parsed_dates) == 2 and parsed_dates["EXPIRY_DATE"] <= parsed_dates["DATE_OF_BIRTH"]:
            errors.append("EXPIRY_BEFORE_DOB")

    cross_score = (cross_matches / cross_total) if cross_total > 0 else 0.5

    # --- OCR confidence component (30%) ---
    if regions:
        avg_conf = sum(r.confidence for r in regions) / len(regions)
    else:
        avg_conf = 0.0

    # --- Weighted average ---
    confidence = (mrz_score * 0.40) + (cross_score * 0.30) + (avg_conf * 0.30)
    confidence = round(min(max(confidence, 0.0), 1.0), 3)

    return ValidationResult(
        confidence=confidence,
        errors=errors,
        warnings=warnings,
    )
