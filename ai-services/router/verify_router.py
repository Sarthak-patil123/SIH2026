"""Verification Router — Unified endpoints for Passport, Visa, Driving Licence, National ID, and DOB Proof.
Combines PaddleOCR text extraction, flexible LLM schema parsing, and 1:1 biometric face verification.
"""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
import numpy as np

from biometrics import verify_faces
from core.exceptions import ImageQualityError, MultipleFacesError
from core.logger import get_logger
from layout import detect_fields, build_regions, crop_region
from llm_parser import parse_document_with_llm
from ocr import run_ocr
from ocr.mrz import extract_mrz
from preprocessing import preprocess
from preprocessing.preprocessor import _load_image

router = APIRouter(prefix="/verify", tags=["Verification"])
logger = get_logger(__name__)


def _extract_ocr_lines(image_np: np.ndarray) -> tuple[list[str], float]:
    """Run PaddleOCR and extract plain text lines with average confidence."""
    try:
        regions = run_ocr(image_np)
        lines = [r.text.strip() for r in regions if r.text and r.text.strip()]
        avg_conf = sum(r.confidence for r in regions) / len(regions) if regions else 0.0
        return lines, round(avg_conf, 4)
    except Exception as exc:
        logger.warning("PaddleOCR extraction failed: %s", exc)
        return [], 0.0


# ── 1. PASSPORT VERIFICATION (Document OCR + Live Face Biometrics) ─────────────
@router.post("/passport")
async def verify_passport_endpoint(
    passport: Optional[UploadFile] = File(None, description="Passport document image"),
    document: Optional[UploadFile] = File(None, description="Alternative passport file param"),
    face: Optional[UploadFile] = File(None, description="Live camera selfie photo"),
    selfie: Optional[UploadFile] = File(None, description="Alternative live selfie file param"),
    live_photo: Optional[UploadFile] = File(None, description="Alternative live photo param"),
    llm_model: Optional[str] = Form(None, description="Optional custom LLM model name"),
    llm_api_base: Optional[str] = Form(None, description="Optional custom OpenAI-compatible API base URL"),
    llm_api_key: Optional[str] = Form(None, description="Optional custom API key"),
) -> dict[str, Any]:
    """Unified Passport Verification:
    1. Preprocesses passport document and live photo.
    2. Runs full Passport OCR & MRZ verification pipeline (process_passport).
    3. LLM parser parses visual biodata and aligns with ICAO MRZ ground truth.
    4. Crops passport photo and executes 1:1 facial biometric verification against live selfie via ArcFace.
    5. Returns unified JSON with document details, MRZ verification, and biometric verdict.
    """
    pass_file = passport or document
    face_file = face or selfie or live_photo

    if not pass_file:
        raise HTTPException(status_code=400, detail="Missing passport document image ('passport' or 'document')")
    if not face_file:
        raise HTTPException(status_code=400, detail="Missing live face selfie image ('face', 'selfie', or 'live_photo')")

    req_id = str(uuid.uuid4())
    t0 = time.monotonic()

    pass_bytes = await pass_file.read()
    face_bytes = await face_file.read()

    # Preprocess passport
    try:
        pass_pre = preprocess(pass_bytes)
        pass_img = pass_pre.image
    except ImageQualityError as e:
        raise HTTPException(status_code=400, detail={"error": str(e), "field": "passport"})

    # Preprocess live face
    try:
        face_pre = preprocess(face_bytes)
        face_img = face_pre.image
    except ImageQualityError as e:
        raise HTTPException(status_code=400, detail={"error": str(e), "field": "face"})

    # 1. Run full Passport OCR + MRZ pipeline
    from ocr.passport import process_passport
    try:
        pass_pipeline_result = process_passport(pass_bytes)
    except Exception as exc:
        logger.warning("process_passport execution warning: %s", exc)
        pass_pipeline_result = {}

    ocr_lines, ocr_conf = _extract_ocr_lines(pass_img)

    # 2. Run LLM parser for structured layout alignment
    doc_data = parse_document_with_llm(
        ocr_lines=ocr_lines,
        doc_type="passport",
        model_name=llm_model,
        api_base_url=llm_api_base,
        api_key=llm_api_key,
    )

    # 3. Align with MRZ ground truth if verified by process_passport
    mrz_info = pass_pipeline_result.get("mrz", {})
    mrz_fields = mrz_info.get("fields", {}) if isinstance(mrz_info, dict) else {}
    if mrz_fields:
        for k in ("passport_number", "surname", "given_names", "nationality", "date_of_birth", "sex", "date_of_expiry"):
            if mrz_fields.get(k):
                doc_data[k] = mrz_fields[k]

    # 4. Crop portrait from passport layout
    try:
        detections = detect_fields(pass_img)
        regions_map = build_regions(pass_img, detections)
    except Exception as exc:
        logger.debug("Layout detection error: %s", exc)
        regions_map = {}

    if "photo" in regions_map:
        doc_portrait = crop_region(pass_img, regions_map["photo"], pad_ratio=0.05)
    else:
        doc_portrait = pass_img

    # 5. ArcFace Biometrics with automatic full-image retry
    try:
        biometric_res = verify_faces(doc_portrait, face_img)
        if not biometric_res.get("doc_face_detected") and doc_portrait is not pass_img:
            retry_res = verify_faces(pass_img, face_img)
            if retry_res.get("doc_face_detected"):
                biometric_res = retry_res
    except MultipleFacesError as e:
        raise HTTPException(status_code=400, detail={"error": "MULTIPLE_FACES_IN_LIVE_PHOTO", "message": str(e)})
    except Exception as exc:
        logger.warning("Biometric verification error: %s", exc)
        biometric_res = {
            "status": "FAILED",
            "match_score": 0.0,
            "decision": "REJECTED",
            "is_match": False,
            "diagnostics": [str(exc)],
        }

    is_verified = (
        biometric_res.get("status") == "VERIFIED"
        and (doc_data.get("passport_number") is not None or mrz_fields.get("passport_number") is not None)
    )

    elapsed_ms = round((time.monotonic() - t0) * 1000, 1)

    return {
        "request_id": req_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "document_type": "passport",
        "verification_status": "VERIFIED" if is_verified else ("REVIEW_REQUIRED" if biometric_res.get("status") == "REVIEW_REQUIRED" else "REJECTED"),
        "document_data": doc_data,
        "mrz_data": mrz_info,
        "biometric_verification": biometric_res,
        "ocr_summary": {
            "lines_detected": len(ocr_lines),
            "confidence_mean": ocr_conf,
        },
        "execution_time_ms": elapsed_ms,
    }


# ── 2. VISA VERIFICATION ──────────────────────────────────────────────────────
@router.post("/visa")
async def verify_visa_endpoint(
    visa: Optional[UploadFile] = File(None, description="Visa document image"),
    document: Optional[UploadFile] = File(None, description="Alternative file param"),
    llm_model: Optional[str] = Form(None),
    llm_api_base: Optional[str] = Form(None),
    llm_api_key: Optional[str] = Form(None),
) -> dict[str, Any]:
    """Visa Verification: PaddleOCR + VISA_SYSTEM_PROMPT LLM parser."""
    file = visa or document
    if not file:
        raise HTTPException(status_code=400, detail="Missing visa document image file (use 'visa' or 'document')")

    img_bytes = await file.read()
    try:
        pre = preprocess(img_bytes)
        img = pre.image
    except ImageQualityError as e:
        raise HTTPException(status_code=400, detail=str(e))

    ocr_lines, ocr_conf = _extract_ocr_lines(img)
    parsed = parse_document_with_llm(
        ocr_lines=ocr_lines,
        doc_type="visa",
        model_name=llm_model,
        api_base_url=llm_api_base,
        api_key=llm_api_key,
    )

    return {
        "request_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "document_type": "visa",
        "extracted_data": parsed,
        "ocr_confidence": ocr_conf,
    }


# ── 3. DRIVING LICENCE VERIFICATION ───────────────────────────────────────────
@router.post("/driving-licence")
@router.post("/driving-license")
async def verify_driving_licence_endpoint(
    driving_licence: Optional[UploadFile] = File(None, description="Driving licence image"),
    driving_license: Optional[UploadFile] = File(None, description="Driving licence image (US spelling)"),
    document: Optional[UploadFile] = File(None, description="Alternative file param"),
    llm_model: Optional[str] = Form(None),
    llm_api_base: Optional[str] = Form(None),
    llm_api_key: Optional[str] = Form(None),
) -> dict[str, Any]:
    """Driving Licence Verification: PaddleOCR + DRIVING_LICENCE_SYSTEM_PROMPT LLM parser."""
    file = driving_licence or driving_license or document
    if not file:
        raise HTTPException(status_code=400, detail="Missing driving licence image (use 'driving_licence' or 'document')")

    img_bytes = await file.read()
    try:
        pre = preprocess(img_bytes)
        img = pre.image
    except ImageQualityError as e:
        raise HTTPException(status_code=400, detail=str(e))

    ocr_lines, ocr_conf = _extract_ocr_lines(img)
    parsed = parse_document_with_llm(
        ocr_lines=ocr_lines,
        doc_type="driving_licence",
        model_name=llm_model,
        api_base_url=llm_api_base,
        api_key=llm_api_key,
    )

    return {
        "request_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "document_type": "driving_licence",
        "extracted_data": parsed,
        "ocr_confidence": ocr_conf,
    }


# ── 4. NATIONAL ID VERIFICATION ───────────────────────────────────────────────
@router.post("/national-id")
async def verify_national_id_endpoint(
    national_id: Optional[UploadFile] = File(None, description="National ID image"),
    document: Optional[UploadFile] = File(None, description="Alternative file param"),
    llm_model: Optional[str] = Form(None),
    llm_api_base: Optional[str] = Form(None),
    llm_api_key: Optional[str] = Form(None),
) -> dict[str, Any]:
    """National ID Verification (Aadhaar, PAN, Voter ID, SSN, Emirates ID, Cedula, etc.):
    PaddleOCR + NATIONAL_ID_SYSTEM_PROMPT LLM parser.
    """
    file = national_id or document
    if not file:
        raise HTTPException(status_code=400, detail="Missing national ID image (use 'national_id' or 'document')")

    img_bytes = await file.read()
    try:
        pre = preprocess(img_bytes)
        img = pre.image
    except ImageQualityError as e:
        raise HTTPException(status_code=400, detail=str(e))

    ocr_lines, ocr_conf = _extract_ocr_lines(img)
    parsed = parse_document_with_llm(
        ocr_lines=ocr_lines,
        doc_type="national_id",
        model_name=llm_model,
        api_base_url=llm_api_base,
        api_key=llm_api_key,
    )

    return {
        "request_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "document_type": "national_id",
        "extracted_data": parsed,
        "ocr_confidence": ocr_conf,
    }


# ── 5. DOB PROOF VERIFICATION ─────────────────────────────────────────────────
@router.post("/dob-proof")
async def verify_dob_proof_endpoint(
    dob_proof: Optional[UploadFile] = File(None, description="DOB proof document image"),
    document: Optional[UploadFile] = File(None, description="Alternative file param"),
    llm_model: Optional[str] = Form(None),
    llm_api_base: Optional[str] = Form(None),
    llm_api_key: Optional[str] = Form(None),
) -> dict[str, Any]:
    """DOB Proof Verification (Birth Certificate, School Certificate, Municipal Record):
    PaddleOCR + DOB_PROOF_SYSTEM_PROMPT LLM parser.
    """
    file = dob_proof or document
    if not file:
        raise HTTPException(status_code=400, detail="Missing DOB proof document image (use 'dob_proof' or 'document')")

    img_bytes = await file.read()
    try:
        pre = preprocess(img_bytes)
        img = pre.image
    except ImageQualityError as e:
        raise HTTPException(status_code=400, detail=str(e))

    ocr_lines, ocr_conf = _extract_ocr_lines(img)
    parsed = parse_document_with_llm(
        ocr_lines=ocr_lines,
        doc_type="dob_proof",
        model_name=llm_model,
        api_base_url=llm_api_base,
        api_key=llm_api_key,
    )

    return {
        "request_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "document_type": "dob_proof",
        "extracted_data": parsed,
        "ocr_confidence": ocr_conf,
    }
