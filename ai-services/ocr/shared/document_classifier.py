"""
Document-type router.

Given OCR regions for a full document image, decides which supported document
type it is — passport, PAN, Aadhaar, driving licence, voter ID, NREGA job card,
or NPR letter — using a combination of keyword hints and identifier-format
signals. The pipeline uses it as the full-page KYC router and as a conservative
confirmation step when generic biodata labels make the cheap passport probe
ambiguous.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from ocr.engine import TextRegion
from ocr.shared.page_classifier import _has_mrz_like_lines, _normalise_text
from ocr.shared.validators import (
    extract_aadhaar_number,
    is_valid_aadhaar,
    normalize_dl,
    normalize_epic,
    normalize_pan,
)

# ---------------------------------------------------------------------------
# Keyword hints (normalised: upper-case, alphanumerics only). Deliberately
# avoid generic phrases like "GOVERNMENT OF INDIA" that appear on several docs.
# ---------------------------------------------------------------------------

_PAN_KEYWORDS = [
    "INCOME TAX DEPARTMENT", "PERMANENT ACCOUNT NUMBER", "INCOME TAX", "GOVT OF INDIA", "FATHERS NAME",
]
_AADHAAR_KEYWORDS = [
    "AADHAAR", "AADHAR", "UNIQUE IDENTIFICATION", "UIDAI", "MERA AADHAAR",
    "ENROLLMENT NO", "VID", "HELP UIDAI GOV IN", "WWW UIDAI GOV IN",
]
_DL_KEYWORDS = [
    "DRIVING LICENCE", "DRIVING LICENSE", "TRANSPORT DEPARTMENT",
    "MOTOR VEHICLE", "FORM 7", "LICENCE TO DRIVE", "LICENSE TO DRIVE",
    "LICENCE NO", "LICENSE NO", "DL NO", "AUTHORISATION TO DRIVE",
    "AUTHORIZATION TO DRIVE", "VEHICLES THROUGHOUT INDIA", "UNION OF INDIA",
    "INVCRG", "LMV", "MCWG", "HGMV", "RTO",
]
_VISA_KEYWORDS = [
    "VISA", "TOURIST VISA", "E-VISA", "EVISA", "ENTRY VISA", "BUSINESS VISA",
    "OCI", "VISA NO", "NUMBER OF ENTRIES", "MULTIPLE", "SINGLE ENTRY",
    "STAY UPTO", "VALID FOR", "INDIAN MISSION", "SPECIAL ENDORSEMENT",
]
_VOTER_KEYWORDS = [
    "ELECTION COMMISSION", "ELECTORS PHOTO IDENTITY", "ELECTOR",
    "ELECTION", "IDENTITY CARD", "EPIC NO", "VOTER",
]
_NREGA_EXPLICIT_KEYWORDS = [
    "MAHATMA GANDHI NATIONAL RURAL EMPLOYMENT GUARANTEE ACT",
    "MAHATMA GANDHI NATIONAL RURAL EMPLOYMENT GUARANTEE SCHEME",
    "MAHATMA GANDHI NREGA",
    "MGNREGA",
]
_NREGA_JOB_CARD_KEYWORDS = ["JOB CARD", "EMPLOYMENT CARD"]
_NREGA_RURAL_CONTEXT = [
    "GRAM PANCHAYAT",
    "RURAL EMPLOYMENT",
    "EMPLOYMENT GUARANTEE",
    "HOUSEHOLD MEMBERS WILLING TO WORK",
]
_NPR_TITLE_KEYWORDS = ["NATIONAL POPULATION REGISTER"]
_NPR_ISSUER_KEYWORDS = ["REGISTRAR GENERAL", "CENSUS COMMISSIONER"]
_PASSPORT_KEYWORDS = ["PASSPORT", "REPUBLIC OF INDIA PASSPORT", "TRAVEL DOCUMENT"]
_DOB_PROOF_KEYWORDS = [
    "BIRTH CERTIFICATE", "CERTIFICATE OF BIRTH", "DATE OF BIRTH", "PLACE OF BIRTH",
    "REGISTRAR OF BIRTHS", "REGISTRAR OF BIRTHS AND DEATHS", "MUNICIPAL CORPORATION",
    "REGISTRATION OF BIRTHS", "FORM 5", "FORM 9", "JANM PRAMAN", "BIRTH REPORT",
    "CHIEF REGISTRAR", "HEALTH DEPARTMENT", "VITAL STATISTICS", "LIVE BIRTH",
    "SECONDARY SCHOOL", "MATRICULATION", "CBSE", "ICSE", "SCHOOL LEAVING",
]


@dataclass
class DocumentClassification:
    document_type: str
    confidence: float
    reasons: list[str] = field(default_factory=list)
    probe_text: list[str] = field(default_factory=list)


def _count_keyword_matches(normalised_regions: list[str], keywords: list[str]) -> int:
    matched: set[str] = set()
    for keyword in keywords:
        norm_kw = _normalise_text(keyword)
        padded = f" {norm_kw} "
        for region_text in normalised_regions:
            if padded in f" {region_text} ":
                matched.add(norm_kw)
                break
    independent = {
        keyword
        for keyword in matched
        if not any(
            keyword != other
            and f" {keyword} " in f" {other} "
            for other in matched
        )
    }
    return len(independent)


def _any_token(regions: list[TextRegion], normalizer) -> bool:
    return any(normalizer(r.text) is not None for r in regions if r.text.strip())


def classify_document(regions: list[TextRegion]) -> DocumentClassification:
    """Classify a full-page document into one of the supported types."""
    probe_text = [r.text.strip() for r in regions if r.text.strip()][:15]
    normalised_regions = [_normalise_text(r.text) for r in regions if r.text.strip()]
    joined_raw = " ".join(r.text for r in regions if r.text.strip())
    joined_normalised = _normalise_text(joined_raw)

    # --- per-type evidence ---
    pan_kw = _count_keyword_matches(normalised_regions, _PAN_KEYWORDS)
    aadhaar_kw = _count_keyword_matches(normalised_regions, _AADHAAR_KEYWORDS)
    dl_kw = _count_keyword_matches(normalised_regions, _DL_KEYWORDS)
    voter_kw = _count_keyword_matches(normalised_regions, _VOTER_KEYWORDS)
    nrega_explicit_kw = _count_keyword_matches(
        normalised_regions, _NREGA_EXPLICIT_KEYWORDS
    )
    nrega_explicit_kw = max(
        nrega_explicit_kw,
        _count_keyword_matches([joined_normalised], _NREGA_EXPLICIT_KEYWORDS),
    )
    nrega_job_card_kw = _count_keyword_matches(
        normalised_regions, _NREGA_JOB_CARD_KEYWORDS
    )
    nrega_context_kw = _count_keyword_matches(
        normalised_regions, _NREGA_RURAL_CONTEXT
    )
    npr_title_kw = _count_keyword_matches(normalised_regions, _NPR_TITLE_KEYWORDS)
    npr_title_kw = max(
        npr_title_kw,
        _count_keyword_matches([joined_normalised], _NPR_TITLE_KEYWORDS),
    )
    npr_issuer_kw = _count_keyword_matches(normalised_regions, _NPR_ISSUER_KEYWORDS)
    visa_kw = _count_keyword_matches(normalised_regions, _VISA_KEYWORDS)
    passport_kw = _count_keyword_matches(normalised_regions, _PASSPORT_KEYWORDS)
    dob_kw = _count_keyword_matches(normalised_regions, _DOB_PROOF_KEYWORDS)
    dob_kw = max(
        dob_kw,
        _count_keyword_matches([joined_normalised], _DOB_PROOF_KEYWORDS),
    )

    nrega_hindi_titles = (
        "राष्ट्रीय ग्रामीण रोजगार गारंटी",
        "महात्मा गांधी राष्ट्रीय ग्रामीण रोजगार गारंटी",
    )
    has_nrega_hindi_title = any(
        title in joined_raw for title in nrega_hindi_titles
    )
    has_nrega_hindi_card_context = (
        "जॉब कार्ड" in joined_raw
        and any(
            phrase in joined_raw
            for phrase in ("ग्राम पंचायत", "रोजगार गारंटी")
        )
    )
    has_nrega_acronym = any(
        f" NREGA " in f" {region_text} " for region_text in normalised_regions
    )
    has_npr_hindi_title = (
        "राष्ट्रीय जनसंख्या रजिस्टर" in joined_raw
    )
    has_npr_acronym = any(
        f" NPR " in f" {region_text} " for region_text in normalised_regions
    )

    has_pan = _any_token(regions, normalize_pan)
    aadhaar_number = extract_aadhaar_number(joined_raw)
    aadhaar_checksum_ok = is_valid_aadhaar(joined_raw)
    has_dl = _any_token(regions, normalize_dl)
    has_epic = _any_token(regions, normalize_epic)
    has_mrz = _has_mrz_like_lines(regions)

    scores: dict[str, float] = {}
    reasons: dict[str, list[str]] = {}

    def add(doc: str, score: float, *why: str):
        scores[doc] = scores.get(doc, 0.0) + score
        reasons.setdefault(doc, []).extend(why)

    # Keyword weight: 2 per distinct phrase. Format/identifier weight: 3.
    if pan_kw:
        add("pan", 2 * pan_kw, f"PAN_KEYWORDS_{pan_kw}")
    if has_pan:
        add("pan", 3, "PAN_FORMAT")

    if aadhaar_kw:
        add("aadhaar", 2 * aadhaar_kw, f"AADHAAR_KEYWORDS_{aadhaar_kw}")
    if aadhaar_number:
        add("aadhaar", 3, "AADHAAR_NUMBER")
    if aadhaar_checksum_ok:
        add("aadhaar", 2, "AADHAAR_CHECKSUM_VALID")

    if dl_kw:
        add("driving_licence", 2 * dl_kw, f"DL_KEYWORDS_{dl_kw}")
    if has_dl:
        add("driving_licence", 3, "DL_FORMAT")

    if voter_kw:
        add("voter_id", 2 * voter_kw, f"VOTER_KEYWORDS_{voter_kw}")
    if has_epic:
        add("voter_id", 3, "EPIC_FORMAT")

    if nrega_explicit_kw or has_nrega_hindi_title:
        add(
            "nrega_job_card",
            9 + min(nrega_explicit_kw, 2),
            "NREGA_EXPLICIT_TITLE",
        )
    elif (
        (has_nrega_acronym and (nrega_job_card_kw or nrega_context_kw))
        or (nrega_job_card_kw and nrega_context_kw)
        or has_nrega_hindi_card_context
    ):
        add("nrega_job_card", 8, "NREGA_JOB_CARD_CONTEXT")

    if npr_title_kw or has_npr_hindi_title:
        add("npr_letter", 9, "NPR_EXPLICIT_TITLE")
    elif has_npr_acronym and npr_issuer_kw:
        add("npr_letter", 8, "NPR_ISSUER_CONTEXT")

    if visa_kw:
        add("visa", 2 * visa_kw, f"VISA_KEYWORDS_{visa_kw}")
    if passport_kw:
        add("passport", 2 * passport_kw, f"PASSPORT_KEYWORDS_{passport_kw}")
    if has_mrz:
        add("passport", 4, "MRZ_DETECTED")
    if dob_kw:
        add("dob_proof", 3 * dob_kw, f"DOB_KEYWORDS_{dob_kw}")

    if not scores:
        return DocumentClassification("unknown", 0.2, ["NO_DOCUMENT_HINTS"], probe_text)

    best_doc = max(scores, key=lambda d: scores[d])
    best_score = scores[best_doc]

    confidence = round(min(0.5 + 0.12 * best_score, 0.98), 3)
    return DocumentClassification(
        document_type=best_doc,
        confidence=confidence,
        reasons=reasons.get(best_doc, []),
        probe_text=probe_text,
    )
