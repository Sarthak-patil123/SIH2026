"""Core package: config, exceptions, logger."""
from .config import CFG, Config
from .exceptions import (
    PipelineError,
    ImageQualityError,
    DocumentNotFoundError,
    FaceNotFoundError,
    MultipleFacesError,
    LayoutDetectionError,
    MRZParseError,
    OCREngineError,
)
from .logger import get_logger

__all__ = [
    "CFG",
    "Config",
    "PipelineError",
    "ImageQualityError",
    "DocumentNotFoundError",
    "FaceNotFoundError",
    "MultipleFacesError",
    "LayoutDetectionError",
    "MRZParseError",
    "OCREngineError",
    "get_logger",
]
