from __future__ import annotations

import re
from typing import Any, Optional


def mock_extract(
    *,
    ocr_hint: str = "",
    demo_preset: Optional[str] = None,
    source_type: str = "auto",
) -> dict[str, Any]:
    hint = ocr_hint or ""
    if source_type == "packaging" or demo_preset == "pack":
        return {
            "sourceType": "packaging",
            "diagnosis": "",
            "investigations": [],
            "clinicalNotes": [],
            "medicines": [
                {
                    "rawName": "Napa",
                    "strength": "500mg",
                    "doseLine": "as labeled",
                    "confidence": 0.91,
                },
                {
                    "rawName": "Seclo",
                    "strength": "20mg",
                    "doseLine": "as labeled",
                    "confidence": 0.86,
                },
            ],
        }
    if demo_preset == "throat" or re.search(r"napa|moxacil|seclo|amox", hint, re.I):
        return {
            "sourceType": "prescription",
            "diagnosis": "PUD",
            "investigations": ["CBC with ESR", "Serum Creatinine", "USG of Abdomen"],
            "clinicalNotes": ["Provisional diagnosis noted on prescription"],
            "medicines": [
                {
                    "rawName": "Moxacil",
                    "strength": "500mg",
                    "doseLine": "1+0+1 after meal x 5 days",
                    "confidence": 0.92,
                },
                {
                    "rawName": "Napa",
                    "strength": "500mg",
                    "doseLine": "1+1+1 if fever",
                    "confidence": 0.9,
                },
                {
                    "rawName": "Seclo",
                    "strength": "20mg",
                    "doseLine": "1+0+0 before breakfast",
                    "confidence": 0.88,
                },
            ],
        }
    return {
        "sourceType": "prescription",
        "diagnosis": "? Nephrotic syndrome",
        "investigations": ["S. Albumin", "24 H. UTP", "S. Electrolytes"],
        "clinicalNotes": [
            "Swelling of leg + face",
            "Nausea / vomiting",
            "Hospitalization under Nephrology noted",
        ],
        "medicines": [
            {"rawName": "Fusid", "strength": "40mg", "doseLine": "1+0+0", "confidence": 0.85},
            {
                "rawName": "Emistat",
                "strength": "8mg",
                "doseLine": "1+1+1 before meal",
                "confidence": 0.84,
            },
            {
                "rawName": "Pantonix",
                "strength": "20mg",
                "doseLine": "1+0+1 before meal",
                "confidence": 0.88,
            },
        ],
    }


def mock_brief(
    *,
    medicines: list[dict[str, Any]],
    patient_context: dict[str, Any],
    language: str,
    clinical_context: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    names = ", ".join(m.get("rawName", "") for m in medicines)
    bn = language == "bn"
    age = patient_context.get("ageBand", "adult")
    clinical = clinical_context or {}
    dx = (clinical.get("diagnosis") or "").strip()
    return {
        "summary": (
            (
                f"এই প্রেসক্রিপশনে {len(medicines)}টি ওষুধ আছে ({names})।"
                + (f" প্রেসক্রিপশনে নোট: {dx}।" if dx else "")
                + " এটি শিক্ষামূলক সারাংশ। চূড়ান্ত নির্দেশনার জন্য ডাক্তার বা ফার্মাসিস্টের সাথে কথা বলুন।"
            )
            if bn
            else (
                f"This prescription lists {len(medicines)} medicine(s): {names}."
                + (f" The prescription notes: {dx}." if dx else "")
                + " Educational summary only. Confirm with your doctor or pharmacist."
            )
        ),
        "holisticExplanation": (
            f"এই ওষুধগুলো একসাথে সাধারণত সংক্রমণ, জ্বর বা পেট সুরক্ষার মতো লক্ষ্যে ব্যবহার হতে পারে। RxLens রোগ নির্ণয় করে না। রোগীর প্রসঙ্গ: বয়স {age}। লিখিত ডোজ থাকলে সেটিই প্রাধান্য পাবে।"
            if bn
            else f"Together, these medicines are commonly used in combinations that address infection and symptom relief, sometimes with stomach protection. RxLens does not diagnose. Patient context age band: {age}. Always prefer the written dose on your prescription."
        ),
        "schedule": [
            {
                "timeOfDay": "সকাল" if bn else "Morning",
                "medicines": [m["rawName"] for m in medicines[:2]],
                "mealTiming": "খাবারের সাথে/পরে (লেবেল অনুযায়ী)" if bn else "With/after food if labeled",
                "notes": "লিখিত নির্দেশনা অনুসরণ করুন" if bn else "Follow written instructions",
            },
            {
                "timeOfDay": "রাত" if bn else "Night",
                "medicines": [m["rawName"] for m in medicines[:1]],
                "mealTiming": "",
                "notes": "",
            },
        ],
        "interactions": [
            {
                "title": "সাধারণ সতর্কতা" if bn else "General caution",
                "detail": (
                    "অন্যান্য ওষুধ (বিশেষ করে রক্ত পাতলা করা/ব্যথানাশক) একসাথে খেলে ঝুঁকি বাড়তে পারে — ফার্মাসিস্টকে জানান।"
                    if bn
                    else "Taking other medicines (especially blood thinners or extra painkillers) may add risk — tell your pharmacist everything you take."
                ),
                "severity": "caution",
            }
        ],
        "sideEffects": {
            "common": ["হালকা বমি বমি ভাব", "পেটের অস্বস্তি"] if bn else ["Mild nausea", "Stomach upset"],
            "seekCareNow": (
                ["শ্বাসকষ্ট", "মুখ/গলা ফোলা", "তীব্র র্যাশ", "কালো পায়খানা"]
                if bn
                else ["Difficulty breathing", "Face/throat swelling", "Severe rash", "Black stools"]
            ),
        },
        "clinicalContext": {
            "diagnosis": clinical.get("diagnosis") or "",
            "investigations": list(clinical.get("investigations") or []),
            "clinicalNotes": list(clinical.get("clinicalNotes") or []),
        },
    }


def mock_missed_dose(
    *,
    medicine: dict[str, Any],
    when_missed: str,
    language: str,
) -> dict[str, Any]:
    bn = language == "bn"
    name = medicine.get("brandName") or medicine.get("rawName") or ("ওষুধ" if bn else "medicine")
    dose = medicine.get("doseLine") or ""
    when_label = {
        "last_night": "গত রাতে" if bn else "last night",
        "this_morning": "আজ সকালে" if bn else "this morning",
        "earlier_today": "আজ আগে" if bn else "earlier today",
        "unsure": "নিশ্চিত নন" if bn else "you are unsure when",
    }.get(when_missed, when_missed)
    return {
        "title": (
            f"{name}: একটি ডোজ মিস হয়েছে"
            if bn
            else f"Missed dose of {name}"
        ),
        "whatToKnow": (
            [
                f"আপনি জানিয়েছেন ডোজ মিস: {when_label}।",
                f"লেখা নির্দেশনা: {dose or 'লেবেলে যা আছে'} — সেটিই প্রাধান্য পাবে।",
                "RxLens ডোজ বদলায় না; এটি শুধু শিক্ষামূলক ধারণা।",
            ]
            if bn
            else [
                f"You said a dose was missed ({when_label}).",
                f"Written directions: {dose or 'as labeled'} — those take priority.",
                "RxLens does not change doses; this is educational context only.",
            ]
        ),
        "options": (
            [
                "পরের নির্ধারিত সময়ে নিয়মিত ডোজ চালিয়ে যান যদি লেবেল/ডাক্তার তা বলে।",
                "ডাবল ডোজ নেবেন না যদি না ডাক্তার/ফার্মাসিস্ট স্পষ্ট বলে।",
                "অ্যান্টিবায়োটিক বা গুরুত্বপূর্ণ ওষুধ হলে আজই ফার্মাসিস্ট/ডাক্তারকে জিজ্ঞাসা করুন।",
            ]
            if bn
            else [
                "Take the next scheduled dose on time if your label/doctor says so.",
                "Do not double up unless a doctor or pharmacist clearly says to.",
                "For antibiotics or critical meds, ask a pharmacist or doctor today.",
            ]
        ),
        "seekCareIf": (
            [
                "তীব্র উপসর্গ ফিরে আসা বা খারাপ হওয়া",
                "অ্যালার্জির লক্ষণ (র্যাশ, ফোলা, শ্বাসকষ্ট)",
                "গর্ভাবস্থা/শিশু/জটিল রোগ থাকলে দ্রুত পরামর্শ নিন",
            ]
            if bn
            else [
                "Symptoms return or worsen sharply",
                "Allergy signs (rash, swelling, breathing trouble)",
                "Pregnancy, child patient, or complex illness — seek advice sooner",
            ]
        ),
        "disclaimer": (
            "শিক্ষামূলক সহায়ক মাত্র; ডাক্তার বা ফার্মাসিস্টের বিকল্প নয়।"
            if bn
            else "Educational only — not a substitute for a doctor or pharmacist."
        ),
    }
