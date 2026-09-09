"""Shared OCR utilities: validators, classifiers, evidence tracking."""
from .document_classifier import classify_document, DocumentClassification
from .validators import (
    normalize_dl,
    normalize_pan,
    normalize_epic,
    is_valid_aadhaar,
    extract_aadhaar_number,
    is_valid_pan,
    is_valid_dl,
    is_valid_epic,
)

__all__ = [
    "classify_document",
    "DocumentClassification",
    "normalize_dl",
    "normalize_pan",
    "normalize_epic",
    "is_valid_aadhaar",
    "extract_aadhaar_number",
    "is_valid_pan",
    "is_valid_dl",
    "is_valid_epic",
]
