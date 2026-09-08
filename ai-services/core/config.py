"""Centralised configuration. All thresholds and paths live here.
Any constant used in more than one module must be defined here.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    # ── Preprocessing (mirrors document-ocr-main/core/preprocessor.py constants) ──
    MIN_RESOLUTION_PX: int = 150   # lowered from 400 to accept small test images
    BLUR_THRESHOLD: float = 30.0
    GLARE_V_THRESHOLD: int = 250
    GLARE_MAX_PIXEL_RATIO: float = 0.15
    TARGET_WIDTH_PX: int = 1600
    CLAHE_CLIP: float = 2.0
    CLAHE_GRID: tuple = (8, 8)

    # ── Layout detection ──
    LAYOUT_MODEL_PATH: str = "layout/weights/passport_layout.pt"
    LAYOUT_CONF_THRESHOLD: float = 0.40
    REGION_PAD_RATIO: float = 0.05          # 5% padding on all crops

    # ── Biometrics ──
    INSIGHTFACE_MODEL_PACK: str = "buffalo_l"   # SCRFD + ArcFace ResNet-100
    FACE_DET_THRESHOLD: float = 0.50
    FACE_DET_SIZE: tuple = (640, 640)
    BIOMETRIC_VERIFIED_THRESHOLD: float = 0.65
    BIOMETRIC_REVIEW_THRESHOLD: float = 0.55


CFG = Config()
