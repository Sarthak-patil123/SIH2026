"""FastAPI application — unified entrypoint for the identity document verification service."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from router.ocr_router import router as ocr_router
from router.biometric_router import router as biometric_router
from core.logger import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm up all lazy-loaded models at startup to avoid first-request latency spikes."""
    logger.info("Warming up models on startup...")

    # Warm up OCR engine
    try:
        import numpy as np
        from ocr.engine import run_ocr
        dummy = np.zeros((32, 200, 3), dtype=np.uint8)
        run_ocr(dummy)
        logger.info("PaddleOCR warmed up.")
    except Exception as exc:
        logger.warning("PaddleOCR warm-up failed (non-fatal): %s", exc)

    # Warm up YOLO layout detector
    try:
        import numpy as np
        from layout.detector import detect_fields
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        detect_fields(dummy)
        logger.info("YOLO layout model warmed up.")
    except Exception as exc:
        logger.warning("YOLO warm-up failed (non-fatal): %s", exc)

    # NOTE: insightface (ArcFace + SCRFD) is NOT warmed up here because it
    # downloads ~500 MB of model weights on first load. Let it lazy-load on
    # the first /biometrics/verify request rather than blocking startup.
    logger.info("Startup warm-up complete.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Identity Document Verification API",
    version="1.0.0",
    description=(
        "AI pipeline: image preprocessing -> YOLO layout detection -> "
        "PaddleOCR text extraction -> ICAO MRZ parsing -> ArcFace 1:1 biometric verification."
    ),
    lifespan=lifespan,
)

app.include_router(ocr_router)
app.include_router(biometric_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": "1.0.0"}
