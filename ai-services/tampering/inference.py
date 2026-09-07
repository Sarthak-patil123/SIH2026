"""Document tampering, splicing, and copy-move forgery detection."""
from __future__ import annotations

from pathlib import Path
from typing import Union
import cv2
import numpy as np

from tampering.explainability import _load_image, compute_ela, generate_explanation_heatmap


def detect_copy_move(img: np.ndarray) -> dict:
    """Detect copy-move cloning via keypoint matching."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    orb = cv2.ORB_create(nfeatures=1000)
    keypoints, descriptors = orb.detectAndCompute(gray, None)

    if descriptors is None or len(descriptors) < 20:
        return {"clone_detected": False, "match_count": 0}

    # Match keypoints with themselves excluding immediate self-matches
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    matches = bf.knnMatch(descriptors, descriptors, k=3)

    clone_pairs = 0
    for m_list in matches:
        if len(m_list) >= 2:
            # First match is self (distance 0), second is closest neighbor
            m = m_list[1]
            pt1 = keypoints[m.queryIdx].pt
            pt2 = keypoints[m.trainIdx].pt
            dist = np.hypot(pt1[0] - pt2[0], pt1[1] - pt2[1])
            # If distance is significant (>50px) and descriptor distance is very low
            if dist > 50 and m.distance < 30:
                clone_pairs += 1

    return {
        "clone_detected": clone_pairs > 8,
        "cloned_keypoint_pairs": clone_pairs,
    }


def detect_tampering(
    image_source: Union[str, bytes, Path, np.ndarray],
    *,
    threshold: float = 0.35,
) -> dict:
    """Analyze an identity document for digital tampering and manipulation.

    Combines:
    1. Error Level Analysis (ELA) - compression discrepancy detection
    2. Copy-move cloning detection via spatial keypoint matching
    3. Noise variance uniformity across document quadrants

    Args:
        image_source: Path, bytes, or numpy BGR array.
        threshold: Tamper score threshold to flag document as manipulated.

    Returns:
        Structured dictionary with tamper_score, verdict, and explanation heatmap.
    """
    img = _load_image(image_source)

    # 1. Error Level Analysis
    ela = compute_ela(img, quality=90)
    ela_gray = cv2.cvtColor(ela, cv2.COLOR_BGR2GRAY)
    ela_mean = np.mean(ela_gray)
    ela_std = np.std(ela_gray)
    ela_p95 = np.percentile(ela_gray, 95)

    # High local variance indicates anomalous insertion / splicing
    ela_score = min(float((ela_p95 / 255.0) * 0.7 + (ela_std / 50.0) * 0.3), 1.0)

    # 2. Copy-move detection
    copy_move = detect_copy_move(img)

    # 3. Quadrant noise consistency
    h, w = img.shape[:2]
    quads = [
        ela_gray[:h // 2, :w // 2],
        ela_gray[:h // 2, w // 2:],
        ela_gray[h // 2:, :w // 2],
        ela_gray[h // 2:, w // 2:],
    ]
    quad_means = [np.mean(q) for q in quads]
    noise_variance = float(np.std(quad_means))
    noise_inconsistency = min(noise_variance / 20.0, 1.0)

    # Combined tamper score
    composite_score = round(
        (ela_score * 0.5)
        + (0.3 if copy_move["clone_detected"] else 0.0)
        + (noise_inconsistency * 0.2),
        3,
    )
    is_tampered = composite_score >= threshold

    heatmap_b64 = generate_explanation_heatmap(img, as_base64=True)

    reasons = []
    if ela_score > 0.4:
        reasons.append("ELA_COMPRESSION_ANOMALY")
    if copy_move["clone_detected"]:
        reasons.append("COPY_MOVE_CLONE_DETECTED")
    if noise_inconsistency > 0.4:
        reasons.append("QUADRANT_NOISE_INCONSISTENCY")
    if not reasons:
        reasons.append("AUTHENTIC_COMPRESSION_SIGNATURE")

    return {
        "status": "success",
        "is_tampered": is_tampered,
        "tamper_score": composite_score,
        "threshold": threshold,
        "reasons": reasons,
        "diagnostics": {
            "ela_mean": round(float(ela_mean), 2),
            "ela_p95": round(float(ela_p95), 2),
            "copy_move": copy_move,
            "quadrant_variance": round(noise_variance, 2),
        },
        "heatmap_base64": heatmap_b64,
    }
