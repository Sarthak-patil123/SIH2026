"""Face Matching & Anti-Spoofing Inference Pipeline."""
from __future__ import annotations

from pathlib import Path
from typing import Union
import cv2
import numpy as np

from biometrics import verify_faces as _verify_faces
from core.logger import get_logger
from face_verification.liveness import check_passive_liveness

logger = get_logger(__name__)


def _load_image(source: Union[str, bytes, Path, np.ndarray]) -> np.ndarray:
    if isinstance(source, np.ndarray):
        return source
    if isinstance(source, (str, Path)):
        img = cv2.imread(str(source))
        if img is None:
            raise ValueError(f"Could not load image from path: {source}")
        return img
    if isinstance(source, bytes):
        arr = np.frombuffer(source, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image bytes.")
        return img
    raise TypeError(f"Unsupported image type: {type(source)}")


def verify_faces(
    photo_doc: Union[str, bytes, Path, np.ndarray],
    selfie: Union[str, bytes, Path, np.ndarray],
    *,
    require_liveness: bool = False,
) -> dict:
    """Full 1:1 facial verification pipeline.

    Args:
        photo_doc: Cropped document portrait or full document image.
        selfie: Live user selfie photo.
        require_liveness: Unused (liveness detection disabled).

    Returns:
        Dictionary with match score, verification decision, and similarity metrics.
    """
    doc_img = _load_image(photo_doc)
    selfie_img = _load_image(selfie)

    # 1:1 Biometric verification via SCRFD + ArcFace
    verification_result = _verify_faces(doc_img, selfie_img)
    is_verified = verification_result["status"] == "VERIFIED"

    return {
        **verification_result,
        "is_verified": is_verified,
    }
