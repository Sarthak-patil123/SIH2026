"""Standalone OCR Microservice (FastAPI).

Provides document-specific OCR and extraction endpoints for Passport,
National ID, Driving Licence, DOB Proof, and Visa.
"""
from __future__ import annotations

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from ocr.passport import process_passport
from ocr.national_id import process_national_id
from ocr.driving_license import process_driving_license
from ocr.dob_proof import process_dob_proof
from ocr.visa import process_visa

app = FastAPI(
    title="Document OCR Microservice",
    version="1.0.0",
    description="Microservice for document OCR and structured field extraction.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "ocr", "engine": "paddleocr"}


@app.post("/extract")
async def extract_text(
    file: UploadFile = File(...),
    doc_type: str = Form("passport"),
) -> dict:
    """Extract structured data from any identity document by type."""
    content = await file.read()
    normalized_type = doc_type.lower().strip().replace("driving_licence", "driving_license")

    try:
        if normalized_type == "passport":
            return process_passport(content)
        elif normalized_type in ("national_id", "aadhaar", "pan", "voter_id"):
            sub = "auto" if normalized_type == "national_id" else normalized_type
            return process_national_id(content, id_type=sub)
        elif normalized_type == "driving_license":
            return process_driving_license(content)
        elif normalized_type == "dob_proof":
            return process_dob_proof(content)
        elif normalized_type == "visa":
            return process_visa(content)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported doc_type '{doc_type}'. Supported: passport, national_id, driving_license, dob_proof, visa",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {exc}")
