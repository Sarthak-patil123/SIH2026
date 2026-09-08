"""POST /biometrics/verify — 1:1 face verification endpoint."""
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile
import numpy as np

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


def _img_to_b64(img: np.ndarray, quality: int = 85) -> str:
    """Encode numpy BGR image to base64 JPEG string."""
    if img is None or not isinstance(img, np.ndarray) or img.size == 0:
        return ""
    import cv2
    import base64
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return base64.b64encode(buf).decode()


@router.post("/passport-verify")
async def verify_passport_with_live_photo(
    passport: UploadFile = File(..., description="Passport document image"),
    live_photo: UploadFile = File(..., description="Live camera photo or external portrait photo"),
) -> dict:
    """
    Unified Passport + Live Photo Verification Endpoint:
    1. Preprocesses passport image and extracts OCR & MRZ data via dedicated passport processor.
    2. Converts OCR output into canonical AdaptedResult with flat_fields.
    3. Detects portrait region in passport via YOLO layout detector and crops it.
    4. Executes 1:1 facial biometric verification between cropped passport portrait and live photo using ArcFace.
    5. Returns unified JSON with face verification metrics, base64 crops for UI preview, passport fields, and flat key-value pairs.
    """
    import numpy as np
    pass_bytes = await passport.read()
    live_bytes = await live_photo.read()

    from ocr.passport import process_passport
    from ocr.adapter import adapt_result

    # 1. Run Passport OCR Pipeline
    try:
        raw_passport = process_passport(pass_bytes)
        adapted = adapt_result(raw_passport)
        passport_data = raw_passport
        flat_fields = adapted.flat_fields()
        adapted_dict = adapted.to_dict()
    except Exception as exc:
        logger.warning(f"Passport OCR processing warning: {exc}")
        raw_passport = {"error": str(exc)}
        flat_fields = {}
        adapted_dict = {}

    # 2. Preprocess images for Biometrics
    try:
        doc_pre = preprocess(pass_bytes)
    except ImageQualityError as e:
        raise HTTPException(status_code=400, detail={"error": str(e), "field": "passport"})

    try:
        live_pre = preprocess(live_bytes)
    except ImageQualityError as e:
        raise HTTPException(status_code=400, detail={"error": str(e), "field": "live_photo"})

    # 3. Detect & crop passport photo region
    try:
        detections = detect_fields(doc_pre.image)
        regions_map = build_regions(doc_pre.image, detections)
    except Exception as exc:
        logger.warning(f"Layout detection error: {exc}")
        regions_map = {}

    if "photo" in regions_map:
        doc_portrait = crop_region(doc_pre.image, regions_map["photo"], pad_ratio=0.05)
    else:
        logger.warning("Photo region not detected by YOLO. Using full document image.")
        doc_portrait = doc_pre.image

    # 4. 1:1 Face Verification
    try:
        bio_result = verify_faces(doc_portrait, live_pre.image)
        if not bio_result.get("doc_face_detected") and doc_portrait is not doc_pre.image:
            logger.info("Retrying face verification with full document image...")
            retry_res = verify_faces(doc_pre.image, live_pre.image)
            if retry_res.get("doc_face_detected"):
                bio_result = retry_res
    except MultipleFacesError as e:
        bio_result = {
            "status": "FAILED",
            "match_score": 0.0,
            "decision_threshold": 0.65,
            "doc_face_detected": True,
            "live_face_detected": False,
            "diagnostics": [f"MULTIPLE_FACES_IN_LIVE_PHOTO: {e}"],
            "error": "MULTIPLE_FACES_IN_LIVE_PHOTO",
        }
    except Exception as e:
        logger.warning(f"Face verification exception: {e}")
        # Try full document as last resort if portrait crop had an issue
        try:
            bio_result = verify_faces(doc_pre.image, live_pre.image)
        except Exception as retry_e:
            bio_result = {
                "status": "FAILED",
                "match_score": 0.0,
                "decision_threshold": 0.65,
                "doc_face_detected": False,
                "live_face_detected": False,
                "diagnostics": [str(e), str(retry_e)],
                "error": str(e),
            }

    # Encode previews for UI side-by-side display
    doc_portrait_b64 = _img_to_b64(doc_portrait)
    live_face_b64 = _img_to_b64(live_pre.image)

    status = bio_result.get("status", "FAILED")
    is_match = status == "VERIFIED"

    return {
        "status": "success",
        "document_type": "passport",
        "face_verification": {
            "status": status,
            "is_match": is_match,
            "match_score": round(float(bio_result.get("match_score", 0.0)), 4),
            "decision_threshold": float(bio_result.get("decision_threshold", 0.65)),
            "doc_face_detected": bio_result.get("doc_face_detected", False),
            "live_face_detected": bio_result.get("live_face_detected", False),
            "doc_portrait_base64": doc_portrait_b64,
            "live_photo_base64": live_face_b64,
            "diagnostics": bio_result.get("diagnostics", []),
            "error": bio_result.get("error"),
        },
        "passport_data": passport_data,
        "flat_fields": flat_fields,
        "adapted": adapted_dict,
    }

