"""RxLens API tests — KB, mock schemas, disclaimers (no live Gemma calls)."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))

# Force mock mode before importing app
import os

os.environ["MOCK_AI"] = "true"
os.environ["DEMO_TOKEN"] = ""
os.environ["RATE_LIMIT_PER_MINUTE"] = "0"

from app import config  # noqa: E402
from app.disclaimer import disclaimer_for  # noqa: E402
from app.kb import load_kb, match_medicine  # noqa: E402
from app.main import app  # noqa: E402
from app.mock import mock_brief, mock_extract  # noqa: E402
from app.schemas import Briefing, ExtractResult  # noqa: E402

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clear_kb_cache():
    load_kb.cache_clear()
    yield
    load_kb.cache_clear()


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["backend"] == "fastapi"


def test_kb_loaded():
    kb = load_kb()
    assert len(kb) > 100


@pytest.mark.parametrize(
    "brand,expected_id_substr",
    [
        ("Paridon", "domperidone"),
        ("Moxacil", "amoxicillin"),
        ("Napa", "paracetamol"),
        ("Seclo", "omeprazole"),
        ("Pantonix", "pantoprazole"),
        ("Algin", "tiemonium"),
        ("Algicid DX", "alginate"),
    ],
)
def test_kb_brand_matches(brand, expected_id_substr):
    hit = match_medicine(brand)
    assert hit["kbId"], f"No match for {brand}"
    assert hit["matchScore"] >= 0.85
    assert expected_id_substr in (hit["kbId"] or "")


def test_disclaimer_languages():
    en = disclaimer_for("en")
    bn = disclaimer_for("bn")
    assert "educational" in en.lower() or "Educational" in en
    assert "শিক্ষামূলক" in bn or "ডাক্তার" in bn
    assert en != bn


def test_mock_extract_schema():
    raw = mock_extract(demo_preset="throat")
    parsed = ExtractResult.model_validate(raw)
    assert len(parsed.medicines) >= 2


def test_mock_brief_schema():
    meds = [
        {
            "rawName": "Moxacil",
            "strength": "500mg",
            "doseLine": "1+0+1",
            "confidence": 0.9,
            "kbSnapshot": {"generic": "Amoxicillin", "drugClass": "Antibiotic"},
        }
    ]
    raw = mock_brief(medicines=meds, patient_context={"ageBand": "adult"}, language="en")
    Briefing.model_validate(raw)


def test_analyze_demo_preset():
    r = client.post("/api/analyze", json={"demoPreset": "throat", "language": "en"})
    assert r.status_code == 200
    data = r.json()
    assert data["requiresConfirmation"] is True
    assert len(data["medicines"]) >= 2
    assert "disclaimer" in data


def test_brief_blocks_needs_review():
    r = client.post(
        "/api/brief",
        json={
            "language": "en",
            "confirmUnmatched": False,
            "medicines": [
                {
                    "rawName": "CompletelyFakeMedXYZ",
                    "strength": "",
                    "doseLine": "",
                    "confidence": 0.3,
                    "needsReview": True,
                }
            ],
        },
    )
    assert r.status_code == 422


def test_brief_allows_user_cleared_review():
    r = client.post(
        "/api/brief",
        json={
            "language": "en",
            "confirmUnmatched": False,
            "medicines": [
                {
                    "rawName": "CompletelyFakeMedXYZ",
                    "strength": "",
                    "doseLine": "1+0+0",
                    "confidence": 0.3,
                    "needsReview": False,
                }
            ],
            "patientContext": {"ageBand": "adult"},
        },
    )
    assert r.status_code == 200
    assert "briefing" in r.json()


def test_brief_confirm_unmatched_escape():
    r = client.post(
        "/api/brief",
        json={
            "language": "en",
            "confirmUnmatched": True,
            "medicines": [
                {
                    "rawName": "CompletelyFakeMedXYZ",
                    "strength": "",
                    "doseLine": "",
                    "confidence": 0.2,
                    "needsReview": True,
                }
            ],
        },
    )
    assert r.status_code == 200


def test_chat_mock_bangla():
    r = client.post(
        "/api/chat",
        json={
            "language": "bn",
            "messages": [{"role": "user", "content": "Napa এর দাম?"}],
        },
    )
    assert r.status_code == 200
    reply = r.json()["reply"]
    assert any("\u0980" <= ch <= "\u09FF" for ch in reply)


def test_medicine_detail():
    r = client.get("/api/medicines/paracetamol")
    assert r.status_code == 200
    assert r.json()["medicine"]["id"] == "paracetamol"


def test_brief_bangla_has_bangla_script():
    r = client.post(
        "/api/brief",
        json={
            "language": "bn",
            "confirmUnmatched": True,
            "medicines": [
                {"rawName": "Napa", "strength": "500mg", "doseLine": "1+1+1", "needsReview": False}
            ],
        },
    )
    assert r.status_code == 200
    summary = r.json()["briefing"]["summary"]
    assert any("\u0980" <= ch <= "\u09FF" for ch in summary)
