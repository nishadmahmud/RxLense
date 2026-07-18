"""
Build api/data/medicines/bd_medicines_enriched.json from HF Bangladesh CSVs
+ curated bd_medicines.json (curated safety fields win on merge).

Usage (from repo root):
  python scripts/build_bd_kb.py
"""

from __future__ import annotations

import csv
import html
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MED = ROOT / "api" / "data" / "medicines"
RAW = MED / "raw" / "bangladesh-hf"
CURATED = MED / "bd_medicines.json"
OUT = MED / "bd_medicines_enriched.json"

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def slug_id(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return s or "unknown"


def strip_html(text: str, max_len: int = 500) -> str:
    if not text:
        return ""
    t = TAG_RE.sub(" ", text)
    t = html.unescape(t)
    t = WS_RE.sub(" ", t).strip()
    if len(t) > max_len:
        t = t[: max_len - 1].rstrip() + "…"
    return t


def split_list(text: str, limit: int = 8) -> list[str]:
    if not text:
        return []
    # Prefer sentence / break splits for long monograph blobs
    parts = re.split(r"[;\n•]|<br\s*/?>|\.(?=\s+[A-Z])", text)
    out: list[str] = []
    for p in parts:
        p = strip_html(p, max_len=160)
        if len(p) < 8:
            continue
        out.append(p)
        if len(out) >= limit:
            break
    if not out and text:
        cleaned = strip_html(text, max_len=240)
        if cleaned:
            out = [cleaned]
    return out


def normalize(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def load_medicine_brands() -> dict[str, dict]:
    """generic_norm -> {generic, brandNames set, strengths set, forms set, prices set}"""
    by_generic: dict[str, dict] = {}
    path = RAW / "medicine.csv"
    price_re = re.compile(r"৳\s*[\d,.]+")
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            generic = (row.get("generic") or "").strip()
            brand = (row.get("brand name") or "").strip()
            if not generic or not brand:
                continue
            key = normalize(generic)
            entry = by_generic.get(key)
            if not entry:
                entry = {
                    "generic": generic,
                    "brandNames": set(),
                    "strengths": set(),
                    "forms": set(),
                    "prices": set(),
                    "brandPrices": {},  # brand -> list of price snippets
                }
                by_generic[key] = entry
            entry["brandNames"].add(brand)
            strength = (row.get("strength") or "").strip()
            form = (row.get("dosage form") or "").strip()
            if strength:
                entry["strengths"].add(strength)
            if form:
                entry["forms"].add(form)
            pkg = " ".join(
                [
                    row.get("package container") or "",
                    row.get("Package Size") or "",
                ]
            )
            snippets = []
            for m in price_re.finditer(pkg):
                # grab a short window around the match
                start = max(0, m.start() - 24)
                end = min(len(pkg), m.end() + 8)
                snip = WS_RE.sub(" ", pkg[start:end]).strip(" ,;")
                if snip:
                    snippets.append(snip)
                    entry["prices"].add(snip)
            if snippets:
                cur = entry["brandPrices"].setdefault(brand, [])
                for s in snippets[:2]:
                    if s not in cur and len(cur) < 4:
                        cur.append(s)
    return by_generic


def load_generic_meta() -> dict[str, dict]:
    path = RAW / "generic.csv"
    meta: dict[str, dict] = {}
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            name = (row.get("generic name") or "").strip()
            if not name:
                continue
            key = normalize(name)
            indication = (row.get("indication") or "").strip()
            uses = [x.strip() for x in re.split(r"[,;/]", indication) if x.strip()][:8]
            if not uses:
                uses = split_list(row.get("indication description") or "", limit=5)

            side = split_list(row.get("side effects description") or "", limit=6)
            serious = []
            # Heuristic: keep later / severe-sounding phrases if present
            for s in side:
                if re.search(r"severe|serious|anaphyla|bleed|liver|kidney|rash|swell", s, re.I):
                    serious.append(s)
            common = [s for s in side if s not in serious][:5]
            if not common and side:
                common = side[:4]

            meta[key] = {
                "generic": name,
                "drugClass": (row.get("drug class") or "").strip() or None,
                "commonUses": uses,
                "interactionTags": split_list(row.get("interaction description") or "", limit=6),
                "commonSideEffects": common,
                "seriousSideEffects": serious[:4],
                "pregnancyNote": strip_html(row.get("pregnancy and lactation description") or "", 280)
                or None,
                "notes": strip_html(row.get("precautions description") or "", 280) or None,
            }
    return meta


def load_curated() -> list[dict]:
    with open(CURATED, encoding="utf-8") as f:
        return json.load(f)


def find_curated(curated_by_norm: dict[str, dict], generic: str) -> dict | None:
    key = normalize(generic)
    if key in curated_by_norm:
        return curated_by_norm[key]
    # Amoxicillin Trihydrate <-> Amoxicillin
    for ck, cv in curated_by_norm.items():
        if key.startswith(ck) or ck.startswith(key):
            return cv
        # first token match for salts
        kt = key.split()
        ct = ck.split()
        if kt and ct and kt[0] == ct[0] and len(kt[0]) > 4:
            return cv
    return None


def build() -> list[dict]:
    brands = load_medicine_brands()
    meta = load_generic_meta()
    curated = load_curated()
    curated_by_norm = {normalize(m["generic"]): m for m in curated}
    curated_used: set[str] = set()

    out: list[dict] = []
    by_id: dict[str, dict] = {}

    for gkey, brand_info in brands.items():
        generic_name = brand_info["generic"]
        gmeta = meta.get(gkey) or meta.get(normalize(generic_name)) or {}
        curated_hit = find_curated(curated_by_norm, generic_name)

        brand_names = set(brand_info["brandNames"])
        strengths = set(brand_info["strengths"])
        prices = sorted(brand_info.get("prices") or [])[:8]

        if curated_hit:
            curated_used.add(normalize(curated_hit["generic"]))
            brand_names.update(curated_hit.get("brandNames") or [])
            entry_id = curated_hit["id"]
            if entry_id in by_id:
                # Merge salts / variants into one curated row
                existing = by_id[entry_id]
                merged = set(existing.get("brandNames") or []) | brand_names
                existing["brandNames"] = sorted(merged, key=str.lower)
                if strengths:
                    existing["exampleStrengths"] = sorted(
                        set(existing.get("exampleStrengths") or []) | strengths
                    )[:12]
                if prices:
                    existing["examplePrices"] = sorted(
                        set(existing.get("examplePrices") or []) | set(prices)
                    )[:8]
                continue
            entry = {
                "id": entry_id,
                "brandNames": sorted(brand_names, key=str.lower),
                "generic": curated_hit.get("generic") or generic_name,
                "drugClass": curated_hit.get("drugClass") or gmeta.get("drugClass"),
                "commonUses": curated_hit.get("commonUses") or gmeta.get("commonUses") or [],
                "foodFlags": curated_hit.get("foodFlags") or [],
                "interactionTags": curated_hit.get("interactionTags")
                or gmeta.get("interactionTags")
                or [],
                "commonSideEffects": curated_hit.get("commonSideEffects")
                or gmeta.get("commonSideEffects")
                or [],
                "seriousSideEffects": curated_hit.get("seriousSideEffects")
                or gmeta.get("seriousSideEffects")
                or [],
                "pregnancyNote": curated_hit.get("pregnancyNote") or gmeta.get("pregnancyNote"),
                "notes": curated_hit.get("notes") or gmeta.get("notes"),
                "source": "curated+hf",
            }
        else:
            entry_id = slug_id(generic_name)
            base = entry_id
            n = 2
            while entry_id in by_id:
                entry_id = f"{base}-{n}"
                n += 1
            entry = {
                "id": entry_id,
                "brandNames": sorted(brand_names, key=str.lower),
                "generic": generic_name,
                "drugClass": gmeta.get("drugClass"),
                "commonUses": gmeta.get("commonUses") or [],
                "foodFlags": [],
                "interactionTags": gmeta.get("interactionTags") or [],
                "commonSideEffects": gmeta.get("commonSideEffects") or [],
                "seriousSideEffects": gmeta.get("seriousSideEffects") or [],
                "pregnancyNote": gmeta.get("pregnancyNote"),
                "notes": gmeta.get("notes"),
                "source": "hf",
            }

        if strengths:
            entry["exampleStrengths"] = sorted(strengths)[:12]
        if prices:
            entry["examplePrices"] = prices
        by_id[entry["id"]] = entry
        out.append(entry)

    # Curated-only entries not covered by HF
    for med in curated:
        if normalize(med["generic"]) in curated_used:
            continue
        if med["id"] in by_id:
            continue
        entry = dict(med)
        entry["source"] = "curated"
        by_id[entry["id"]] = entry
        out.append(entry)

    out.sort(key=lambda m: (m.get("generic") or "").lower())
    return out


def main() -> None:
    if not (RAW / "medicine.csv").exists():
        raise SystemExit(f"Missing {RAW / 'medicine.csv'}")
    data = build()
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    curated_n = sum(1 for m in data if m.get("source") == "curated")
    both_n = sum(1 for m in data if m.get("source") == "curated+hf")
    hf_n = sum(1 for m in data if m.get("source") == "hf")
    brand_n = sum(len(m.get("brandNames") or []) for m in data)
    print(f"Wrote {OUT}")
    print(f"entries={len(data)} curated+hf={both_n} hf={hf_n} curated-only={curated_n} brandNames={brand_n}")
    # quick checks
    for q in ("Paridon", "Pantonix", "Algin", "Algicid DX", "Moxacil", "Napa"):
        hits = [m["generic"] for m in data if q.lower() in [b.lower() for b in m.get("brandNames", [])]]
        print(f"  {q} -> {hits[:2] or 'NO MATCH'}")


if __name__ == "__main__":
    main()
