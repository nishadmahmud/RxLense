"""Fetch MedEx.com.bd search + brand pages for indicative BD list prices."""

from __future__ import annotations

import re
from html import unescape
from typing import Any
from urllib.parse import quote_plus

import httpx

MEDEX_ORIGIN = "https://medex.com.bd"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; RxLensBot/1.0; educational prescription companion)",
    "Accept-Language": "en-US,en;q=0.9",
}
_TAG_RE = re.compile(r"(?is)<script[^>]*>.*?</script>|<style[^>]*>.*?</style>|<[^>]+>")
_WS_RE = re.compile(r"[ \t]+")
_BRAND_HREF_RE = re.compile(
    r'href="(https://medex\.com\.bd/brands/\d+/[^"]+|(/brands/\d+/[^"]+))"',
    re.IGNORECASE,
)
_TITLE_RE = re.compile(
    r'href="(?:https://medex\.com\.bd)?(/brands/\d+/[^"]+)"[^>]*>\s*([^<]{2,120})',
    re.IGNORECASE,
)


def _strip_html(html: str) -> str:
    text = _TAG_RE.sub(" ", html or "")
    text = unescape(text)
    text = text.replace("\xa0", " ")
    lines = []
    for ln in text.splitlines():
        ln = _WS_RE.sub(" ", ln).strip()
        if ln:
            lines.append(ln)
    return "\n".join(lines)


def _abs_url(href: str) -> str:
    if href.startswith("http"):
        return href
    return MEDEX_ORIGIN + href


def looks_like_price_query(text: str) -> bool:
    raw = (text or "").lower()
    keys = (
        "price",
        "prices",
        "cost",
        "how much",
        "indicative price",
        "দাম",
        "মূল্য",
        "কত টাকা",
        "টাকা",
    )
    return any(k in raw for k in keys)


def extract_price_queries(text: str, *, profile_context: Any, scan_context: Any) -> list[str]:
    """Pull medicine names to look up from the user message + contexts."""
    raw = (text or "").strip()
    names: list[str] = []
    seen: set[str] = set()

    def add(n: str) -> None:
        n = re.sub(r"\s+", " ", (n or "").strip())
        if len(n) < 2:
            return
        key = n.lower()
        if key in seen:
            return
        seen.add(key)
        names.append(n)

    # "Indicative price for X?" / "X এর আনুমানিক দাম?"
    m = re.search(r"(?:indicative\s+price\s+for|price\s+for|price\s+of)\s+(.+?)\??\s*$", raw, re.I)
    if m:
        add(m.group(1).strip(" ?.!"))
    m = re.search(r"^(.+?)\s*এর\s*আনুমানিক\s*দাম", raw)
    if m:
        add(m.group(1))

    all_mode = bool(
        re.search(r"\ball\b", raw, re.I)
        or "সব সেভ" in raw
        or "all my saved" in raw.lower()
    )

    if all_mode or not names:
        if isinstance(profile_context, dict):
            for item in profile_context.get("regimen") or []:
                if isinstance(item, dict):
                    add(item.get("brandName") or "")
            for item in profile_context.get("chronicMeds") or []:
                if isinstance(item, dict):
                    add(item.get("brandName") or "")
        if isinstance(scan_context, dict):
            for item in scan_context.get("medicines") or []:
                if isinstance(item, dict):
                    add(item.get("rawName") or item.get("brandName") or "")

    if not names and raw and not all_mode:
        # typed freeform medicine name without template
        cleaned = re.sub(
            r"(?i)\b(indicative|price|prices|for|of|check|please|দাম|মূল্য|জানতে|চাই)\b",
            " ",
            raw,
        )
        cleaned = re.sub(r"[?\.,!]+", " ", cleaned).strip()
        if cleaned and len(cleaned) < 60:
            add(cleaned)

    return names[:5]


async def _get(client: httpx.AsyncClient, url: str) -> str:
    r = await client.get(url, headers=_HEADERS, follow_redirects=True, timeout=20.0)
    r.raise_for_status()
    return r.text


def _parse_search_hits(html: str) -> list[dict[str, str]]:
    hits: list[dict[str, str]] = []
    seen: set[str] = set()
    for m in _TITLE_RE.finditer(html or ""):
        path, title = m.group(1), m.group(2).strip()
        url = _abs_url(path)
        if url in seen:
            continue
        seen.add(url)
        hits.append({"title": title, "url": url})
        if len(hits) >= 4:
            break
    if not hits:
        for m in _BRAND_HREF_RE.finditer(html or ""):
            href = m.group(1) or m.group(2)
            url = _abs_url(href)
            if url in seen or "/brands/" not in url or url.rstrip("/").endswith("/brands"):
                continue
            seen.add(url)
            slug = url.rstrip("/").split("/")[-1].replace("-", " ")
            hits.append({"title": slug, "url": url})
            if len(hits) >= 4:
                break
    return hits


def _price_snippets(html: str, *, max_chars: int = 900) -> str:
    plain = _strip_html(html)
    lines = plain.splitlines()
    keep: list[str] = []
    for i, ln in enumerate(lines):
        low = ln.lower()
        if "unit price" in low or "৳" in ln or "pack size" in low or "mrp" in low:
            start = max(0, i - 1)
            end = min(len(lines), i + 4)
            keep.extend(lines[start:end])
    if not keep:
        # fallback: first chunk of brand page text
        keep = lines[:40]
    # dedupe preserve order
    out: list[str] = []
    seen: set[str] = set()
    for ln in keep:
        if ln in seen:
            continue
        seen.add(ln)
        out.append(ln)
    text = "\n".join(out)
    return text[:max_chars]


def _price_lines_from_brand(html: str) -> list[str]:
    """Extract short human-readable price lines from a MedEx brand page."""
    plain = _strip_html(html)
    lines = plain.splitlines()
    out: list[str] = []
    for i, ln in enumerate(lines):
        low = ln.lower()
        if "unit price" in low:
            # next lines often hold ৳ amounts / pack
            chunk = [ln]
            for j in range(i + 1, min(len(lines), i + 5)):
                if "৳" in lines[j] or re.search(r"\d", lines[j]):
                    chunk.append(lines[j])
                elif lines[j].lower().startswith("pack") or "x " in lines[j].lower():
                    chunk.append(lines[j])
                else:
                    break
            out.append(" · ".join(chunk))
        elif ln.startswith("৳") and i > 0 and "unit" in lines[i - 1].lower():
            continue
    if not out:
        for ln in lines:
            if "৳" in ln:
                out.append(ln)
            if len(out) >= 4:
                break
    # dedupe
    seen: set[str] = set()
    unique: list[str] = []
    for ln in out:
        if ln in seen:
            continue
        seen.add(ln)
        unique.append(ln)
    return unique[:6]


async def lookup_medex_prices(query: str) -> dict[str, Any]:
    """Structured MedEx prices for the medicine modal / API clients."""
    q = (query or "").strip()
    if not q:
        return {"source": "medex", "query": q, "items": [], "error": "empty query"}

    items: list[dict[str, Any]] = []
    try:
        async with httpx.AsyncClient() as client:
            search_url = f"{MEDEX_ORIGIN}/search?search={quote_plus(q)}"
            search_html = await _get(client, search_url)
            hits = _parse_search_hits(search_html)
            for h in hits[:3]:
                entry: dict[str, Any] = {
                    "title": h["title"],
                    "url": h["url"],
                    "prices": [],
                }
                try:
                    brand_html = await _get(client, h["url"])
                    entry["prices"] = _price_lines_from_brand(brand_html)
                except Exception as exc:  # noqa: BLE001
                    entry["error"] = str(exc)
                items.append(entry)
        return {"source": "medex", "query": q, "items": items, "error": None}
    except Exception as exc:  # noqa: BLE001
        return {"source": "medex", "query": q, "items": [], "error": str(exc)}


async def gather_medex_price_context(queries: list[str]) -> str:
    """Search MedEx for each query; open top brand pages; return text for the LLM."""
    if not queries:
        return "(no medicine names to search)"

    blocks: list[str] = []
    async with httpx.AsyncClient() as client:
        for q in queries:
            try:
                search_url = f"{MEDEX_ORIGIN}/search?search={quote_plus(q)}"
                search_html = await _get(client, search_url)
                hits = _parse_search_hits(search_html)
                if not hits:
                    blocks.append(f"### Query: {q}\nNo MedEx brand hits.")
                    continue
                parts = [f"### Query: {q}", f"Search: {search_url}", "Top hits:"]
                for h in hits:
                    parts.append(f"- {h['title']} | {h['url']}")
                # Fetch top 2 brand pages for unit prices
                for h in hits[:2]:
                    try:
                        brand_html = await _get(client, h["url"])
                        snip = _price_snippets(brand_html)
                        parts.append(f"\nBrand page: {h['title']}\n{snip}")
                    except Exception as exc:  # noqa: BLE001
                        parts.append(f"\nBrand page fetch failed ({h['url']}): {exc}")
                blocks.append("\n".join(parts))
            except Exception as exc:  # noqa: BLE001
                blocks.append(f"### Query: {q}\nMedEx search failed: {exc}")

    return "\n\n".join(blocks)[:6000]
