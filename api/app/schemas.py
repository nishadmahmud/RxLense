from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class PatientContext(BaseModel):
    ageBand: Literal["child", "adult", "older_adult"] = "adult"
    ageYears: Optional[str] = None
    gender: Optional[Literal["male", "female", "other", "prefer_not"]] = None
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
    # Kept for older clients; ignored — model auto-detects prescription vs packaging
    sourceType: Optional[Literal["prescription", "packaging", "auto"]] = "auto"


class BriefRequest(BaseModel):
    medicines: list[MedicineIn]
    patientContext: PatientContext = Field(default_factory=PatientContext)
    language: Literal["en", "bn"] = "en"
    # Escape hatch after user acknowledges unmatched / low-confidence rows
    confirmUnmatched: bool = False
    clinicalContext: Optional["ClinicalContext"] = None


class ExtractedMedicine(BaseModel):
    rawName: str
    strength: str = ""
    doseLine: str = ""
    confidence: float = 0.6


class ClinicalContext(BaseModel):
    """Fields copied from the prescription — educational display only, not a diagnosis."""

    diagnosis: str = ""
    investigations: list[str] = Field(default_factory=list)
    clinicalNotes: list[str] = Field(default_factory=list)


class ExtractResult(BaseModel):
    medicines: list[ExtractedMedicine]
    sourceType: Literal["prescription", "packaging"] = "prescription"
    diagnosis: str = ""
    investigations: list[str] = Field(default_factory=list)
    clinicalNotes: list[str] = Field(default_factory=list)


class ScheduleItem(BaseModel):
    timeOfDay: str
    medicines: list[str]
    mealTiming: str = ""
    notes: str = ""
    # "rx" = from written doseLine; "assumed" = typical use when Rx had no times
    timingSource: Literal["rx", "assumed"] = "rx"


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
    interactions: list[InteractionItem] = Field(default_factory=list)
    sideEffects: SideEffects = Field(default_factory=SideEffects)
    # Kept optional for older cached responses; no longer requested from the model
    foodAndLifestyle: FoodLifestyle = Field(default_factory=FoodLifestyle)
    doctorQuestions: list[str] = Field(default_factory=list)
    clinicalContext: ClinicalContext = Field(default_factory=ClinicalContext)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"] = "user"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    language: Literal["en", "bn"] = "en"
    profileContext: Optional[Any] = None
    scanContext: Optional[Any] = None
    imageBase64: Optional[str] = None


class MissedDoseMedicine(BaseModel):
    rawName: str = ""
    brandName: str = ""
    strength: str = ""
    doseLine: str = ""


class MissedDoseRequest(BaseModel):
    medicine: MissedDoseMedicine
    whenMissed: Literal["last_night", "this_morning", "earlier_today", "unsure"] = "unsure"
    patientContext: PatientContext = Field(default_factory=PatientContext)
    language: Literal["en", "bn"] = "en"


class MissedDoseCoach(BaseModel):
    title: str
    whatToKnow: list[str] = Field(default_factory=list)
    options: list[str] = Field(default_factory=list)
    seekCareIf: list[str] = Field(default_factory=list)
    disclaimer: str = ""
