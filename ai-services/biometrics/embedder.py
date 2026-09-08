"""ArcFace ResNet-100 face embedding extractor.

Uses insightface.app.FaceAnalysis with detection+recognition modules.
Returns L2-normalised 512-D embedding vectors via face.normed_embedding.

Lazy singleton: model loads on first call, not at import time.
"""
from __future__ import annotations

from typing import Any
import cv2
import numpy as np

from core.config import CFG
from core.exceptions import FaceNotFoundError
from core.logger import get_logger

logger = get_logger(__name__)

_app: Any = None


def _get_app() -> Any:
    global _app
    if _app is None:
        try:
            from insightface.app import FaceAnalysis
        except ImportError as exc:
            raise ImportError("insightface is required for face embeddings. Install via `pip install insightface`.") from exc

        _app = FaceAnalysis(
            name=CFG.INSIGHTFACE_MODEL_PACK,
            allowed_modules=["detection", "recognition"],
            providers=["CPUExecutionProvider"],
        )
        try:
            _app.prepare(ctx_id=-1, det_size=CFG.FACE_DET_SIZE)
        except Exception as exc:
            logger.info("ArcFace prepare failed: %s", exc)
        logger.info("ArcFace loaded.")
    return _app


def get_embedding(img: np.ndarray) -> np.ndarray:
    """Extract L2-normalised 512-D ArcFace embedding from an image.

    Flexible for small images, document portrait crops, and direct face crops.

    Args:
        img: BGR numpy array (full image or portrait crop).

    Returns:
        np.ndarray of shape (512,) — L2-normalised embedding vector.

    Raises:
        FaceNotFoundError: Only if input image is empty or invalid.
    """
    if img is None or not isinstance(img, np.ndarray) or img.size == 0:
        raise FaceNotFoundError("Empty or invalid image for embedding extraction.")

    from biometrics.detector import detect_faces

    # 1. Try detect_faces (which has multi-scale small image logic)
    try:
        faces = detect_faces(img, is_live=False)
        if faces and hasattr(faces[0], "normed_embedding") and faces[0].normed_embedding is not None:
            return faces[0].normed_embedding
    except Exception as exc:
        logger.debug("detect_faces in get_embedding non-fatal error: %s", exc)

    # 2. Fallback: Direct ArcFace feature extraction on resized 112x112 crop
    app = _get_app()
    rec_model = app.models.get("recognition")
    if rec_model is not None:
        try:
            face_112 = cv2.resize(img, (112, 112), interpolation=cv2.INTER_LANCZOS4)
            raw_feat = rec_model.get_feat(face_112)
            flat = raw_feat.flatten()
            norm = np.linalg.norm(flat)
            if norm > 0:
                return (flat / norm).astype(np.float32)
        except Exception as exc:
            logger.warning("Direct ArcFace get_feat failed: %s", exc)

    raise FaceNotFoundError("Unable to extract facial embedding from image.")
