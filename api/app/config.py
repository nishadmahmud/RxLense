import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
_MEDICINES_DIR = BASE_DIR / "data" / "medicines"
_ENRICHED = _MEDICINES_DIR / "bd_medicines_enriched.json"
_CURATED = _MEDICINES_DIR / "bd_medicines.json"
_KB_ENV = os.getenv("KB_PATH", "").strip()
KB_PATH = Path(_KB_ENV) if _KB_ENV else (_ENRICHED if _ENRICHED.exists() else _CURATED)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMMA_VISION_MODEL = os.getenv("GEMMA_VISION_MODEL", "gemma-4-31b-it")
# 26B MoE is faster for brief/chat; keep 31B dense for vision extract
GEMMA_TEXT_MODEL = os.getenv("GEMMA_TEXT_MODEL", "gemma-4-26b-a4b-it")
MOCK_AI = os.getenv("MOCK_AI", "true").lower() == "true"
PORT = int(os.getenv("PORT", "4000"))
# Public demo abuse shield (empty DEMO_TOKEN = no token required)
DEMO_TOKEN = os.getenv("DEMO_TOKEN", "").strip()
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "30"))
MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(8 * 1024 * 1024)))
