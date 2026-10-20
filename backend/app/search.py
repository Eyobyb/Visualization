"""DuckDuckGo search agent. Results are passed through as returned, with no cleanup."""
import asyncio
import time
from collections import OrderedDict
from typing import Dict, List

MAX_RESULTS = 8
CACHE_SIZE = 128

_cache: "OrderedDict[str, Dict]" = OrderedDict()


def to_markdown(query: str, results: List[Dict]) -> str:
    lines = [f"## DuckDuckGo results for: {query}", ""]
    for i, r in enumerate(results, 1):
        lines += [f"### {i}. {r['title']}", r["url"], "", r["snippet"], ""]
    return "\n".join(lines).rstrip() + "\n"


def _search_sync(query: str) -> Dict:
    from ddgs import DDGS

    started = time.monotonic()
    try:
        hits = DDGS().text(query, max_results=MAX_RESULTS) or []
    except Exception as e:  # ddgs raises on rate limits and network errors
        return {"query": query, "results": [], "markdown": "", "error": f"{type(e).__name__}: {e}", "elapsed_ms": 0}
    results = [
        {"id": f"r{i}", "title": h.get("title", ""), "url": h.get("href", ""), "snippet": h.get("body", "")}
        for i, h in enumerate(hits, 1)
    ]
    return {
        "query": query,
        "results": results,
        "markdown": to_markdown(query, results),
        "elapsed_ms": round((time.monotonic() - started) * 1000),
    }


async def search(query: str) -> Dict:
    key = " ".join(query.lower().split())
    if key in _cache:
        _cache.move_to_end(key)
        return dict(_cache[key], cached=True)
    result = await asyncio.to_thread(_search_sync, query)
    if not result.get("error"):
        _cache[key] = result
        if len(_cache) > CACHE_SIZE:
            _cache.popitem(last=False)
    return result
