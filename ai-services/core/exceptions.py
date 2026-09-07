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
