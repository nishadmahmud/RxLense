from __future__ import annotations

import json
import re
from typing import Any, Optional

import httpx

from .config import (
    GEMINI_API_KEY,
    GEMMA_TEXT_MODEL,
    GEMMA_VISION_MODEL,
    MAX_IMAGE_BYTES,
)

# Magic-byte sniff for common image types Expo may send
_MIME_PREFIXES = (
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
    (b"RIFF", "image/webp"),  # refine below
)


def _strip_fences(text: str) -> str:
    t = (text or "").strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t, flags=re.I)
        t = re.sub(r"\s*```$", "", t)
    return t.strip()


def parse_json_loose(text: str) -> Any:
    cleaned = _strip_fences(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise ValueError("Model did not return valid JSON")


def prepare_image_part(image_base64: str) -> dict[str, Any]:
    """Validate size, sniff mime, return Gemini inline_data part."""
    import base64

    raw_b64 = re.sub(r"^data:image/\w+;base64,", "", image_base64 or "")
    header_mime = None
    m = re.match(r"^data:(image/\w+);base64,", image_base64 or "")
    if m:
        header_mime = m.group(1)

    try:
        data = base64.b64decode(raw_b64, validate=False)
    except Exception as exc:  # noqa: BLE001
        raise ValueError("Invalid image base64") from exc

    if not data:
        raise ValueError("Empty image — try a clearer photo of the prescription")
    if len(data) > MAX_IMAGE_BYTES:
        mb = MAX_IMAGE_BYTES // (1024 * 1024)
        raise ValueError(f"Image too large (max {mb}MB). Compress or retake the photo.")

    mime = header_mime or "image/jpeg"
    for prefix, detected in _MIME_PREFIXES:
        if data.startswith(prefix):
            if detected == "image/webp" and data[8:12] != b"WEBP":
                continue
            mime = detected
            break

    return {"inline_data": {"mime_type": mime, "data": raw_b64}}


async def call_gemma(
    *,
    prompt: str,
    image_base64: Optional[str] = None,
    model: Optional[str] = None,
) -> Any:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set")

    use_model = model or (GEMMA_VISION_MODEL if image_base64 else GEMMA_TEXT_MODEL)
    parts: list[dict[str, Any]] = [{"text": prompt}]
    if image_base64:
        parts.append(prepare_image_part(image_base64))

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{use_model}:generateContent?key={GEMINI_API_KEY}"
    )
    payload = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"temperature": 0.2},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        res = await client.post(url, json=payload)
        if res.status_code >= 400:
            raise RuntimeError(f"Gemma API error {res.status_code}: {res.text[:500]}")
        data = res.json()

    text = ""
    for part in data.get("candidates", [{}])[0].get("content", {}).get("parts", []):
        if part.get("thought"):
            continue
        text += part.get("text") or ""
    if not text:
        raise RuntimeError(
            "Empty model response. The image may be too blurry or not a prescription. Try again."
        )
    return parse_json_loose(text)


async def call_gemma_text(
    *,
    prompt: str,
    model: Optional[str] = None,
) -> str:
    """Plain-text Gemma reply (chat)."""
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set")

    use_model = model or GEMMA_TEXT_MODEL
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{use_model}:generateContent?key={GEMINI_API_KEY}"
    )
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4},
    }

    async with httpx.AsyncClient(timeout=90.0) as client:
        res = await client.post(url, json=payload)
        if res.status_code >= 400:
            raise RuntimeError(f"Gemma API error {res.status_code}: {res.text[:500]}")
        data = res.json()

    text = ""
    for part in data.get("candidates", [{}])[0].get("content", {}).get("parts", []):
        if part.get("thought"):
            continue
        text += part.get("text") or ""
    if not text:
        raise RuntimeError("Empty model response")
    return text.strip()
