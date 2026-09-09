"""Test runner configuration.

Edit IMAGES_ROOT and OUTPUTS_ROOT to change where images are read from
and where results are written to. All other settings follow from there.
"""
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths — edit these to point to your custom image/output directories
# ---------------------------------------------------------------------------

# Root folder that contains sub-folders per document type:
#   test_images/passport/*.jpg
#   test_images/aadhaar/*.jpg   etc.
IMAGES_ROOT = Path(__file__).parent / "test_images"

# All JSON output files will be written here, mirroring the sub-folder structure.
OUTPUTS_ROOT = Path(__file__).parent / "test_outputs"

# ---------------------------------------------------------------------------
# Document type → processor function mapping
# ---------------------------------------------------------------------------
# Keys MUST match the sub-folder names under IMAGES_ROOT.
# Values are callables with signature: (image_path: Path) -> dict

import sys
import os

# Ensure ai-services root is on the path when running this script directly
_AI_SERVICES = Path(__file__).resolve().parent.parent
if str(_AI_SERVICES) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICES))


def _get_processors() -> dict:
    """Lazy import processors to avoid heavy model loads at import time."""
    from ocr.passport import process_passport
    from ocr.national_id import process_national_id
    from ocr.driving_license import process_driving_license
    from ocr.dob_proof import process_dob_proof
    from ocr.visa import process_visa

    return {
        # folder_name: (processor_fn, kwargs)
        "passport":        (process_passport, {}),
        "aadhaar":         (process_national_id, {"id_type": "aadhaar"}),
        "pan":             (process_national_id, {"id_type": "pan"}),
        "voter_id":        (process_national_id, {"id_type": "voter_id"}),
        "national_id":     (process_national_id, {"id_type": "auto"}),
        "driving_license": (process_driving_license, {}),
        "dob_proof":       (process_dob_proof, {}),
        "visa":            (process_visa, {}),
    }


# Supported image extensions
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp"}

# Whether to include raw processor output alongside adapter output in JSON
INCLUDE_RAW_OUTPUT = True

# Stop after first error per document type (False = continue on errors)
FAIL_FAST = False
