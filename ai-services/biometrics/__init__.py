"""Biometric face verification package.

Public API:
  verify_faces(doc_img, live_img) -> dict
"""
from __future__ import annotations

import numpy as np

from core.config import CFG
from core.exceptions import FaceNotFoundError, MultipleFacesError
from core.logger import get_logger
from .detector import detect_faces
from .embedder import get_embedding
from .matcher import compute_similarity, make_decision

logger = get_logger(__name__)


def verify_faces(doc_img: np.ndarray, live_img: np.ndarray) -> dict:
    """Full 1:1 biometric face verification pipeline.

    Steps:
    1. detect_faces(doc_img, is_live=False)    -> doc face bbox + landmarks
    2. detect_faces(live_img, is_live=True)    -> live face bbox + landmarks
                                                  Raises MultipleFacesError if > 1 face
    3. get_embedding(doc_img)                  -> doc 512-D L2-norm vector
    4. get_embedding(live_img)                 -> live 512-D L2-norm vector
    5. compute_similarity(emb_doc, emb_live)   -> cosine score
    6. make_decision(score)                    -> VERIFIED / REVIEW_REQUIRED / REJECTED

    Args:
        doc_img:  BGR np.ndarray - cropped document portrait (from YOLO photo region).
        live_img: BGR np.ndarray - live selfie photo.

    Returns:
        {
            "status": str,              # VERIFIED | REVIEW_REQUIRED | REJECTED | FAILED
            "match_score": float,
            "decision_threshold": float,
            "doc_face_detected": bool,
            "doc_face_bbox": list[int] | None,  # [x1, y1, x2, y2]
            "live_face_detected": bool,
            "live_face_bbox": list[int] | None,
            "diagnostics": list[str],
        }
    """
    diagnostics: list[str] = []
    doc_face_bbox = None
    live_face_bbox = None
    doc_face_detected = False
    live_face_detected = False

    # ── Step 1: Detect document face ──────────────────────────────────────────
    try:
        doc_faces = detect_faces(doc_img, is_live=False)
        doc_face_detected = True
        doc_face_bbox = [int(v) for v in doc_faces[0].bbox]
    except FaceNotFoundError as e:
        diagnostics.append(f"DOC_FACE_NOT_FOUND: {e}")
        return {
            "status": "FAILED",
            "match_score": 0.0,
            "decision_threshold": CFG.BIOMETRIC_VERIFIED_THRESHOLD,
            "doc_face_detected": False,
            "doc_face_bbox": None,
            "live_face_detected": False,
            "live_face_bbox": None,
            "diagnostics": diagnostics,
        }

    # ── Step 2: Detect live face (strict single-face enforcement) ─────────────
    try:
        live_faces = detect_faces(live_img, is_live=True)
        live_face_detected = True
        live_face_bbox = [int(v) for v in live_faces[0].bbox]
    except MultipleFacesError:
        raise  # Re-raise — router returns 400
    except FaceNotFoundError as e:
        diagnostics.append(f"LIVE_FACE_NOT_FOUND: {e}")
        return {
            "status": "FAILED",
            "match_score": 0.0,
            "decision_threshold": CFG.BIOMETRIC_VERIFIED_THRESHOLD,
            "doc_face_detected": doc_face_detected,
            "doc_face_bbox": doc_face_bbox,
            "live_face_detected": False,
            "live_face_bbox": None,
            "diagnostics": diagnostics,
        }

    # ── Steps 3–6: Embed and match ────────────────────────────────────────────
    # Extract face crops using the bbox detected above. Crop with 10% padding
    # so ArcFace sees the full face including chin/forehead. Pass the crop to
    # get_embedding so both detector and embedder operate on the same face region.
    def _crop_face(img: np.ndarray, bbox: list[int], pad: float = 0.10) -> np.ndarray:
        h_img, w_img = img.shape[:2]
        x1, y1, x2, y2 = bbox
        dx = int((x2 - x1) * pad)
        dy = int((y2 - y1) * pad)
        cx1 = max(0, x1 - dx)
        cy1 = max(0, y1 - dy)
        cx2 = min(w_img, x2 + dx)
        cy2 = min(h_img, y2 + dy)
        return img[cy1:cy2, cx1:cx2]

    doc_crop = _crop_face(doc_img, doc_face_bbox)
    live_crop = _crop_face(live_img, live_face_bbox)

    emb_doc = get_embedding(doc_crop)
    emb_live = get_embedding(live_crop)
    score = compute_similarity(emb_doc, emb_live)
    verdict = make_decision(score)

    return {
        **verdict,
        "doc_face_detected": doc_face_detected,
        "doc_face_bbox": doc_face_bbox,
        "live_face_detected": live_face_detected,
        "live_face_bbox": live_face_bbox,
        "diagnostics": diagnostics,
    }


__all__ = [
    "verify_faces",
    "detect_faces",
    "get_embedding",
    "compute_similarity",
    "make_decision",
]
