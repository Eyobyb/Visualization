"""Server side of the viz stream: route with Jev, then split and validate Claude's program as it streams.

The browser compiles and renders; the server only forwards complete statements and reports
the problems it finds, using the same compiler rules (see `app.vizlang`).
"""
import json
from typing import Any, AsyncIterator, Callable, Dict, List, Optional, Set

from . import jev, llm
from .vizlang import (
    LangError, StatementSplitter, StatementText, compile_program, data_refs, image_jobs, parse_statement, to_markdown,
)
from .vizlang.prompt import preset_source


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


async def viz_events(
    *,
    system: str,
    messages: List[Dict[str, str]],
    query: str,
    bindings: Dict[str, Any],
    extra: Optional[str],
    prose: Callable[[], AsyncIterator[str]],
) -> AsyncIterator[str]:
    """Events: route, then either prose `delta`s or data, statement and diagnostic events; then done.

    `prose()` streams a plain-text answer as `delta` and `done` events.
    """
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
        source = ""
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
            if not done:
                continue
            for p in done:
                ev = statement_event(p)
                if ev:
                    yield sse(ev)
            for ev in new_diagnostics(streaming=True):
                yield ev

        for p in splitter.finish():
            ev = statement_event(p) if not p.partial else None
            if ev:
                yield sse(ev)
        final = compile_program(source, data=bindings)
        yield sse({
            "type": "done",
            "diagnostics": [{k: d[k] for k in ("code", "msg", "where")} for d in final.diagnostics],
            "statements": final.statements,
            "markdown": to_markdown(final.root),
            "images": [{"key": k, "query": q} for k, q in image_jobs(final.root)],
        })
    except Exception as e:  # surface API errors in the column instead of a dropped connection
        yield sse({"type": "error", "message": str(e)})
