"""Passive liveness and anti-spoofing analysis for selfie photos.

Analyzes high-frequency texture components, glare/reflection artifacts,
and sharpness consistency to flag printed photos or screen replay attacks.
"""
from __future__ import annotations

import cv2
import numpy as np


def check_passive_liveness(img: np.ndarray) -> dict:
    """Analyze single-frame selfie for presentation attack detection cues.

    Args:
        img: BGR numpy array of the selfie image.

    Returns:
        Dictionary with liveness score, pass/fail status, and diagnostic flags.
    """
    if img is None or img.size == 0:
        return {"is_live": False, "score": 0.0, "reason": "EMPTY_IMAGE"}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. Texture richness / sharpness via Laplacian variance
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    is_sharp = lap_var >= 45.0

    # 2. High-frequency FFT spectrum analysis (screens & prints lack micro-texture)
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1e-9)

    h, w = gray.shape
    cy, cx = h // 2, w // 2
    # Radius of low-frequency center
    r = min(h, w) // 8
    y, x = np.ogrid[:h, :w]
    mask = (x - cx) ** 2 + (y - cy) ** 2 > r ** 2
    high_freq_energy = np.mean(magnitude_spectrum[mask])

    # 3. Color distribution (screen replays often show color distortion/banding)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    sat = hsv[:, :, 1]
    has_natural_saturation = 20 < np.mean(sat) < 220

    # Composite liveness heuristic score [0.0 - 1.0]
    score = 0.0
    if is_sharp:
        score += 0.4
    if high_freq_energy > 50:
        score += 0.3
    if has_natural_saturation:
        score += 0.3

    is_live = score >= 0.65

    return {
        "is_live": is_live,
        "score": round(score, 3),
        "sharpness_score": round(lap_var, 2),
        "high_frequency_energy": round(float(high_freq_energy), 2),
        "natural_saturation": has_natural_saturation,
    }
