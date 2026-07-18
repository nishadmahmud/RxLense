from __future__ import annotations

import json
import re
from functools import lru_cache
from typing import Any

from .config import KB_PATH


def _normalize(s: str) -> str:
    return re.sub(r"[^a-z0-9\u0980-\u09ff]+", " ", (s or "").lower()).strip()


@lru_cache(maxsize=1)
def load_kb() -> list[dict[str, Any]]:
    with open(KB_PATH, encoding="utf-8") as f:
        return json.load(f)


def score_match(query: str, medicine: dict[str, Any]) -> float:
    q = _normalize(query)
    if not q:
        return 0.0

    candidates = [_normalize(medicine.get("generic", "")), _normalize(medicine.get("id", ""))]
    candidates.extend(_normalize(b) for b in medicine.get("brandNames") or [])

    best = 0.0
    for c in candidates:
        if not c:
            continue
        if c == q:
            best = max(best, 1.0)
        elif c.startswith(q + " ") or q.startswith(c + " "):
            best = max(best, 0.9)
        elif len(q) >= 5 and (c.startswith(q) or q.startswith(c)):
            best = max(best, 0.85)
        elif len(q) >= 5 and (f" {q} " in f" {c} " or f" {c} " in f" {q} "):
            best = max(best, 0.8)
        else:
            qt = set(q.split())
            ct = set(c.split())
            if qt and qt <= ct:
                best = max(best, 0.88)
            elif qt:
                overlap = len(qt & ct) / len(qt)
                if overlap >= 0.67:
                    best = max(best, 0.55 + 0.3 * overlap)
    return best


def match_medicine(name: str) -> dict[str, Any]:
    best = None
    best_score = 0.0
    for med in load_kb():
        s = score_match(name, med)
        if s > best_score:
            best_score = s
            best = med

    if not best or best_score < 0.45:
        return {"kbId": None, "matchScore": best_score, "kbSnapshot": None}

    return {
        "kbId": best["id"],
        "matchScore": best_score,
        "kbSnapshot": {
            "id": best["id"],
            "generic": best["generic"],
            "brandNames": best.get("brandNames", []),
            "drugClass": best.get("drugClass"),
            "commonUses": best.get("commonUses", []),
            "foodFlags": best.get("foodFlags", []),
            "interactionTags": best.get("interactionTags", []),
            "commonSideEffects": best.get("commonSideEffects", []),
            "seriousSideEffects": best.get("seriousSideEffects", []),
            "pregnancyNote": best.get("pregnancyNote"),
            "notes": best.get("notes"),
            "examplePrices": best.get("examplePrices", []),
            "exampleStrengths": best.get("exampleStrengths", []),
        },
    }


def enrich_proposed(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for item in items or []:
        raw = item.get("rawName") or item.get("name") or "Unknown"
        hit = match_medicine(raw)
        confidence = float(item.get("confidence") if item.get("confidence") is not None else 0.5)
        out.append(
            {
                "rawName": raw,
                "strength": item.get("strength") or "",
                "doseLine": item.get("doseLine") or "",
                "confidence": confidence,
                "needsReview": confidence < 0.55 or not hit["kbId"],
                "kbId": hit["kbId"],
                "matchScore": hit["matchScore"],
                "kbSnapshot": hit["kbSnapshot"],
            }
        )
    return out


def search(q: str, limit: int = 10) -> list[dict[str, Any]]:
    scored = [{"medicine": m, "score": score_match(q, m)} for m in load_kb()]
    scored = [x for x in scored if x["score"] >= 0.4]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return [x["medicine"] for x in scored[:limit]]


def get_by_id(med_id: str) -> dict[str, Any] | None:
    for med in load_kb():
        if med.get("id") == med_id:
            return med
    return None
