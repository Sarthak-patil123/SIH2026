"""Router package: ocr and biometrics endpoints."""
from .ocr_router import router as ocr_router
from .biometric_router import router as biometric_router

__all__ = ["ocr_router", "biometric_router"]
