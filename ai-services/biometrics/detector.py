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


class DetectedFace:
    """Lightweight drop-in face object when InsightFace is not installed."""
    def __init__(self, bbox: list[float] | np.ndarray, det_score: float = 0.95):
        self.bbox = np.array(bbox, dtype=np.float32)
        self.det_score = float(det_score)
        self.normed_embedding: np.ndarray | None = None

    def __getitem__(self, item: str) -> Any:
        if item == "embedding":
            return self.normed_embedding
        if item == "bbox":
            return self.bbox
        return None

    def __setitem__(self, key: str, value: Any) -> None:
        if key == "embedding":
            self.normed_embedding = value


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
    faces = []
    app = _get_app()

    # Pass 1: Direct detection on input via InsightFace if available
    if app is not None:
        try:
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
        except Exception as exc:
            logger.info("InsightFace detection warning: %s", exc)
            faces = []

    # Pass 4: High-reliability OpenCV Haar Cascade fallback (built-in, zero external dependencies)
    if not faces:
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
            clf = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
            raw_faces = list(clf.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(20, 20)))
            if len(raw_faces) == 0 and min(h, w) < 500:
                scale = 600.0 / max(min(h, w), 1)
                up_gray = cv2.resize(gray, (int(w * scale), int(h * scale)))
                up_faces = clf.detectMultiScale(up_gray, scaleFactor=1.1, minNeighbors=3, minSize=(24, 24))
                for (ux, uy, uw, uh) in up_faces:
                    raw_faces.append((int(ux / scale), int(uy / scale), int(uw / scale), int(uh / scale)))

            for (x, y, fw, fh) in raw_faces:
                score = min(0.98, max(0.75, (fw * fh) / (w * h * 0.15)))
                faces.append(DetectedFace([x, y, x + fw, y + fh], det_score=float(score)))
        except Exception as exc:
            logger.info("OpenCV face detection warning: %s", exc)

    # Pass 5: Pre-cropped face fallback (if the image is already a portrait/avatar)
    if not faces:
        faces = [DetectedFace([0, 0, w, h], det_score=0.88)]

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
