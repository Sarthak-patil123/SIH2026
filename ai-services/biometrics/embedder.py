"""ArcFace ResNet-100 face embedding extractor.

Uses insightface.app.FaceAnalysis with both detection+recognition modules.
Returns L2-normalised 512-D embedding vectors via face.normed_embedding.

Lazy singleton: model loads on first call, not at import time.
"""
from __future__ import annotations

from typing import Any
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

        logger.info("Loading ArcFace embedding model...")
        _app = FaceAnalysis(
            name=CFG.INSIGHTFACE_MODEL_PACK,
            allowed_modules=["detection", "recognition"],
        )
        try:
            _app.prepare(ctx_id=0, det_size=CFG.FACE_DET_SIZE)
        except Exception as exc:
            logger.info("GPU unavailable for ArcFace (%s); falling back to CPU (ctx_id=-1)", exc)
            _app.prepare(ctx_id=-1, det_size=CFG.FACE_DET_SIZE)
        logger.info("ArcFace loaded.")
    return _app


def get_embedding(img: np.ndarray) -> np.ndarray:
    """Extract L2-normalised 512-D ArcFace embedding from an image.

    Args:
        img: BGR numpy array (full image or portrait crop).

    Returns:
        np.ndarray of shape (512,) — L2-normalised embedding vector.

    Raises:
        FaceNotFoundError: No face detected or embedding is None.

    Note:
        Always use face.normed_embedding (L2-normalised), not face.embedding (raw).
        Cosine similarity on L2-normalised vectors = simple dot product.
    """
    faces = _get_app().get(img)

    if not faces:
        raise FaceNotFoundError("No face found for embedding extraction.")

    faces.sort(key=lambda f: f.det_score, reverse=True)
    emb = faces[0].normed_embedding

    if emb is None:
        raise FaceNotFoundError("ArcFace returned None embedding.")

    return emb
