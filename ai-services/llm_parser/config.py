"""Configuration for LLM Parser subsystem.
Supports flexible model selection and OpenAI-compatible API base URLs.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _load_env_file() -> None:
    """Load key-value pairs from .env into os.environ if not already present."""
    search_paths = [
        Path(__file__).resolve().parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
    ]
    for env_path in search_paths:
        if env_path.exists():
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip('"').strip("'")
                            if k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass


_load_env_file()


@dataclass
class LLMConfig:
    api_base_url: str = os.getenv("LLM_API_BASE_URL", os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"))
    api_key: str = os.getenv("LLM_API_KEY", os.getenv("OPENAI_API_KEY", "EMPTY"))
    model_name: str = os.getenv("LLM_MODEL_NAME", os.getenv("DEFAULT_LLM_MODEL", "gpt-4o-mini"))
    temperature: float = float(os.getenv("LLM_TEMPERATURE", "0.1"))
    timeout_seconds: float = float(os.getenv("LLM_TIMEOUT", "45.0"))


default_llm_config = LLMConfig()
