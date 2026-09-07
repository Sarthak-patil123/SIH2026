"""MRZ parsing package.

Public API:
  extract_mrz(mrz_crop: np.ndarray) -> MRZResult | TravelMRZResult | None
"""
from __future__ import annotations

import numpy as np

from ocr.engine import run_ocr
from .parser import MRZResult, parse_mrz
from .travel_mrz import TravelMRZResult, parse_travel_mrz


def extract_mrz(mrz_crop: np.ndarray) -> MRZResult | TravelMRZResult | None:
    """
    Unified MRZ extraction from a cropped MRZ image.

    Steps:
    1. Run OCR on the crop to get TextRegion list.
    2. Try parse_mrz()  (TD3 — 2x44 chars, Passport format).
    3. If None, try parse_travel_mrz() (TD1/TD2/MRV-A/MRV-B — ID cards, visas).
    4. Return the first successful result, or None.

    Args:
        mrz_crop: BGR numpy array of the MRZ zone, already isolated by YOLO.

    Returns:
        MRZResult (passport) | TravelMRZResult (ID/visa) | None (parse failure)
    """
    regions = run_ocr(mrz_crop)
    result = parse_mrz(regions)
    if result is not None:
        return result
    return parse_travel_mrz(regions)


__all__ = ["extract_mrz", "MRZResult", "TravelMRZResult", "parse_mrz", "parse_travel_mrz"]
