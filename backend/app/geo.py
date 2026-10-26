"""Geocodes PlaceMap places with OpenStreetMap's Nominatim.

Nominatim's usage policy allows at most one request per second and needs an identifying
User-Agent, so every request in the process goes through one gate and results (including misses)
are cached. Set `GEOCODER_USER_AGENT` to something that identifies your deployment, and
`GEOCODER_URL` to use your own Nominatim instance.
"""
import asyncio
import logging
import os
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set, Tuple

import httpx

log = logging.getLogger(__name__)

DEFAULT_URL = "https://nominatim.openstreetmap.org/search"
DEFAULT_USER_AGENT = "VizPlayground/0.1 (local development)"
TIMEOUT_S = 6.0
MIN_INTERVAL_S = 1.0
CACHE_SIZE = 512


@dataclass
class Location:
    lat: float
    lng: float
    label: str


@dataclass
class PlaceResult:
    key: str
    query: str
    location: Optional[Location] = None

    def event(self) -> Dict[str, Any]:
        loc = self.location
        return {
            "type": "place",
            "key": self.key,
            "query": self.query,
            "lat": loc.lat if loc else None,
            "lng": loc.lng if loc else None,
            "label": loc.label if loc else None,
            "found": loc is not None,
        }


_cache: "OrderedDict[str, Optional[Location]]" = OrderedDict()


def _cache_key(query: str) -> str:
    return " ".join(query.lower().split())


def cached(query: str) -> Tuple[bool, Optional[Location]]:
    k = _cache_key(query)
    if k in _cache:
        _cache.move_to_end(k)
        return True, _cache[k]
    return False, None


def remember(query: str, loc: Optional[Location]) -> None:
    _cache[_cache_key(query)] = loc
    _cache.move_to_end(_cache_key(query))
    while len(_cache) > CACHE_SIZE:
        _cache.popitem(last=False)


class _Gate:
    """Spaces requests at least `MIN_INTERVAL_S` apart across the whole process."""

    def __init__(self) -> None:
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        self.lock: Optional[asyncio.Lock] = None
        self.last: Optional[float] = None

    async def wait(self, interval: float) -> None:
        loop = asyncio.get_running_loop()
        if self.loop is not loop or self.lock is None:
            self.loop, self.lock = loop, asyncio.Lock()
        async with self.lock:
            if self.last is not None:
                gap = self.last + interval - time.monotonic()
                if gap > 0:
                    await asyncio.sleep(gap)
            self.last = time.monotonic()


_gate = _Gate()


def variants(query: str) -> List[str]:
    """Queries to try in order for "name, address…, area, city, country": the full text, the name with the
    last three parts, the first address part with the city, then the street-level remainder. Nominatim
    misses long free-text addresses, and an area on its own would stack every pin on one spot, so the
    shorter forms are only tried when enough detail is left."""
    parts = [p.strip() for p in query.split(",") if p.strip()]
    out = [query]
    if len(parts) >= 5:
        out.append(", ".join([parts[0]] + parts[-3:]))
        out.append(", ".join([parts[1]] + parts[-2:]))
        out.append(", ".join(parts[2:]))
    seen: Set[str] = set()
    return [q for q in out if not (q.lower() in seen or seen.add(q.lower()))]


def parse_result(body: Any) -> Optional[Location]:
    if not isinstance(body, list) or not body or not isinstance(body[0], dict):
        return None
    top = body[0]
    try:
        lat, lng = float(top["lat"]), float(top["lon"])
    except (KeyError, TypeError, ValueError):
        return None
    return Location(lat=lat, lng=lng, label=str(top.get("display_name") or ""))


class PlaceResolver:
    """Geocodes place jobs for one turn. Call `close()` when the turn ends."""

    def __init__(self, client: Optional[httpx.AsyncClient] = None, interval: float = MIN_INTERVAL_S):
        self._owned = client is None
        self.client = client or httpx.AsyncClient(
            timeout=TIMEOUT_S,
            headers={"User-Agent": os.environ.get("GEOCODER_USER_AGENT") or DEFAULT_USER_AGENT, "Accept-Language": "en"},
        )
        self.interval = interval
        self.url = os.environ.get("GEOCODER_URL") or DEFAULT_URL
        self.tasks: Dict[str, "asyncio.Task[PlaceResult]"] = {}
        self.queries: Dict[str, str] = {}
        self.sent: Set[str] = set()
        self.results: Dict[str, PlaceResult] = {}

    def start(self, jobs: List[Tuple[str, str]]) -> None:
        """Starts any job whose key is new or whose query changed."""
        for key, query in jobs:
            if self.queries.get(key) == query:
                continue
            old = self.tasks.get(key)
            if old:
                old.cancel()
            self.queries[key] = query
            self.sent.discard(key)
            self.tasks[key] = asyncio.ensure_future(self.resolve(key, query))

    def _emit(self, r: PlaceResult) -> PlaceResult:
        self.sent.add(r.key)
        self.results[r.key] = r
        return r

    def ready(self) -> List[PlaceResult]:
        """Finished results not returned before."""
        return [
            self._emit(task.result()) for key, task in self.tasks.items()
            if key not in self.sent and task.done() and not task.cancelled()
        ]

    async def drain(self, timeout: float) -> List[PlaceResult]:
        """Waits up to `timeout` seconds for the rest. Unfinished jobs are left out, not reported as missing,
        so the browser can still geocode them through `/api/viz/places`."""
        pending = [t for k, t in self.tasks.items() if k not in self.sent and not t.done()]
        if pending and timeout > 0:
            await asyncio.wait(pending, timeout=timeout)
        return self.ready()

    async def close(self) -> None:
        for t in self.tasks.values():
            t.cancel()
        if self._owned:
            await self.client.aclose()

    async def lookup(self, query: str) -> Optional[Location]:
        hit, loc = cached(query)
        if hit:
            return loc
        for q in variants(query):
            loc = await self._search(q)
            if loc:
                break
        remember(query, loc)
        return loc

    async def _search(self, q: str) -> Optional[Location]:
        hit, loc = cached(q)
        if hit:
            return loc
        await _gate.wait(self.interval)
        hit, loc = cached(q)
        if hit:
            return loc
        r = await self.client.get(self.url, params={"q": q, "format": "jsonv2", "limit": "1"})
        r.raise_for_status()
        loc = parse_result(r.json())
        remember(q, loc)
        return loc

    async def resolve(self, key: str, query: str) -> PlaceResult:
        try:
            return PlaceResult(key=key, query=query, location=await self.lookup(query))
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001 - one unplaced pin should not end the turn
            log.warning("Geocoding failed for %r: %s: %s", query, type(e).__name__, e)
            return PlaceResult(key=key, query=query)
