"""The /api/viz/stream endpoint and the Jev router, with Claude and Jev faked."""
import asyncio
import json
import os
import random

import httpx
import pytest
from fastapi.testclient import TestClient

from app import jev, llm, main
from app.vizlang import compile_program, split_statements

PROGRAM = """root = Col([title, summary, picks, sources])
title = Title("Telegram or a website?", size: "lg")
summary = Summary("Keep Telegram and add a simple site.", points: ["Telegram brings most orders", "A site helps new buyers"])
$channel = "Telegram"
picks = SegmentedControl($channel, options: ["Telegram", "Website"])
// comment lines are not sent
sources = Sources(data.results)
"""

SEARCH = {
    "query": "telegram vs website",
    "markdown": "## results\n",
    "results": [
        {"id": "r1", "title": "Selling on Telegram", "url": "https://a.example", "snippet": "Chat commerce"},
        {"id": "r2", "title": "Why a website", "url": "https://b.example", "snippet": "Catalogues"},
    ],
}


def fake_stream(text, seed=0):
    async def stream_text(system, messages, extra_system=None, max_tokens=8000):
        rng = random.Random(seed)
        i = 0
        while i < len(text):
            n = rng.randint(1, 9)
            yield text[i:i + n]
            i += n
    return stream_text


def fake_route(route):
    async def r(query, bindings, client=None):
        return route
    return r


def events(resp):
    return [json.loads(line[6:]) for line in resp.text.splitlines() if line.startswith("data: ")]


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(jev, "route", fake_route(jev.Route(visual=0.9, hints=["Use the explainer layout."], layout="explainer")))
    return TestClient(main.app)


def post(client, **body):
    body.setdefault("messages", [{"role": "user", "content": "Telegram or a website for my coffee shop?"}])
    return client.post("/api/viz/stream", json=body)


def test_streams_statements_then_done(client, monkeypatch):
    monkeypatch.setattr(llm, "stream_text", fake_stream(PROGRAM))
    ev = events(post(client, search=SEARCH))
    types = [e["type"] for e in ev]
    assert types[:2] == ["route", "data"] and types[-1] == "done"
    assert set(types[2:-1]) == {"statement"}
    assert ev[1]["bindings"]["results"][0] == SEARCH["results"][0]

    stmts = [e for e in ev if e["type"] == "statement"]
    expected = [p for p in split_statements(PROGRAM) if not p.text.startswith("//")]
    assert [(s["text"], s["line"]) for s in stmts] == [(p.text, p.line) for p in expected]
    assert [s["name"] for s in stmts] == ["root", "title", "summary", "$channel", "picks", "sources"]
    assert stmts[-1]["refs"] == ["results"]

    final = compile_program(PROGRAM, data=ev[1]["bindings"])
    assert ev[-1]["diagnostics"] == [{k: d[k] for k in ("code", "msg", "where")} for d in final.diagnostics] == []
    assert ev[-1]["statements"] == 6
    assert "# Telegram or a website?" in ev[-1]["markdown"]


def test_reports_problems_while_streaming(client, monkeypatch):
    src = 'root = Col([a, b])\na = Sparkle()\nb = Text("ok", glow: true)\n'
    monkeypatch.setattr(llm, "stream_text", fake_stream(src))
    ev = events(post(client))
    types = [e["type"] for e in ev]
    diags = [e for e in ev if e["type"] == "diagnostic"]
    assert [d["code"] for d in diags] == ["unknown_component", "unknown_prop"]
    assert types.index("diagnostic") < types.index("done")
    assert ev[1]["bindings"] == {}


def test_unparseable_and_unterminated_statements(client, monkeypatch):
    src = 'root = Col([a])\na = Text("x" "y")\nb = Col(['
    monkeypatch.setattr(llm, "stream_text", fake_stream(src))
    ev = events(post(client))
    stmts = [e for e in ev if e["type"] == "statement"]
    assert [s["name"] for s in stmts] == ["root", None]
    assert [d["code"] for d in ev[-1]["diagnostics"]] == ["parse_error", "unterminated_statement", "unresolved_ref"]


def test_prose_when_jev_says_text(monkeypatch):
    monkeypatch.setattr(jev, "route", fake_route(jev.Route(visual=0.2)))
    monkeypatch.setattr(main, "stream_text", fake_stream("Just use Telegram for now."))
    ev = events(post(TestClient(main.app)))
    assert [e["type"] for e in ev][0] == "route" and ev[-1]["type"] == "done"
    assert {e["type"] for e in ev[1:-1]} == {"delta"}
    assert "".join(e["text"] for e in ev if e["type"] == "delta") == "Just use Telegram for now."


def test_claude_error_becomes_error_event(client, monkeypatch):
    async def boom(*a, **k):
        raise RuntimeError("overloaded")
        yield ""  # pragma: no cover
    monkeypatch.setattr(llm, "stream_text", boom)
    assert events(post(client))[-1] == {"type": "error", "message": "overloaded"}


def test_route_hints_reach_claude(client, monkeypatch):
    seen = {}

    async def capture(system, messages, extra_system=None, max_tokens=8000):
        seen["system"], seen["extra"] = system, extra_system
        yield 'root = Text("hi")\n'
    monkeypatch.setattr(llm, "stream_text", capture)
    post(client, search=SEARCH)
    assert "{{CATALOG}}" not in seen["system"] and "#### Chart(" in seen["system"]
    assert "### `data.results`" in seen["extra"] and "https://a.example" in seen["extra"]
    assert "Use the explainer layout." in seen["extra"] and "Text-heavy answer" in seen["extra"]


# Router

def answers(visual=0.89, interactive=0.3, **layouts):
    probs = {k: 0.0 for k in jev.LAYOUTS}
    probs.update(layouts)
    top = max(probs, key=probs.get)
    return {
        "model": "jev-1.13.0",
        "answers": {
            "visual": {"type": "noul", "noul": visual},
            "interactive": {"type": "noul", "noul": interactive},
            "layout": {"type": "choice", "choice": top, "confidence": 0.5, "probabilities": probs},
        },
        "usage": {"input_tokens": 1, "output_tokens": 1},
    }


def test_request_body_summarizes_bindings():
    body = jev.request_body("q", {"results": SEARCH["results"], "context": {"text": "x" * 5000}}, model="jev-latest")
    assert body["model"] == "jev-latest"
    assert set(body["questions"]) == {"visual", "layout", "interactive"}
    assert body["questions"]["layout"]["criteria"] == jev.LAYOUTS
    assert body["state"]["data"]["results"].startswith("2 rows: Selling on Telegram; Why a website")
    assert len(body["state"]["data"]["context"]) < 300


def test_firm_layout_hint():
    r = jev.parse_response(answers(dashboard=0.8, twoway=0.1, interactive=0.7))
    assert r.layout == "dashboard" and r.render and r.model == "jev-1.13.0"
    assert r.hints[0].startswith("Use the dashboard layout")
    assert "$variable" in r.hints[1]


def test_close_layouts_become_options():
    r = jev.parse_response(answers(dashboard=0.48, explainer=0.47))
    assert r.layout == "dashboard"
    assert r.hints == ["A dashboard or explainer layout would fit; choose whichever suits the answer."]


def test_unclear_layout_gives_no_hint():
    r = jev.parse_response(answers(dashboard=0.55, explainer=0.3, calculator=0.15))
    assert r.layout is None and r.hints == []


def test_low_visual_means_prose():
    assert not jev.parse_response(answers(visual=0.2, dashboard=0.9)).render


def run(coro):
    return asyncio.run(coro)


def test_route_calls_api(monkeypatch):
    monkeypatch.setenv("JEV_API_KEY", "k")
    seen = {}

    def handler(request):
        seen["auth"] = request.headers["authorization"]
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json=answers(dashboard=0.9))

    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
            return await jev.route("q", {}, client=c)
    r = run(go())
    assert seen["auth"] == "Bearer k" and seen["body"]["state"]["query"] == "q"
    assert r.layout == "dashboard" and not r.fallback


@pytest.mark.parametrize("failure", ["timeout", "status", "malformed"])
def test_route_falls_back(monkeypatch, failure):
    monkeypatch.setenv("JEV_API_KEY", "k")

    def handler(request):
        if failure == "timeout":
            raise httpx.ReadTimeout("slow", request=request)
        if failure == "status":
            return httpx.Response(401, json={"detail": "bad key"})
        return httpx.Response(200, json={"answers": {}})

    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
            return await jev.route("q", {}, client=c)
    r = run(go())
    assert r.fallback and r.render and r.hints == []


def test_route_without_key(monkeypatch):
    monkeypatch.delenv("JEV_API_KEY", raising=False)
    assert run(jev.route("q", {})).fallback


@pytest.mark.skipif(os.environ.get("JEV_LIVE") != "1", reason="set JEV_LIVE=1 to call the real Jev API")
def test_live_jev():
    r = run(jev.route("How did Q3 sales go by region?", {"results": SEARCH["results"]}))
    assert not r.fallback and 0 <= r.visual <= 1 and set(r.layouts) <= set(jev.LAYOUTS)
