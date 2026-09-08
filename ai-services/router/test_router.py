"""Testing and diagnostic endpoints for individual AI pipeline components."""
from __future__ import annotations

import base64
import os
import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from core.logger import get_logger
from layout import detect_fields, build_regions, crop_region
from ocr import run_ocr
from ocr.mrz import extract_mrz
from ocr.mrz.parser import parse_mrz
from ocr.mrz.travel_mrz import parse_travel_mrz
from ocr.shared import classify_document
from ocr.extractors import (
    extract_aadhaar,
    extract_driving_licence,
    extract_pan,
    extract_passport,
    extract_voter_id,
)
from preprocessing import preprocess
from preprocessing.preprocessor import _detect_document, _load_image, _check_blur, _check_glare

router = APIRouter(prefix="/test", tags=["Component Diagnostics"])
logger = get_logger(__name__)


def _img_to_b64(img: np.ndarray, quality: int = 85) -> str:
    """Encode numpy BGR image to base64 JPEG string."""
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return base64.b64encode(buf).decode()


def _read_image(data: bytes) -> np.ndarray:
    """Safely decode image bytes into BGR numpy array."""
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file format")
    return img


@router.get("/status")
def get_system_status() -> dict:
    """Check readiness of individual AI modules."""
    status = {
        "paddleocr": "ready",
        "layout_yolo": "ready",
        "biometrics_arcface": "ready",
        "rule_extractors": "ready",
        "llm_module": "disabled",
        "llm_note": "LLM extraction is intentionally inactive per architecture specification.",
    }
    return status
SAMPLE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "MRZ_Passport_Reader_From_Image-main", "MRZ_Passport_Reader_From_Image-main"))


@router.get("/samples/{filename}")
async def get_sample_image(filename: str):
    """Serve sample test images directly for quick 1-click UI and automated testing."""
    allowed = ["example1.jpg", "image.png", "passport1.jpg"]
    if filename not in allowed:
        raise HTTPException(status_code=404, detail=f"Filename {filename} not allowed. Choose from {allowed}")
    file_path = os.path.join(SAMPLE_DIR, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail=f"File {filename} not found at {file_path}")
    media_type = "image/png" if filename.endswith(".png") else "image/jpeg"
    return FileResponse(file_path, media_type=media_type)


@router.post("/preprocess")
async def test_preprocess(
    file: UploadFile = File(..., description="Document image to preprocess"),
) -> dict:
    """Test image preprocessing: resolution, blur, glare, and perspective correction."""
    data = await file.read()
    raw_img = _read_image(data)
    rh, rw = raw_img.shape[:2]

    try:
        pre = preprocess(data)
        proc_img = pre.image
        ph, pw = proc_img.shape[:2]
        blur_val = _check_blur(raw_img, threshold=0.0)
        glare_warning = _check_glare(raw_img)
        corners, _ = _detect_document(raw_img)

        return {
            "status": "success",
            "original_dimensions": {"width": rw, "height": rh},
            "processed_dimensions": {"width": pw, "height": ph},
            "blur_score": round(blur_val, 2),
            "glare_detected": glare_warning is not None,
            "warnings": pre.warnings,
            "corners_detected": corners.tolist() if corners is not None else None,
            "processed_image_base64": _img_to_b64(proc_img),
        }
    except Exception as exc:
        logger.exception("Preprocessing test failed")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/layout")
async def test_layout(
    file: UploadFile = File(..., description="Image to detect layout regions"),
) -> dict:
    """Test YOLO layout detector: photo, signature, mrz, and text bounding boxes."""
    data = await file.read()
    img = _read_image(data)
    h, w = img.shape[:2]

    try:
        detections = detect_fields(img)
        regions_map = build_regions(img, detections)

        # Draw bboxes on image for visual feedback
        annotated = img.copy()
        color_map = {
            "photo": (255, 120, 0),       # Blue
            "signature": (0, 200, 0),     # Green
            "mrz": (200, 0, 200),         # Purple
            "text": (0, 165, 255),        # Orange
            "passport_number": (0, 0, 255),# Red
        }

        crops: dict[str, str] = {}
        for name, bbox in regions_map.items():
            crop = crop_region(img, bbox)
            if crop.size > 0:
                crops[name] = _img_to_b64(crop)
            x1, y1, x2, y2 = bbox
            col = color_map.get(name, (0, 255, 255))
            cv2.rectangle(annotated, (x1, y1), (x2, y2), col, 2)
            cv2.putText(
                annotated, name.upper(), (x1, max(15, y1 - 5)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, col, 2
            )

        det_list = []
        for det in detections:
            label, x1, y1, x2, y2, *rest = det
            conf = rest[0] if rest else 1.0
            det_list.append({
                "label": label,
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "confidence": round(float(conf), 4),
            })

        return {
            "status": "success",
            "image_dimensions": {"width": w, "height": h},
            "detections": det_list,
            "crops_base64": crops,
            "annotated_image_base64": _img_to_b64(annotated),
        }
    except Exception as exc:
        logger.exception("Layout test failed")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/ocr-raw")
async def test_ocr_raw(
    file: UploadFile = File(..., description="Image to run raw PaddleOCR on"),
    lang: str | None = Form(None),
) -> dict:
    """Test PaddleOCR directly on image, returning all detected text blocks."""
    data = await file.read()
    img = _read_image(data)
    h, w = img.shape[:2]

    try:
        regions = run_ocr(img, lang=lang)

        annotated = img.copy()
        blocks = []
        for i, r in enumerate(regions):
            poly = np.array(r.bbox, np.int32).reshape((-1, 1, 2))
            cv2.polylines(annotated, [poly], isClosed=True, color=(0, 255, 0), thickness=2)
            # Label index
            if r.bbox:
                pt = r.bbox[0]
                cv2.putText(
                    annotated, str(i + 1), (pt[0], max(12, pt[1] - 3)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1
                )

            xs = [p[0] for p in r.bbox]
            ys = [p[1] for p in r.bbox]
            blocks.append({
                "id": i + 1,
                "text": r.text,
                "confidence": round(r.confidence, 4),
                "polygon": r.bbox,
                "bbox": [min(xs), min(ys), max(xs), max(ys)] if r.bbox else [],
            })

        return {
            "status": "success",
            "image_dimensions": {"width": w, "height": h},
            "total_blocks": len(blocks),
            "blocks": blocks,
            "annotated_image_base64": _img_to_b64(annotated),
        }
    except Exception as exc:
        logger.exception("Raw OCR test failed")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/classify")
async def test_classify(
    file: UploadFile = File(..., description="Document image to classify"),
) -> dict:
    """Test document-type auto-classifier (Passport, Aadhaar, PAN, DL, Voter ID, etc.)."""
    data = await file.read()
    img = _read_image(data)

    try:
        regions = run_ocr(img)
        res = classify_document(regions)
        return {
            "status": "success",
            "detected_type": res.document_type,
            "confidence": res.confidence,
            "reasons": res.reasons,
            "probe_text": res.probe_text,
            "total_ocr_regions": len(regions),
        }
    except Exception as exc:
        logger.exception("Classification test failed")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/mrz")
async def test_mrz(
    file: UploadFile = File(..., description="Document or cropped MRZ zone"),
) -> dict:
    """Test MRZ parser (TD3 Passports and TD1 ID Cards / Visas) with checksum verification."""
    data = await file.read()
    img = _read_image(data)

    try:
        # Run OCR on the given image
        regions = run_ocr(img)

        # Try TD3
        td3 = parse_mrz(regions)
        if td3 is not None:
            return {
                "status": "success",
                "mrz_type": "TD3",
                "is_valid": td3.overall_checksum_valid,
                "raw_lines": list(td3.raw_lines),
                "fields": {
                    "document_type": td3.document_type.value,
                    "country_code": td3.country_code.value,
                    "surname": td3.surname.value,
                    "given_names": td3.given_names.value,
                    "passport_number": td3.passport_number.value,
                    "nationality": td3.nationality.value,
                    "date_of_birth": td3.date_of_birth.value,
                    "sex": td3.sex.value,
                    "expiry_date": td3.expiry_date.value,
                    "personal_number": td3.personal_number.value,
                },
                "checksums": {
                    "passport_number": td3.passport_number.checksum_valid,
                    "date_of_birth": td3.date_of_birth.checksum_valid,
                    "expiry_date": td3.expiry_date.checksum_valid,
                    "personal_number": td3.personal_number.checksum_valid,
                    "overall_valid": td3.overall_checksum_valid,
                },
                "errors": td3.errors,
            }

        # Try Travel MRZ (TD1/TD2/Visa)
        travel = parse_travel_mrz(regions)
        if travel is not None:
            return {
                "status": "success",
                "mrz_type": travel.document_type,
                "issuing_country": travel.issuing_country,
                "fields": travel.fields,
                "checks": travel.checks,
                "errors": travel.errors,
                "warnings": travel.warnings,
            }

        return {
            "status": "failed",
            "message": "No valid MRZ lines detected in image.",
            "ocr_text_lines": [r.text for r in regions],
        }
    except Exception as exc:
        logger.exception("MRZ test failed")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/extractor")
async def test_extractor(
    file: UploadFile = File(..., description="Document image"),
    doc_type: str = Form(..., description="Extractor type: aadhaar | pan | driving_licence | voter_id | passport"),
) -> dict:
    """Test a specific rule-based field extractor directly."""
    data = await file.read()
    img = _read_image(data)

    try:
        regions = run_ocr(img)
        norm_type = doc_type.lower().strip().replace("driving_license", "driving_licence")

        fields_dict: dict = {}
        if norm_type == "aadhaar":
            res = extract_aadhaar(regions)
            fields_dict = {f: getattr(res, f) for f in res.__dataclass_fields__}
        elif norm_type == "pan":
            res = extract_pan(regions)
            fields_dict = {f: getattr(res, f) for f in res.__dataclass_fields__}
        elif norm_type == "driving_licence":
            res = extract_driving_licence(regions)
            fields_dict = {f: getattr(res, f) for f in res.__dataclass_fields__}
        elif norm_type == "voter_id":
            res = extract_voter_id(regions)
            fields_dict = {f: getattr(res, f) for f in res.__dataclass_fields__}
        elif norm_type == "passport":
            res = extract_passport(regions)
            fields_dict = {f: getattr(res, f) for f in res.__dataclass_fields__}
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown doc_type '{doc_type}'. Use: aadhaar, pan, driving_licence, voter_id, passport",
            )

        return {
            "status": "success",
            "doc_type": norm_type,
            "extracted_fields": fields_dict,
            "total_ocr_regions": len(regions),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Extractor test failed")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/doc-processor")
async def test_doc_processor(
    file: UploadFile = File(..., description="Document image to process"),
    doc_type: str = Form(..., description="passport | national_id | driving_license | dob_proof | visa"),
) -> dict:
    """Test dedicated document processors (calls respective ocr/<doc_type>/processor.py)."""
    data = await file.read()
    norm_type = doc_type.lower().strip().replace("driving_licence", "driving_license")

    from ocr.passport import process_passport
    from ocr.national_id import process_national_id
    from ocr.driving_license import process_driving_license
    from ocr.dob_proof import process_dob_proof
    from ocr.visa import process_visa

    try:
        if norm_type == "passport":
            return process_passport(data)
        elif norm_type in ("national_id", "aadhaar", "pan", "voter_id"):
            sub = "auto" if norm_type == "national_id" else norm_type
            return process_national_id(data, id_type=sub)
        elif norm_type == "driving_license":
            return process_driving_license(data)
        elif norm_type == "dob_proof":
            return process_dob_proof(data)
        elif norm_type == "visa":
            return process_visa(data)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown doc_type '{doc_type}'. Use: passport, national_id, driving_license, dob_proof, visa",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Doc processor failed")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/tampering")
async def test_tampering_endpoint(
    file: UploadFile = File(..., description="Document image to analyze for tampering"),
) -> dict:
    """Test Error Level Analysis (ELA), copy-move and forgery detection."""
    from tampering.inference import detect_tampering

    data = await file.read()
    try:
        return detect_tampering(data)
    except Exception as exc:
        logger.exception("Tampering detection failed")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/adapted-doc-processor")
async def test_adapted_doc_processor(
    file: UploadFile = File(..., description="Document image to process"),
    doc_type: str = Form(..., description="passport | national_id | aadhaar | pan | voter_id | driving_license | dob_proof | visa"),
) -> dict:
    """Run document processor + adapter layer. Returns canonical AdaptedResult JSON.

    This is the primary endpoint for testing the full extraction pipeline with
    the adapter layer applied. No LLM is invoked.
    """
    from ocr.passport import process_passport
    from ocr.national_id import process_national_id
    from ocr.driving_license import process_driving_license
    from ocr.dob_proof import process_dob_proof
    from ocr.visa import process_visa
    from ocr.adapter import adapt_result

    data = await file.read()
    norm_type = doc_type.lower().strip().replace("driving_licence", "driving_license")

    try:
        if norm_type == "passport":
            raw = process_passport(data)
        elif norm_type in ("national_id", "aadhaar", "pan", "voter_id"):
            sub = "auto" if norm_type == "national_id" else norm_type
            raw = process_national_id(data, id_type=sub)
        elif norm_type == "driving_license":
            raw = process_driving_license(data)
        elif norm_type == "dob_proof":
            raw = process_dob_proof(data)
        elif norm_type == "visa":
            raw = process_visa(data)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown doc_type '{doc_type}'. Use: passport, national_id, aadhaar, pan, voter_id, driving_license, dob_proof, visa",
            )

        adapted = adapt_result(raw)
        return {
            "adapted": adapted.to_dict(),
            "flat_fields": adapted.flat_fields(),
            "raw": raw,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Adapted doc processor failed")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/passport-verify")
@router.post("/passport-live-verify")
async def test_passport_verify(
    passport: UploadFile = File(..., description="Passport document image"),
    live_photo: UploadFile = File(..., description="Live camera photo or external portrait photo"),
) -> dict:
    """Test endpoint for Passport + Live Photo verification and OCR extraction."""
    from router.biometric_router import verify_passport_with_live_photo
    return await verify_passport_with_live_photo(passport=passport, live_photo=live_photo)


