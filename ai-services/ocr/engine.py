"""
PaddleOCR wrapper. Accepts a preprocessed image, returns detected text regions.

Uses PaddleOCR models with text detection, angle classification, and recognition.
"""

from __future__ import annotations

import logging
import threading
from dataclasses import dataclass
from typing import Optional

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

_lock = threading.Lock()
_ocr_instances: dict[str, object] = {}

_LANG_MAP = {
    "en": "en",
    "latin": "latin",
    "hi": "hi",
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
    """Get or create a cached PaddleOCR instance.

    Raises:
        OCRModelInitError: if PaddleOCR model initialisation fails. A failed
            instance is never cached, so a subsequent call can retry.
    """
    if lang in _ocr_instances:
        return _ocr_instances[lang]

    try:
        from paddleocr import PaddleOCR
    except Exception as exc:  # pragma: no cover - import failure is environmental
        logger.exception("Failed to import paddleocr")
        raise OCRModelInitError(f"MODEL_INIT_FAILED: paddleocr import failed: {exc}") from exc

    with _lock:
        # Re-check under the lock — another thread may have built it.
        if lang in _ocr_instances:
            return _ocr_instances[lang]

        paddle_lang = _LANG_MAP.get(lang, "en")
        try:
            instance = PaddleOCR(use_angle_cls=True, lang=paddle_lang)
        except TypeError:
            try:
                instance = PaddleOCR(lang=paddle_lang)
            except Exception as exc:
                logger.exception("PaddleOCR model initialisation failed (lang=%s)", lang)
                raise OCRModelInitError(
                    f"MODEL_INIT_FAILED: could not initialise PaddleOCR models for lang={lang}: {exc}"
                ) from exc
        except Exception as exc:
            # Do NOT cache — leave the slot empty so a later call can retry.
            logger.exception("PaddleOCR model initialisation failed (lang=%s)", lang)
            raise OCRModelInitError(
                f"MODEL_INIT_FAILED: could not initialise PaddleOCR models for lang={lang}: {exc}"
            ) from exc

        _ocr_instances[lang] = instance

    return _ocr_instances[lang]


def _call_paddleocr(ocr_instance, image: np.ndarray):
    """Execute OCR inference on an image array."""
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
        return run_ocr(image, lang="devanagari")

    return regions
