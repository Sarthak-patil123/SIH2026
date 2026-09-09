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
    """Get or create a cached OCR engine instance (PaddleOCR primary, EasyOCR fallback).

    Raises:
        OCRModelInitError: if both PaddleOCR and EasyOCR initialisation fail.
    """
    if lang in _ocr_instances:
        return _ocr_instances[lang]

    # Primary engine: PaddleOCR
    paddle_exc = None
    try:
        from paddleocr import PaddleOCR
        with _lock:
            if lang in _ocr_instances:
                return _ocr_instances[lang]

            paddle_lang = _LANG_MAP.get(lang, "en")
            try:
                instance = PaddleOCR(
                    use_angle_cls=True,
                    lang=paddle_lang,
                    det_db_thresh=0.22,        # Captures faint text, stamps & registration numbers
                    det_db_box_thresh=0.48,    # Preserves small number boxes and dates
                    det_db_unclip_ratio=1.85,  # Prevents clipping slashes, ascenders/descenders & matras
                    det_limit_side_len=1536,   # High-resolution detection for dense certificates
                    use_dilation=True,         # Connects broken/dot-matrix print
                    drop_score=0.30,           # Retains low-confidence tokens for LLM parsing
                )
            except TypeError:
                instance = PaddleOCR(
                    lang=paddle_lang,
                    det_db_thresh=0.22,
                    det_db_box_thresh=0.48,
                    det_db_unclip_ratio=1.85,
                    det_limit_side_len=1536,
                    use_dilation=True,
                    drop_score=0.30,
                )

            _ocr_instances[lang] = instance
            logger.info("PaddleOCR engine initialised with tuned parameters for language: %s", paddle_lang)
            return _ocr_instances[lang]
    except Exception as exc:
        paddle_exc = exc
        logger.info("PaddleOCR not available (%s), checking for EasyOCR fallback...", exc)

    # Resilient fallback: EasyOCR
    try:
        import easyocr
        with _lock:
            if lang in _ocr_instances:
                return _ocr_instances[lang]

            easy_langs = ["en"]
            if lang in ("hi", "devanagari"):
                easy_langs = ["hi", "en"]
            reader = easyocr.Reader(easy_langs, gpu=False, verbose=False)
            instance = ("easyocr", reader)
            _ocr_instances[lang] = instance
            logger.info("Using EasyOCR engine (langs=%s)", easy_langs)
            return _ocr_instances[lang]
    except Exception as easy_exc:
        logger.exception("OCR model initialisation failed for both PaddleOCR and EasyOCR")
        raise OCRModelInitError(
            f"MODEL_INIT_FAILED: PaddleOCR failed ({paddle_exc}) and EasyOCR failed ({easy_exc})"
        ) from easy_exc


def _call_paddleocr(ocr_instance, image: np.ndarray):
    """Execute OCR inference on an image array."""
    # Check if instance is the EasyOCR fallback adapter
    if isinstance(ocr_instance, tuple) and len(ocr_instance) == 2 and ocr_instance[0] == "easyocr":
        reader = ocr_instance[1]
        raw_results = reader.readtext(image)
        paddle_fmt = []
        for item in raw_results:
            if len(item) >= 3:
                bbox, text, conf = item[0], item[1], item[2]
                paddle_fmt.append([bbox, (text, float(conf))])
        return [paddle_fmt]

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
# Universal Script Detection and Multilingual Fusion
# ---------------------------------------------------------------------------

def _detect_dominant_script(regions: list[TextRegion]) -> Optional[str]:
    """Detect non-Latin script from OCR text or identify garbled text requiring specialized script models."""
    if not regions:
        return None
    all_text = "".join(r.text for r in regions)
    if not all_text:
        return None

    script_counts = {
        "devanagari": sum(1 for c in all_text if 0x0900 <= ord(c) <= 0x097F),
        "ar": sum(1 for c in all_text if 0x0600 <= ord(c) <= 0x06FF),
        "cyrillic": sum(1 for c in all_text if 0x0400 <= ord(c) <= 0x04FF),
        "ch": sum(1 for c in all_text if 0x4E00 <= ord(c) <= 0x9FFF or 0x3400 <= ord(c) <= 0x4DBF),
        "japan": sum(1 for c in all_text if 0x3040 <= ord(c) <= 0x30FF),
        "korean": sum(1 for c in all_text if 0xAC00 <= ord(c) <= 0xD7AF),
        "ta": sum(1 for c in all_text if 0x0B80 <= ord(c) <= 0x0BFF),
        "te": sum(1 for c in all_text if 0x0C00 <= ord(c) <= 0x0C7F),
    }

    best_script, count = max(script_counts.items(), key=lambda x: x[1])
    if count >= 2 or (count / max(len(all_text), 1)) > 0.05:
        return best_script

    # Heuristic for Indic/Arabic text forced through Latin model:
    # Characterized by high low-confidence boxes (<0.70) or dense nonsense symbols
    low_conf_count = sum(1 for r in regions if r.confidence < 0.70)
    symbol_heavy = sum(1 for r in regions if re.search(r"[#@\$%&]{1,}|[a-z]{1,2}\s+[a-z]{1,2}", r.text, re.IGNORECASE))
    if len(regions) >= 4 and (low_conf_count / len(regions) > 0.35 or symbol_heavy / len(regions) > 0.25):
        # Default to Devanagari for Indic noisy fallback
        return "devanagari"

    return None


def _calculate_iou(box1: list[list[int]], box2: list[list[int]]) -> float:
    """Calculate Intersection over Union (IoU) between two bounding polygons."""
    if not box1 or not box2 or len(box1) < 4 or len(box2) < 4:
        return 0.0
    x1_min = min(p[0] for p in box1)
    y1_min = min(p[1] for p in box1)
    x1_max = max(p[0] for p in box1)
    y1_max = max(p[1] for p in box1)

    x2_min = min(p[0] for p in box2)
    y2_min = min(p[1] for p in box2)
    x2_max = max(p[0] for p in box2)
    y2_max = max(p[1] for p in box2)

    inter_x1 = max(x1_min, x2_min)
    inter_y1 = max(y1_min, y2_min)
    inter_x2 = min(x1_max, x2_max)
    inter_y2 = min(y1_max, y2_max)

    if inter_x2 <= inter_x1 or inter_y2 <= inter_y1:
        return 0.0

    inter_area = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
    area1 = (x1_max - x1_min) * (y1_max - y1_min)
    area2 = (x2_max - x2_min) * (y2_max - y2_min)
    union_area = area1 + area2 - inter_area
    return inter_area / max(union_area, 1.0)


def _merge_bilingual_regions(
    primary: list[TextRegion],
    secondary: list[TextRegion],
) -> list[TextRegion]:
    """Fuse primary (Latin) and secondary (Script) OCR outputs into a comprehensive list."""
    if not secondary:
        return primary
    if not primary:
        return secondary

    merged: list[TextRegion] = list(primary)

    for s_reg in secondary:
        matched = False
        for i, p_reg in enumerate(merged):
            iou = _calculate_iou(p_reg.bbox, s_reg.bbox)
            if iou > 0.40:
                matched = True
                # If secondary region has non-ASCII characters or significantly higher confidence, prefer it
                s_has_unicode = any(ord(c) > 127 for c in s_reg.text)
                p_has_unicode = any(ord(c) > 127 for c in p_reg.text)
                if (s_has_unicode and not p_has_unicode) or (s_reg.confidence > p_reg.confidence + 0.15):
                    merged[i] = s_reg
                break
        if not matched:
            merged.append(s_reg)

    return merged


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_ocr(
    image: np.ndarray,
    *,
    lang: Optional[str] = None,
) -> list[TextRegion]:
    """
    Run PaddleOCR on a preprocessed image with automatic multilingual script detection.

    Args:
        image: BGR numpy array (preprocessed).
        lang: Force a specific language. If None, auto-detects script and runs multi-script fusion.

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
        logger.warning("Primary OCR engine failed (%s), falling back to EasyOCR...", exc)
        try:
            import easyocr
            easy_langs = ["en"]
            if use_lang in ("hi", "devanagari"):
                easy_langs = ["hi", "en"]
            elif use_lang in ("ar", "arabic"):
                easy_langs = ["ar", "en"]
            elif use_lang in ("ch", "chinese"):
                easy_langs = ["ch_sim", "en"]
            reader = easyocr.Reader(easy_langs, gpu=False)
            _ocr_instances[use_lang] = ("easyocr", reader)
            result = _call_paddleocr(_ocr_instances[use_lang], image)
        except Exception as fallback_exc:
            logger.exception("Both primary OCR and fallback failed")
            raise OCREngineError(f"OCR_INFERENCE_FAILED: {fallback_exc}") from fallback_exc

    regions = _parse_paddleocr_results(result)

    # Universal Multilingual Auto-Detection:
    # If no language was forced, detect dominant non-Latin script and fuse multilingual outputs
    if lang is None:
        target_script = _detect_dominant_script(regions)
        if target_script and target_script != "en":
            try:
                script_regions = run_ocr(image, lang=target_script)
                if script_regions:
                    return _merge_bilingual_regions(regions, script_regions)
            except Exception as exc:
                logger.warning("Multilingual OCR fusion for script '%s' failed: %s", target_script, exc)

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

