"""Resolves AsyncImage queries to real photos: Bing image search, then Jev checks the candidates.

Each query gets a few search candidates. Their thumbnails go to Jev in one request with a yes/no
question per image, and the best one Jev scores at or above `MATCH_THRESHOLD` is used. Pictures
already used elsewhere in the turn are skipped. When Jev is unavailable the first candidate is used
unverified; when Jev rejects every candidate the image resolves to nothing.
"""
import asyncio
import base64
import html
import json
import logging
import os
import re
import uuid
from dataclasses import dataclass
from typing import Any, AsyncIterator, Dict, List, Optional, Set, Tuple

import httpx

from . import jev

log = logging.getLogger(__name__)

SEARCH_URL = "https://www.bing.com/images/async"
CANDIDATES = 4
# Jev rejects images smaller than about 300px, so thumbnails are requested at a fixed size.
CHECK_SIZE = 448
MATCH_THRESHOLD = 0.5
TIMEOUT_S = 6.0
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/130.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
_META = re.compile(r' m="(\{.*?\})"')


@dataclass
class Candidate:
    title: str
    image: str
    thumbnail: str
    page: str


@dataclass
class Resolution:
    key: str
    query: str
    candidate: Optional[Candidate] = None
    score: Optional[float] = None
    verified: bool = False

    def event(self) -> Dict[str, Any]:
        c = self.candidate
        return {
            "type": "image",
            "key": self.key,
            "query": self.query,
            "url": c.image if c else None,
            "thumbnail": c.thumbnail if c else None,
            "page": c.page if c else None,
            "title": c.title if c else None,
            "score": self.score,
            "verified": self.verified,
        }


def parse_results(page: str) -> List[Candidate]:
    """Candidates from Bing's image results HTML, in rank order."""
    out = []
    for raw in _META.findall(page):
        try:
            m = json.loads(html.unescape(raw))
        except ValueError:
            continue
        if m.get("murl") and m.get("turl"):
            out.append(Candidate(title=m.get("t", ""), image=m["murl"], thumbnail=m["turl"], page=m.get("purl", "")))
    return out


def image_format(data: bytes) -> Optional[str]:
    """`png` or `jpg` from the file signature; other formats are not accepted by Jev."""
    if data.startswith(b"\x89PNG"):
        return "png"
    if data.startswith(b"\xff\xd8"):
        return "jpg"
    return None


def check_body(query: str, images: List[Tuple[str, bytes]], model: Optional[str] = None) -> Dict[str, Any]:
    """One noul question per image. `images` are (format, bytes) pairs."""
    assets: Dict[str, Any] = {}
    questions: Dict[str, Any] = {}
    for i, (fmt, data) in enumerate(images):
        ph = uuid.uuid4().hex
        assets[ph] = {"type": "image", "format": fmt, "data_base64": base64.b64encode(data).decode()}
        questions[f"c{i}"] = {
            "type": "noul",
            "instructions": f'Is {ph} a good photo for this search: "{query}"? It should clearly show the main subject.',
        }
    return {
        "model": model or os.environ.get("JEV_MODEL", jev.DEFAULT_MODEL),
        "state": "Pick photos for an image search.",
        "questions": questions,
        "assets": assets,
    }


def parse_check(body: Dict[str, Any], n: int) -> List[float]:
    a = body["answers"]
    return [float(a[f"c{i}"]["noul"]) for i in range(n)]


def choose(cands: List[Candidate], scores: Optional[List[float]], taken: Set[str]) -> Tuple[Optional[int], bool]:
    """Index of the candidate to use and whether Jev verified it. Ties keep search order."""
    free = [i for i, c in enumerate(cands) if c.image not in taken]
    if not free:
        return None, False
    if scores is None:
        return free[0], False
    best = max(free, key=lambda i: (scores[i], -i))
    return (best, True) if scores[best] >= MATCH_THRESHOLD else (None, True)


class ImageResolver:
    """Resolves image jobs concurrently for one turn. Call `close()` when the turn ends."""

    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        self._owned = client is None
        self.client = client or httpx.AsyncClient(timeout=TIMEOUT_S, headers=HEADERS, follow_redirects=True)
        self.tasks: Dict[str, "asyncio.Task[Resolution]"] = {}
        self.queries: Dict[str, str] = {}
        self.sent: Set[str] = set()
        self.results: Dict[str, Resolution] = {}
        self.taken: Set[str] = set()

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

    def _emit(self, r: Resolution) -> Resolution:
        self.sent.add(r.key)
        self.results[r.key] = r
        return r

    def ready(self) -> List[Resolution]:
        """Finished resolutions not returned before."""
        return [
            self._emit(task.result()) for key, task in self.tasks.items()
            if key not in self.sent and task.done() and not task.cancelled()
        ]

    async def drain(self, timeout: float) -> List[Resolution]:
        """Waits up to `timeout` seconds for the rest. Unfinished jobs resolve to nothing."""
        pending = [t for k, t in self.tasks.items() if k not in self.sent and not t.done()]
        if pending:
            await asyncio.wait(pending, timeout=timeout)
        out = self.ready()
        for key, task in self.tasks.items():
            if key not in self.sent:
                task.cancel()
                out.append(self._emit(Resolution(key=key, query=self.queries[key])))
        return out

    async def stream(self, timeout: float) -> AsyncIterator[Resolution]:
        """Every started job as it finishes, then the unfinished ones as nothing after `timeout` seconds."""
        deadline = asyncio.get_running_loop().time() + timeout
        while True:
            for r in self.ready():
                yield r
            pending = [t for k, t in self.tasks.items() if k not in self.sent and not t.done()]
            left = deadline - asyncio.get_running_loop().time()
            if not pending or left <= 0:
                break
            await asyncio.wait(pending, timeout=left, return_when=asyncio.FIRST_COMPLETED)
        for r in await self.drain(0):
            yield r

    def url(self, key: str) -> Optional[str]:
        r = self.results.get(key)
        return r.candidate.image if r and r.candidate else None

    async def close(self) -> None:
        for t in self.tasks.values():
            t.cancel()
        if self._owned:
            await self.client.aclose()

    async def search(self, query: str) -> List[Candidate]:
        r = await self.client.get(SEARCH_URL, params={"q": query, "first": "0", "count": str(CANDIDATES + 4), "mmasync": "1"})
        r.raise_for_status()
        return parse_results(r.text)

    async def thumbnail(self, c: Candidate) -> Optional[Tuple[str, bytes]]:
        sep = "&" if "?" in c.thumbnail else "?"
        try:
            r = await self.client.get(f"{c.thumbnail}{sep}w={CHECK_SIZE}&h={CHECK_SIZE}&c=7")
            r.raise_for_status()
        except httpx.HTTPError:
            return None
        fmt = image_format(r.content)
        return (fmt, r.content) if fmt else None

    async def check(self, query: str, images: List[Tuple[str, bytes]]) -> Optional[List[float]]:
        """Jev's score per image, or None when Jev is not configured or fails."""
        key = os.environ.get("JEV_API_KEY")
        if not key:
            return None
        try:
            r = await self.client.post(
                jev.API_URL,
                json=check_body(query, images),
                headers={"Authorization": f"Bearer {key}", "TypeSafe-Danger-Zone-Images": "true"},
            )
            r.raise_for_status()
            return parse_check(r.json(), len(images))
        except Exception as e:  # noqa: BLE001 - verification is optional
            log.warning("Jev image check failed, using unverified images: %s: %s", type(e).__name__, e)
            return None

    async def resolve(self, key: str, query: str) -> Resolution:
        try:
            found = [c for c in await self.search(query) if c.image not in self.taken]
            thumbs = await asyncio.gather(*(self.thumbnail(c) for c in found[:CANDIDATES]))
            cands = [c for c, t in zip(found, thumbs) if t]
            images = [t for t in thumbs if t]
            if not cands:
                return Resolution(key=key, query=query)
            scores = await self.check(query, images)
            i, verified = choose(cands, scores, self.taken)
            if i is None:
                return Resolution(key=key, query=query, verified=verified)
            self.taken.add(cands[i].image)
            return Resolution(
                key=key, query=query, candidate=cands[i], score=scores[i] if scores else None, verified=verified,
            )
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001 - one missing photo should not end the turn
            log.warning("Image search failed for %r: %s: %s", query, type(e).__name__, e)
            return Resolution(key=key, query=query)
