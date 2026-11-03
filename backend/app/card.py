"""Brief Intelligence card generation from a full answer.

Takes the completed prose answer (and optional agent datasets) and asks Claude for a
single CardPayload JSON teaser. Validation is intentionally light — the frontend
`resolveCard` trims further.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple

from . import llm

VIZ_COMPONENTS = frozenset({
    "kpi", "kpi_strip", "trend", "columns", "columns_baseline", "ranked_list", "table",
    "funnel", "stacked_bars", "pie", "scatter", "radar", "gauge", "heatmap", "sankey", "treemap",
})
SEVERITIES = frozenset({"crit", "warn", "good", "info", "neutral"})

_FENCE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)


def extract_json(text: str) -> Any:
    """Parse the first JSON object from a model reply (raw or fenced)."""
    text = (text or "").strip()
    if not text:
        raise ValueError("empty card response")
    m = _FENCE.search(text)
    if m:
        text = m.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("no JSON object in card response")
    return json.loads(text[start : end + 1])


def _str_list(value: Any, limit: int) -> Optional[List[str]]:
    if not isinstance(value, list):
        return None
    out = [str(x).strip() for x in value if str(x).strip()]
    return out[:limit] or None


def validate_card(raw: Any) -> Dict[str, Any]:
    """Normalize a model object into a CardPayload-shaped dict. Raises ValueError on junk."""
    if not isinstance(raw, dict):
        raise ValueError("card must be an object")
    headline = str(raw.get("headline") or "").strip()
    if not headline:
        raise ValueError("card.headline is required")

    card: Dict[str, Any] = {"headline": headline[:160]}

    takeaway = str(raw.get("takeaway") or "").strip()
    if takeaway:
        card["takeaway"] = takeaway[:280]

    bullets = _str_list(raw.get("bullets"), 3)
    if bullets:
        card["bullets"] = bullets

    sources = _str_list(raw.get("sources"), 3)
    if sources:
        card["sources"] = sources

    updated = str(raw.get("updated") or "").strip()
    if updated:
        card["updated"] = updated[:40]

    sev = raw.get("severity")
    if isinstance(sev, str) and sev in SEVERITIES:
        card["severity"] = sev
    else:
        card["severity"] = "neutral"

    if raw.get("attention") is True:
        card["attention"] = True

    total = raw.get("total_rows")
    if isinstance(total, (int, float)) and total > 0:
        card["total_rows"] = int(total)

    viz = raw.get("viz")
    if viz is None:
        card["viz"] = None
    elif isinstance(viz, dict):
        component = viz.get("component")
        if component not in VIZ_COMPONENTS:
            raise ValueError(f"unknown viz component: {component!r}")
        card["viz"] = viz
    else:
        raise ValueError("card.viz must be an object or null")

    return card


def fallback_card(answer: str, sources: Optional[List[str]] = None) -> Dict[str, Any]:
    """Text-only teaser when card generation fails."""
    line = next((ln.strip(" #*-") for ln in answer.splitlines() if ln.strip()), "Open the full answer")
    card: Dict[str, Any] = {
        "headline": line[:120] or "Open the full answer",
        "takeaway": "Card generation fell back to text — ask about this to read the full response.",
        "severity": "info",
        "viz": None,
    }
    if sources:
        card["sources"] = sources[:3]
    return card


def datasets_brief(datasets: List[Dict[str, Any]]) -> str:
    """Compact dataset summary for the card prompt."""
    if not datasets:
        return ""
    parts = []
    for d in datasets[:4]:
        rows = d.get("rows") or []
        sample = rows[:3]
        parts.append(
            f"- `{d.get('id')}`: {d.get('description', '')}\n"
            f"  fields: {json.dumps(d.get('fields') or {}, ensure_ascii=False)}\n"
            f"  sample rows ({len(rows)} total): {json.dumps(sample, ensure_ascii=False)}"
        )
    return "## Datasets available\n\n" + "\n".join(parts)


async def generate_card(
    *,
    system: str,
    question: str,
    answer: str,
    datasets: Optional[List[Dict[str, Any]]] = None,
    max_tokens: int = 2500,
) -> Tuple[Dict[str, Any], Optional[str]]:
    """Ask Claude for a CardPayload. Returns `(card, error)` — always a usable card."""
    extra = (
        f"## User question\n\n{question.strip()}\n\n"
        f"## Full answer (compress into a teaser card)\n\n{answer.strip()}\n\n"
        + datasets_brief(datasets or [])
    )
    try:
        msg = await llm.client().messages.create(
            model=os.environ.get("ANTHROPIC_MODEL", llm.DEFAULT_MODEL),
            max_tokens=max_tokens,
            system=[
                {"type": "text", "text": system, "cache_control": {"type": "ephemeral"}},
                {"type": "text", "text": extra},
            ],
            messages=[{"role": "user", "content": "Emit the card JSON now."}],
        )
        text = "".join(b.text for b in msg.content if getattr(b, "type", None) == "text")
        card = validate_card(extract_json(text))
        return card, None
    except Exception as e:  # never fail the turn on card shape
        sources = None
        if datasets:
            names = []
            for d in datasets:
                for s in d.get("sources") or []:
                    if isinstance(s, dict) and s.get("title"):
                        names.append(str(s["title"]))
            sources = names or None
        return fallback_card(answer, sources), str(e)
