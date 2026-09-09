from pathlib import Path
from typing import Any
import numpy as np
from core.config import CFG

_model: Any = None


def _get_model():
    global _model
    if _model is None:
        try:
            from ultralytics import YOLO
        except ImportError as exc:
            raise ImportError(
                "ultralytics is required for layout detection. Install it via `pip install ultralytics`."
            ) from exc

        model_path = Path(CFG.LAYOUT_MODEL_PATH)
        if not model_path.exists():
            alt_path = Path(__file__).parent / "weights" / "passport_layout.pt"
            if alt_path.exists():
                model_path = alt_path
        _model = YOLO(str(model_path))
    return _model


def detect_fields(image: np.ndarray) -> list:
    model = _get_model()
    results = model(image, conf=CFG.LAYOUT_CONF_THRESHOLD)[0]

    detections = []
    for box in results.boxes:
        cls = int(box.cls[0])
        label = model.names[cls]
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        conf = float(box.conf[0]) if hasattr(box, "conf") and len(box.conf) > 0 else 1.0
        detections.append((label, x1, y1, x2, y2, conf))

    return detections
