"""Tampering and document forgery detection package."""
from .inference import detect_tampering
from .explainability import generate_explanation_heatmap, compute_ela

__all__ = ["detect_tampering", "generate_explanation_heatmap", "compute_ela"]
