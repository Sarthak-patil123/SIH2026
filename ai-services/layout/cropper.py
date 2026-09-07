"""Crop a region from an image with percentage padding."""
import numpy as np
from core.config import CFG


def crop_region(
    img: np.ndarray,
    bbox: tuple,
    pad_ratio: float = CFG.REGION_PAD_RATIO,
) -> np.ndarray:
    """
    Crop with percentage padding. Clamps to image boundaries.

    Args:
        img: BGR numpy array.
        bbox: (x1, y1, x2, y2) region to crop.
        pad_ratio: Fractional padding added to each side (default 5%).

    Returns:
        Cropped BGR numpy array.
    """
    h, w = img.shape[:2]
    x1, y1, x2, y2 = bbox
    pad_x = int((x2 - x1) * pad_ratio)
    pad_y = int((y2 - y1) * pad_ratio)
    x1 = max(0, x1 - pad_x)
    y1 = max(0, y1 - pad_y)
    x2 = min(w, x2 + pad_x)
    y2 = min(h, y2 + pad_y)
    return img[y1:y2, x1:x2].copy()
