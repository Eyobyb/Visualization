"""Routes each turn with Jev (TypeSafe System One) before Claude writes anything.

Jev answers fixed questions with probabilities: should the answer be visual, which preset
layout fits, and does it need inputs. The answers become short hints in Claude's prompt.
Any failure falls back to rendering with no hints, so Jev is never on the critical path.
"""
import logging
import os
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional

import httpx

log = logging.getLogger(__name__)

API_URL = "https://api.typesafe.ai/v1/systemone"
DEFAULT_MODEL = "jev-latest"
TIMEOUT_S = 4.0
VISUAL_THRESHOLD = 0.5
FIRM_PROBABILITY = 0.6
FIRM_LEAD = 0.2
CLOSE_LEAD = 0.15
INTERACTIVE_THRESHOLD = 0.6

LAYOUTS = {
    "dashboard": "Several metrics, trends or rankings to review together",
    "explainer": "Mostly prose given structure: summary, facts, pros and cons, steps, sources",
    "twoway": "The assistant needs choices or approval from the user before it can continue",
    "calculator": "The user wants to try inputs and see derived numbers update",
    "split": "Dividing an amount between people or items, recalculated as values change",
    "moodboard": "Visual inspiration, mostly pictures",
    "product": "Shopping or ranking products with prices, ratings and specs",
    "weather": "Current weather or a forecast for a place",
    "comparison": "Two or three options compared, ending in a recommendation",
}

QUESTIONS = {
    "visual": {
        "type": "noul",
        "instructions": "Would charts, tables, cards or controls make the answer to this query clearer than prose alone?",
    },
    "layout": {"type": "choice", "instructions": "Which layout fits the answer to this query best?", "criteria": LAYOUTS},
    "interactive": {
        "type": "noul",
        "instructions": "Would the user benefit from inputs (sliders, toggles, choices) to explore the answer themselves?",
    },
}


@dataclass
class Route:
    visual: float = 1.0
    layout: Optional[str] = None
    interactive: float = 0.0
    hints: List[str] = field(default_factory=list)
    # Layout probabilities, for logging and the route event.
    layouts: Dict[str, float] = field(default_factory=dict)
    model: Optional[str] = None
    fallback: bool = False

    @property
    def render(self) -> bool:
        return self.visual >= VISUAL_THRESHOLD

    def event(self) -> Dict[str, Any]:
        return {"type": "route", **asdict(self)}


def summarize_bindings(bindings: Dict[str, Any]) -> Dict[str, str]:
    """One line per binding: enough for Jev to judge the data without sending all of it."""
    out = {}
    for name, value in bindings.items():
        if isinstance(value, list):
            titles = "; ".join(str(r.get("title", "")) for r in value[:5] if isinstance(r, dict))
            out[name] = f"{len(value)} rows" + (f": {titles}" if titles else "")
        elif isinstance(value, dict) and isinstance(value.get("text"), str):
            out[name] = f"text, {len(value['text'])} characters: {value['text'][:200]}"
        else:
            out[name] = type(value).__name__
    return out


def request_body(query: str, bindings: Dict[str, Any], model: Optional[str] = None) -> Dict[str, Any]:
    return {
        "model": model or os.environ.get("JEV_MODEL", DEFAULT_MODEL),
        "state": {"query": query, "data": summarize_bindings(bindings)},
        "questions": QUESTIONS,
    }


def parse_response(body: Dict[str, Any]) -> Route:
    """Turns Jev's answers into a route. Raises KeyError or TypeError on a malformed response."""
    a = body["answers"]
    visual = float(a["visual"]["noul"])
    interactive = float(a["interactive"]["noul"])
    probs = {k: float(v) for k, v in a["layout"]["probabilities"].items() if k in LAYOUTS}
    ranked = sorted(probs.items(), key=lambda kv: kv[1], reverse=True)
    hints: List[str] = []
    layout = None
    if ranked:
        (top, p1), (second, p2) = ranked[0], ranked[1] if len(ranked) > 1 else ("", 0.0)
        if p1 >= FIRM_PROBABILITY and p1 - p2 >= FIRM_LEAD:
            layout = top
            hints.append(f"Use the {top} layout: {LAYOUTS[top].lower()}.")
        elif second and p1 - p2 <= CLOSE_LEAD:
            layout = top
            hints.append(f"A {top} or {second} layout would fit; choose whichever suits the answer.")
    if interactive > INTERACTIVE_THRESHOLD:
        hints.append("Include at least one input bound to a $variable so the user can explore.")
    return Route(
        visual=visual, layout=layout, interactive=interactive, hints=hints, layouts=probs, model=body.get("model"),
    )


async def route(query: str, bindings: Dict[str, Any], client: Optional[httpx.AsyncClient] = None) -> Route:
    """Asks Jev how to answer. Never raises: problems fall back to rendering without hints."""
    key = os.environ.get("JEV_API_KEY")
    if not key:
        log.warning("JEV_API_KEY is not set; rendering without routing")
        return Route(fallback=True)
    owned = client is None
    client = client or httpx.AsyncClient(timeout=TIMEOUT_S)
    try:
        r = await client.post(API_URL, json=request_body(query, bindings), headers={"Authorization": f"Bearer {key}"})
        r.raise_for_status()
        return parse_response(r.json())
    except Exception as e:  # noqa: BLE001 - routing is optional
        log.warning("Jev routing failed, rendering without hints: %s: %s", type(e).__name__, e)
        return Route(fallback=True)
    finally:
        if owned:
            await client.aclose()
