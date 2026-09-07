"""Explainable AI visual heatmap generator for document forgery and tampering."""
from __future__ import annotations

import base64
import io
from pathlib import Path
from typing import Union
import cv2
import numpy as np
from PIL import Image


def _load_image(source: Union[str, bytes, Path, np.ndarray]) -> np.ndarray:
    if isinstance(source, np.ndarray):
        return source
    if isinstance(source, (str, Path)):
        img = cv2.imread(str(source))
        if img is None:
            raise ValueError(f"Failed to load image from {source}")
        return img
    if isinstance(source, bytes):
        arr = np.frombuffer(source, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image bytes")
        return img
    raise TypeError(f"Unsupported image type: {type(source)}")


def compute_ela(image: np.ndarray, quality: int = 90) -> np.ndarray:
    """Compute Error Level Analysis (ELA) map showing JPEG compression differentials.

    Modified/spliced areas compress at different rates than the original background.
    """
    # Encode to JPEG in memory
    success, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not success:
        return np.zeros_like(image)

    resaved = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    diff = cv2.absdiff(image, resaved)

    # Scale the difference for visibility
    diff_max = np.max(diff)
    scale = 255.0 / max(diff_max, 1)
    ela = np.clip(diff * scale, 0, 255).astype(np.uint8)
    return ela


def generate_explanation_heatmap(
    image_input: Union[str, bytes, Path, np.ndarray],
    *,
    as_base64: bool = False,
) -> Union[np.ndarray, str]:
    """Generate visual heatmap highlighting potential forged or manipulated regions."""
    img = _load_image(image_input)

    ela = compute_ela(img, quality=90)
    gray_ela = cv2.cvtColor(ela, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray_ela, (7, 7), 0)

    # Apply Jet color map (blue = untouched, red/yellow = anomalous compression error)
    heatmap = cv2.applyColorMap(blurred, cv2.COLORMAP_JET)

    # Blend with original image for context (60% original, 40% heatmap)
    blended = cv2.addWeighted(img, 0.6, heatmap, 0.4, 0)

    if as_base64:
        _, buf = cv2.imencode(".jpg", blended, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return base64.b64encode(buf).decode()

    return blended
