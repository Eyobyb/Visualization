"""PlaceResolver against a fake Nominatim."""
import asyncio
import time

import httpx
import pytest

from app import geo

TOMOCA = [{"lat": "9.030898", "lon": "38.7508324", "display_name": "Tomoca Coffee, Wawel Street, Addis Ababa"}]


@pytest.fixture(autouse=True)
def fresh_cache():
    geo._cache.clear()
    geo._gate.last = None
    yield
    geo._cache.clear()


def fake_nominatim(answers, calls):
    def handler(request: httpx.Request) -> httpx.Response:
        q = request.url.params["q"]
        calls.append(q)
        assert request.url.params["format"] == "jsonv2" and request.url.params["limit"] == "1"
        a = answers.get(q, [])
        return a if isinstance(a, httpx.Response) else httpx.Response(200, json=a)
    return handler


def resolver(answers, calls, interval=0.0):
    client = httpx.AsyncClient(transport=httpx.MockTransport(fake_nominatim(answers, calls)))
    return geo.PlaceResolver(client=client, interval=interval)


def run(coro):
    return asyncio.run(coro)


def test_parse_result():
    loc = geo.parse_result(TOMOCA)
    assert (loc.lat, loc.lng) == (9.030898, 38.7508324) and loc.label.startswith("Tomoca")
    assert geo.parse_result([]) is None
    assert geo.parse_result([{"lat": "x", "lon": "1"}]) is None
    assert geo.parse_result({"error": "nope"}) is None


def test_variants_shorten_long_addresses_but_never_to_an_area():
    assert geo.variants("Dukamo, Mafi City Center Mall, Cameroon St, Bole, Addis Ababa, Ethiopia") == [
        "Dukamo, Mafi City Center Mall, Cameroon St, Bole, Addis Ababa, Ethiopia",
        "Dukamo, Bole, Addis Ababa, Ethiopia",
        "Mafi City Center Mall, Addis Ababa, Ethiopia",
        "Cameroon St, Bole, Addis Ababa, Ethiopia",
    ]
    assert geo.variants("Akoo Coffee, Bole, Addis Ababa, Ethiopia") == ["Akoo Coffee, Bole, Addis Ababa, Ethiopia"]


def test_lookup_falls_back_through_variants_and_caches_the_answer():
    async def go():
        calls = []
        long = "Dukamo, Mafi City Center Mall, Cameroon St, Bole, Addis Ababa, Ethiopia"
        r = resolver({"Mafi City Center Mall, Addis Ababa, Ethiopia": TOMOCA}, calls)
        first = await r.lookup(long)
        again = await r.lookup(long)
        await r.close()
        return calls, first, again

    calls, first, again = run(go())
    assert calls == [
        "Dukamo, Mafi City Center Mall, Cameroon St, Bole, Addis Ababa, Ethiopia",
        "Dukamo, Bole, Addis Ababa, Ethiopia",
        "Mafi City Center Mall, Addis Ababa, Ethiopia",
    ]
    assert first == again and first.lat == 9.030898


def test_found_and_missing_events():
    async def go():
        calls = []
        r = resolver({"Tomoca, Addis Ababa": TOMOCA}, calls)
        r.start([("map.0", "Tomoca, Addis Ababa"), ("map.1", "Nowhere at all")])
        out = await r.drain(2)
        await r.close()
        return {x.key: x.event() for x in out}

    ev = run(go())
    assert ev["map.0"] == {
        "type": "place", "key": "map.0", "query": "Tomoca, Addis Ababa", "lat": 9.030898, "lng": 38.7508324,
        "label": "Tomoca Coffee, Wawel Street, Addis Ababa", "found": True,
    }
    assert ev["map.1"]["found"] is False and ev["map.1"]["lat"] is None


def test_results_and_misses_are_cached_but_errors_are_not():
    async def go():
        calls = []
        answers = {"Tomoca": TOMOCA, "Down": httpx.Response(503)}
        for _ in range(2):
            r = resolver(answers, calls)
            r.start([("a", "Tomoca"), ("b", "  tomoca "), ("c", "Missing"), ("d", "Down")])
            out = {x.key: x for x in await r.drain(2)}
            await r.close()
        return calls, out

    calls, out = run(go())
    assert calls.count("Tomoca") + calls.count("  tomoca ") == 1
    assert calls.count("Missing") == 1
    assert calls.count("Down") == 2
    assert out["d"].location is None and out["b"].location is not None


def test_requests_are_spaced_by_the_interval():
    async def go():
        calls = []
        r = resolver({}, calls, interval=0.1)
        r.start([(str(i), "place " + str(i)) for i in range(4)])
        t = time.monotonic()
        await r.drain(5)
        await r.close()
        return time.monotonic() - t, calls

    took, calls = run(go())
    assert len(calls) == 4 and took >= 0.3


def test_drain_leaves_unfinished_places_out():
    async def go():
        calls = []
        r = resolver({}, calls, interval=10)
        r.start([("a", "first"), ("b", "second")])
        out = await r.drain(0.3)
        await r.close()
        return [x.key for x in out]

    assert run(go()) == ["a"]
