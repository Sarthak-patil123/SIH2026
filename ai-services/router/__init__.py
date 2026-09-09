from .ocr_router import router as ocr_router
from .biometric_router import router as biometric_router
from .test_router import router as test_router

__all__ = ["ocr_router", "biometric_router", "test_router"]
