"""Layout detection package.

Public API:
  detect_fields(image: np.ndarray) -> list[tuple]
    Returns: [(label, x1, y1, x2, y2, conf), ...]  — 6-tuple per detection

  build_regions(img: np.ndarray, detections: list) -> dict
    Returns: {"photo": (x1,y1,x2,y2), "signature": ..., "mrz": ..., "text": ...}

  crop_region(img: np.ndarray, bbox: tuple, pad_ratio: float) -> np.ndarray
    Returns cropped image array with percentage padding.
"""
from .detector import detect_fields
from .region_builder import build_regions
from .cropper import crop_region

__all__ = ["detect_fields", "build_regions", "crop_region"]
