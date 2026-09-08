#!/usr/bin/env pwsh
# =============================================================================
# start.ps1  —  Activate venv and start the AI Services server
# =============================================================================
# Run from ai-services folder:
#   .\start.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

$VENV_ACT = ".\venv\Scripts\Activate.ps1"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  AI Services — Starting Server" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check venv exists
if (-not (Test-Path $VENV_ACT)) {
    Write-Host "ERROR: Virtual environment not found." -ForegroundColor Red
    Write-Host "Run setup first:  .\setup_env.ps1" -ForegroundColor Yellow
    exit 1
}

# Activate venv
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& $VENV_ACT

# Set env vars for PaddlePaddle and OpenMP stability
$env:PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK = "True"
$env:FLAGS_use_mkldnn = "0"
$env:KMP_DUPLICATE_LIB_OK = "TRUE"

Write-Host "Starting FastAPI server on http://localhost:8000 ..." -ForegroundColor Green
Write-Host "Test UI:  http://localhost:8000/" -ForegroundColor Cyan
Write-Host "API docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
