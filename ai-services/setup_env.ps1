#!/usr/bin/env pwsh
# =============================================================================
# setup_env.ps1  —  One-shot AI Services Environment Setup
# =============================================================================
# Run ONCE from ai-services folder:
#   cd "c:\Users\sarth\OneDrive\Desktop\web project\sih2026\ai-services"
#   .\setup_env.ps1
#
# After setup, every day just run:
#   .\start.ps1
#
# WHY THE STRICT ORDER:
#   1. paddlepaddle requires numpy<2.0 and protobuf<=3.20.2
#   2. insightface (via albumentations) tries to pull numpy>=2.0 — we override after
#   3. onnxruntime>=1.19 requires protobuf>=4.25 — so we stay on onnxruntime==1.18.1
#   4. insightface doesn't compile on Windows without MSVC — use prebuilt wheel
#   5. torch from pytorch.org CPU index avoids CUDA deps
#   6. After all installs, re-pin numpy and protobuf to enforce compatibility
# =============================================================================

$ErrorActionPreference = "Stop"

$VENV_DIR  = ".\venv"
$PYTHON    = "py"
$PY_VER    = "-3.12"
$INSIGHT_WHL = "https://github.com/Gourieff/Assets/raw/main/Insightface/insightface-0.7.3-cp312-cp312-win_amd64.whl"

function Step($n, $msg) {
    Write-Host ""
    Write-Host "[$n] $msg" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  AI Services — Environment Setup (Python 3.12)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# ── Step 1: Verify Python 3.12 ────────────────────────────────────────────────
Step "1/9" "Checking Python 3.12..."
try {
    $pyver = & $PYTHON $PY_VER --version 2>&1
    Write-Host "      Found: $pyver" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python 3.12 not found. Install from https://python.org" -ForegroundColor Red
    exit 1
}

# ── Step 2: Create virtual environment ────────────────────────────────────────
Step "2/9" "Creating virtual environment..."
if (Test-Path $VENV_DIR) {
    Write-Host "      Existing venv found — skipping creation." -ForegroundColor Yellow
} else {
    & $PYTHON $PY_VER -m venv $VENV_DIR
    Write-Host "      Created." -ForegroundColor Green
}

$PIP = "$VENV_DIR\Scripts\pip.exe"
$PY  = "$VENV_DIR\Scripts\python.exe"

# ── Step 3: Upgrade pip ───────────────────────────────────────────────────────
Step "3/9" "Upgrading pip..."
& $PIP install --quiet --upgrade pip setuptools wheel
Write-Host "      Done." -ForegroundColor Green

# ── Step 4: Install numpy + protobuf at pinned versions FIRST ─────────────────
Step "4/9" "Installing pinned numpy==1.26.4 + protobuf==3.20.2..."
& $PIP install --quiet "numpy==1.26.4" "protobuf==3.20.2"
Write-Host "      Done." -ForegroundColor Green

# ── Step 5: Install PaddlePaddle CPU then PaddleOCR ──────────────────────────
Step "5/9" "Installing PaddlePaddle==2.6.2 + PaddleOCR==2.8.1 (may take 2-3 min)..."
& $PIP install --quiet "paddlepaddle==2.6.2"
& $PIP install --quiet "paddleocr==2.8.1"
Write-Host "      Done." -ForegroundColor Green

# ── Step 6: Install torch CPU (stable 2.4.0) from official wheel index ────────
Step "6/9" "Installing PyTorch 2.4.0+cpu from pytorch.org (may take 2-3 min)..."
& $PIP install --quiet "torch==2.4.0+cpu" "torchvision==0.19.0+cpu" `
    --index-url https://download.pytorch.org/whl/cpu
Write-Host "      Done." -ForegroundColor Green

# ── Step 7: Fix missing libomp140.x86_64.dll (fbgemm.dll dependency) ─────────
Step "7/9" "Patching OpenMP DLL for PyTorch on Windows..."
$torchLib = "$VENV_DIR\Lib\site-packages\torch\lib"
$libiomp  = "$torchLib\libiomp5md.dll"
$libomp140 = "$torchLib\libomp140.x86_64.dll"
if (Test-Path $libiomp) {
    if (-not (Test-Path $libomp140)) {
        Copy-Item $libiomp $libomp140
        Write-Host "      Copied libiomp5md.dll -> libomp140.x86_64.dll" -ForegroundColor Green
    } else {
        Write-Host "      libomp140.x86_64.dll already exists. OK." -ForegroundColor Green
    }
} else {
    Write-Host "      WARNING: libiomp5md.dll not found — PyTorch may not work." -ForegroundColor Yellow
}

# ── Step 8: Install insightface prebuilt wheel (no MSVC needed) ──────────────
Step "8/9" "Installing insightface 0.7.3 prebuilt wheel..."
& $PIP install --quiet $INSIGHT_WHL
Write-Host "      Done." -ForegroundColor Green

# ── Step 9: Install remaining requirements + RE-PIN numpy and protobuf ────────
Step "9/9" "Installing remaining requirements..."
& $PIP install --quiet -r requirements.txt
# Reinstall insightface prebuilt in case albumentations reverted torch or numpy
Write-Host "      Re-pinning numpy==1.26.4 and protobuf==3.20.2 (override transitive upgrades)..."
& $PIP install --quiet --no-deps "numpy==1.26.4" "protobuf==3.20.2"
# Re-install onnxruntime 1.18.1 which is the last version that works with protobuf 3.x
& $PIP install --quiet --no-deps "onnxruntime==1.18.1"
Write-Host "      Done." -ForegroundColor Green

# ── Patch insightface mask_renderer to not crash if torch DLL load fails ─────
$insightfaceInit = "$VENV_DIR\Lib\site-packages\insightface\app\__init__.py"
if (Test-Path $insightfaceInit) {
    $content = Get-Content $insightfaceInit -Raw
    if ($content -notmatch "try:") {
        $patched = @"
from .face_analysis import *
try:
    from .mask_renderer import *
except Exception:
    pass
"@
        Set-Content $insightfaceInit $patched
        Write-Host "      Patched insightface/app/__init__.py (mask_renderer made optional)" -ForegroundColor Green
    }
}

# ── Verify ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Verifying key imports..." -ForegroundColor Yellow
& $PY -c @"
import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
import numpy as np
print(f'  numpy     : {np.__version__}')
import paddle
print(f'  paddle    : {paddle.__version__}')
import paddleocr
print(f'  paddleocr : OK')
import fastapi
print(f'  fastapi   : {fastapi.__version__}')
import onnxruntime as ort
print(f'  onnxruntime: {ort.__version__}')
import insightface
print(f'  insightface: {insightface.__version__}')
import ultralytics
print(f'  ultralytics: {ultralytics.__version__}')
print('')
print('ALL CHECKS PASSED!')
"@

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  Setup complete! Run .\start.ps1 to launch." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
