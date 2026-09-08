"""
PaddleOCR wrapper. Accepts a preprocessed image, returns detected text regions.

Uses PaddleOCR models with text detection, angle classification, and recognition.
"""

from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass
from typing import Optional

os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

import numpy as np
from core.exceptions import OCREngineError
from core.logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

@dataclass
class TextRegion:
    text: str
    bbox: list[list[int]]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    confidence: float


class OCRModelInitError(OCREngineError):
    """Raised when the PaddleOCR models cannot be initialised."""


# ---------------------------------------------------------------------------
# Singleton OCR instance
# ---------------------------------------------------------------------------

import cv2

_lock = threading.Lock()
_ocr_instances: dict[str, object] = {}

_LANG_MAP = {
    "en": "en",
    "latin": "latin",
    "hi": "devanagari",
    "devanagari": "devanagari",
    "ta": "ta",
    "te": "te",
    "ar": "ar",
    "arabic": "ar",
    "cyrillic": "cyrillic",
    "ru": "cyrillic",
    "ch": "ch",
    "chinese": "ch",
    "japan": "japan",
    "korean": "korean",
}


def _get_ocr(lang: str = "en"):
    """Get or create a cached PaddleOCR engine instance.

    PaddleOCR is the sole OCR engine.

    Raises:
        OCRModelInitError: if PaddleOCR initialisation fails.
    """
    if lang in _ocr_instances:
        return _ocr_instances[lang]

    try:
        from paddleocr import PaddleOCR
        with _lock:
            if lang in _ocr_instances:
                return _ocr_instances[lang]

            paddle_lang = _LANG_MAP.get(lang, "en")
            try:
                instance = PaddleOCR(use_angle_cls=True, lang=paddle_lang)
            except TypeError:
                instance = PaddleOCR(lang=paddle_lang)

            _ocr_instances[lang] = instance
            logger.info("PaddleOCR engine initialised for language: %s", paddle_lang)
            return _ocr_instances[lang]
    except Exception as exc:
        logger.exception("PaddleOCR model initialisation failed")
        raise OCRModelInitError(
            f"MODEL_INIT_FAILED: PaddleOCR failed to initialise ({exc})"
        ) from exc


def _call_paddleocr(ocr_instance, image: np.ndarray):
    """Execute PaddleOCR inference on an image array."""
    try:
        return ocr_instance.ocr(image, cls=True)
    except TypeError:
        return ocr_instance.ocr(image)


# ---------------------------------------------------------------------------
# Result parsing
# ---------------------------------------------------------------------------

def _parse_paddleocr_results(result) -> list[TextRegion]:
    """Parse PaddleOCR output into TextRegion list.

    Supports:
    - PaddleOCR 2.x nested list format: [[[bbox, (text, score)], ...]]
    - PaddleOCR 3.x / PaddleX dict format: [{'dt_polys': [...], 'rec_texts': [...], 'rec_scores': [...]}]
    """
    regions: list[TextRegion] = []
    if not result:
        return regions

    # Extract primary item (first image/page result)
    item = result[0] if isinstance(result, list) and len(result) > 0 else result
    if item is None:
        return regions

    # Format 1: Dictionary output (PaddleOCR 3.x / PaddleX)
    if isinstance(item, dict):
        boxes = item.get("dt_polys") or item.get("rec_boxes") or item.get("dt_boxes") or []
        texts = item.get("rec_texts") or item.get("rec_text") or []
        scores = item.get("rec_scores") or item.get("rec_score") or []

        for box, txt, score in zip(boxes, texts, scores):
            text = str(txt).strip()
            if text:
                try:
                    bbox = [[int(round(pt[0])), int(round(pt[1]))] for pt in box]
                    confidence = float(score)
                    regions.append(TextRegion(text=text, bbox=bbox, confidence=confidence))
                except (ValueError, TypeError, IndexError):
                    continue
        return regions

    # Format 2: Classic PaddleOCR 2.x list of lines
    if isinstance(item, list):
        for line in item:
            if not line or len(line) < 2:
                continue
            box, text_info = line[0], line[1]
            if isinstance(text_info, (tuple, list)) and len(text_info) >= 2:
                text = str(text_info[0]).strip()
                try:
                    score = float(text_info[1])
                except (ValueError, TypeError):
                    score = 1.0
            elif isinstance(text_info, str):
                text = text_info.strip()
                score = 1.0
            else:
                continue

            if text:
                try:
                    bbox = [[int(round(pt[0])), int(round(pt[1]))] for pt in box]
                    regions.append(TextRegion(text=text, bbox=bbox, confidence=score))
                except (ValueError, TypeError, IndexError):
                    continue

    return regions


# ---------------------------------------------------------------------------
# Script detection
# ---------------------------------------------------------------------------

def _is_likely_non_latin(regions: list[TextRegion]) -> bool:
    """Heuristic: if > 40% of characters in detected text are non-ASCII, re-run
    with multilingual / devanagari model."""
    all_text = "".join(r.text for r in regions)
    if not all_text:
        return False
    non_ascii = sum(1 for c in all_text if ord(c) > 127)
    return (non_ascii / len(all_text)) > 0.4


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_ocr(
    image: np.ndarray,
    *,
    lang: Optional[str] = None,
) -> list[TextRegion]:
    """
    Run PaddleOCR on a preprocessed image.

    Args:
        image: BGR numpy array (preprocessed).
        lang: Force a language. If None, starts with 'en' and falls back to
              'devanagari' if non-Latin script is detected.

    Returns:
        List of TextRegion with text, bounding box, and confidence.
    """
    if image is None or not isinstance(image, np.ndarray) or image.size == 0:
        return []

    # Ensure 3-channel BGR format for PaddleOCR
    if len(image.shape) == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    elif len(image.shape) == 3 and image.shape[2] == 4:
        image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
    elif len(image.shape) != 3 or image.shape[2] != 3:
        logger.warning("Unsupported image shape for OCR: %s", getattr(image, "shape", None))
        return []

    use_lang = lang or "en"
    ocr = _get_ocr(use_lang)

    try:
        result = _call_paddleocr(ocr, image)
    except Exception as exc:
        logger.exception("PaddleOCR inference failed (lang=%s)", use_lang)
        raise OCREngineError(f"OCR_INFERENCE_FAILED: {exc}") from exc

    regions = _parse_paddleocr_results(result)

    # Auto-detect non-Latin and retry with multilingual/devanagari
    if lang is None and _is_likely_non_latin(regions):
        try:
            return run_ocr(image, lang="devanagari")
        except Exception as exc:
            logger.warning("Fallback to devanagari OCR failed: %s; keeping latin results", exc)
            return regions

    return regions


def cluster_regions_by_line(
    regions: list[TextRegion],
    *,
    y_overlap_ratio: float = 0.5,
) -> list[list[TextRegion]]:
    """Cluster TextRegions that share the same horizontal text line.

    Useful when PaddleOCR breaks a continuous line (such as an MRZ or name)
    into multiple neighboring bounding boxes.

    Returns:
        List of lines (each line is a list of TextRegions sorted left-to-right).
    """
    if not regions:
        return []

    # Sort primarily by vertical center
    def _box_center_y(r: TextRegion) -> float:
        if not r.bbox:
            return 0.0
        ys = [p[1] for p in r.bbox]
        return (min(ys) + max(ys)) / 2.0

    def _box_height(r: TextRegion) -> float:
        if not r.bbox:
            return 1.0
        ys = [p[1] for p in r.bbox]
        return max(max(ys) - min(ys), 1.0)

    sorted_regions = sorted(regions, key=_box_center_y)
    lines: list[list[TextRegion]] = []

    for reg in sorted_regions:
        cy = _box_center_y(reg)
        h = _box_height(reg)
        placed = False

        for line in lines:
            line_cy = sum(_box_center_y(r) for r in line) / len(line)
            line_h = sum(_box_height(r) for r in line) / len(line)
            tol = max(h, line_h) * y_overlap_ratio

            if abs(cy - line_cy) <= tol:
                line.append(reg)
                placed = True
                break

        if not placed:
            lines.append([reg])

    # Sort each line left-to-right
    for line in lines:
        line.sort(key=lambda r: min(p[0] for p in r.bbox) if r.bbox else 0)

    # Sort lines top-to-bottom
    lines.sort(key=lambda line: sum(_box_center_y(r) for r in line) / len(line))
    return lines

