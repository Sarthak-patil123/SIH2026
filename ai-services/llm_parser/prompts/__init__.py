"""Prompts registry for document types."""
from __future__ import annotations

from .passport import PASSPORT_SYSTEM_PROMPT
from .visa import VISA_SYSTEM_PROMPT
from .driving_licence import DRIVING_LICENCE_SYSTEM_PROMPT
from .national_id import NATIONAL_ID_SYSTEM_PROMPT
from .dob_proof import DOB_PROOF_SYSTEM_PROMPT

PROMPT_MAP = {
    "passport": PASSPORT_SYSTEM_PROMPT,
    "visa": VISA_SYSTEM_PROMPT,
    "driving_licence": DRIVING_LICENCE_SYSTEM_PROMPT,
    "driving_license": DRIVING_LICENCE_SYSTEM_PROMPT,
    "national_id": NATIONAL_ID_SYSTEM_PROMPT,
    "dob_proof": DOB_PROOF_SYSTEM_PROMPT,
}


def get_prompt_for_doc_type(doc_type: str) -> str:
    """Retrieve system prompt for document type, with fallback to national_id."""
    normalized = doc_type.strip().lower().replace("-", "_")
    return PROMPT_MAP.get(normalized, NATIONAL_ID_SYSTEM_PROMPT)


__all__ = [
    "PASSPORT_SYSTEM_PROMPT",
    "VISA_SYSTEM_PROMPT",
    "DRIVING_LICENCE_SYSTEM_PROMPT",
    "NATIONAL_ID_SYSTEM_PROMPT",
    "DOB_PROOF_SYSTEM_PROMPT",
    "get_prompt_for_doc_type",
]
