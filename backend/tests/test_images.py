"""AsyncImage resolution: Bing search parsing, Jev checks, choosing, and image events in the viz stream."""
import asyncio
import html
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app import images, jev, llm, main, viz

JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def bing_page(items):
    """Bing results HTML with one `m` attribute per (title, image, thumbnail) item."""
    tags = []
    for title, image, thumb in items:
        meta = {"t": title, "murl": image, "turl": thumb, "purl": "https://page.example/" + title}
        tags.append(f'<a class="iusc" m="{html.escape(json.dumps(meta), quote=True)}" href="#"></a>')
    return "<div>" + "".join(tags) + "</div>"


ITEMS = [(f"img{i}", f"https://img.example/{i}.jpg", f"https://tse.example/th?id={i}") for i in range(5)]


def transport(scores=None, jev_status=200, thumbs=None, seen=None):
    """Fakes Bing search, thumbnails and Jev. `scores` maps the candidate index to Jev's answer."""
    def handler(request: httpx.Request):
        url = str(request.url)
        if seen is not None:
            seen.append(request)
        if request.url.host == "www.bing.com":
            return httpx.Response(200, text=bing_page(ITEMS))
        if request.url.host == "tse.example":
            i = int(request.url.params["id"])
            return httpx.Response(200, content=(thumbs or {}).get(i, JPEG))
        if url == jev.API_URL:
            if jev_status != 200:
                return httpx.Response(jev_status, json={})
            n = len(json.loads(request.content)["questions"])
            answers = {f"c{i}": {"type": "noul", "noul": (scores or {}).get(i, 0.0)} for i in range(n)}
            return httpx.Response(200, json={"model": "jev-1.13.0", "answers": answers, "usage": {}})
        return httpx.Response(404)
    return httpx.MockTransport(handler)


def resolve(t, *jobs):
    async def run():
        async with httpx.AsyncClient(transport=t) as c:
            r = images.ImageResolver(client=c)
            r.start(list(jobs))
            out = await r.drain(5)
            await r.close()
            return {x.key: x for x in out}
    return asyncio.run(run())


@pytest.fixture
def jev_key(monkeypatch):
    monkeypatch.setenv("JEV_API_KEY", "test-key")


def test_parse_results_in_rank_order():
    page = bing_page(ITEMS[:2]) + '<a m="{not json}"></a><a m="{&quot;t&quot;: &quot;no urls&quot;}"></a>'
    got = images.parse_results(page)
    assert [(c.title, c.image, c.thumbnail) for c in got] == ITEMS[:2]
    assert got[0].page == "https://page.example/img0"


def test_image_format():
    assert images.image_format(JPEG) == "jpg"
    assert images.image_format(PNG) == "png"
    assert images.image_format(b"RIFF....WEBP") is None


def test_check_body_one_question_per_image():
    body = images.check_body("jebena on charcoal", [("jpg", JPEG), ("png", PNG)], model="jev-latest")
    assert body["model"] == "jev-latest" and list(body["questions"]) == ["c0", "c1"]
    for (ph, asset), q in zip(body["assets"].items(), body["questions"].values()):
        assert q["type"] == "noul" and ph in q["instructions"] and "jebena on charcoal" in q["instructions"]
    assert [a["format"] for a in body["assets"].values()] == ["jpg", "png"]


def test_choose():
    cands = [images.Candidate(t, i, th, "") for t, i, th in ITEMS[:3]]
    assert images.choose(cands, [0.2, 0.9, 0.7], set()) == (1, True)
    assert images.choose(cands, [0.8, 0.8, 0.1], set()) == (0, True)
    assert images.choose(cands, [0.2, 0.9, 0.7], {ITEMS[1][1]}) == (2, True)
    assert images.choose(cands, [0.1, 0.3, 0.49], set()) == (None, True)
    assert images.choose(cands, None, {ITEMS[0][1]}) == (1, False)
    assert images.choose(cands, None, {c.image for c in cands}) == (None, False)


def test_resolves_best_verified_candidate(jev_key):
    seen = []
    got = resolve(transport(scores={0: 0.1, 2: 0.85, 3: 0.6}, seen=seen), ("photo", "woven mesob basket"))["photo"]
    assert got.candidate.image == ITEMS[2][1] and got.verified and got.score == 0.85
    ev = got.event()
    assert ev["type"] == "image" and ev["url"] == ITEMS[2][1] and ev["thumbnail"] == ITEMS[2][2]

    jev_calls = [r for r in seen if str(r.url) == jev.API_URL]
    assert len(jev_calls) == 1
    assert jev_calls[0].headers["TypeSafe-Danger-Zone-Images"] == "true"
    assert jev_calls[0].headers["Authorization"] == "Bearer test-key"
    assert len(json.loads(jev_calls[0].content)["assets"]) == images.CANDIDATES
    thumbs = [r for r in seen if r.url.host == "tse.example"]
    assert all(r.url.params["w"] == str(images.CHECK_SIZE) and r.url.params["c"] == "7" for r in thumbs)


def test_rejects_when_nothing_matches(jev_key):
    got = resolve(transport(scores={0: 0.2, 1: 0.4}), ("photo", "red sports car"))["photo"]
    assert got.candidate is None and got.verified
    assert got.event()["url"] is None


def test_unverified_first_candidate_when_jev_fails(jev_key):
    got = resolve(transport(jev_status=500), ("photo", "coffee pot"))["photo"]
    assert got.candidate.image == ITEMS[0][1] and not got.verified and got.score is None


def test_unverified_without_key(monkeypatch):
    monkeypatch.delenv("JEV_API_KEY", raising=False)
    seen = []
    got = resolve(transport(seen=seen), ("photo", "coffee pot"))["photo"]
    assert got.candidate.image == ITEMS[0][1] and not got.verified
    assert not [r for r in seen if str(r.url) == jev.API_URL]


def test_skips_unsupported_thumbnails(jev_key):
    got = resolve(transport(scores={0: 0.9, 1: 0.9}, thumbs={0: b"GIF89a"}), ("photo", "coffee pot"))["photo"]
    assert got.candidate.image == ITEMS[1][1]


def test_images_in_one_turn_are_distinct(jev_key):
    got = resolve(transport(scores={0: 0.9, 1: 0.8, 2: 0.7}), ("photos.0", "coffee pot"), ("photos.1", "coffee pot"))
    assert {got["photos.0"].candidate.image, got["photos.1"].candidate.image} == {ITEMS[0][1], ITEMS[1][1]}


def test_search_failure_resolves_to_nothing(jev_key):
    t = httpx.MockTransport(lambda r: httpx.Response(503))
    got = resolve(t, ("photo", "coffee pot"))["photo"]
    assert got.candidate is None and not got.verified


PROGRAM = """root = Col([title, photo, photos])
title = Title("Coffee ceremony")
photo = AsyncImage("traditional jebena coffee pot on charcoal", caption: "Jebena")
photos = AsyncImageGroup(["roasted coffee beans in a clay dish", "woven mesob basket"])
"""


def stream(monkeypatch, resolve_fn):
    async def stream_text(system, messages, extra_system=None, max_tokens=8000):
        for line in PROGRAM.splitlines(keepends=True):
            yield line
            await asyncio.sleep(0.01)
    monkeypatch.setattr(jev, "route", lambda *a, **k: _route())
    monkeypatch.setattr(llm, "stream_text", stream_text)
    monkeypatch.setattr(images.ImageResolver, "resolve", resolve_fn)
    resp = TestClient(main.app).post("/api/viz/stream", json={"messages": [{"role": "user", "content": "coffee"}]})
    return [json.loads(line[6:]) for line in resp.text.splitlines() if line.startswith("data: ")]


async def _route():
    return jev.Route(visual=0.9)


def test_stream_sends_image_events_before_done(monkeypatch):
    async def fake(self, key, query):
        c = images.Candidate(query, "https://img.example/" + key, "https://tse.example/" + key, "")
        return images.Resolution(key=key, query=query, candidate=c, score=0.9, verified=True)
    ev = stream(monkeypatch, fake)
    types = [e["type"] for e in ev]
    imgs = [e for e in ev if e["type"] == "image"]
    assert types[-1] == "done" and max(types.index(t) for t in types if t == "image") < len(types) - 1
    assert sorted(e["key"] for e in imgs) == ["photo", "photos.0", "photos.1"]
    assert {e["key"]: e["query"] for e in imgs}["photos.1"] == "woven mesob basket"
    assert ev[-1]["images"] == [
        {"key": "photo", "query": "traditional jebena coffee pot on charcoal", "url": "https://img.example/photo"},
        {"key": "photos.0", "query": "roasted coffee beans in a clay dish", "url": "https://img.example/photos.0"},
        {"key": "photos.1", "query": "woven mesob basket", "url": "https://img.example/photos.1"},
    ]


def test_first_image_starts_while_program_streams(monkeypatch):
    async def fake(self, key, query):
        return images.Resolution(key=key, query=query, candidate=images.Candidate("", "u", "t", ""), verified=True)
    ev = stream(monkeypatch, fake)
    types = [e["type"] for e in ev]
    last_statement = len(types) - 1 - types[::-1].index("statement")
    assert types.index("image") < last_statement


def test_images_endpoint_streams_each_job(monkeypatch):
    async def fake(self, key, query):
        await asyncio.sleep(0.05 if key == "a" else 0)
        c = images.Candidate(query, "https://img.example/" + key, "https://tse.example/" + key, "")
        return images.Resolution(key=key, query=query, candidate=c, score=0.9, verified=True)
    monkeypatch.setattr(images.ImageResolver, "resolve", fake)
    resp = TestClient(main.app).post("/api/viz/images", json={"images": [{"key": "a", "query": "jebena"}, {"key": "b", "query": "mesob"}]})
    ev = [json.loads(line[6:]) for line in resp.text.splitlines() if line.startswith("data: ")]
    assert [(e["type"], e.get("key")) for e in ev] == [("image", "b"), ("image", "a"), ("done", None)]
    assert ev[1]["url"] == "https://img.example/a" and ev[1]["verified"]


def test_images_endpoint_times_out_slow_jobs(monkeypatch):
    monkeypatch.setattr(viz, "IMAGE_DEADLINE_S", 0.05)

    async def slow(self, key, query):
        await asyncio.sleep(10)
    monkeypatch.setattr(images.ImageResolver, "resolve", slow)
    resp = TestClient(main.app).post("/api/viz/images", json={"images": [{"key": "a", "query": "jebena"}]})
    ev = [json.loads(line[6:]) for line in resp.text.splitlines() if line.startswith("data: ")]
    assert ev == [images.Resolution(key="a", query="jebena").event(), {"type": "done"}]


def test_images_endpoint_limits_requests():
    c = TestClient(main.app)
    assert c.post("/api/viz/images", json={"images": [{"key": str(i), "query": "x"} for i in range(13)]}).status_code == 422
    assert c.post("/api/viz/images", json={"images": [{"key": "a", "query": ""}]}).status_code == 422


def test_slow_images_resolve_to_nothing(monkeypatch):
    monkeypatch.setattr(viz, "IMAGE_DEADLINE_S", 0.05)

    async def slow(self, key, query):
        await asyncio.sleep(10)
    ev = stream(monkeypatch, slow)
    imgs = [e for e in ev if e["type"] == "image"]
    assert len(imgs) == 3 and all(e["url"] is None for e in imgs)
    assert all(i["url"] is None for i in ev[-1]["images"])
