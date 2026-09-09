"""LLM Parser Package for Document Information Extraction."""
from __future__ import annotations

from .client import FlexibleLLMClient
from .config import LLMConfig, default_llm_config
from .parser import parse_document_with_llm
from .prompts import (
    DOB_PROOF_SYSTEM_PROMPT,
    DRIVING_LICENCE_SYSTEM_PROMPT,
    NATIONAL_ID_SYSTEM_PROMPT,
    PASSPORT_SYSTEM_PROMPT,
    VISA_SYSTEM_PROMPT,
    get_prompt_for_doc_type,
)

__all__ = [
    "FlexibleLLMClient",
    "LLMConfig",
    "default_llm_config",
    "parse_document_with_llm",
    "get_prompt_for_doc_type",
    "PASSPORT_SYSTEM_PROMPT",
    "VISA_SYSTEM_PROMPT",
    "DRIVING_LICENCE_SYSTEM_PROMPT",
    "NATIONAL_ID_SYSTEM_PROMPT",
    "DOB_PROOF_SYSTEM_PROMPT",
]
