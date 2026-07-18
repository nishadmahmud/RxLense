from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class PatientContext(BaseModel):
    ageBand: Literal["child", "adult", "older_adult"] = "adult"
    ageYears: Optional[str] = None
    pregnancyOrBreastfeeding: Literal["yes", "no", "prefer_not"] = "no"
    conditions: list[str] = Field(default_factory=list)
    otherMedsText: str = ""
    otherMeds: list[Any] = Field(default_factory=list)
    personLabel: str = ""


class MedicineIn(BaseModel):
    rawName: str
    strength: str = ""
    doseLine: str = ""
    confidence: Optional[float] = None
    needsReview: Optional[bool] = None
    kbId: Optional[str] = None
    matchScore: Optional[float] = None
    kbSnapshot: Optional[Any] = None


class AnalyzeRequest(BaseModel):
    imageBase64: Optional[str] = None
    ocrHint: str = ""
    language: Literal["en", "bn"] = "en"
    demoPreset: Optional[str] = None


class BriefRequest(BaseModel):
    medicines: list[MedicineIn]
    patientContext: PatientContext = Field(default_factory=PatientContext)
    language: Literal["en", "bn"] = "en"
    # Escape hatch after user acknowledges unmatched / low-confidence rows
    confirmUnmatched: bool = False


class ExtractedMedicine(BaseModel):
    rawName: str
    strength: str = ""
    doseLine: str = ""
    confidence: float = 0.6


class ExtractResult(BaseModel):
    medicines: list[ExtractedMedicine]


class ScheduleItem(BaseModel):
    timeOfDay: str
    medicines: list[str]
    mealTiming: str = ""
    notes: str = ""


class InteractionItem(BaseModel):
    title: str
    detail: str
    severity: Literal["info", "caution", "important"] = "caution"


class FoodLifestyle(BaseModel):
    avoid: list[str] = Field(default_factory=list)
    doThis: list[str] = Field(default_factory=list)


class SideEffects(BaseModel):
    common: list[str] = Field(default_factory=list)
    seekCareNow: list[str] = Field(default_factory=list)


class Briefing(BaseModel):
    summary: str
    holisticExplanation: str
    schedule: list[ScheduleItem]
    interactions: list[InteractionItem]
    foodAndLifestyle: FoodLifestyle
    sideEffects: SideEffects
    doctorQuestions: list[str] = Field(default_factory=list)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"] = "user"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    language: Literal["en", "bn"] = "en"
    profileContext: Optional[Any] = None
    scanContext: Optional[Any] = None
