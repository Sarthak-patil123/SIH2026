"""OCR package. Public API: run_ocr(), TextRegion."""
from .engine import run_ocr, TextRegion, OCRModelInitError

__all__ = ["run_ocr", "TextRegion", "OCRModelInitError"]
