"""Flexible LLM Client for document parsing.
Works with any OpenAI-compatible endpoint:
- Local Ollama (e.g. http://localhost:11434/v1)
- Groq Cloud API
- OpenAI (e.g. https://api.openai.com/v1)
- LMStudio / vLLM / LocalAI / OpenRouter
Provides graceful heuristic fallback if no LLM service is running or reachable.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

import requests

from .config import LLMConfig, default_llm_config

logger = logging.getLogger(__name__)


class FlexibleLLMClient:
    """Client for querying OpenAI-compatible chat completion APIs with fallback."""

    def __init__(self, config: LLMConfig | None = None):
        self.config = config or default_llm_config
        self.last_error: str | None = None

    def complete_chat(
        self,
        system_prompt: str,
        user_content: str,
        model_name: str | None = None,
        api_base_url: str | None = None,
        api_key: str | None = None,
        temperature: float | None = None,
        timeout: float | None = None,
    ) -> str:
        """Query LLM chat completions endpoint, returning the raw content response string."""
        base_url = (api_base_url or self.config.api_base_url).rstrip("/")
        model = model_name or self.config.model_name
        key = api_key or self.config.api_key
        temp = temperature if temperature is not None else self.config.temperature
        t_out = timeout if timeout is not None else self.config.timeout_seconds

        # Form endpoint URL
        endpoint = f"{base_url}/chat/completions"

        headers = {
            "Content-Type": "application/json",
        }
        if key and key != "EMPTY":
            headers["Authorization"] = f"Bearer {key}"

        candidate_models = [model]
        # Automatic fallback models for resilience against demand spikes or 404s
        for fallback in ["gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-3-flash-preview"]:
            if fallback not in candidate_models:
                candidate_models.append(fallback)

        for candidate in candidate_models:
            payload = {
                "model": candidate,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                "temperature": temp,
            }

            try:
                logger.info("Calling LLM endpoint %s with model %s", endpoint, candidate)
                self.last_error = None
                response = requests.post(endpoint, json=payload, headers=headers, timeout=t_out)
                if response.status_code == 200:
                    data = response.json()
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        content = choices[0]["message"].get("content", "")
                        return content
                self.last_error = f"HTTP {response.status_code}: {response.text[:250]}"
                logger.warning(
                    "LLM API model %s returned status %d: %s. Attempting fallback model if available.",
                    candidate,
                    response.status_code,
                    response.text[:150],
                )
            except Exception as exc:
                self.last_error = str(exc)
                logger.warning("LLM API call with model %s failed (%s).", candidate, exc)

        return ""
