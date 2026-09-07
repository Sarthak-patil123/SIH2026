"""POST /biometrics/verify — 1:1 face verification endpoint."""
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from biometrics import verify_faces
from core.exceptions import ImageQualityError, MultipleFacesError
from core.logger import get_logger
from layout import detect_fields, build_regions, crop_region
from preprocessing import preprocess

router = APIRouter(prefix="/biometrics", tags=["Biometrics"])
logger = get_logger(__name__)


@router.post("/verify")
async def verify_biometric(
    document: UploadFile = File(..., description="Document image (portrait will be extracted)"),
    selfie: UploadFile = File(..., description="Live camera photo (must contain exactly 1 face)"),
) -> dict:
    """
    Pipeline:
    1. Preprocess document image
    2. YOLO layout detection -> crop photo region
    3. Load selfie image (preprocess without perspective warp for live photos)
    4. verify_faces(doc_portrait, selfie) -> cosine similarity + verdict
    """
    doc_bytes = await document.read()
    live_bytes = await selfie.read()

    # ── Preprocess document ───────────────────────────────────────────────────
    try:
        doc_pre = preprocess(doc_bytes)
    except ImageQualityError as e:
        raise HTTPException(status_code=400, detail={"error": str(e), "field": "document"})

    # ── Preprocess selfie (apply EXIF + normalise, skip perspective warp) ─────
    try:
        live_pre = preprocess(live_bytes)
    except ImageQualityError as e:
        raise HTTPException(status_code=400, detail={"error": str(e), "field": "selfie"})

    # ── Detect document portrait region ──────────────────────────────────────
    try:
        detections = detect_fields(doc_pre.image)
        regions_map = build_regions(doc_pre.image, detections)
    except Exception as exc:
        logger.warning(f"Layout detection error: {exc}")
        regions_map = {}

    if "photo" in regions_map:
        doc_portrait = crop_region(doc_pre.image, regions_map["photo"], pad_ratio=0.05)
    else:
        # Fallback: use the full document image if portrait not found
        logger.warning("Photo region not detected by YOLO. Using full document image.")
        doc_portrait = doc_pre.image

    # ── Face verification ─────────────────────────────────────────────────────
    try:
        result = verify_faces(doc_portrait, live_pre.image)
    except MultipleFacesError as e:
        raise HTTPException(
            status_code=400,
            detail={"error": "MULTIPLE_FACES_IN_LIVE_PHOTO", "message": str(e)},
        )

    return result
