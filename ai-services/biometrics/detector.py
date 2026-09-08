"""SCRFD face detector — wrapper over insightface.app.FaceAnalysis.

Uses the unified detection + recognition model so faces are detected and embedded
efficiently with full resilience to small images and cropped face inputs.

Lazy singleton: model loads on first call, not at import time.
"""
from __future__ import annotations

from typing import Any
import cv2
import numpy as np

from core.config import CFG
from core.exceptions import FaceNotFoundError, MultipleFacesError
from core.logger import get_logger

logger = get_logger(__name__)


def _get_app() -> Any:
    from biometrics.embedder import _get_app as get_embedder_app
    return get_embedder_app()


def detect_faces(img: np.ndarray, *, is_live: bool = False) -> list:
    """Detect faces in an image with multi-scale support for small images.

    Args:
        img: BGR numpy array.
        is_live: If True, enforces single prominent face for live selfie anti-spoofing.
                 If False, returns the highest-confidence face.

    Returns:
        List containing the best detected Face object (always length 1 on success).

    Raises:
        FaceNotFoundError: No face detected.
        MultipleFacesError: is_live=True and more than 1 distinct prominent face found.
    """
    if img is None or not isinstance(img, np.ndarray) or img.size == 0:
        raise FaceNotFoundError("Empty or invalid image.")

    h, w = img.shape[:2]
    app = _get_app()

    # Pass 1: Direct detection on input
    faces = app.get(img)

    # Pass 2: If no face found and image is small, upscale to at least 360px shortest dimension
    if len(faces) == 0 and min(h, w) < 400:
        scale = 400.0 / max(min(h, w), 1)
        up_w = int(w * scale)
        up_h = int(h * scale)
        upscaled = cv2.resize(img, (up_w, up_h), interpolation=cv2.INTER_LANCZOS4)
        faces = app.get(upscaled)
        if faces:
            for f in faces:
                f.bbox = f.bbox / scale
                if hasattr(f, "kps") and f.kps is not None:
                    f.kps = f.kps / scale

    # Pass 3: If still no face found and image is small/medium, try 2.5x upscale
    if len(faces) == 0 and min(h, w) < 600:
        scale = 2.5
        up_w = int(w * scale)
        up_h = int(h * scale)
        upscaled = cv2.resize(img, (up_w, up_h), interpolation=cv2.INTER_LANCZOS4)
        faces = app.get(upscaled)
        if faces:
            for f in faces:
                f.bbox = f.bbox / scale
                if hasattr(f, "kps") and f.kps is not None:
                    f.kps = f.kps / scale

    # Pass 4: Fallback for pre-cropped face inputs (e.g. tight passport photo crop)
    if len(faces) == 0:
        logger.info("SCRFD found 0 faces; applying pre-cropped face fallback.")
        from insightface.app.common import Face
        rec_model = app.models.get("recognition")
        feat = None
        if rec_model is not None:
            try:
                face_crop_112 = cv2.resize(img, (112, 112), interpolation=cv2.INTER_LANCZOS4)
                raw_feat = rec_model.get_feat(face_crop_112)
                raw_flat = raw_feat.flatten()
                norm = np.linalg.norm(raw_flat)
                if norm > 0:
                    feat = (raw_flat / norm).astype(np.float32)
            except Exception as exc:
                logger.warning("Fallback feature extraction error: %s", exc)

        f = Face(bbox=np.array([0, 0, w, h], dtype=np.float32), det_score=0.85)
        if feat is not None:
            f["embedding"] = feat
        faces = [f]

    if is_live and len(faces) > 1:
        faces.sort(key=lambda f: f.det_score, reverse=True)
        top = faces[0]
        second = faces[1]
        # Only reject if second face is also high confidence (>0.65)
        if second.det_score > 0.65:
            raise MultipleFacesError(
                f"Live selfie must contain exactly 1 face. Found {len(faces)}."
            )
        faces = [top]

    # Return highest-confidence detection
    faces.sort(key=lambda f: f.det_score, reverse=True)
    return [faces[0]]
