from __future__ import annotations

import time
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from . import config
from .abuse import AbuseShieldMiddleware
from .chat_guard import chat_refusal_for, is_denied_chat_message
from .disclaimer import disclaimer_for
from .gemma import call_gemma, call_gemma_text
from .kb import enrich_proposed, get_by_id, search
from .medex import (
    extract_price_queries,
    gather_medex_price_context,
    lookup_medex_prices,
    looks_like_price_query,
)
from .mock import mock_brief, mock_extract, mock_missed_dose
from .prompts import (
    brief_prompt,
    chat_prompt,
    extract_prompt,
    missed_dose_prompt,
)
from .schemas import (
    AnalyzeRequest,
    BriefRequest,
    Briefing,
    ChatRequest,
    ExtractResult,
    MissedDoseCoach,
    MissedDoseRequest,
)

app = FastAPI(title="RxLens AI API", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AbuseShieldMiddleware)


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "rxlens-api",
        "backend": "fastapi",
        "mockAi": config.MOCK_AI,
        "kbLoaded": True,
        "visionModel": config.GEMMA_VISION_MODEL,
        "textModel": config.GEMMA_TEXT_MODEL,
        "demoTokenRequired": bool(config.DEMO_TOKEN),
    }


@app.get("/api/medicines/search")
def medicines_search(q: str = Query("")) -> dict[str, Any]:
    return {"results": search(q)}


@app.get("/api/prices")
async def medicine_prices(q: str = Query("")) -> dict[str, Any]:
    """Live MedEx list prices for a brand/generic query."""
    data = await lookup_medex_prices(q)
    return data


@app.get("/api/medicines/{med_id}")
def medicine_detail(med_id: str) -> dict[str, Any]:
    med = get_by_id(med_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"medicine": med}


@app.post("/api/analyze")
async def analyze(body: AnalyzeRequest) -> dict[str, Any]:
    language = body.language
    try:
        if (
            config.MOCK_AI
            or not config.GEMINI_API_KEY
            or (body.demoPreset and not body.imageBase64)
        ):
            extracted = mock_extract(
                ocr_hint=body.ocrHint,
                demo_preset=body.demoPreset,
                source_type=body.sourceType or "auto",
            )
        else:
            if not body.imageBase64 and not body.ocrHint:
                raise HTTPException(status_code=400, detail="imageBase64 or ocrHint required")
            prompt = extract_prompt(ocr_hint=body.ocrHint, language=language)
            raw = await call_gemma(prompt=prompt, image_base64=body.imageBase64)
            try:
                parsed = ExtractResult.model_validate(raw)
            except ValidationError:
                raw = await call_gemma(
                    prompt=prompt + "\n\nPrevious output invalid. Return ONLY valid JSON.",
                    image_base64=body.imageBase64,
                )
                parsed = ExtractResult.model_validate(raw)
            extracted = parsed.model_dump()

        source_type = extracted.get("sourceType") or "prescription"
        if source_type not in ("prescription", "packaging"):
            source_type = "prescription"
        medicines = enrich_proposed(extracted.get("medicines", []))
        if not medicines:
            raise HTTPException(
                status_code=422,
                detail="No medicines detected. Try a clearer photo of a prescription or medicine pack.",
            )
        return {
            "medicines": medicines,
            "disclaimer": disclaimer_for(language),
            "requiresConfirmation": True,
            "sourceType": source_type,
        }
    except HTTPException:
        raise
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail=f"Invalid model extract JSON: {exc}") from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/brief")
async def brief(body: BriefRequest) -> dict[str, Any]:
    language = body.language
    t0 = time.perf_counter()
    timing: dict[str, float] = {}
    try:
        meds = [m.model_dump() for m in body.medicines]
        if not meds:
            raise HTTPException(status_code=400, detail="At least one medicine is required")

        t_enrich = time.perf_counter()
        enriched = enrich_proposed(meds)
        timing["enrich_ms"] = round((time.perf_counter() - t_enrich) * 1000, 1)

        for i, m in enumerate(enriched):
            if i < len(meds) and meds[i].get("needsReview") is False:
                m["needsReview"] = False
                m["userConfirmed"] = True

        blocked = [m for m in enriched if m.get("needsReview")]
        if blocked and not body.confirmUnmatched:
            names = [m.get("rawName") or "?" for m in blocked]
            raise HTTPException(
                status_code=422,
                detail={
                    "message": (
                        "Edit or confirm medicines marked Needs review before generating "
                        "a briefing. Unmatched names: " + ", ".join(names)
                    ),
                    "medicines": names,
                    "code": "NEEDS_REVIEW",
                },
            )

        ctx = body.patientContext.model_dump()
        low_confidence = [m for m in enriched if (m.get("confidence") or 1) < 0.4]

        gemma_calls = 0
        if config.MOCK_AI or not config.GEMINI_API_KEY:
            t_mock = time.perf_counter()
            briefing = mock_brief(medicines=enriched, patient_context=ctx, language=language)
            timing["gemma_ms"] = round((time.perf_counter() - t_mock) * 1000, 1)
            timing["gemma_calls"] = 0
        else:
            prompt = brief_prompt(
                medicines=enriched,
                patient_context=ctx,
                language=language,
            )
            timing["prompt_chars"] = len(prompt)
            t_gemma = time.perf_counter()
            raw = await call_gemma(prompt=prompt)
            gemma_calls = 1
            try:
                briefing = Briefing.model_validate(raw).model_dump()
            except ValidationError:
                raw = await call_gemma(
                    prompt=prompt
                    + "\n\nPrevious output invalid. Return ONLY valid JSON matching the schema."
                )
                gemma_calls = 2
                briefing = Briefing.model_validate(raw).model_dump()
            timing["gemma_ms"] = round((time.perf_counter() - t_gemma) * 1000, 1)
            timing["gemma_calls"] = gemma_calls

        timing["total_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        print(
            f"[brief timing] meds={len(enriched)} enrich={timing.get('enrich_ms')}ms "
            f"gemma={timing.get('gemma_ms')}ms calls={timing.get('gemma_calls')} "
            f"prompt_chars={timing.get('prompt_chars', 0)} total={timing['total_ms']}ms"
        )

        return {
            "briefing": briefing,
            "medicines": enriched,
            "disclaimer": disclaimer_for(language),
            "warnings": {
                "lowConfidenceCount": len(low_confidence),
                "blockedHint": bool(blocked),
                "unmatchedConfirmed": bool(blocked) and body.confirmUnmatched,
            },
            "timing": timing,
        }
    except HTTPException:
        raise
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail=f"Invalid model briefing JSON: {exc}") from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/chat")
async def chat(body: ChatRequest) -> dict[str, Any]:
    language = body.language
    try:
        has_image = bool(body.imageBase64)
        if not body.messages and not has_image:
            raise HTTPException(status_code=400, detail="messages required")

        last = (body.messages[-1].content if body.messages else "") or ""
        if last and is_denied_chat_message(last):
            return {"reply": chat_refusal_for(language), "disclaimer": disclaimer_for(language)}

        if config.MOCK_AI or not config.GEMINI_API_KEY:
            if has_image:
                if language == "bn":
                    reply = (
                        "ছবি পেয়েছি (মক মোড)। আসল Gemma চালু থাকলে প্রেসক্রিপশন বা প্যাক থেকে "
                        "ওষুধের নাম পড়ে শিক্ষামূলক উত্তর দেবে।"
                    )
                else:
                    reply = (
                        "Got your image (mock mode). With Gemma enabled, I would read the "
                        "prescription or pack and reply educationally."
                    )
            elif language == "bn":
                reply = (
                    f"এটি শিক্ষামূলক উত্তর (মক মোড)। আপনি জিজ্ঞাসা করেছেন: {last[:120]}। "
                    "আসল Gemma চালু করলে স্ক্যান ও ওষুধের তথ্য দিয়ে আরও ভালো উত্তর পাবেন। "
                    "দাম ফার্মেসিতে নিশ্চিত করুন।"
                )
            else:
                reply = (
                    f"Educational mock reply about: {last[:120]}. "
                    "Enable Gemma for grounded answers from your scan and medicine KB. "
                    "Confirm any prices at a pharmacy."
                )
            return {"reply": reply, "disclaimer": disclaimer_for(language)}

        price_web_context = ""
        if last and looks_like_price_query(last):
            queries = extract_price_queries(
                last,
                profile_context=body.profileContext,
                scan_context=body.scanContext,
            )
            price_web_context = await gather_medex_price_context(queries)

        history_lines = [f"{m.role}: {m.content}" for m in (body.messages or [])[-12:]]
        if has_image and (not history_lines or not last):
            history_lines.append("user: [photo attached]")
        elif has_image and last and "[photo" not in last.lower():
            history_lines[-1] = f"user: {last} [photo attached]"

        prompt = chat_prompt(
            messages="\n".join(history_lines),
            language=language,
            profile_context=body.profileContext,
            scan_context=body.scanContext,
            price_web_context=price_web_context,
            has_image=has_image,
        )
        reply = await call_gemma_text(prompt=prompt, image_base64=body.imageBase64)

        return {"reply": reply, "disclaimer": disclaimer_for(language)}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/coach/missed-dose")
async def missed_dose_coach(body: MissedDoseRequest) -> dict[str, Any]:
    language = body.language
    med = body.medicine.model_dump()
    name = (med.get("brandName") or med.get("rawName") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="medicine name required")
    try:
        if config.MOCK_AI or not config.GEMINI_API_KEY:
            coach = mock_missed_dose(
                medicine=med,
                when_missed=body.whenMissed,
                language=language,
            )
        else:
            prompt = missed_dose_prompt(
                medicine=med,
                when_missed=body.whenMissed,
                patient_context=body.patientContext.model_dump(),
                language=language,
            )
            raw = await call_gemma(prompt=prompt)
            try:
                parsed = MissedDoseCoach.model_validate(raw)
            except ValidationError:
                raw = await call_gemma(
                    prompt=prompt + "\n\nPrevious output invalid. Return ONLY valid JSON."
                )
                parsed = MissedDoseCoach.model_validate(raw)
            coach = parsed.model_dump()
            if not coach.get("disclaimer"):
                coach["disclaimer"] = disclaimer_for(language)

        return {
            "coach": coach,
            "disclaimer": coach.get("disclaimer") or disclaimer_for(language),
        }
    except HTTPException:
        raise
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail=f"Invalid coach JSON: {exc}") from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc
