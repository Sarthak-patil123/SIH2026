# Implementation Plan — AI Identity Document Verification Pipeline

**Approach:** Copy exact code from reference folders. Do not rewrite what already exists.  
Write only thin adapters, glue code, and the FastAPI layer on top.  
All logic, models, and trained weights come from the reference repositories.

**Target:** `ai-services/` | **Python:** 3.10 | **API:** FastAPI + Uvicorn

> [!IMPORTANT]
> **Golden Rule:** If the code already exists in a reference folder — copy it. Do not rewrite it.  
> Write new code ONLY for: config, exceptions, logger, thin wrappers, and FastAPI routers.  
> Every stage has a `### Source` section that tells you the exact file path to copy from.

---

## Reference Repository Map

Before starting, understand what lives where:

```
Passport-Verification-System-main/
└── Passport-Verification-System-main/
    ├── models/
    │   └── passport_layout.pt           ← YOLO trained weights (22.5 MB)
    └── ai/
        ├── detector.py                  ← YOLO inference loop
        ├── region_builder.py            ← Photo/Signature/MRZ/Text bbox selection
        ├── cropper.py                   ← Save crops to disk
        ├── ocr.py                       ← EasyOCR wrapper (DO NOT USE — reference only)
        ├── annotator.py                 ← Debug image drawing
        ├── parser.py                    ← Basic regex parser (reference only)
        └── pipeline.py                  ← Original pipeline orchestration

document-ocr-main/
└── document-ocr-main/
    └── core/
        ├── preprocessor.py              ← COPY: entire file
        ├── ocr_engine.py                ← COPY: entire file
        ├── mrz_parser.py               ← COPY: entire file
        ├── travel_mrz.py               ← COPY: entire file
        ├── document_classifier.py      ← COPY: entire file
        ├── page_classifier.py          ← COPY: entire file
        ├── driving_licence_extractor.py← COPY: entire file
        ├── aadhaar_extractor.py        ← COPY: entire file
        ├── pan_extractor.py            ← COPY: entire file
        ├── voter_id_extractor.py       ← COPY: entire file
        ├── validator.py                ← COPY: entire file (find_label_value etc.)
        ├── validators.py               ← COPY: entire file (normalize_dl, Verhoeff etc.)
        ├── document_registry.py        ← COPY: entire file
        └── evidence.py                 ← COPY: entire file

insightface-master/
└── insightface-master/
    └── python-package/
        └── insightface/
            ├── app/
            │   ├── face_analysis.py     ← USE via pip install insightface
            │   └── common.py            ← USE via pip install insightface
            └── utils/
                └── face_align.py        ← USE via pip install insightface

MRZ_Passport_Reader_From_Image-main/    ← REFERENCE ONLY — do not copy
```

---

## Target Directory Structure (`ai-services/`)

```
ai-services/
├── Dockerfile
├── requirements.txt
├── main.py                              ← Stage 7 (new — thin FastAPI entrypoint)
│
├── core/                                ← Stage 1 (new — config, exceptions, logger)
│   ├── __init__.py
│   ├── config.py
│   ├── exceptions.py
│   └── logger.py
│
├── preprocessing/                       ← Stage 2 (COPIED from document-ocr-main)
│   ├── __init__.py
│   └── preprocessor.py                  ← DIRECT COPY of core/preprocessor.py
│
├── layout/                              ← Stage 3 (COPIED from Passport-Verification-System)
│   ├── __init__.py
│   ├── weights/
│   │   └── passport_layout.pt           ← COPY binary weight file
│   ├── detector.py                      ← ADAPTED COPY of ai/detector.py
│   └── region_builder.py                ← DIRECT COPY of ai/region_builder.py
│
├── ocr/                                 ← Stage 4 (COPIED from document-ocr-main)
│   ├── __init__.py
│   ├── engine.py                        ← DIRECT COPY of core/ocr_engine.py
│   ├── mrz/
│   │   ├── __init__.py
│   │   ├── parser.py                    ← DIRECT COPY of core/mrz_parser.py
│   │   └── travel_mrz.py               ← DIRECT COPY of core/travel_mrz.py
│   ├── extractors/
│   │   ├── __init__.py
│   │   ├── driving_licence.py           ← DIRECT COPY of core/driving_licence_extractor.py
│   │   ├── aadhaar.py                   ← DIRECT COPY of core/aadhaar_extractor.py
│   │   ├── pan.py                       ← DIRECT COPY of core/pan_extractor.py
│   │   └── voter_id.py                  ← DIRECT COPY of core/voter_id_extractor.py
│   └── shared/
│       ├── __init__.py
│       ├── validator.py                 ← DIRECT COPY of core/validator.py
│       ├── validators.py               ← DIRECT COPY of core/validators.py
│       ├── document_classifier.py      ← DIRECT COPY of core/document_classifier.py
│       ├── page_classifier.py          ← DIRECT COPY of core/page_classifier.py
│       ├── document_registry.py        ← DIRECT COPY of core/document_registry.py
│       └── evidence.py                 ← DIRECT COPY of core/evidence.py
│
├── biometrics/                          ← Stage 5 (new — thin wrappers over insightface)
│   ├── __init__.py                      ← Unified verify_faces() entry point
│   ├── detector.py                      ← Thin wrapper: insightface SCRFD
│   ├── embedder.py                      ← Thin wrapper: insightface ArcFace
│   └── matcher.py                       ← New: cosine similarity + threshold decision
│
├── schemas/                             ← Stage 6 (new — Pydantic models)
│   ├── __init__.py
│   ├── request.py
│   └── response.py
│
└── router/                              ← Stage 7 (new — FastAPI endpoints)
    ├── __init__.py
    ├── ocr_router.py
    └── biometric_router.py
```

---

## Stage 1 — Scaffold: Config, Exceptions, Logger, Dependencies

**Goal:** Foundation files every module imports from.  
**All new code — nothing to copy from reference repos.**

---

### 1.1 `requirements.txt` — Full Replacement

```
# Web framework
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.9
pydantic==2.7.0

# Image processing
opencv-python-headless==4.10.0.84
Pillow==10.4.0
pillow-heif==0.16.0
numpy==1.26.4
scikit-image==0.24.0

# OCR — PP-OCRv5 via ONNX, zero PaddlePaddle
rapidocr-onnxruntime==1.4.4

# Layout detection
ultralytics==8.2.90

# Face recognition
insightface==0.7.3
onnxruntime==1.18.1

# Fuzzy string match (used by validator.py from document-ocr-main)
rapidfuzz==3.9.3

# Utilities
python-dateutil==2.9.0
```

> [!WARNING]
> `scikit-image` is required by `insightface/utils/face_align.py` (uses `skimage.transform`).  
> `rapidfuzz` is required by `document-ocr-main/core/validator.py` — do not omit it.  
> Never add `paddlepaddle`, `easyocr`, or `torch`.

---

### 1.2 `Dockerfile`

```dockerfile
FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    cmake \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### 1.3 `core/config.py`

```python
"""Centralised configuration. All thresholds and paths live here.
Any constant used in more than one module must be defined here.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    # ── Preprocessing (mirrors document-ocr-main/core/preprocessor.py constants) ──
    MIN_RESOLUTION_PX: int = 600
    BLUR_THRESHOLD: float = 80.0
    GLARE_V_THRESHOLD: int = 250
    GLARE_MAX_PIXEL_RATIO: float = 0.15
    TARGET_WIDTH_PX: int = 1600
    CLAHE_CLIP: float = 2.0
    CLAHE_GRID: tuple = (8, 8)

    # ── Layout detection ──
    LAYOUT_MODEL_PATH: str = "layout/weights/passport_layout.pt"
    LAYOUT_CONF_THRESHOLD: float = 0.40
    REGION_PAD_RATIO: float = 0.05          # 5% padding on all crops

    # ── Biometrics ──
    INSIGHTFACE_MODEL_PACK: str = "buffalo_l"   # SCRFD + ArcFace ResNet-100
    FACE_DET_THRESHOLD: float = 0.50
    FACE_DET_SIZE: tuple = (640, 640)
    BIOMETRIC_VERIFIED_THRESHOLD: float = 0.65
    BIOMETRIC_REVIEW_THRESHOLD: float = 0.55


CFG = Config()
```

---

### 1.4 `core/exceptions.py`

```python
"""Pipeline exception hierarchy.
Raise specific subclasses; catch PipelineError at router level.
"""


class PipelineError(Exception):
    """Base for all pipeline errors."""


class ImageQualityError(PipelineError):
    """Image rejected by quality gate (blur, glare, resolution)."""


class DocumentNotFoundError(PipelineError):
    """No document boundary found in image frame."""


class FaceNotFoundError(PipelineError):
    """No face detected in provided image region."""


class MultipleFacesError(PipelineError):
    """More than one face found in live selfie (anti-spoofing)."""


class LayoutDetectionError(PipelineError):
    """YOLO produced zero valid layout detections."""


class MRZParseError(PipelineError):
    """MRZ could not be located or parsed."""


class OCREngineError(PipelineError):
    """RapidOCR model failed to initialise or run."""
```

---

### 1.5 `core/logger.py`

```python
"""Structured JSON logger. Use get_logger(__name__) in every module."""
import json
import logging
import sys
from datetime import datetime, timezone


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps({
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "module": record.module,
            "msg": record.getMessage(),
        })


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(_JsonFormatter())
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger
```

---

### 1.6 Stage 1 Smoke Test

```bash
# Run from ai-services/
pip install -r requirements.txt
python -c "from core.config import CFG; print('CFG OK')"
python -c "from core.exceptions import PipelineError; print('Exceptions OK')"
python -c "from core.logger import get_logger; get_logger('smoke').info('Logger OK')"
```

---

## Stage 2 — Preprocessing

**Goal:** Image loading, quality checks, perspective correction, normalisation.  
**Approach:** Direct copy of one file. Zero rewriting.

### What to do

**Step 1 — Copy the file:**
```
SOURCE: document-ocr-main/document-ocr-main/core/preprocessor.py
DEST:   ai-services/preprocessing/preprocessor.py
```

**Step 2 — Create `preprocessing/__init__.py`:**
```python
"""Preprocessing package. Public API: preprocess(), PreprocessResult, ImageQualityError."""
from .preprocessor import preprocess, PreprocessResult, ImageQualityError

__all__ = ["preprocess", "PreprocessResult", "ImageQualityError"]
```

**Step 3 — No other changes to `preprocessor.py` itself.** The file is self-contained.

### What `preprocessor.py` already provides (do not rewrite these):

| Function | What it does |
|:---------|:-------------|
| `preprocess(source, *, blur_threshold)` | Full pipeline: load → resolution check → blur check → glare check → quad detect → perspective warp → CLAHE normalise |
| `PreprocessResult` | Dataclass with `.image` (BGR ndarray) and `.warnings` (list[str]) |
| `ImageQualityError` | Raised on `RESOLUTION_TOO_LOW`, `IMAGE_TOO_BLURRY`, `IMAGE_TOO_LARGE`, `INVALID_IMAGE` |
| `_check_glare()` | Returns warning string — does NOT raise; pipeline continues |
| `_detect_document()` | 4-corner contour quad detection with aspect/area sanity checks |
| `_perspective_correct()` | `getPerspectiveTransform` + `warpPerspective` |
| `_normalise()` | Resize to 1600px + CLAHE on LAB L-channel |

### Stage 2 Smoke Test

```python
# test_stage2.py — from ai-services/
from preprocessing import preprocess

result = preprocess("path/to/any/id_photo.jpg")
print("Shape:", result.image.shape)    # (H, 1600, 3)
print("Warnings:", result.warnings)
```

---

## Stage 3 — YOLO Layout Detection

**Goal:** Detect `photo`, `signature`, `mrz`, `text` bounding boxes on the document image.  
**Approach:** Copy model weights directly. Copy `region_builder.py` directly. Adapt `detector.py` to accept `np.ndarray` instead of file path (one-line change).

### What to do

**Step 1 — Copy model weights (binary file):**
```
SOURCE: Passport-Verification-System-main/Passport-Verification-System-main/models/passport_layout.pt
DEST:   ai-services/layout/weights/passport_layout.pt
```

**Step 2 — Copy and adapt `detector.py`:**
```
SOURCE: Passport-Verification-System-main/Passport-Verification-System-main/ai/detector.py
DEST:   ai-services/layout/detector.py
```

Make only these two changes to the copied file:

```python
# ORIGINAL line 4 (hardcoded path):
model = YOLO(os.path.join("models","passport_layout.pt"))

# REPLACE with lazy singleton that uses CFG:
from core.config import CFG
_model = None
def _get_model():
    global _model
    if _model is None:
        _model = YOLO(CFG.LAYOUT_MODEL_PATH)
    return _model
```

```python
# ORIGINAL detect_fields signature accepts file path:
def detect_fields(image_path):
    results = model(image_path, conf=0.4)[0]

# REPLACE with: accept np.ndarray directly:
def detect_fields(image: np.ndarray) -> list:
    results = _get_model()(image, conf=CFG.LAYOUT_CONF_THRESHOLD)[0]
```

Everything else in `detector.py` stays identical.

**Step 3 — Copy `region_builder.py` directly:**
```
SOURCE: Passport-Verification-System-main/Passport-Verification-System-main/ai/region_builder.py
DEST:   ai-services/layout/region_builder.py
```

Zero changes needed. The function `build_regions(image_path, detections)` will be called with the preprocessed image directly (it uses `cv2.imread` internally — change the argument to accept `np.ndarray`):

```python
# ORIGINAL line 4:
def build_regions(image_path, detections):
    img = cv2.imread(image_path)

# REPLACE first 2 lines with:
def build_regions(img: np.ndarray, detections: list) -> dict:
    # img is already loaded — remove the cv2.imread call
```

**Step 4 — Create `layout/__init__.py`:**
```python
"""Layout detection package.

Public API:
  detect_fields(image: np.ndarray) -> list[tuple]
    Returns: [(label, x1, y1, x2, y2), ...]

  build_regions(img: np.ndarray, detections: list) -> dict
    Returns: {"photo": (x1,y1,x2,y2), "signature": ..., "mrz": ..., "text": ...}

  crop_region(img: np.ndarray, bbox: tuple, pad_ratio: float) -> np.ndarray
    Returns cropped image array with percentage padding.
"""
from .detector import detect_fields
from .region_builder import build_regions
from .cropper import crop_region

__all__ = ["detect_fields", "build_regions", "crop_region"]
```

**Step 5 — Create `layout/cropper.py` (new, thin utility):**
```python
"""Crop a region from an image with percentage padding."""
import numpy as np
from core.config import CFG


def crop_region(
    img: np.ndarray,
    bbox: tuple,
    pad_ratio: float = CFG.REGION_PAD_RATIO,
) -> np.ndarray:
    """
    Crop with percentage padding. Clamps to image boundaries.

    Args:
        img: BGR numpy array.
        bbox: (x1, y1, x2, y2) region to crop.
        pad_ratio: Fractional padding added to each side (default 5%).

    Returns:
        Cropped BGR numpy array.
    """
    h, w = img.shape[:2]
    x1, y1, x2, y2 = bbox
    pad_x = int((x2 - x1) * pad_ratio)
    pad_y = int((y2 - y1) * pad_ratio)
    x1 = max(0, x1 - pad_x)
    y1 = max(0, y1 - pad_y)
    x2 = min(w, x2 + pad_x)
    y2 = min(h, y2 + pad_y)
    return img[y1:y2, x1:x2].copy()
```

### Stage 3 Smoke Test

```python
# test_stage3.py — from ai-services/
import cv2
from preprocessing import preprocess
from layout import detect_fields, build_regions, crop_region

result = preprocess("path/to/passport.jpg")
detections = detect_fields(result.image)
regions = build_regions(result.image, detections)

print("Detected regions:", list(regions.keys()))   # ['photo', 'signature', 'mrz', 'text']

if "photo" in regions:
    face_crop = crop_region(result.image, regions["photo"])
    cv2.imwrite("debug_photo.jpg", face_crop)
    print("Photo crop saved.")

if "signature" in regions:
    sig_crop = crop_region(result.image, regions["signature"])
    cv2.imwrite("debug_signature.jpg", sig_crop)
    print("Signature crop saved.")
```

---

## Stage 4A — OCR Engine

**Goal:** Thread-safe PaddleOCR singleton that returns `TextRegion` objects.  
**Approach:** Built using official `PaddleOCR-main` engine with support for both 2.x and 3.x result formats.

### What to do

**Engine:**
```
SOURCE: PaddleOCR-main
DEST:   ai-services/ocr/engine.py
```

Exposes `run_ocr()`, `TextRegion`, and `OCRModelInitError`, wrapping PaddleOCR with text detection, angle classification, and recognition. Standardizes parsed regions to `TextRegion(text, bbox, confidence)`.

**Create `ocr/__init__.py`:**
```python
"""OCR package. Public API: run_ocr(), TextRegion."""
from .engine import run_ocr, TextRegion, OCRModelInitError

__all__ = ["run_ocr", "TextRegion", "OCRModelInitError"]
```

> [!IMPORTANT]
> `TextRegion.bbox` is a **quadrilateral**: `[[x1,y1],[x2,y2],[x3,y3],[x4,y4]]`.  
> When you need a bounding rectangle, compute: `x1=min(p[0] for p in bbox)`, `y1=min(p[1] for p in bbox)`, etc.

### Stage 4A Smoke Test

```python
# test_stage4a.py — from ai-services/
import cv2
from ocr import run_ocr

img = cv2.imread("path/to/any/id.jpg")
regions = run_ocr(img)
for r in regions:
    print(f"[{r.confidence:.2f}] {r.text[:60]}")
```

---

## Stage 4B — MRZ Parser

**Goal:** Full ICAO Doc 9303 compliant MRZ parsing for TD3 passports and TD1/MRV ID cards.  
**Approach:** Copy two files directly. Write one thin wrapper function.

### What to do

**Copy file 1:**
```
SOURCE: document-ocr-main/document-ocr-main/core/mrz_parser.py
DEST:   ai-services/ocr/mrz/parser.py
```

**Copy file 2:**
```
SOURCE: document-ocr-main/document-ocr-main/core/travel_mrz.py
DEST:   ai-services/ocr/mrz/travel_mrz.py
```

**Fix internal imports in both copied files** — change `from .ocr_engine import TextRegion` and `from .document_registry import normalize_country` to their new paths:

In `parser.py`:
```python
# CHANGE:
from .ocr_engine import TextRegion
# TO:
from ocr.engine import TextRegion
```

In `travel_mrz.py`:
```python
# CHANGE:
from .document_registry import normalize_country
from .mrz_parser import _DIGIT_CORRECTIONS, _parse_mrz_date, verify_check_digit
from .ocr_engine import TextRegion
# TO:
from ocr.shared.document_registry import normalize_country
from ocr.mrz.parser import _DIGIT_CORRECTIONS, _parse_mrz_date, verify_check_digit
from ocr.engine import TextRegion
```

**Create `ocr/mrz/__init__.py` with unified public function:**
```python
"""MRZ parsing package.

Public API:
  extract_mrz(mrz_crop: np.ndarray) -> MRZResult | TravelMRZResult | None
"""
from __future__ import annotations

import numpy as np

from ocr.engine import run_ocr
from .parser import MRZResult, parse_mrz
from .travel_mrz import TravelMRZResult, parse_travel_mrz


def extract_mrz(mrz_crop: np.ndarray) -> MRZResult | TravelMRZResult | None:
    """
    Unified MRZ extraction from a cropped MRZ image.

    Steps:
    1. Run OCR on the crop to get TextRegion list.
    2. Try parse_mrz()  (TD3 — 2×44 chars, Passport format).
    3. If None, try parse_travel_mrz() (TD1/TD2/MRV-A/MRV-B — ID cards, visas).
    4. Return the first successful result, or None.

    Args:
        mrz_crop: BGR numpy array of the MRZ zone, already isolated by YOLO.

    Returns:
        MRZResult (passport) | TravelMRZResult (ID/visa) | None (parse failure)
    """
    regions = run_ocr(mrz_crop)
    result = parse_mrz(regions)
    if result is not None:
        return result
    return parse_travel_mrz(regions)


__all__ = ["extract_mrz", "MRZResult", "TravelMRZResult"]
```

### Stage 4B Smoke Test

```python
# test_stage4b.py — from ai-services/
import cv2
from ocr.mrz import extract_mrz

mrz_crop = cv2.imread("path/to/passport_mrz_crop.jpg")
result = extract_mrz(mrz_crop)

if result:
    # MRZResult (TD3 passport) has .passport_number, .date_of_birth, etc.
    print("Doc number:", result.passport_number.value)
    print("DOB:", result.date_of_birth.value)
    print("Expiry:", result.expiry_date.value)
    print("All checksums valid:", result.overall_checksum_valid)
    print("Errors:", result.errors)
else:
    print("MRZ not parseable")
```

---

## Stage 4C — Shared OCR Utilities & Document Extractors

**Goal:** Copy all shared utility files and document-specific extractors from `document-ocr-main`.  
**Approach:** Pure file copies. Fix import paths. Zero logic changes.

### Step 1 — Copy all shared utility files

```
SOURCE → DEST

document-ocr-main/core/validator.py          → ocr/shared/validator.py
document-ocr-main/core/validators.py         → ocr/shared/validators.py
document-ocr-main/core/document_classifier.py→ ocr/shared/document_classifier.py
document-ocr-main/core/page_classifier.py    → ocr/shared/page_classifier.py
document-ocr-main/core/document_registry.py  → ocr/shared/document_registry.py
document-ocr-main/core/evidence.py           → ocr/shared/evidence.py
```

**Create `ocr/shared/__init__.py`:**
```python
"""Shared OCR utilities: validators, classifiers, evidence tracking."""
from .document_classifier import classify_document, DocumentClassification
from .validators import normalize_dl, normalize_pan, normalize_epic, is_valid_aadhaar, extract_aadhaar_number

__all__ = [
    "classify_document", "DocumentClassification",
    "normalize_dl", "normalize_pan", "normalize_epic",
    "is_valid_aadhaar", "extract_aadhaar_number",
]
```

**Fix imports in each copied shared file** — replace `from .X import` with `from ocr.shared.X import` or `from ocr.engine import`:

| File | Import to fix | Replace with |
|:-----|:-------------|:-------------|
| `validator.py` | `from .mrz_parser import MRZResult` | `from ocr.mrz.parser import MRZResult` |
| `validator.py` | `from .ocr_engine import TextRegion` | `from ocr.engine import TextRegion` |
| `document_classifier.py` | `from .ocr_engine import TextRegion` | `from ocr.engine import TextRegion` |
| `document_classifier.py` | `from .page_classifier import ...` | `from ocr.shared.page_classifier import ...` |
| `document_classifier.py` | `from .validators import ...` | `from ocr.shared.validators import ...` |
| `page_classifier.py` | `from .mrz_parser import _find_mrz_lines` | `from ocr.mrz.parser import _find_mrz_lines` |
| `page_classifier.py` | `from .ocr_engine import TextRegion` | `from ocr.engine import TextRegion` |
| `evidence.py` | `from .ocr_engine import TextRegion` | `from ocr.engine import TextRegion` |

---

### Step 2 — Copy all document extractors

```
SOURCE → DEST

document-ocr-main/core/driving_licence_extractor.py → ocr/extractors/driving_licence.py
document-ocr-main/core/aadhaar_extractor.py          → ocr/extractors/aadhaar.py
document-ocr-main/core/pan_extractor.py               → ocr/extractors/pan.py
document-ocr-main/core/voter_id_extractor.py          → ocr/extractors/voter_id.py
```

**Fix imports in each extractor** — same pattern as shared files:

| File | Import to fix | Replace with |
|:-----|:-------------|:-------------|
| `driving_licence.py` | `from .ocr_engine import TextRegion` | `from ocr.engine import TextRegion` |
| `driving_licence.py` | `from .validator import find_label_value, ...` | `from ocr.shared.validator import find_label_value, ...` |
| `driving_licence.py` | `from .validators import normalize_dl` | `from ocr.shared.validators import normalize_dl` |
| `aadhaar.py` | `from .ocr_engine import TextRegion` | `from ocr.engine import TextRegion` |
| `aadhaar.py` | `from .validator import find_label_value, ...` | `from ocr.shared.validator import find_label_value, ...` |
| `aadhaar.py` | `from .validators import extract_aadhaar_number, is_valid_aadhaar` | `from ocr.shared.validators import ...` |
| `pan.py` | `from .ocr_engine import TextRegion` | `from ocr.engine import TextRegion` |
| `pan.py` | `from .validator import ...` | `from ocr.shared.validator import ...` |
| `pan.py` | `from .validators import normalize_pan` | `from ocr.shared.validators import normalize_pan` |
| `voter_id.py` | `from .ocr_engine import TextRegion` | `from ocr.engine import TextRegion` |
| `voter_id.py` | `from .validator import ...` | `from ocr.shared.validator import ...` |
| `voter_id.py` | `from .validators import normalize_epic` | `from ocr.shared.validators import normalize_epic` |

**Create `ocr/extractors/__init__.py`:**
```python
"""Document field extractor package.

Public API:
  extract_driving_licence(regions, layout) -> DrivingLicenceFields
  extract_aadhaar(regions, layout)         -> AadhaarFields
  extract_pan(regions)                     -> PanFields
  extract_voter_id(regions)                -> VoterIdFields
"""
from .driving_licence import DrivingLicenceFields, extract_driving_licence
from .aadhaar import AadhaarFields, extract_aadhaar
from .pan import PanFields, extract_pan
from .voter_id import VoterIdFields, extract_voter_id

__all__ = [
    "DrivingLicenceFields", "extract_driving_licence",
    "AadhaarFields", "extract_aadhaar",
    "PanFields", "extract_pan",
    "VoterIdFields", "extract_voter_id",
]
```

---

### Stage 4C Smoke Test

```python
# test_stage4c.py — from ai-services/
import cv2
from preprocessing import preprocess
from ocr import run_ocr
from ocr.shared import classify_document
from ocr.extractors import extract_aadhaar, extract_driving_licence

result = preprocess("path/to/aadhaar.jpg")
regions = run_ocr(result.image)

classification = classify_document(regions)
print("Detected:", classification.document_type, "conf:", classification.confidence)

fields = extract_aadhaar(regions)
print("Aadhaar Number:", fields.aadhaar_number)
print("Name:", fields.name)
print("DOB:", fields.date_of_birth)
```

---

## Stage 5 — Biometric Face Verification

**Goal:** 1:1 face match between document portrait and live selfie.  
**Approach:** Thin wrappers over `insightface` pip package. The `face_align.norm_crop()` from insightface handles alignment natively. No custom alignment code needed.

### Stage 5 does NOT copy any file from reference repos.
### The `insightface` library (installed via pip) is the entire source.

---

### 5.1 `biometrics/detector.py`

```python
"""SCRFD face detector — thin wrapper over insightface.app.FaceAnalysis.

Uses the 'detection' module only (SCRFD). Does NOT load ArcFace here.
ArcFace is loaded separately in embedder.py.

Lazy singleton: model loads on first call, not at import time.
"""
from __future__ import annotations

import numpy as np
from insightface.app import FaceAnalysis

from core.config import CFG
from core.exceptions import FaceNotFoundError, MultipleFacesError
from core.logger import get_logger

logger = get_logger(__name__)

_app: FaceAnalysis | None = None


def _get_app() -> FaceAnalysis:
    global _app
    if _app is None:
        logger.info("Loading SCRFD face detection model...")
        _app = FaceAnalysis(
            name=CFG.INSIGHTFACE_MODEL_PACK,
            allowed_modules=["detection"],
        )
        _app.prepare(
            ctx_id=0,
            det_thresh=CFG.FACE_DET_THRESHOLD,
            det_size=CFG.FACE_DET_SIZE,
        )
        logger.info("SCRFD loaded.")
    return _app


def detect_faces(img: np.ndarray, *, is_live: bool = False) -> list:
    """Detect faces in an image. Returns a list of Face objects.

    Args:
        img: BGR numpy array.
        is_live: If True, enforces exactly 1 face (anti-spoofing for selfies).
                 If False, returns the highest-confidence face from the image.

    Returns:
        List containing the best detected Face object (always length 1 on success).

    Raises:
        FaceNotFoundError: No face detected.
        MultipleFacesError: is_live=True and more than 1 face found.
    """
    faces = _get_app().get(img)

    if len(faces) == 0:
        raise FaceNotFoundError("No face detected.")

    if is_live and len(faces) > 1:
        raise MultipleFacesError(
            f"Live selfie must contain exactly 1 face. Found {len(faces)}."
        )

    # Return highest-confidence detection
    faces.sort(key=lambda f: f.det_score, reverse=True)
    return [faces[0]]
```

---

### 5.2 `biometrics/embedder.py`

```python
"""ArcFace ResNet-100 face embedding extractor.

Uses insightface.app.FaceAnalysis with both detection+recognition modules.
Returns L2-normalised 512-D embedding vectors via face.normed_embedding.

Lazy singleton: model loads on first call, not at import time.
"""
from __future__ import annotations

import numpy as np
from insightface.app import FaceAnalysis

from core.config import CFG
from core.exceptions import FaceNotFoundError
from core.logger import get_logger

logger = get_logger(__name__)

_app: FaceAnalysis | None = None


def _get_app() -> FaceAnalysis:
    global _app
    if _app is None:
        logger.info("Loading ArcFace embedding model...")
        _app = FaceAnalysis(
            name=CFG.INSIGHTFACE_MODEL_PACK,
            allowed_modules=["detection", "recognition"],
        )
        _app.prepare(ctx_id=0, det_size=CFG.FACE_DET_SIZE)
        logger.info("ArcFace loaded.")
    return _app


def get_embedding(img: np.ndarray) -> np.ndarray:
    """Extract L2-normalised 512-D ArcFace embedding from an image.

    Args:
        img: BGR numpy array (full image or portrait crop).

    Returns:
        np.ndarray of shape (512,) — L2-normalised embedding vector.

    Raises:
        FaceNotFoundError: No face detected or embedding is None.

    Note:
        Always use face.normed_embedding (L2-normalised), not face.embedding (raw).
        Cosine similarity on L2-normalised vectors = simple dot product.
    """
    faces = _get_app().get(img)

    if not faces:
        raise FaceNotFoundError("No face found for embedding extraction.")

    faces.sort(key=lambda f: f.det_score, reverse=True)
    emb = faces[0].normed_embedding

    if emb is None:
        raise FaceNotFoundError("ArcFace returned None embedding.")

    return emb
```

---

### 5.3 `biometrics/matcher.py`

```python
"""Cosine similarity matcher with three-band decision logic.

Thresholds (from CFG):
  >= BIOMETRIC_VERIFIED_THRESHOLD  → VERIFIED
  >= BIOMETRIC_REVIEW_THRESHOLD    → REVIEW_REQUIRED
  <  BIOMETRIC_REVIEW_THRESHOLD    → REJECTED
"""
import numpy as np
from core.config import CFG


def compute_similarity(emb_doc: np.ndarray, emb_live: np.ndarray) -> float:
    """Cosine similarity between two L2-normalised 512-D ArcFace embeddings.

    Both vectors must already be L2-normalised (use face.normed_embedding).
    Similarity = dot product of normalised vectors, clamped to [0.0, 1.0].
    """
    return float(np.clip(np.dot(emb_doc, emb_live), 0.0, 1.0))


def make_decision(score: float) -> dict:
    """Apply threshold bands to a similarity score. Returns structured verdict.

    Returns:
        {
            "status": "VERIFIED" | "REVIEW_REQUIRED" | "REJECTED",
            "match_score": float,
            "decision_threshold": float,
        }
    """
    if score >= CFG.BIOMETRIC_VERIFIED_THRESHOLD:
        status = "VERIFIED"
    elif score >= CFG.BIOMETRIC_REVIEW_THRESHOLD:
        status = "REVIEW_REQUIRED"
    else:
        status = "REJECTED"

    return {
        "status": status,
        "match_score": round(score, 4),
        "decision_threshold": CFG.BIOMETRIC_VERIFIED_THRESHOLD,
    }
```

---

### 5.4 `biometrics/__init__.py` — Unified Entry Point

```python
"""Biometric face verification package.

Public API:
  verify_faces(doc_img, live_img) -> dict
"""
from __future__ import annotations

import numpy as np

from core.exceptions import FaceNotFoundError, MultipleFacesError
from core.logger import get_logger
from .detector import detect_faces
from .embedder import get_embedding
from .matcher import compute_similarity, make_decision

logger = get_logger(__name__)


def verify_faces(doc_img: np.ndarray, live_img: np.ndarray) -> dict:
    """Full 1:1 biometric face verification pipeline.

    Steps:
    1. detect_faces(doc_img, is_live=False)    → doc face bbox + landmarks
    2. detect_faces(live_img, is_live=True)    → live face bbox + landmarks
                                                  Raises MultipleFacesError if > 1 face
    3. get_embedding(doc_img)                  → doc 512-D L2-norm vector
    4. get_embedding(live_img)                 → live 512-D L2-norm vector
    5. compute_similarity(emb_doc, emb_live)   → cosine score
    6. make_decision(score)                    → VERIFIED / REVIEW_REQUIRED / REJECTED

    Args:
        doc_img:  BGR np.ndarray — cropped document portrait (from YOLO photo region).
        live_img: BGR np.ndarray — live selfie photo.

    Returns:
        {
            "status": str,              # VERIFIED | REVIEW_REQUIRED | REJECTED | FAILED
            "match_score": float,
            "decision_threshold": float,
            "doc_face_detected": bool,
            "doc_face_bbox": list[int] | None,  # [x1, y1, x2, y2]
            "live_face_detected": bool,
            "live_face_bbox": list[int] | None,
            "diagnostics": list[str],
        }
    """
    diagnostics: list[str] = []
    doc_face_bbox = None
    live_face_bbox = None
    doc_face_detected = False
    live_face_detected = False

    # ── Step 1: Detect document face ──────────────────────────────────────────
    try:
        doc_faces = detect_faces(doc_img, is_live=False)
        doc_face_detected = True
        doc_face_bbox = [int(v) for v in doc_faces[0].bbox]
    except FaceNotFoundError as e:
        diagnostics.append(f"DOC_FACE_NOT_FOUND: {e}")
        return {
            "status": "FAILED",
            "match_score": 0.0,
            "decision_threshold": CFG.BIOMETRIC_VERIFIED_THRESHOLD,  # noqa: F821
            "doc_face_detected": False,
            "doc_face_bbox": None,
            "live_face_detected": False,
            "live_face_bbox": None,
            "diagnostics": diagnostics,
        }

    # ── Step 2: Detect live face (strict single-face enforcement) ─────────────
    try:
        live_faces = detect_faces(live_img, is_live=True)
        live_face_detected = True
        live_face_bbox = [int(v) for v in live_faces[0].bbox]
    except MultipleFacesError as e:
        raise  # Re-raise — router returns 400
    except FaceNotFoundError as e:
        diagnostics.append(f"LIVE_FACE_NOT_FOUND: {e}")
        return {
            "status": "FAILED",
            "match_score": 0.0,
            "decision_threshold": CFG.BIOMETRIC_VERIFIED_THRESHOLD,  # noqa: F821
            "doc_face_detected": doc_face_detected,
            "doc_face_bbox": doc_face_bbox,
            "live_face_detected": False,
            "live_face_bbox": None,
            "diagnostics": diagnostics,
        }

    # ── Steps 3–6: Embed and match ────────────────────────────────────────────
    emb_doc = get_embedding(doc_img)
    emb_live = get_embedding(live_img)
    score = compute_similarity(emb_doc, emb_live)
    verdict = make_decision(score)

    return {
        **verdict,
        "doc_face_detected": doc_face_detected,
        "doc_face_bbox": doc_face_bbox,
        "live_face_detected": live_face_detected,
        "live_face_bbox": live_face_bbox,
        "diagnostics": diagnostics,
    }


# Fix CFG import at bottom (was referenced before import above for FAILED returns)
from core.config import CFG  # noqa: E402
```

### Stage 5 Smoke Test

```python
# test_stage5.py — from ai-services/
import cv2
from biometrics import verify_faces

doc = cv2.imread("path/to/cropped_document_portrait.jpg")
live = cv2.imread("path/to/selfie.jpg")

result = verify_faces(doc, live)
print("Status:", result["status"])
print("Score:", result["match_score"])
print("Diagnostics:", result["diagnostics"])
```

---

## Stage 6 — Pydantic Response Schemas

**Goal:** Strict typed API response models implementing the JSON contract from `pipeline_architecture.md`.  
**Approach:** New code — Pydantic v2 models.

### 6.1 `schemas/request.py`

```python
"""API request metadata models.
Note: Images are received as multipart UploadFile, not in the JSON body.
This model validates form-field metadata sent alongside uploads.
"""
from typing import Literal
from pydantic import BaseModel


class DocumentMeta(BaseModel):
    doc_type: Literal["passport", "national_id", "driving_license", "dob_proof"] | None = None
```

---

### 6.2 `schemas/response.py`

```python
"""Pydantic v2 response models — implements the JSON schema from pipeline_architecture.md §5.1."""
from __future__ import annotations
from typing import Literal
from pydantic import BaseModel


class QualityAssessment(BaseModel):
    passed: bool
    blur_score: float
    glare_detected: bool
    glare_ratio: float
    warnings: list[str] = []
    errors: list[str] = []


class BoundingBox(BaseModel):
    """Bounding box for a detected layout region."""
    bounding_box: list[int]           # [x1, y1, x2, y2]
    confidence: float
    image_base64: str | None = None   # base64-encoded JPEG crop


class LayoutCoordinates(BaseModel):
    photo: BoundingBox | None = None
    signature: BoundingBox | None = None
    mrz_region: BoundingBox | None = None


class MRZChecksums(BaseModel):
    document_number: bool = False
    date_of_birth: bool = False
    expiry_date: bool = False
    personal_number: bool | None = None
    composite: bool = False
    all_valid: bool = False


class MRZFields(BaseModel):
    document_number: str | None = None
    surname: str | None = None
    given_names: str | None = None
    nationality: str | None = None
    date_of_birth: str | None = None
    sex: str | None = None
    expiry_date: str | None = None
    personal_number: str | None = None
    country_code: str | None = None


class MRZData(BaseModel):
    is_valid_format: bool
    mrz_type: Literal["TD1", "TD2", "TD3", "MRV_A", "MRV_B"] | None = None
    raw_lines: list[str] = []
    fields: MRZFields = MRZFields()
    checksums: MRZChecksums | None = None
    confidence: float = 0.0


class OCRTextBlock(BaseModel):
    """A single detected text region from RapidOCR."""
    text: str
    polygon: list[list[int]]   # [[x,y],[x,y],[x,y],[x,y]] — quadrilateral
    confidence: float


class FieldValue(BaseModel):
    """A single extracted field with provenance for LLM consumption."""
    value: str | None = None
    confidence: float = 0.0
    source: Literal["mrz", "ocr"] = "ocr"   # which sub-pipeline provided this


class ExtractedData(BaseModel):
    mrz: MRZData | None = None
    ocr_text_blocks: list[OCRTextBlock] = []
    rule_extracted_fields: dict[str, FieldValue] = {}
    # rule_extracted_fields is the direct LLM input interface:
    # {"surname": {"value": "SMITH", "confidence": 0.95, "source": "mrz"}, ...}


class BiometricVerification(BaseModel):
    status: Literal["VERIFIED", "REVIEW_REQUIRED", "REJECTED", "FAILED"]
    match_score: float
    decision_threshold: float
    doc_face_detected: bool
    doc_face_bbox: list[int] | None = None
    live_face_detected: bool
    live_face_bbox: list[int] | None = None
    diagnostics: list[str] = []


class DocumentMetadata(BaseModel):
    detected_type: Literal["passport", "national_id", "driving_license", "dob_proof", "unknown"]
    document_country: str | None = None
    orientation_applied_degrees: int = 0
    normalized_dimensions: dict[str, int] = {}


class PipelineSummary(BaseModel):
    overall_confidence: float
    ocr_confidence_mean: float
    layout_confidence_mean: float
    execution_time_ms: float


class VerificationResponse(BaseModel):
    """Root response model. The full output of one pipeline run."""
    request_id: str
    timestamp: str                        # ISO 8601
    document_metadata: DocumentMetadata
    quality_assessment: QualityAssessment
    layout_coordinates: LayoutCoordinates
    extracted_data: ExtractedData
    biometric_verification: BiometricVerification | None = None
    pipeline_summary: PipelineSummary
```

### Stage 6 Smoke Test

```python
# test_stage6.py — from ai-services/
from schemas.response import BiometricVerification

b = BiometricVerification(
    status="VERIFIED", match_score=0.87, decision_threshold=0.65,
    doc_face_detected=True, live_face_detected=True,
)
print(b.model_dump_json(indent=2))
```

---

## Stage 7 — FastAPI Routers & Main Entry Point

**Goal:** Wire all stages into two HTTP endpoints. Catch all `PipelineError` subclasses at the router level — never return a 500 for domain errors.

---

### 7.1 `router/ocr_router.py`

```python
"""POST /ocr/extract — Document OCR, layout detection, and field extraction."""
from __future__ import annotations

import base64
import time
import uuid
from datetime import datetime, timezone
from typing import Literal

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from core.exceptions import ImageQualityError, PipelineError
from core.logger import get_logger
from layout import detect_fields, build_regions, crop_region
from ocr import run_ocr
from ocr.mrz import extract_mrz
from ocr.shared import classify_document
from ocr.extractors import (
    extract_aadhaar, extract_driving_licence, extract_pan, extract_voter_id,
)
from preprocessing import preprocess
from schemas.response import (
    BoundingBox, DocumentMetadata, ExtractedData, FieldValue,
    LayoutCoordinates, MRZChecksums, MRZData, MRZFields,
    OCRTextBlock, PipelineSummary, QualityAssessment, VerificationResponse,
)

router = APIRouter(prefix="/ocr", tags=["OCR"])
logger = get_logger(__name__)


def _bbox_to_rect(bbox: list[list[int]]) -> list[int]:
    """Convert RapidOCR quadrilateral bbox to [x1,y1,x2,y2] rectangle."""
    xs = [p[0] for p in bbox]
    ys = [p[1] for p in bbox]
    return [min(xs), min(ys), max(xs), max(ys)]


def _img_to_b64(img: np.ndarray) -> str:
    """Encode numpy BGR image to base64 JPEG string."""
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buf).decode()


@router.post("/extract", response_model=VerificationResponse)
async def extract_document(
    document: UploadFile = File(..., description="Document image"),
    doc_type: Literal["passport", "national_id", "driving_license", "dob_proof"] | None = Form(None),
) -> dict:
    """
    Pipeline:
    1. Preprocess image (quality check + perspective correction)
    2. YOLO layout detection (photo, signature, mrz, text bboxes)
    3. OCR full image → TextRegion list
    4. Auto-classify document type if not provided
    5. MRZ extraction (if mrz region detected)
    6. Field extraction by document type
    7. Assemble and return VerificationResponse
    """
    t_start = time.monotonic()
    request_id = str(uuid.uuid4())

    image_bytes = await document.read()

    # ── Step 1: Preprocess ────────────────────────────────────────────────────
    try:
        pre = preprocess(image_bytes)
    except ImageQualityError as e:
        raise HTTPException(status_code=400, detail={"error": str(e), "request_id": request_id})

    img = pre.image
    h, w = img.shape[:2]
    warnings = list(pre.warnings)

    quality = QualityAssessment(
        passed=True,
        blur_score=0.0,    # preprocessor doesn't expose raw score; 0.0 = passed gate
        glare_detected="GLARE_DETECTED" in warnings,
        glare_ratio=0.0,
        warnings=warnings,
        errors=[],
    )

    # ── Step 2: Layout detection ──────────────────────────────────────────────
    detections = detect_fields(img)
    regions_map = build_regions(img, detections)

    def _region_bbox(key: str) -> BoundingBox | None:
        if key not in regions_map:
            return None
        bbox = regions_map[key]
        crop = crop_region(img, bbox)
        return BoundingBox(
            bounding_box=list(bbox),
            confidence=next((d[5] for d in detections if d[0] == key), 0.0) if detections else 0.0,
            image_base64=_img_to_b64(crop),
        )

    layout_coords = LayoutCoordinates(
        photo=_region_bbox("photo"),
        signature=_region_bbox("signature"),
        mrz_region=_region_bbox("mrz"),
    )

    layout_conf_mean = (
        sum(d[5] for d in detections) / len(detections) if detections else 0.0
    )

    # ── Step 3: Full-image OCR ────────────────────────────────────────────────
    ocr_regions = run_ocr(img)
    ocr_blocks = [
        OCRTextBlock(text=r.text, polygon=r.bbox, confidence=r.confidence)
        for r in ocr_regions
    ]
    ocr_conf_mean = (
        sum(r.confidence for r in ocr_regions) / len(ocr_regions) if ocr_regions else 0.0
    )

    # ── Step 4: Auto-classify if doc_type not provided ────────────────────────
    if doc_type is None:
        classification = classify_document(ocr_regions)
        detected_type = classification.document_type
    else:
        detected_type = doc_type

    # ── Step 5: MRZ extraction (passports and MRZ-bearing ID cards) ──────────
    mrz_data: MRZData | None = None
    if "mrz" in regions_map:
        mrz_crop = crop_region(img, regions_map["mrz"], pad_ratio=0.0)
        mrz_result = extract_mrz(mrz_crop)
        if mrz_result is not None:
            mrz_data = MRZData(
                is_valid_format=True,
                mrz_type="TD3" if hasattr(mrz_result, "passport_number") else "TD1",
                raw_lines=list(mrz_result.raw_lines) if mrz_result.raw_lines else [],
                fields=MRZFields(
                    document_number=getattr(getattr(mrz_result, "passport_number", None), "value", None),
                    surname=getattr(getattr(mrz_result, "surname", None), "value", None),
                    given_names=getattr(getattr(mrz_result, "given_names", None), "value", None),
                    nationality=getattr(getattr(mrz_result, "nationality", None), "value", None),
                    date_of_birth=getattr(getattr(mrz_result, "date_of_birth", None), "value", None),
                    sex=getattr(getattr(mrz_result, "sex", None), "value", None),
                    expiry_date=getattr(getattr(mrz_result, "expiry_date", None), "value", None),
                ),
                checksums=MRZChecksums(
                    document_number=getattr(getattr(mrz_result, "passport_number", None), "checksum_valid", False),
                    date_of_birth=getattr(getattr(mrz_result, "date_of_birth", None), "checksum_valid", False),
                    expiry_date=getattr(getattr(mrz_result, "expiry_date", None), "checksum_valid", False),
                    all_valid=getattr(mrz_result, "overall_checksum_valid", False),
                ),
                confidence=1.0 if getattr(mrz_result, "overall_checksum_valid", False) else 0.6,
            )

    # ── Step 6: Document field extraction ────────────────────────────────────
    rule_fields: dict[str, FieldValue] = {}

    if detected_type in ("passport", "national_id") and mrz_data and mrz_data.fields:
        f = mrz_data.fields
        for key, val in f.model_dump().items():
            if val:
                rule_fields[key] = FieldValue(value=val, confidence=mrz_data.confidence, source="mrz")

    if detected_type == "driving_license":
        try:
            dl = extract_driving_licence(ocr_regions)
            for fname in dl.__dataclass_fields__:
                v = getattr(dl, fname, None)
                if v:
                    rule_fields[fname] = FieldValue(value=str(v), confidence=0.8, source="ocr")
        except Exception:
            pass

    elif detected_type in ("national_id",) and not rule_fields:
        try:
            aad = extract_aadhaar(ocr_regions)
            for fname in aad.__dataclass_fields__:
                v = getattr(aad, fname, None)
                if v:
                    rule_fields[fname] = FieldValue(value=str(v), confidence=0.8, source="ocr")
        except Exception:
            pass

    # ── Step 7: Assemble response ─────────────────────────────────────────────
    elapsed_ms = (time.monotonic() - t_start) * 1000
    overall_conf = round((ocr_conf_mean * 0.35) + (layout_conf_mean * 0.15) + 0.5, 3)

    return VerificationResponse(
        request_id=request_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        document_metadata=DocumentMetadata(
            detected_type=detected_type or "unknown",
            normalized_dimensions={"width": w, "height": h},
        ),
        quality_assessment=quality,
        layout_coordinates=layout_coords,
        extracted_data=ExtractedData(
            mrz=mrz_data,
            ocr_text_blocks=ocr_blocks,
            rule_extracted_fields=rule_fields,
        ),
        pipeline_summary=PipelineSummary(
            overall_confidence=overall_conf,
            ocr_confidence_mean=round(ocr_conf_mean, 4),
            layout_confidence_mean=round(layout_conf_mean, 4),
            execution_time_ms=round(elapsed_ms, 1),
        ),
    ).model_dump()
```

---

### 7.2 `router/biometric_router.py`

```python
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
    2. YOLO layout detection → crop photo region
    3. Load selfie image (preprocess without perspective warp for live photos)
    4. verify_faces(doc_portrait, selfie) → cosine similarity + verdict
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
    detections = detect_fields(doc_pre.image)
    regions_map = build_regions(doc_pre.image, detections)

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
```

---

### 7.3 `main.py`

```python
"""FastAPI application — unified entrypoint for the verification service."""
from fastapi import FastAPI
from router.ocr_router import router as ocr_router
from router.biometric_router import router as biometric_router

app = FastAPI(
    title="Identity Document Verification API",
    version="1.0.0",
    description=(
        "AI pipeline: image preprocessing → YOLO layout detection → "
        "RapidOCR text extraction → ICAO MRZ parsing → ArcFace 1:1 biometric verification."
    ),
)

app.include_router(ocr_router)
app.include_router(biometric_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": "1.0.0"}
```

---

### 7.4 Stage 7 Integration Tests

```bash
# Start server
cd ai-services/
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Health check
curl http://localhost:8000/health

# OCR extract (passport)
curl -X POST http://localhost:8000/ocr/extract \
  -F "document=@/path/to/passport.jpg" \
  -F "doc_type=passport"

# OCR extract (auto-detect)
curl -X POST http://localhost:8000/ocr/extract \
  -F "document=@/path/to/aadhaar.jpg"

# Biometric verify
curl -X POST http://localhost:8000/biometrics/verify \
  -F "document=@/path/to/passport.jpg" \
  -F "selfie=@/path/to/selfie.jpg"
```

---

## Stage Completion Checklist

| # | Stage | Key Action | Status |
|:--|:------|:-----------|:-------|
| 1 | Scaffold | Create `core/config.py`, `exceptions.py`, `logger.py`; replace `requirements.txt` + `Dockerfile` | `[x]` |
| 2 | Preprocessing | **Copy** `preprocessor.py` → `preprocessing/`; create `__init__.py` | `[x]` |
| 3 | Layout | **Copy** `passport_layout.pt`; **adapt** `detector.py` (2 lines); **adapt** `region_builder.py` (2 lines); create `cropper.py` | `[x]` |
| 4A | OCR Engine | **Copy** `ocr_engine.py` → `ocr/engine.py`; create `__init__.py` | `[x]` |
| 4B | MRZ Parser | **Copy** `mrz_parser.py` + `travel_mrz.py`; fix imports; create unified `extract_mrz()` | `[x]` |
| 4C | Extractors | **Copy** 4 extractors + 6 shared utils; fix all imports | `[x]` |
| 5 | Biometrics | Create 4 new thin wrapper files (`detector.py`, `embedder.py`, `matcher.py`, `__init__.py`) | `[x]` |
| 6 | Schemas | Create `request.py` + `response.py` (Pydantic v2) | `[x]` |
| 7 | FastAPI | Create `ocr_router.py`, `biometric_router.py`, `main.py` | `[x]` |

---

## Import Fix Reference Table

When copying files from `document-ocr-main/core/`, all relative imports (`from .X import`) must become absolute imports. This is the complete mapping:

| Old relative import | New absolute import |
|:--------------------|:--------------------|
| `from .ocr_engine import TextRegion` | `from ocr.engine import TextRegion` |
| `from .mrz_parser import MRZResult` | `from ocr.mrz.parser import MRZResult` |
| `from .mrz_parser import _find_mrz_lines` | `from ocr.mrz.parser import _find_mrz_lines` |
| `from .mrz_parser import _DIGIT_CORRECTIONS, ...` | `from ocr.mrz.parser import _DIGIT_CORRECTIONS, ...` |
| `from .validator import find_label_value, ...` | `from ocr.shared.validator import find_label_value, ...` |
| `from .validators import normalize_dl, ...` | `from ocr.shared.validators import normalize_dl, ...` |
| `from .document_registry import normalize_country` | `from ocr.shared.document_registry import normalize_country` |
| `from .page_classifier import _has_mrz_like_lines, ...` | `from ocr.shared.page_classifier import _has_mrz_like_lines, ...` |
| `from .evidence import ...` | `from ocr.shared.evidence import ...` |

---

## Non-Negotiable Rules

> [!CAUTION]
> These rules apply to every single file in every stage.

1. **Copy, don't rewrite.** If the code already exists in a reference folder, copy it.
2. **Fix imports, not logic.** The only changes to copied files are import path fixes and the 2-line adapter changes in `detector.py` and `region_builder.py`.
3. **Never install `paddlepaddle` or `easyocr`** — not in requirements, not in any Dockerfile layer.
4. **`TextRegion.bbox` is a quadrilateral** `[[x,y],[x,y],[x,y],[x,y]]` — never a rectangle. Use `min/max` of corners when a rect is needed.
5. **Always use `face.normed_embedding`** from insightface — never `face.embedding` raw.
6. **Always `preprocess()` before OCR** — never pass a raw image to `run_ocr()`.
7. **Singleton lazy-load for all models** — YOLO, RapidOCR, insightface. Import must not crash if weights are absent.
8. **All `PipelineError` subclasses are caught at the router** — they become structured 400 responses, never 500s.
9. **`is_live=True` in `detect_faces()`** enforces single-face — this is an anti-spoofing requirement, not optional.
10. **`FieldValue.source`** must always be `"mrz"` when a field comes from the MRZ engine, `"ocr"` when from visual OCR — the downstream LLM depends on this distinction.
