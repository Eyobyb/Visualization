"""The data agent: tool loop, validation and the page fetcher, with Claude, search and DNS faked."""
import asyncio
import json
from types import SimpleNamespace

import httpx
import pytest

from app import agent, llm, search


def run(coro):
    return asyncio.run(coro)


def tool(name, args, id=None):
    return SimpleNamespace(type="tool_use", id=id or f"tu_{name}", name=name, input=args)


def reply(*blocks):
    return SimpleNamespace(content=list(blocks), stop_reason="tool_use")


class FakeClaude:
    """Returns scripted replies in order and records each request."""

    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = []
        self.messages = self

    async def create(self, **kw):
        self.calls.append(kw)
        r = self.replies.pop(0)
        if isinstance(r, Exception):
            raise r
        if callable(r):
            return await r()
        return r


LAPTOPS = {
    "id": "laptops",
    "description": "Developer laptops, price in USD, October 2026",
    "fields": {"model": "string", "price_usd": "number", "ram_gb": "number", "linux": "bool"},
    "rows": [
        {"model": "MacBook Air M4", "price_usd": "$1,299", "ram_gb": 16, "linux": "no"},
        {"model": "ThinkPad X1", "price_usd": 1899, "ram_gb": 32, "linux": True},
        {"model": "Bad row", "price_usd": "lots", "ram_gb": 8, "linux": True},
    ],
    "sources": [{"title": "Review", "url": "https://reviews.example/laptops"}],
}


def public(host):
    async def resolve(h):
        return ["93.184.216.34"]
    return resolve


@pytest.fixture
def fake_search(monkeypatch):
    async def s(query):
        return {"query": query, "results": [{"id": "r1", "title": "Laptops", "url": "https://reviews.example/laptops", "snippet": "x"}]}
    monkeypatch.setattr(search, "search", s)


def use(monkeypatch, replies):
    fake = FakeClaude(replies)
    monkeypatch.setattr(llm, "client", lambda: fake)
    return fake


QUESTION = [{"role": "user", "content": "best laptops for developers"}]


# Loop

def test_runs_tools_then_submits(monkeypatch, fake_search):
    fake = use(monkeypatch, [
        reply(SimpleNamespace(type="text", text="Searching."), tool("web_search", {"query": "dev laptops 2026"})),
        reply(tool("submit_data", {"datasets": [LAPTOPS], "notes": "Prices from one review."})),
    ])
    steps = []
    r = run(agent.gather(QUESTION, steps.append))
    assert not r.fallback and r.usable and r.steps == 1
    assert steps == [{"tool": "web_search", "query": "dev laptops 2026"}]
    ds = r.datasets[0]
    assert ds["id"] == "laptops" and len(ds["rows"]) == 2
    assert ds["rows"][0] == {"model": "MacBook Air M4", "price_usd": 1299, "ram_gb": 16, "linux": False}
    assert r.results == [{"id": "s1", "title": "Review", "url": "https://reviews.example/laptops", "snippet": "Source for data.laptops"}]
    assert r.bindings() == {"laptops": ds["rows"], "results": r.results}
    assert "Prices from one review." in r.notes and any("Dropped 1 row(s) of laptops" in n for n in r.notes)

    second = fake.calls[1]["messages"]
    assert second[1]["role"] == "assistant" and second[1]["content"][1]["name"] == "web_search"
    result = second[2]["content"][0]
    assert result["type"] == "tool_result" and result["tool_use_id"] == "tu_web_search"
    assert result["content"].startswith(agent.UNTRUSTED) and "reviews.example" in result["content"]
    assert [t["name"] for t in fake.calls[0]["tools"]] == ["web_search", "fetch_page", "search_maps", "submit_data"]
    assert "tool_choice" not in fake.calls[0]
    assert "{{TODAY}}" not in fake.calls[0]["system"][0]["text"]


def test_empty_text_blocks_are_not_sent_back(monkeypatch, fake_search):
    fake = use(monkeypatch, [
        reply(SimpleNamespace(type="text", text=""), tool("web_search", {"query": "a"}), SimpleNamespace(type="text", text="  ")),
        reply(tool("submit_data", {"datasets": []})),
    ])
    run(agent.gather(QUESTION))
    assert [b["type"] for b in fake.calls[1]["messages"][1]["content"]] == ["tool_use"]


def test_tool_errors_go_back_to_the_model(monkeypatch, fake_search):
    fake = use(monkeypatch, [
        reply(tool("fetch_page", {"url": "http://127.0.0.1/admin"})),
        reply(tool("submit_data", {"datasets": []})),
    ])
    r = run(agent.gather(QUESTION))
    err = fake.calls[1]["messages"][2]["content"][0]
    assert err["is_error"] and "not a public address" in err["content"]
    assert r.fallback and r.error == "no usable datasets"


def test_last_round_asks_to_submit_then_falls_back(monkeypatch, fake_search):
    fake = use(monkeypatch, [reply(tool("web_search", {"query": f"q{i}"}, id=f"t{i}")) for i in range(agent.MAX_STEPS)])
    r = run(agent.gather(QUESTION))
    assert r.fallback and r.steps == agent.MAX_STEPS - 1 and "without submitting" in r.error
    last = fake.calls[-1]
    assert [t["name"] for t in last["tools"]] == ["submit_data"]
    assert last["messages"][-1]["content"][-1] == {"type": "text", "text": agent.SUBMIT_NOW}
    assert all(t["name"] != "submit_data" or len(c["tools"]) == 4 for c in fake.calls[:-1] for t in c["tools"])


def test_running_short_of_time_asks_to_submit(monkeypatch, fake_search):
    fake = use(monkeypatch, [reply(tool("submit_data", {"datasets": [LAPTOPS]}))])
    r = run(agent.gather(QUESTION, submit_after=0.0))
    first = fake.calls[0]
    assert [t["name"] for t in first["tools"]] == ["submit_data"]
    assert first["messages"] == [{"role": "user", "content": [
        {"type": "text", "text": QUESTION[0]["content"]}, {"type": "text", "text": agent.SUBMIT_NOW},
    ]}]
    assert r.usable


def test_timeout_reports_steps_taken(monkeypatch, fake_search):
    async def slow():
        await asyncio.sleep(5)
    use(monkeypatch, [reply(tool("web_search", {"query": "a"}), tool("web_search", {"query": "b"}, id="t2")), slow])
    r = run(agent.gather(QUESTION, deadline=0.2, submit_after=10))
    assert r.fallback and r.steps == 2 and "out of time" in r.error


def test_stopping_without_tools_falls_back(monkeypatch):
    use(monkeypatch, [reply(SimpleNamespace(type="text", text="I cannot help."))])
    r = run(agent.gather(QUESTION))
    assert r.fallback and "without submitting" in r.error


def test_claude_error_falls_back(monkeypatch):
    use(monkeypatch, [RuntimeError("overloaded")])
    r = run(agent.gather(QUESTION))
    assert r.fallback and r.error == "RuntimeError: overloaded"


def test_deadline_falls_back(monkeypatch):
    async def slow():
        await asyncio.sleep(5)
    use(monkeypatch, [slow])
    r = run(agent.gather(QUESTION, deadline=0.05))
    assert r.fallback and "out of time" in r.error


def test_history_keeps_short_assistant_turns(monkeypatch):
    fake = use(monkeypatch, [reply(tool("submit_data", {"datasets": []}))])
    history = [
        {"role": "user", "content": "first"},
        {"role": "assistant", "content": "x" * 5000},
        {"role": "user", "content": "second"},
    ]
    run(agent.gather(history))
    sent = fake.calls[0]["messages"]
    assert [m["role"] for m in sent] == ["user", "assistant", "user"]
    assert len(sent[1]["content"]) == agent.HISTORY_CHARS and sent[2]["content"] == "second"


# Validation

def test_validation_drops_bad_datasets():
    bad = [
        {**LAPTOPS, "id": "results"},
        {**LAPTOPS, "id": "!!!"},
        {**LAPTOPS, "id": "nosource", "sources": [{"url": "javascript:alert(1)"}]},
        {**LAPTOPS, "id": "nofields", "fields": {"x": "money"}},
        {**LAPTOPS, "id": "norows", "rows": [{"model": None, "price_usd": None}]},
        LAPTOPS,
        {**LAPTOPS},
    ]
    r = agent.validate({"datasets": bad})
    assert [d["id"] for d in r.datasets] == ["laptops"]
    notes = " ".join(r.notes)
    for frag in ("results", "!!!", "nosource", "nofields", "norows", "second dataset named laptops"):
        assert frag in notes


def test_validation_accepts_stringified_arrays_and_bare_urls():
    ds = {
        **LAPTOPS,
        "fields": json.dumps(LAPTOPS["fields"]),
        "rows": json.dumps(LAPTOPS["rows"]),
        "sources": "https://reviews.example/laptops",
    }
    r = agent.validate({"datasets": json.dumps([ds, {**LAPTOPS, "id": "listed", "sources": ["https://a.example/x"]}])})
    assert [d["id"] for d in r.datasets] == ["laptops", "listed"]
    assert r.datasets[0]["rows"] == agent.validate({"datasets": [LAPTOPS]}).datasets[0]["rows"]
    assert r.datasets[1]["sources"] == [{"title": "a.example", "url": "https://a.example/x"}]


def test_validation_renames_long_or_odd_names():
    ds = {
        **LAPTOPS, "id": "Coffee Export Revenue By Fiscal Year (USD)",
        "fields": {"Fiscal year": "string", "2024 value": "number"},
        "rows": [{"Fiscal year": "2024/25", "2024 value": "2.65"}],
    }
    r = agent.validate({"datasets": [ds]})
    d = r.datasets[0]
    assert d["id"] == "coffee_export_revenue_by_fiscal" and len(d["id"]) == 31
    assert d["fields"] == {"Fiscal_year": "string", "f_2024_value": "number"}
    assert d["rows"] == [{"Fiscal_year": "2024/25", "f_2024_value": 2.65}]
    assert "Renamed dataset Coffee Export Revenue By Fiscal Year (USD) to coffee_export_revenue_by_fiscal." in r.notes


def test_validation_coerces_types():
    ds = {
        "id": "series", "description": "d", "sources": [{"url": "https://a.example"}],
        "fields": {"year": "date", "share": "number", "ok": "bool", "label": "string"},
        "rows": [
            {"year": 2024, "share": "0.12", "ok": "Yes", "label": 7, "extra": "dropped"},
            {"year": "2025-01", "share": "1e3", "ok": None, "label": ""},
            {"year": "", "share": 1, "ok": True, "label": "x"},
            {"year": "2026", "share": True, "ok": True, "label": "x"},
            {"year": "2026", "share": float("nan"), "ok": True, "label": "x"},
        ],
    }
    r = agent.validate({"datasets": [ds]})
    assert r.datasets[0]["rows"] == [
        {"year": "2024", "share": 0.12, "ok": True, "label": "7"},
        {"year": "2025-01", "share": 1000.0, "ok": None, "label": ""},
    ]
    assert r.datasets[0]["sources"] == [{"title": "a.example", "url": "https://a.example"}]
    assert "Dropped 3 row(s)" in " ".join(r.notes)


def test_validation_caps_datasets_and_rows():
    many = [{**LAPTOPS, "id": f"d{i}", "rows": [LAPTOPS["rows"][1]] * 500} for i in range(9)]
    r = agent.validate({"datasets": many})
    assert len(r.datasets) == agent.MAX_DATASETS
    assert all(len(d["rows"]) == agent.MAX_ROWS for d in r.datasets)
    assert len(r.results) == 1 and r.results[0]["snippet"].count("data.") == agent.MAX_DATASETS


def test_validation_rejects_malformed_input():
    assert agent.validate({"rows": []}).fallback
    assert agent.validate("nope").fallback


# Pages

@pytest.mark.parametrize("url", [
    "http://localhost/x", "http://127.0.0.1/", "http://10.0.0.5/", "http://169.254.169.254/latest/meta-data",
    "http://[::1]/", "http://192.168.1.1/", "ftp://example.com/", "file:///etc/passwd", "http://printer.local/",
])
def test_blocks_non_public_urls(url):
    with pytest.raises(agent.BlockedUrl):
        run(agent.check_url(url, public(None)))


def test_blocks_hosts_resolving_to_private_addresses():
    async def private(h):
        return ["93.184.216.34", "10.1.2.3"]
    with pytest.raises(agent.BlockedUrl):
        run(agent.check_url("https://sneaky.example/", private))
    run(agent.check_url("https://ok.example/", public(None)))


PAGE = """<html><head><title>Best laptops</title><style>.x{}</style><script>alert(1)</script></head>
<body><nav>Home | Shop</nav><h1>Top picks</h1><p>Prices as of October.</p>
<table><tr><th>Model</th><th>Price</th></tr><tr><td>MacBook Air</td><td>$1,299</td></tr></table></body></html>"""


def test_html_to_text_keeps_tables_and_drops_scripts():
    title, text = agent.html_to_text(PAGE)
    assert title == "Best laptops"
    assert "alert" not in text and ".x{}" not in text and "Home" not in text
    assert "Top picks" in text and "Model | Price" in text and "MacBook Air | $1,299" in text


def fetch(handler, url):
    agent._pages.clear()

    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
            return await agent.Tools(c, public(None)).fetch_page(url)
    return run(go())


def test_fetch_page_reads_html():
    out = fetch(lambda r: httpx.Response(200, html=PAGE), "https://reviews.example/laptops")
    assert out.startswith(agent.UNTRUSTED) and 'title="Best laptops"' in out and "MacBook Air | $1,299" in out


def test_fetch_page_checks_every_redirect():
    def handler(request):
        if request.url.host == "reviews.example":
            return httpx.Response(302, headers={"location": "http://127.0.0.1/secret"})
        return httpx.Response(200, text="secret")
    with pytest.raises(agent.BlockedUrl):
        fetch(handler, "https://reviews.example/go")


def test_fetch_page_follows_public_redirects_and_truncates():
    def handler(request):
        if request.url.path == "/old":
            return httpx.Response(301, headers={"location": "/new"})
        return httpx.Response(200, text="y" * (agent.PAGE_CHARS + 50), headers={"content-type": "text/plain"})
    out = fetch(handler, "https://reviews.example/old")
    assert 'url="https://reviews.example/new"' in out and "[truncated]" in out


def test_fetch_page_rejects_binary():
    with pytest.raises(ValueError, match="cannot read application/pdf"):
        fetch(lambda r: httpx.Response(200, content=b"%PDF", headers={"content-type": "application/pdf"}), "https://a.example/x.pdf")
