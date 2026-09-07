"""SCRFD face detector — thin wrapper over insightface.app.FaceAnalysis.

Uses the 'detection' module only (SCRFD). Does NOT load ArcFace here.
ArcFace is loaded separately in embedder.py.

Lazy singleton: model loads on first call, not at import time.
"""
from __future__ import annotations

from typing import Any
import numpy as np

from core.config import CFG
from core.exceptions import FaceNotFoundError, MultipleFacesError
from core.logger import get_logger

logger = get_logger(__name__)

_app: Any = None


def _get_app() -> Any:
    global _app
    if _app is None:
        try:
            from insightface.app import FaceAnalysis
        except ImportError as exc:
            raise ImportError("insightface is required for face detection. Install via `pip install insightface`.") from exc

        logger.info("Loading SCRFD face detection model...")
        _app = FaceAnalysis(
            name=CFG.INSIGHTFACE_MODEL_PACK,
            allowed_modules=["detection"],
        )
        try:
            _app.prepare(
                ctx_id=0,
                det_thresh=CFG.FACE_DET_THRESHOLD,
                det_size=CFG.FACE_DET_SIZE,
            )
        except Exception as exc:
            logger.info("GPU unavailable for SCRFD (%s); falling back to CPU (ctx_id=-1)", exc)
            _app.prepare(
                ctx_id=-1,
                det_thresh=CFG.FACE_DET_THRESHOLD,
                det_size=CFG.FACE_DET_SIZE,
            )
        logger.info("SCRFD loaded.")
    return _app


def detect_faces(img: np.ndarray, *, is_live: bool = False) -> list:
    """Detect faces in an image. Returns a list of Face objects.

    Args:
        img: BGR numpy array.
        is_live: If True, enforces exactly 1 face (anti-spoofing for selfies).
                 If False, returns the highest-confidence face from the image.

    Returns:
        List containing the best detected Face object (always length 1 on success).

    Raises:
        FaceNotFoundError: No face detected.
        MultipleFacesError: is_live=True and more than 1 face found.
    """
    faces = _get_app().get(img)

    if len(faces) == 0:
        raise FaceNotFoundError("No face detected.")

    if is_live and len(faces) > 1:
        raise MultipleFacesError(
            f"Live selfie must contain exactly 1 face. Found {len(faces)}."
        )

    # Return highest-confidence detection
    faces.sort(key=lambda f: f.det_score, reverse=True)
    return [faces[0]]
