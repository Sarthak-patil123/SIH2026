"""Explicit document capabilities and normalized country/type hints."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class DocumentProfile:
    document_type: str
    name: str
    countries: tuple[str, ...]
    fields: tuple[str, ...]
    required_fields: tuple[str, ...]
    extraction_methods: tuple[str, ...]
    experimental: bool = True
    legacy: bool = False


_IDENTITY = ("surname", "given_names", "date_of_birth", "document_number", "expiry_date")
_ADDRESS = ("address", "city", "state", "postal_code")
_MRZ = ("country_code", "mrz_raw")
_PROFILES = (
    DocumentProfile("passport", "Passport book", ("*",), ("surname", "given_names", "full_name", "passport_number", "nationality", "date_of_birth", "sex", "expiry_date", "issue_date", "place_of_birth", "country_code"), ("surname", "passport_number"), ("mrz", "ocr"), False, True),
    DocumentProfile("pan", "Indian PAN card", ("IN",), ("pan_number", "name", "father_name", "date_of_birth"), ("pan_number", "name", "date_of_birth"), ("ocr",), False, True),
    DocumentProfile("aadhaar", "Indian Aadhaar card", ("IN",), ("aadhaar_number", "name", "date_of_birth", "year_of_birth", "gender", "address", "pincode", "checksum_valid", "aadhaar_masked", "aadhaar_last4", "vid"), ("aadhaar_number_or_masked_last4", "name", "date_or_year_of_birth", "gender"), ("ocr",), False, True),
    DocumentProfile("driving_licence", "Indian driving licence", ("IN",), ("dl_number", "name", "date_of_birth", "issue_date", "validity_date", "address", "relation_name", "blood_group", "class_of_vehicle", "validity_date_transport"), ("dl_number", "name", "date_of_birth", "issue_date", "validity_date"), ("ocr",), False, True),
    DocumentProfile("voter_id", "Indian voter ID", ("IN",), ("epic_number", "name", "relation_name", "relation_type", "gender", "date_of_birth", "age"), ("epic_number", "name", "date_of_birth_or_age"), ("ocr",), False, True),
    DocumentProfile("nrega_job_card", "Indian NREGA job card", ("IN",), ("job_card_number", "head_of_household", "category", "registration_date", "validity_from", "validity_to", "address", "village", "gram_panchayat", "block", "district", "state", "bpl_status", "family_id", "members"), ("job_card_number", "household_or_member_name", "location"), ("ocr",), True, True),
    DocumentProfile("npr_letter", "Indian NPR letter", ("IN",), ("reference_number", "name", "address", "pincode", "issue_date"), ("name", "address"), ("ocr",), True, True),
    DocumentProfile("us_driver_license", "US driver license", ("US",), _IDENTITY + _ADDRESS + ("first_name", "middle_names", "issue_date", "sex", "license_class", "restrictions", "endorsements"), ("surname", "document_number", "date_of_birth", "expiry_date"), ("pdf417", "ocr")),
    DocumentProfile("us_state_id", "US state identification card", ("US",), _IDENTITY + _ADDRESS + ("first_name", "middle_names", "issue_date", "sex"), ("surname", "document_number", "date_of_birth", "expiry_date"), ("pdf417", "ocr")),
    DocumentProfile("passport_card", "Passport card", ("*",), _IDENTITY + ("nationality", "sex", "issue_date", "address") + _MRZ, ("surname", "document_number", "date_of_birth", "expiry_date"), ("mrz", "ocr")),
    DocumentProfile("us_green_card", "US Permanent Resident Card (I-551)", ("US",), ("surname", "given_names", "uscis_number", "card_number", "date_of_birth", "expiry_date", "category", "resident_since", "country_of_birth", "sex") + _MRZ, ("surname", "uscis_number", "card_number", "date_of_birth"), ("mrz", "ocr")),
    DocumentProfile("us_ead", "US Employment Authorization Document (I-766)", ("US",), ("surname", "given_names", "uscis_number", "card_number", "date_of_birth", "expiry_date", "category", "valid_from", "country_of_birth", "sex") + _MRZ, ("surname", "uscis_number", "card_number", "date_of_birth", "expiry_date"), ("mrz", "ocr")),
    DocumentProfile("visa", "Machine-readable visa (MRV-A / MRV-B)", ("*",), _IDENTITY + ("nationality", "sex", "mrz_format") + _MRZ, ("surname", "document_number", "date_of_birth", "expiry_date"), ("mrz", "ocr")),
    DocumentProfile("us_i94", "US I-94 arrival/departure record", ("US",), ("i94_number", "surname", "given_names", "date_of_birth", "admission_date", "admit_until", "class_of_admission", "passport_number", "country_of_citizenship"), ("i94_number", "surname", "class_of_admission", "admit_until"), ("ocr",)),
    DocumentProfile("us_w9", "US Form W-9", ("US",), ("name", "business_name", "taxpayer_id", "taxpayer_id_type", "address", "city_state_postal_code"), ("name", "taxpayer_id", "taxpayer_id_type"), ("ocr",)),
)
DOCUMENT_PROFILES = {profile.document_type: profile for profile in _PROFILES}

_COMMON_ALPHA3_TO_ALPHA2 = {
    "USA": "US", "IND": "IN", "GBR": "GB", "CAN": "CA", "AUS": "AU",
    "DEU": "DE", "FRA": "FR", "JPN": "JP", "CHN": "CN", "BRA": "BR",
    "RUS": "RU", "ZAF": "ZA", "ITA": "IT", "ESP": "ES", "KOR": "KR",
}


def normalize_country(country: str | None) -> str | None:
    if country is None:
        return None
    if not isinstance(country, str):
        raise ValueError("INVALID_COUNTRY_HINT_TYPE")
    value = country.strip().upper()
    aliases = {"USA": "US", "UNITED STATES": "US", "UNITED STATES OF AMERICA": "US", "IND": "IN", "INDIA": "IN", "UK": "GB"}
    value = aliases.get(value, value)
    try:
        import pycountry
        result = pycountry.countries.get(alpha_2=value) if len(value) == 2 else pycountry.countries.get(alpha_3=value)
        if result is not None:
            return result.alpha_2
    except ImportError:
        pass

    if len(value) == 2:
        return value
    if len(value) == 3:
        if value in _COMMON_ALPHA3_TO_ALPHA2:
            return _COMMON_ALPHA3_TO_ALPHA2[value]
        return value[:2]
    return value


def validate_document_hint(document_type: str | None, country: str | None = None) -> tuple[str | None, str | None]:
    """Return canonical hints or fail explicitly instead of ignoring a conflict."""
    if document_type is None and country is None:
        return None, None
    norm_country = normalize_country(country) if country is not None else None
    if document_type is None:
        return None, norm_country
    if not isinstance(document_type, str):
        raise ValueError("INVALID_DOCUMENT_TYPE_HINT_TYPE")
    key = document_type.strip().lower().replace("-", "_").replace(" ", "_")
    profile = DOCUMENT_PROFILES.get(key)
    if profile is None:
        raise ValueError(f"UNSUPPORTED_DOCUMENT_TYPE: {document_type}")
    if norm_country is not None and "*" not in profile.countries and norm_country not in profile.countries:
        raise ValueError(f"DOCUMENT_COUNTRY_MISMATCH: {document_type} is not valid for country {country}")
    return profile.document_type, norm_country
