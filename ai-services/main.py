"""FastAPI application — unified entrypoint for the identity document verification service."""
import os
# Set PaddlePaddle env vars before any paddle import to prevent source checks and oneDNN issues
os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
os.environ.setdefault("FLAGS_use_mkldnn", "0")
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("PYTHONWARNINGS", "ignore::DeprecationWarning")
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from core.logger import get_logger
from router.ocr_router import router as ocr_router
from router.biometric_router import router as biometric_router
from router.test_router import router as test_router

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

# CORS middleware for testing from browser or remote origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core production routers
app.include_router(ocr_router)
app.include_router(biometric_router)

# Component diagnostics and test suite router
app.include_router(test_router)

# Mount static folder
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/", response_class=HTMLResponse)
@app.get("/test", response_class=HTMLResponse)
async def serve_test_ui():
    """Serve the single-page HTML testbed for checking every component."""
    html_path = static_dir / "test_ui.html"
    if html_path.exists():
        return FileResponse(str(html_path))
    return HTMLResponse("<h2>Test UI not found in static folder.</h2>", status_code=404)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": "1.0.0"}
