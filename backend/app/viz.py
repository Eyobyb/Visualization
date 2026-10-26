"""Server side of the viz stream: route with Jev, then split and validate Claude's program as it streams.

The browser compiles and renders; the server only forwards complete statements and reports
the problems it finds, using the same compiler rules (see `app.vizlang`).
"""
import asyncio
import json
from dataclasses import dataclass
from typing import Any, AsyncIterator, Awaitable, Callable, Dict, List, Optional, Set, Tuple

from . import geo, images, jev, llm
from .agent import AgentResult, OnStep
from .vizlang import (
    LangError, StatementSplitter, StatementText, compile_program, data_refs, image_jobs, parse_statement, place_jobs,
    to_markdown,
)
from .vizlang.prompt import preset_source

# How long the stream waits for unfinished image searches and geocoding after the program is complete.
IMAGE_DEADLINE_S = 8.0


def sse(payload: Dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def route_section(route: jev.Route) -> Optional[str]:
    """Jev's hints and, when a layout was picked, that preset as an example."""
    if not route.hints:
        return None
    parts = ["## Suggested approach\n\n" + "\n".join("- " + h for h in route.hints)]
    src = preset_source(route.layout)
    if src:
        parts.append(
            f"An example of the {route.layout} layout. Its `data.*` names are illustrative; "
            f"use only this message's bindings.\n\n```\n{src.strip()}\n```"
        )
    return "\n\n".join(parts)


def statement_event(p: StatementText) -> Optional[Dict[str, Any]]:
    """A completed statement, or None for a comment-only one. Unparseable statements are still sent."""
    try:
        st = parse_statement(p.text, p.line)
    except LangError:
        return {"type": "statement", "name": None, "text": p.text, "line": p.line, "refs": []}
    if st is None:
        return None
    name = "$" + st.name if st.is_state else st.name
    return {"type": "statement", "name": name, "text": p.text, "line": p.line, "refs": data_refs(st)}


async def image_events(jobs: List[Tuple[str, str]]) -> AsyncIterator[str]:
    """`image` events for `(key, query)` jobs as they resolve, then `done`. Used by the Playground."""
    resolver = images.ImageResolver()
    try:
        resolver.start(jobs)
        async for r in resolver.stream(IMAGE_DEADLINE_S):
            yield sse(r.event())
        yield sse({"type": "done"})
    finally:
        await resolver.close()


async def place_events(jobs: List[Tuple[str, str]]) -> AsyncIterator[str]:
    """`place` events for `(key, query)` jobs as they are geocoded, then `done`. Used by the Playground
    and for places a turn did not finish locating."""
    resolver = geo.PlaceResolver()
    try:
        resolver.start(jobs)
        loop = asyncio.get_running_loop()
        deadline = loop.time() + IMAGE_DEADLINE_S + len(jobs) * geo.MIN_INTERVAL_S
        while True:
            for r in resolver.ready():
                yield sse(r.event())
            pending = [t for k, t in resolver.tasks.items() if k not in resolver.sent and not t.done()]
            left = deadline - loop.time()
            if not pending or left <= 0:
                break
            await asyncio.wait(pending, timeout=left, return_when=asyncio.FIRST_COMPLETED)
        yield sse({"type": "done"})
    finally:
        await resolver.close()


def place_summary(resolver: geo.PlaceResolver, key: str, query: str) -> Dict[str, Any]:
    """A place for `done`; `found` is None when geocoding had not finished."""
    r = resolver.results.get(key)
    loc = r.location if r else None
    return {
        "key": key, "query": query, "lat": loc.lat if loc else None, "lng": loc.lng if loc else None,
        "found": None if r is None else loc is not None,
    }


@dataclass
class AgentTurn:
    """What a turn uses once the data agent has finished: its result and the inputs rebuilt from it."""
    result: AgentResult
    bindings: Dict[str, Any]
    extra: Optional[str]
    prose: Callable[[], AsyncIterator[str]]


async def agent_events(run: Callable[[OnStep], Awaitable[AgentTurn]]) -> AsyncIterator[Any]:
    """`agent_step` events while the agent works, then the finished `AgentTurn` as the last item."""
    queue: "asyncio.Queue[Dict[str, Any]]" = asyncio.Queue()
    task = asyncio.ensure_future(run(queue.put_nowait))
    try:
        while True:
            get = asyncio.ensure_future(queue.get())
            done, _ = await asyncio.wait({task, get}, return_when=asyncio.FIRST_COMPLETED)
            if get in done:
                yield sse({"type": "agent_step", **get.result()})
                continue
            get.cancel()
            break
        while not queue.empty():
            yield sse({"type": "agent_step", **queue.get_nowait()})
        yield task.result()
    finally:
        task.cancel()


async def viz_events(
    *,
    system: str,
    messages: List[Dict[str, str]],
    query: str,
    bindings: Dict[str, Any],
    extra: Optional[str],
    prose: Callable[[], AsyncIterator[str]],
    agent: Optional[Callable[[OnStep], Awaitable[AgentTurn]]] = None,
) -> AsyncIterator[str]:
    """Events: [agent_step*, agent], route, then either prose `delta`s or data, statement, diagnostic
    image and place events; then done.

    `prose()` streams a plain-text answer as `delta` and `done` events. Images start resolving as soon
    as the statement holding their query is complete, and PlaceMap places start geocoding the same way. With `agent`, the data agent runs first; when it
    returns usable datasets its bindings, data context and prose replace the search-based ones.
    """
    resolver: Optional[images.ImageResolver] = None
    places: Optional[geo.PlaceResolver] = None
    try:
        if agent:
            async for item in agent_events(agent):
                if isinstance(item, AgentTurn):
                    yield sse(item.result.event())
                    if item.result.usable:
                        bindings, extra, prose = item.bindings, item.extra, item.prose
                else:
                    yield item
        route = await jev.route(query, bindings)
        yield sse(route.event())
        if not route.render:
            async for ev in prose():
                yield ev
            return

        yield sse({"type": "data", "bindings": bindings})
        extra_system = "\n\n".join(s for s in (extra, route_section(route)) if s) or None
        splitter = StatementSplitter()
        resolver = images.ImageResolver()
        places = geo.PlaceResolver()
        source = ""
        complete = ""
        sent: Set[str] = set()

        def new_diagnostics(streaming: bool) -> List[str]:
            r = compile_program(source, streaming=streaming, data=bindings)
            out = []
            for d in r.diagnostics:
                k = d["code"] + "|" + d["msg"] + "|" + d["where"]
                if d["transient"] or k in sent:
                    continue
                sent.add(k)
                out.append(sse({"type": "diagnostic", "code": d["code"], "msg": d["msg"], "where": d["where"]}))
            return out

        async for chunk in llm.stream_text(system, messages, extra_system=extra_system):
            source += chunk
            done = splitter.feed(chunk)
            for r in resolver.ready() + places.ready():
                yield sse(r.event())
            if not done:
                continue
            for p in done:
                complete += p.text + "\n"
                ev = statement_event(p)
                if ev:
                    yield sse(ev)
            for ev in new_diagnostics(streaming=True):
                yield ev
            root = compile_program(complete, streaming=True, data=bindings).root
            resolver.start(image_jobs(root))
            places.start(place_jobs(root))

        for p in splitter.finish():
            ev = statement_event(p) if not p.partial else None
            if ev:
                yield sse(ev)
        final = compile_program(source, data=bindings)
        jobs = image_jobs(final.root)
        located = place_jobs(final.root)
        resolver.start(jobs)
        places.start(located)
        started = asyncio.get_running_loop().time()
        for r in await resolver.drain(IMAGE_DEADLINE_S):
            yield sse(r.event())
        left = IMAGE_DEADLINE_S - (asyncio.get_running_loop().time() - started)
        for r in await places.drain(left):
            yield sse(r.event())
        yield sse({
            "type": "done",
            "diagnostics": [{k: d[k] for k in ("code", "msg", "where")} for d in final.diagnostics],
            "statements": final.statements,
            "markdown": to_markdown(final.root),
            "images": [{"key": k, "query": q, "url": resolver.url(k)} for k, q in jobs],
            "places": [place_summary(places, k, q) for k, q in located],
        })
    except Exception as e:  # surface API errors in the column instead of a dropped connection
        yield sse({"type": "error", "message": str(e)})
    finally:
        if resolver:
            await resolver.close()
        if places:
            await places.close()
