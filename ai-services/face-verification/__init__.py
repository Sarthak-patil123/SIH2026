"""Face verification and liveness package."""
from .inference import verify_faces
from .liveness import check_passive_liveness

__all__ = ["verify_faces", "check_passive_liveness"]
