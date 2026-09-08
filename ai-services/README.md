# AI Services — Identity Document Verification

FastAPI backend with PaddleOCR, YOLO layout detection, and ArcFace biometric verification.

---

## Quick Start (Windows)

### 1. One-time Setup
```powershell
cd ai-services
.\setup_env.ps1
```

This creates a Python 3.12 virtual environment and installs all pinned dependencies.

### 2. Start the Server (every time)
```powershell
cd ai-services
.\start.ps1
```

Server starts at: `http://localhost:8000`  
Test UI: `http://localhost:8000/` (open in browser)  
API docs: `http://localhost:8000/docs`

---

## Architecture

```
Image Input
    │
    ▼
preprocessing/      ─── Quality check, blur/glare detection, perspective correction
    │
    ▼
layout/             ─── YOLO layout detector (photo, signature, MRZ region bboxes)
    │
    ▼
ocr/engine.py       ─── PaddleOCR (sole OCR engine, CPU, numpy 1.26.4 pinned)
    │
    ├── ocr/passport/     ─── Passport pipeline (MRZ TD3 + visual fields)
    ├── ocr/visa/         ─── Visa pipeline (MRV-A/B + visual fields)
    ├── ocr/driving_license/ ─── Indian DL pipeline
    ├── ocr/national_id/  ─── Aadhaar / PAN / Voter ID pipeline
    │
    ▼
ocr/adapter.py      ─── Canonical AdaptedResult (no LLM, deterministic)
    │
    ▼
biometrics/         ─── insightface ArcFace 1:1 face verification (SCRFD + ResNet-100)
```

---

## API Endpoints

### Document OCR
| Method | Path | Description |
|--------|------|-------------|
| POST | `/ocr/extract` | General document OCR (auto-detects type) |
| POST | `/test/adapted-doc-processor` | Full pipeline + canonical JSON adapter |

### Biometrics
| Method | Path | Description |
|--------|------|-------------|
| POST | `/biometrics/verify` | 1:1 face verification (doc portrait + selfie) |
| POST | `/biometrics/passport-verify` | Passport OCR + face verification combined |

### Diagnostics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/test/status` | Component readiness check |
| POST | `/test/preprocess` | Test image preprocessing |
| POST | `/test/ocr` | Test PaddleOCR on raw image |
| POST | `/test/layout` | Test YOLO layout detection |
| POST | `/test/mrz` | Test MRZ extraction |

---

## Document Support

| Document | Fields Extracted | MRZ | Face Verification |
|----------|-----------------|-----|-------------------|
| **Passport** | passport_number, name, nationality, DOB, expiry, sex | ✅ TD3 | ✅ via `/biometrics/passport-verify` |
| **Visa** | document_number, passport_number, name, visa_type, entries, dates | ✅ MRV-A/B | ❌ |
| **Driving Licence** | dl_number, name, DOB, validity, vehicle class, address | ❌ | ❌ |
| **Aadhaar** | aadhaar_number, name, DOB, gender, address | ❌ | ❌ |
| **PAN** | pan_number, name, father_name, DOB | ❌ | ❌ |
| **Voter ID** | epic_number, name, DOB, constituency | ❌ | ❌ |

---

## Dependencies (Pinned)

| Package | Version | Notes |
|---------|---------|-------|
| paddlepaddle | 2.6.2 | CPU only. Install BEFORE paddleocr |
| paddleocr | 2.8.1 | |
| numpy | 1.26.4 | Pinned — DO NOT upgrade to 2.x |
| onnxruntime | 1.18.1 | For insightface ArcFace |
| insightface | 0.7.3 | Downloads buffalo_l models on first use |
| ultralytics | 8.2.90 | YOLO layout detector |

> ⚠️ **Important**: Never run `pip install --upgrade` on this environment.  
> Always use `.\setup_env.ps1` for fresh installs.

---

## Troubleshooting

### PaddlePaddle oneDNN errors
Set this env var before starting:
```powershell
$env:FLAGS_use_mkldnn = "0"
```
Or use `.\start.ps1` which sets it automatically.

### insightface model download fails
insightface downloads ~500MB on first use. Ensure internet access on first run.
Models are cached in `C:\Users\<you>\.insightface\`.

### Import errors after install
Ensure you're inside the venv:
```powershell
.\venv\Scripts\Activate.ps1
python -c "import paddle; print(paddle.__version__)"
```
