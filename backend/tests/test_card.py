"""Card teaser generation: JSON extract/validate and /api/card/stream."""

import json

import pytest
from fastapi.testclient import TestClient

from app import card, llm, main
from app.agent import AgentResult


SAMPLE_CARD = {
    "headline": "Activation rose 3 points this week",
    "takeaway": "Trials held while paid conversions slipped slightly.",
    "sources": ["Amplitude"],
    "updated": "1h ago",
    "severity": "good",
    "viz": {
        "component": "kpi",
        "data": [{"label": "Activation", "value": 42, "unit": "%", "delta": 3, "delta_unit": "pt", "good": "up"}],
    },
}


def events(resp):
    return [json.loads(line[6:]) for line in resp.text.splitlines() if line.startswith("data: ")]


def test_extract_json_raw():
    assert card.extract_json('{"headline":"Hi","viz":null}')["headline"] == "Hi"


def test_extract_json_fenced():
    raw = 'Here you go:\n```json\n{"headline":"Hi","viz":null}\n```\n'
    assert card.extract_json(raw)["headline"] == "Hi"


def test_validate_card_ok():
    out = card.validate_card(SAMPLE_CARD)
    assert out["headline"].startswith("Activation")
    assert out["viz"]["component"] == "kpi"


def test_validate_card_requires_headline():
    with pytest.raises(ValueError, match="headline"):
        card.validate_card({"viz": None})


def test_validate_card_rejects_unknown_viz():
    with pytest.raises(ValueError, match="unknown viz"):
        card.validate_card({"headline": "x", "viz": {"component": "widget", "data": []}})


def test_fallback_card():
    fb = card.fallback_card("# Big finding\n\nDetails here.", ["Stripe"])
    assert "Big finding" in fb["headline"]
    assert fb["viz"] is None
    assert fb["sources"] == ["Stripe"]


@pytest.fixture
def client(monkeypatch):
    async def fake_stream(system, messages, extra_system=None, max_tokens=8000):
        for part in ["## Answer\n", "Activation is up."]:
            yield part

    async def fake_create(**kwargs):
        class Block:
            type = "text"
            text = json.dumps(SAMPLE_CARD)

        class Msg:
            content = [Block()]

        return Msg()

    class FakeAnthropic:
        class messages:
            create = staticmethod(fake_create)

    monkeypatch.setattr(main, "stream_text", fake_stream)
    monkeypatch.setattr(llm, "client", lambda: FakeAnthropic())
    return TestClient(main.app)


def test_card_stream_emits_delta_card_done(client):
    resp = client.post("/api/card/stream", json={"messages": [{"role": "user", "content": "How is activation?"}]})
    assert resp.status_code == 200
    evs = events(resp)
    types = [e["type"] for e in evs]
    assert "delta" in types
    assert "card" in types
    assert types[-1] == "done"
    card_ev = next(e for e in evs if e["type"] == "card")
    assert card_ev["payload"]["headline"].startswith("Activation")
    done = evs[-1]
    assert "Activation is up." in done["answer"]
    assert done["card"]["viz"]["component"] == "kpi"


def test_card_stream_requires_messages(client):
    resp = client.post("/api/card/stream", json={"messages": []})
    assert resp.status_code == 400


def test_card_stream_with_agent(client, monkeypatch):
    async def fake_gather(messages, on_step=lambda s: None, **kwargs):
        on_step({"tool": "web_search", "query": "activation"})
        return AgentResult(
            datasets=[{
                "id": "activation",
                "description": "Weekly activation",
                "fields": {"week": "string", "rate": "number"},
                "rows": [{"week": "2026-10-01", "rate": 42}],
                "sources": [{"title": "Amplitude", "url": "https://example.com"}],
            }],
            notes=[],
            steps=1,
            fallback=False,
            error=None,
        )

    monkeypatch.setattr(main.agent, "gather", fake_gather)
    resp = client.post(
        "/api/card/stream",
        json={"messages": [{"role": "user", "content": "activation?"}], "agent": True},
    )
    assert resp.status_code == 200
    types = [e["type"] for e in events(resp)]
    assert "agent_step" in types
    assert "agent" in types
    assert "card" in types
    assert types[-1] == "done"
