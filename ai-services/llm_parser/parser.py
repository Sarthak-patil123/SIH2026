"""Core LLM Parser module.
Converts noisy PaddleOCR text into strictly validated, structured JSON
using dedicated per-document system prompts and flexible LLM backends.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from .client import FlexibleLLMClient
from .prompts import get_prompt_for_doc_type

logger = logging.getLogger(__name__)


def _clean_llm_json_response(raw_text: str) -> dict[str, Any] | None:
    """Extract and parse JSON from an LLM response string."""
    if not raw_text or not raw_text.strip():
        return None

    cleaned = raw_text.strip()

    # Strip markdown code block fences if present
    if "```" in cleaned:
        # Match ```json ... ``` or ``` ... ```
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
        if match:
            cleaned = match.group(1).strip()

    # Try direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Find the outermost { ... }
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = cleaned[first_brace : last_brace + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    return None


def _heuristic_fallback(ocr_lines: list[str], doc_type: str, error_detail: str | None = None) -> dict[str, Any]:
    """Fallback heuristic extraction when LLM service is unavailable or returned unparseable output."""
    full_text = " ".join(ocr_lines).upper()
    norm_type = doc_type.strip().lower().replace("-", "_")

    # Common pattern detectors (supports DD/MM/YYYY, YYYY-MM-DD, DD.MM.YYYY, and textual months)
    date_pattern = re.compile(
        r"\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{4}[/.-]\d{1,2}[/.-]\d{1,2}|\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+\d{4})\b",
        re.IGNORECASE,
    )
    all_dates = date_pattern.findall(" ".join(ocr_lines))

    note_msg = "Extracted via rule-based fallback."
    if error_detail:
        note_msg += f" Reason: {error_detail}"
    else:
        note_msg += " Reason: LLM was offline or returned unparseable output."

    # Base structure
    result: dict[str, Any] = {
        "document_type": norm_type,
        "is_llm_parsed": False,
        "extraction_method": "paddleocr_heuristic_fallback",
        "confidence_score": 0.65 if ocr_lines else 0.0,
        "raw_ocr_lines_count": len(ocr_lines),
        "flexible_fields": {},
        "notes": note_msg,
        "llm_error": error_detail,
    }

    if norm_type == "passport":
        result.update({
            "passport_number": None,
            "surname": None,
            "given_names": None,
            "full_name": None,
            "nationality": None,
            "date_of_birth": all_dates[0] if len(all_dates) > 0 else None,
            "date_of_expiry": all_dates[1] if len(all_dates) > 1 else None,
            "sex": "M" if " M " in full_text or "SEX: M" in full_text else ("F" if " F " in full_text else None),
            "mrz_data": {"detected": False, "lines": []},
        })
        # Check for passport number format (letter + 7-8 digits)
        pass_match = re.search(r"\b([A-PR-WYZ][0-9]{7,8})\b", full_text)
        if pass_match:
            result["passport_number"] = pass_match.group(1)

    elif norm_type == "visa":
        result.update({
            "visa_number": None,
            "visa_type": "TOURIST" if "TOURIST" in full_text else ("BUSINESS" if "BUSINESS" in full_text else None),
            "issuing_country": "IND" if "INDIA" in full_text else ("USA" if "UNITED STATES" in full_text else None),
            "issue_date": all_dates[0] if len(all_dates) > 0 else None,
            "expiry_date": all_dates[1] if len(all_dates) > 1 else None,
            "entries": "MULTIPLE" if "MULTIPLE" in full_text else ("SINGLE" if "SINGLE" in full_text else None),
        })
        v_match = re.search(r"\b([A-Z0-9]{8,12})\b", full_text)
        if v_match:
            result["visa_number"] = v_match.group(1)

    elif norm_type in ("driving_licence", "driving_license"):
        result.update({
            "licence_number": None,
            "full_name": None,
            "date_of_birth": all_dates[0] if len(all_dates) > 0 else None,
            "valid_till": all_dates[1] if len(all_dates) > 1 else None,
            "blood_group": next((bg for bg in ["O+", "B+", "A+", "AB+", "O-", "B-", "A-", "AB-"] if bg in full_text), None),
            "vehicle_classes": [vc for vc in ["MCWG", "LMV", "LMV-TR", "CLASS C", "A", "B"] if vc in full_text],
        })
        dl_match = re.search(r"\b([A-Z]{2}[0-9]{2}\s?[0-9]{11,13})\b", full_text)
        if dl_match:
            result["licence_number"] = dl_match.group(1).replace(" ", "")

    elif norm_type == "dob_proof":
        result.update({
            "proof_subtype": "birth_certificate" if "BIRTH" in full_text else "school_leaving_certificate",
            "registration_number": None,
            "child_or_holder_name": None,
            "date_of_birth": all_dates[0] if all_dates else None,
            "father_name": None,
            "mother_name": None,
        })

    else:  # national_id fallback
        # Check Aadhaar / PAN / Voter ID
        subtype = "unknown"
        id_num = None
        pan_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", full_text)
        aadhaar_match = re.search(r"\b(\d{4}\s?\d{4}\s?\d{4})\b", full_text)
        voter_match = re.search(r"\b([A-Z]{3}[0-9]{7})\b", full_text)

        if pan_match:
            subtype = "pan"
            id_num = pan_match.group(1)
        elif aadhaar_match:
            subtype = "aadhaar"
            id_num = aadhaar_match.group(1).replace(" ", "")
        elif voter_match:
            subtype = "voter_id"
            id_num = voter_match.group(1)

        result.update({
            "id_subtype": subtype,
            "id_number": id_num,
            "full_name": None,
            "date_of_birth": all_dates[0] if all_dates else None,
            "gender": "MALE" if "MALE" in full_text else ("FEMALE" if "FEMALE" in full_text else None),
        })

    return result


def parse_document_with_llm(
    ocr_lines: list[str] | str,
    doc_type: str,
    client: FlexibleLLMClient | None = None,
    model_name: str | None = None,
    api_base_url: str | None = None,
    api_key: str | None = None,
    temperature: float | None = None,
) -> dict[str, Any]:
    """Parse raw OCR lines into structured JSON using the document-specific LLM system prompt."""
    if isinstance(ocr_lines, str):
        lines = [ln.strip() for ln in ocr_lines.splitlines() if ln.strip()]
    elif isinstance(ocr_lines, (list, tuple)):
        lines = []
        for item in ocr_lines:
            if hasattr(item, "text"):
                val = str(getattr(item, "text", "")).strip()
            elif isinstance(item, dict) and "text" in item:
                val = str(item["text"]).strip()
            else:
                val = str(item).strip()
            if val:
                lines.append(val)
    else:
        lines = []

    if not lines:
        return {
            "document_type": doc_type,
            "error": "No OCR text provided for parsing",
            "confidence_score": 0.0,
            "is_llm_parsed": False,
        }

    # Format user message
    numbered_ocr_text = "\n".join(f"[{i+1}] {line}" for i, line in enumerate(lines))
    user_prompt = (
        f"Extract all identity and document verification fields from the following PaddleOCR output "
        f"for a '{doc_type}' document:\n\n"
        f"--- RAW OCR LINES ---\n{numbered_ocr_text}\n--- END OCR LINES ---\n\n"
        f"Return the parsed data strictly as a JSON object adhering to the specified schema."
    )

    system_prompt = get_prompt_for_doc_type(doc_type)
    llm_client = client or FlexibleLLMClient()

    llm_output = llm_client.complete_chat(
        system_prompt=system_prompt,
        user_content=user_prompt,
        model_name=model_name,
        api_base_url=api_base_url,
        api_key=api_key,
        temperature=temperature,
    )

    parsed_json = _clean_llm_json_response(llm_output)

    if parsed_json and isinstance(parsed_json, dict):
        parsed_json["is_llm_parsed"] = True
        parsed_json["raw_lines_count"] = len(lines)
        return parsed_json

    # Heuristic fallback if LLM is offline, fails, or produces invalid output
    err_detail = getattr(llm_client, "last_error", None)
    logger.info("Using heuristic rule fallback for doc_type: %s (error: %s)", doc_type, err_detail)
    return _heuristic_fallback(lines, doc_type, error_detail=err_detail)
