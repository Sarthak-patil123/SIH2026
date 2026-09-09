# =============================================================================
# Dockerfile — AI Services (PaddleOCR + ArcFace + YOLO)
# Base: Python 3.12 slim (Debian Bookworm)
# =============================================================================

FROM python:3.12-slim-bookworm AS base

# System dependencies required by PaddlePaddle, OpenCV, insightface
RUN apt-get update && apt-get install -y --no-install-recommends \
    # OpenCV headless
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    # Build tools (for insightface C extensions)
    gcc \
    g++ \
    cmake \
    # Image format support
    libpng-dev \
    libjpeg-dev \
    libwebp-dev \
    libtiff-dev \
    # libstdc++ for ONNX
    libstdc++6 \
    # curl for health-checks
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Dependency layer (cached unless requirements change) ────────────────────
COPY requirements.txt .

# Upgrade pip first
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install PaddlePaddle CPU before PaddleOCR (order matters for numpy compat)
RUN pip install --no-cache-dir "paddlepaddle==2.6.2" "numpy==1.26.4"
RUN pip install --no-cache-dir "paddleocr==2.8.1"

# Install remaining dependencies
RUN pip install --no-cache-dir \
    fastapi==0.115.0 \
    uvicorn[standard]==0.30.6 \
    python-multipart==0.0.9 \
    pydantic==2.7.0 \
    opencv-python-headless==4.10.0.84 \
    Pillow==10.4.0 \
    pillow-heif==0.16.0 \
    scikit-image==0.24.0 \
    ultralytics==8.2.90 \
    insightface==0.7.3 \
    onnxruntime==1.18.1 \
    rapidfuzz==3.9.3 \
    python-dateutil==2.9.0 \
    pycountry==24.6.1 \
    requests==2.32.3

# ── Application layer ───────────────────────────────────────────────────────
COPY . .

# Environment variables for PaddlePaddle stability
ENV PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True \
    FLAGS_use_mkldnn=0 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
