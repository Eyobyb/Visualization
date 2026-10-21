"""Server side of the viz stream: route with Jev, then split and validate Claude's program as it streams.

The browser compiles and renders; the server only forwards complete statements and reports
the problems it finds, using the same compiler rules (see `app.vizlang`).
"""
import json
from typing import Any, AsyncIterator, Callable, Dict, List, Optional, Set, Tuple

from . import images, jev, llm
from .vizlang import (
    LangError, StatementSplitter, StatementText, compile_program, data_refs, image_jobs, parse_statement, to_markdown,
)
from .vizlang.prompt import preset_source

# How long the stream waits for unfinished image searches after the program is complete.
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


async def viz_events(
    *,
    system: str,
    messages: List[Dict[str, str]],
    query: str,
    bindings: Dict[str, Any],
    extra: Optional[str],
    prose: Callable[[], AsyncIterator[str]],
) -> AsyncIterator[str]:
    """Events: route, then either prose `delta`s or data, statement, diagnostic and image events; then done.

    `prose()` streams a plain-text answer as `delta` and `done` events. Images start resolving as soon
    as the statement holding their query is complete.
    """
    resolver: Optional[images.ImageResolver] = None
    try:
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
            for r in resolver.ready():
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
            resolver.start(image_jobs(compile_program(complete, streaming=True, data=bindings).root))

        for p in splitter.finish():
            ev = statement_event(p) if not p.partial else None
            if ev:
                yield sse(ev)
        final = compile_program(source, data=bindings)
        jobs = image_jobs(final.root)
        resolver.start(jobs)
        for r in await resolver.drain(IMAGE_DEADLINE_S):
            yield sse(r.event())
        yield sse({
            "type": "done",
            "diagnostics": [{k: d[k] for k in ("code", "msg", "where")} for d in final.diagnostics],
            "statements": final.statements,
            "markdown": to_markdown(final.root),
            "images": [{"key": k, "query": q, "url": resolver.url(k)} for k, q in jobs],
        })
    except Exception as e:  # surface API errors in the column instead of a dropped connection
        yield sse({"type": "error", "message": str(e)})
    finally:
        if resolver:
            await resolver.close()
