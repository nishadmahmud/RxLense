from __future__ import annotations

import re
from typing import Any, Optional


def mock_extract(*, ocr_hint: str = "", demo_preset: Optional[str] = None) -> dict[str, Any]:
    hint = ocr_hint or ""
    if demo_preset == "throat" or re.search(r"napa|moxacil|seclo|amox", hint, re.I):
        return {
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
            ]
        }
    return {
        "medicines": [
            {"rawName": "Napa", "strength": "500mg", "doseLine": "1+1+1 SOS", "confidence": 0.8},
            {"rawName": "Alatrol", "strength": "10mg", "doseLine": "0+0+1", "confidence": 0.75},
        ]
    }


def mock_brief(*, medicines: list[dict[str, Any]], patient_context: dict[str, Any], language: str) -> dict[str, Any]:
    names = ", ".join(m.get("rawName", "") for m in medicines)
    bn = language == "bn"
    age = patient_context.get("ageBand", "adult")
    return {
        "summary": (
            f"এই প্রেসক্রিপশনে {len(medicines)}টি ওষুধ আছে ({names})। এটি শিক্ষামূলক সারাংশ। চূড়ান্ত নির্দেশনার জন্য ডাক্তার বা ফার্মাসিস্টের সাথে কথা বলুন।"
            if bn
            else f"This prescription lists {len(medicines)} medicine(s): {names}. Educational summary only. Confirm with your doctor or pharmacist."
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
        "foodAndLifestyle": {
            "avoid": (
                ["অ্যালকোহল (প্রযোজ্য হলে)", "ডাক্তারের অজান্তে অতিরিক্ত ব্যথানাশক"]
                if bn
                else ["Alcohol if advised", "Extra painkillers without advice"]
            ),
            "doThis": (
                ["অ্যান্টিবায়োটিক কোর্স শেষ করুন যদি ডাক্তার বলে থাকেন", "পানি পান করুন", "উন্নতি না হলে আবার দেখান"]
                if bn
                else ["Finish antibiotic course if prescribed", "Stay hydrated", "Return if symptoms worsen"]
            ),
        },
        "sideEffects": {
            "common": ["হালকা বমি বমি ভাব", "পেটের অস্বস্তি"] if bn else ["Mild nausea", "Stomach upset"],
            "seekCareNow": (
                ["শ্বাসকষ্ট", "মুখ/গলা ফোলা", "তীব্র র্যাশ", "কালো পায়খানা"]
                if bn
                else ["Difficulty breathing", "Face/throat swelling", "Severe rash", "Black stools"]
            ),
        },
        "doctorQuestions": (
            [
                "জ্বর কমলেও অ্যান্টিবায়োটিক চালিয়ে যাবো?",
                "আমার অন্য ওষুধের সাথে এগুলো নিরাপদ?",
                "এক ডোজ মিস করলে কী করব?",
            ]
            if bn
            else [
                "Should I finish the antibiotic if I feel better?",
                "Is this safe with my other medicines?",
                "What if I miss a dose?",
            ]
        ),
    }
