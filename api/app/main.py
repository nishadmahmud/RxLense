from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from . import config
from .abuse import AbuseShieldMiddleware
from .disclaimer import disclaimer_for
from .gemma import call_gemma, call_gemma_text
from .kb import enrich_proposed, get_by_id, search
from .mock import mock_brief, mock_extract
from .prompts import brief_prompt, chat_prompt, extract_prompt
from .schemas import AnalyzeRequest, BriefRequest, Briefing, ChatRequest, ExtractResult

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
        if config.MOCK_AI or not config.GEMINI_API_KEY:
            extracted = mock_extract(ocr_hint=body.ocrHint, demo_preset=body.demoPreset)
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

        medicines = enrich_proposed(extracted.get("medicines", []))
        if not medicines:
            raise HTTPException(
                status_code=422,
                detail="No medicines detected. Try a clearer photo or the demo prescription.",
            )
        return {
            "medicines": medicines,
            "disclaimer": disclaimer_for(language),
            "requiresConfirmation": True,
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
    try:
        meds = [m.model_dump() for m in body.medicines]
        if not meds:
            raise HTTPException(status_code=400, detail="At least one medicine is required")

        enriched = enrich_proposed(meds)

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

        if config.MOCK_AI or not config.GEMINI_API_KEY:
            briefing = mock_brief(medicines=enriched, patient_context=ctx, language=language)
        else:
            prompt = brief_prompt(
                medicines=enriched,
                patient_context=ctx,
                language=language,
            )
            raw = await call_gemma(prompt=prompt)
            try:
                briefing = Briefing.model_validate(raw).model_dump()
            except ValidationError:
                raw = await call_gemma(
                    prompt=prompt
                    + "\n\nPrevious output invalid. Return ONLY valid JSON matching the schema."
                )
                briefing = Briefing.model_validate(raw).model_dump()

        return {
            "briefing": briefing,
            "medicines": enriched,
            "disclaimer": disclaimer_for(language),
            "warnings": {
                "lowConfidenceCount": len(low_confidence),
                "blockedHint": bool(blocked),
                "unmatchedConfirmed": bool(blocked) and body.confirmUnmatched,
            },
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
        if not body.messages:
            raise HTTPException(status_code=400, detail="messages required")

        if config.MOCK_AI or not config.GEMINI_API_KEY:
            last = body.messages[-1].content
            if language == "bn":
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
        else:
            transcript = "\n".join(f"{m.role}: {m.content}" for m in body.messages[-12:])
            prompt = chat_prompt(
                messages=transcript,
                language=language,
                profile_context=body.profileContext,
                scan_context=body.scanContext,
            )
            reply = await call_gemma_text(prompt=prompt)

        return {"reply": reply, "disclaimer": disclaimer_for(language)}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc
