"""Tampering Detection Microservice (FastAPI)."""
from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from tampering.inference import detect_tampering

app = FastAPI(
    title="Tampering Detection Service",
    version="1.0.0",
    description="Microservice for document forgery, splicing, and ELA tampering detection.",
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
    return {"status": "ok", "service": "tampering-detection", "methods": ["ELA", "copy-move", "noise-variance"]}


@app.post("/detect")
async def detect_endpoint(
    file: UploadFile = File(..., description="Document image to analyze for forgery"),
) -> dict:
    """Analyze document image for digital tampering and manipulation."""
    content = await file.read()
    try:
        return detect_tampering(content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
