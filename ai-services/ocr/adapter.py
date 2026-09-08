"""OCR Result Adapter Layer.

Converts raw processor outputs from every OCR module into a canonical
``AdaptedResult`` JSON structure so downstream consumers never need to
handle per-module schema differences or invoke an LLM for parsing.

Design principles
-----------------
* **No LLM involvement** — all normalisation is deterministic.
* **Stable contract** — field names are predefined per document type.
* **Graceful degradation** — missing fields are ``null``, never absent.
* **Confidence propagation** — each field carries a 0-1 confidence.
* **Provenance** — each field records whether it came from MRZ or OCR.

Usage
-----
    from ocr.adapter import adapt_result

    raw = process_passport(image)
    adapted = adapt_result(raw)           # → AdaptedResult (dataclass)
    print(adapted.to_dict())              # → plain dict, JSON-serialisable
    print(adapted.to_json())             # → JSON string
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from typing import Any, Literal

# ---------------------------------------------------------------------------
# Field-level model
# ---------------------------------------------------------------------------

FieldSource = Literal["mrz", "ocr", "derived", "unknown"]


@dataclass
class FieldResult:
    """A single extracted field with provenance metadata."""

    value: str | None = None
    confidence: float = 0.0
    source: FieldSource = "unknown"
    normalized: bool = False        # True if value was post-processed

    def to_dict(self) -> dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Canonical per-document schemas
# ---------------------------------------------------------------------------

PASSPORT_FIELDS: list[str] = [
    "passport_number",
    "surname",
    "given_names",
    "nationality",
    "country_code",
    "date_of_birth",
    "sex",
    "expiry_date",
    "personal_number",
    "place_of_birth",
    "date_of_issue",
    "place_of_issue",
]

NATIONAL_ID_FIELDS: dict[str, list[str]] = {
    "aadhaar": [
        "aadhaar_number",
        "name",
        "date_of_birth",
        "gender",
        "address",
        "pincode",
        "mobile_last4",
        "vid",
    ],
    "pan": [
        "pan_number",
        "name",
        "father_name",
        "date_of_birth",
    ],
    "voter_id": [
        "epic_number",
        "name",
        "relation_name",
        "gender",
        "date_of_birth",
        "part_number",
        "serial_number",
        "constituency",
        "district",
        "state",
    ],
}

DRIVING_LICENSE_FIELDS: list[str] = [
    "dl_number",
    "name",
    "relation_name",
    "date_of_birth",
    "issue_date",
    "validity_date",
    "validity_date_transport",
    "class_of_vehicle",
    "blood_group",
    "address",
    "rto_code",
    "hazardous_valid_till",
    "hill_valid_till",
]

DOB_PROOF_FIELDS: list[str] = [
    "name",
    "date_of_birth",
    "father_name",
    "mother_name",
    "registration_number",
    "place_of_birth",
    "issuing_authority",
    "issue_date",
]

VISA_FIELDS: list[str] = [
    "document_number",
    "passport_number",
    "surname",
    "given_names",
    "nationality",
    "visa_type",
    "entries",
    "issue_date",
    "expiry_date",
    "issuing_post",
]


# ---------------------------------------------------------------------------
# Top-level adapted result
# ---------------------------------------------------------------------------

@dataclass
class MRZSummary:
    is_valid: bool = False
    mrz_type: str | None = None
    raw_lines: list[str] = field(default_factory=list)
    checksums: dict[str, bool] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class AdaptedResult:
    """The canonical normalised output from any OCR processor module.

    All fields in ``extracted_fields`` are guaranteed to be present with
    ``None`` values if not found — enabling safe downstream access.
    """

    document_type: str
    subtype: str | None
    country: str | None
    status: str                          # "success" | "partial" | "error"
    confidence: float                    # 0-1 aggregate
    extracted_fields: dict[str, FieldResult]
    mrz: MRZSummary | None
    validation_errors: list[str]
    validation_warnings: list[str]
    quality_warnings: list[str]
    raw_ocr_count: int
    adapter_version: str = "1.0"

    # ------------------------------------------------------------------ #

    def to_dict(self) -> dict[str, Any]:
        """Return a plain dict suitable for JSON serialisation."""
        fields_out = {k: v.to_dict() for k, v in self.extracted_fields.items()}
        return {
            "adapter_version": self.adapter_version,
            "document_type": self.document_type,
            "subtype": self.subtype,
            "country": self.country,
            "status": self.status,
            "aggregate_confidence": round(self.confidence, 4),
            "extracted_fields": fields_out,
            "mrz": self.mrz.to_dict() if self.mrz else None,
            "validation": {
                "errors": self.validation_errors,
                "warnings": self.validation_warnings,
            },
            "quality_warnings": self.quality_warnings,
            "raw_ocr_count": self.raw_ocr_count,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=indent)

    def flat_fields(self) -> dict[str, str | None]:
        """Return simple ``{field_name: value}`` dict — useful for display."""
        return {k: v.value for k, v in self.extracted_fields.items()}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _make_field(
    raw_fields: dict[str, Any],
    key: str,
    source: FieldSource = "ocr",
    confidence: float = 0.85,
) -> FieldResult:
    """Extract a field from the raw processor output safely."""
    val = raw_fields.get(key)
    if val is None or val == "":
        return FieldResult(value=None, confidence=0.0, source=source)
    return FieldResult(
        value=str(val).strip(),
        confidence=confidence,
        source=source,
        normalized=False,
    )


def _mrz_field(mrz_raw: dict | None, key: str) -> FieldResult:
    """Pull a field from MRZ sub-dict with higher confidence."""
    if not mrz_raw:
        return FieldResult()
    fields = mrz_raw.get("fields", mrz_raw)
    val = fields.get(key)
    if val is None or val == "":
        return FieldResult()
    return FieldResult(value=str(val).strip(), confidence=0.97, source="mrz")


def _compute_confidence(extracted: dict[str, FieldResult], required: list[str]) -> float:
    """Compute aggregate confidence from required fields fill-rate x field confidence."""
    if not required:
        return 0.0
    filled = [v for k, v in extracted.items() if k in required and v.value is not None]
    fill_rate = len(filled) / len(required)
    avg_conf = sum(v.confidence for v in filled) / len(filled) if filled else 0.0
    return round(fill_rate * avg_conf, 4)


def _empty_fields(schema: list[str]) -> dict[str, FieldResult]:
    return {k: FieldResult() for k in schema}


# ---------------------------------------------------------------------------
# Per-type adapters
# ---------------------------------------------------------------------------

def _adapt_passport(raw: dict[str, Any]) -> AdaptedResult:
    fields_raw = raw.get("fields", {})
    mrz_raw = raw.get("mrz")

    extracted: dict[str, FieldResult] = _empty_fields(PASSPORT_FIELDS)

    # MRZ-sourced fields (higher confidence)
    if mrz_raw:
        mrz_fields = mrz_raw.get("fields", mrz_raw)
        for key in ["passport_number", "surname", "given_names", "nationality",
                    "country_code", "date_of_birth", "sex", "expiry_date", "personal_number"]:
            f = _mrz_field(mrz_raw, key)
            if f.value:
                extracted[key] = f

    # Visual / rule-based fields (supplement MRZ)
    for k in PASSPORT_FIELDS:
        if extracted[k].value is None:
            extracted[k] = _make_field(fields_raw, k)

    # MRZ summary
    mrz_summary = None
    if mrz_raw:
        mrz_summary = MRZSummary(
            is_valid=mrz_raw.get("is_valid", False),
            mrz_type=mrz_raw.get("type"),
            raw_lines=mrz_raw.get("raw_lines", []),
            checksums=mrz_raw.get("checksums", {}),
        )

    val_info = raw.get("validation", {})
    conf = _compute_confidence(
        extracted,
        required=["passport_number", "surname", "given_names", "date_of_birth", "expiry_date"],
    )

    return AdaptedResult(
        document_type="passport",
        subtype=None,
        country=(
            extracted.get("country_code", FieldResult()).value
            or (mrz_raw.get("country_code") if mrz_raw else None)
        ),
        status=raw.get("status", "success"),
        confidence=conf,
        extracted_fields=extracted,
        mrz=mrz_summary,
        validation_errors=val_info.get("errors", []),
        validation_warnings=val_info.get("warnings", []),
        quality_warnings=raw.get("quality_warnings", []),
        raw_ocr_count=raw.get("raw_ocr_count", 0),
    )


def _adapt_national_id(raw: dict[str, Any]) -> AdaptedResult:
    subtype = raw.get("subtype", "aadhaar")
    fields_raw = raw.get("fields", {})

    schema = NATIONAL_ID_FIELDS.get(subtype, NATIONAL_ID_FIELDS["aadhaar"])
    extracted: dict[str, FieldResult] = _empty_fields(schema)

    for k in schema:
        extracted[k] = _make_field(fields_raw, k)

    # Required fields by subtype
    required_map = {
        "aadhaar": ["aadhaar_number", "name"],
        "pan": ["pan_number", "name"],
        "voter_id": ["epic_number", "name"],
    }
    conf = _compute_confidence(extracted, required=required_map.get(subtype, []))

    return AdaptedResult(
        document_type="national_id",
        subtype=subtype,
        country=raw.get("country", "IND"),
        status=raw.get("status", "success"),
        confidence=conf,
        extracted_fields=extracted,
        mrz=None,
        validation_errors=[],
        validation_warnings=[],
        quality_warnings=raw.get("quality_warnings", []),
        raw_ocr_count=raw.get("raw_ocr_count", 0),
    )


def _adapt_driving_license(raw: dict[str, Any]) -> AdaptedResult:
    fields_raw = raw.get("fields", {})

    extracted: dict[str, FieldResult] = _empty_fields(DRIVING_LICENSE_FIELDS)
    for k in DRIVING_LICENSE_FIELDS:
        extracted[k] = _make_field(fields_raw, k)

    is_valid = raw.get("is_valid_format", False)
    if extracted["dl_number"].value:
        extracted["dl_number"].normalized = is_valid

    conf = _compute_confidence(extracted, required=["dl_number", "name", "date_of_birth"])

    return AdaptedResult(
        document_type="driving_license",
        subtype=None,
        country=raw.get("country", "IND"),
        status=raw.get("status", "success"),
        confidence=conf,
        extracted_fields=extracted,
        mrz=None,
        validation_errors=[] if is_valid else (
            ["DL number format invalid"] if extracted["dl_number"].value else []
        ),
        validation_warnings=[],
        quality_warnings=raw.get("quality_warnings", []),
        raw_ocr_count=raw.get("raw_ocr_count", 0),
    )


def _adapt_dob_proof(raw: dict[str, Any]) -> AdaptedResult:
    fields_raw = raw.get("fields", {})

    extracted: dict[str, FieldResult] = _empty_fields(DOB_PROOF_FIELDS)
    for k in DOB_PROOF_FIELDS:
        extracted[k] = _make_field(fields_raw, k)

    conf = _compute_confidence(extracted, required=["name", "date_of_birth"])

    return AdaptedResult(
        document_type="dob_proof",
        subtype=None,
        country=None,
        status=raw.get("status", "success"),
        confidence=conf,
        extracted_fields=extracted,
        mrz=None,
        validation_errors=[],
        validation_warnings=[],
        quality_warnings=raw.get("quality_warnings", []),
        raw_ocr_count=raw.get("raw_ocr_count", 0),
    )


def _adapt_visa(raw: dict[str, Any]) -> AdaptedResult:
    fields_raw = raw.get("fields", {})
    mrz_raw = raw.get("mrz")

    extracted: dict[str, FieldResult] = _empty_fields(VISA_FIELDS)
    for k in VISA_FIELDS:
        extracted[k] = _make_field(fields_raw, k)

    mrz_summary = None
    if mrz_raw:
        mrz_summary = MRZSummary(
            is_valid=bool(mrz_raw.get("checks", {}).get("composite_valid", False)),
            mrz_type=mrz_raw.get("type", "MRV"),
            raw_lines=[],
            checksums=mrz_raw.get("checks", {}),
        )

    conf = _compute_confidence(extracted, required=["document_number", "surname", "expiry_date"])

    return AdaptedResult(
        document_type="visa",
        subtype=None,
        country=fields_raw.get("issuing_country") or (mrz_raw.get("issuing_country") if mrz_raw else None),
        status=raw.get("status", "success"),
        confidence=conf,
        extracted_fields=extracted,
        mrz=mrz_summary,
        validation_errors=[],
        validation_warnings=[],
        quality_warnings=raw.get("quality_warnings", []),
        raw_ocr_count=raw.get("raw_ocr_count", 0),
    )


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

_ADAPTERS = {
    "passport": _adapt_passport,
    "national_id": _adapt_national_id,
    "aadhaar": _adapt_national_id,
    "pan": _adapt_national_id,
    "voter_id": _adapt_national_id,
    "driving_license": _adapt_driving_license,
    "driving_licence": _adapt_driving_license,
    "dob_proof": _adapt_dob_proof,
    "visa": _adapt_visa,
}


def adapt_result(raw: dict[str, Any]) -> AdaptedResult:
    """Convert a raw processor dict into a canonical ``AdaptedResult``.

    Args:
        raw: The dict returned by any ``process_*`` function.

    Returns:
        ``AdaptedResult`` with all canonical fields guaranteed present.

    Raises:
        ValueError: if ``document_type`` key is absent from *raw*.
    """
    doc_type = raw.get("document_type", "").lower().strip()
    if not doc_type:
        raise ValueError("'document_type' key missing from raw processor result.")

    adapter_fn = _ADAPTERS.get(doc_type)
    if adapter_fn is None:
        raise ValueError(
            f"No adapter registered for document_type '{doc_type}'. "
            f"Available: {list(_ADAPTERS.keys())}"
        )
    return adapter_fn(raw)
