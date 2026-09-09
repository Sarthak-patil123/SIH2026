"""Cosine similarity matcher with three-band decision logic.

Thresholds (from CFG):
  >= BIOMETRIC_VERIFIED_THRESHOLD  -> VERIFIED
  >= BIOMETRIC_REVIEW_THRESHOLD    -> REVIEW_REQUIRED
  <  BIOMETRIC_REVIEW_THRESHOLD    -> REJECTED
"""
import numpy as np
from core.config import CFG


def compute_similarity(emb_doc: np.ndarray, emb_live: np.ndarray) -> float:
    """Cosine similarity between two L2-normalised 512-D ArcFace embeddings.

    Both vectors must already be L2-normalised (use face.normed_embedding).
    Similarity = dot product of normalised vectors, clamped to [0.0, 1.0].
    """
    return float(np.clip(np.dot(emb_doc, emb_live), 0.0, 1.0))


def make_decision(score: float) -> dict:
    """Apply threshold bands to a similarity score. Returns structured verdict.

    Returns:
        {
            "status": "VERIFIED" | "REVIEW_REQUIRED" | "REJECTED",
            "match_score": float,
            "decision_threshold": float,
        }
    """
    if score >= CFG.BIOMETRIC_VERIFIED_THRESHOLD:
        status = "VERIFIED"
    elif score >= CFG.BIOMETRIC_REVIEW_THRESHOLD:
        status = "REVIEW_REQUIRED"
    else:
        status = "REJECTED"

    return {
        "status": status,
        "match_score": round(score, 4),
        "decision_threshold": CFG.BIOMETRIC_VERIFIED_THRESHOLD,
    }
