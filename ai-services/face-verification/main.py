"""Face Verification & Liveness Microservice (FastAPI)."""
from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from face_verification.inference import verify_faces

app = FastAPI(
    title="Face Verification & Liveness Service",
    version="1.0.0",
    description="Microservice for 1:1 facial matching and presentation attack detection.",
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
    return {"status": "ok", "service": "face-verification", "model": "arcface-resnet100"}


@app.post("/verify")
async def verify_endpoint(
    document: UploadFile = File(..., description="Document portrait image"),
    selfie: UploadFile = File(..., description="Live selfie photo"),
) -> dict:
    """Verify identity document portrait against live camera photo."""
    doc_bytes = await document.read()
    live_bytes = await selfie.read()

    try:
        return verify_faces(doc_bytes, live_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
