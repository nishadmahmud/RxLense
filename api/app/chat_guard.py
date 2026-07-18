"""Light keyword deny-list for chat (not a full classifier)."""

from __future__ import annotations

import re

# Intentionally short / high-signal; medical chat still goes to the model.
_DENY_PATTERNS = [
    r"\bkill\s+(yourself|myself|him|her|them)\b",
    r"\bsuicide\b",
    r"\bself[-\s]?harm\b",
    r"\bhow\s+to\s+(make|build)\s+(a\s+)?bomb\b",
    r"\bchild\s*porn\b",
    r"\bcsam\b",
    r"\brape\b",
    r"\bsexual\s+(with|act|content)\b",
    r"\bnude\s+(pics?|photos?|of)\b",
    r"\bhow\s+to\s+hack\b",
    r"\bcredit\s+card\s+(dump|fraud)\b",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in _DENY_PATTERNS]


def chat_refusal_for(language: str) -> str:
    if language == "bn":
        return (
            "আমি এই বিষয়ে সাহায্য করতে পারি না। RxLens শুধু প্রেসক্রিপশন ও ওষুধ বিষয়ে "
            "শিক্ষামূলক তথ্য দেয়। জরুরি বা বিপজ্জনক পরিস্থিতিতে স্থানীয় জরুরি সেবা বা "
            "বিশ্বস্ত মানুষের সাহায্য নিন।"
        )
    return (
        "I cannot help with that. RxLens only gives educational information about "
        "prescriptions and medicines. If you are in danger or crisis, contact local "
        "emergency services or someone you trust."
    )


def is_denied_chat_message(text: str) -> bool:
    raw = (text or "").strip()
    if not raw:
        return False
    return any(p.search(raw) for p in _COMPILED)
