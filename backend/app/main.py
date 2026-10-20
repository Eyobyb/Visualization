import json
import time
from pathlib import Path
from typing import AsyncIterator, Dict, List, Literal

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.responses import StreamingResponse  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from .dil import compile_dil  # noqa: E402
from .dil.catalog import catalog_summary  # noqa: E402
from .llm import stream_text  # noqa: E402

PROMPTS = Path(__file__).resolve().parent.parent / "prompts"
RECOMPILE_INTERVAL_S = 0.25

app = FastAPI(title="GenUI demo")


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


def load_prompt(name: str) -> str:
    path = PROMPTS / name
    if not path.exists():
        raise HTTPException(500, f"Missing prompt file: {name}")
    return path.read_text()


def sse(payload: Dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def sse_response(gen: AsyncIterator[str]) -> StreamingResponse:
    return StreamingResponse(
        gen,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def text_events(system: str, req: ChatRequest) -> AsyncIterator[str]:
    try:
        async for chunk in stream_text(system, [m.model_dump() for m in req.messages]):
            yield sse({"type": "delta", "text": chunk})
        yield sse({"type": "done"})
    except Exception as e:  # surface API errors in the column instead of a dropped connection
        yield sse({"type": "error", "message": str(e)})


@app.post("/api/plain/stream")
async def plain_stream(req: ChatRequest):
    return sse_response(text_events(load_prompt("plain.md"), req))


@app.post("/api/openui/stream")
async def openui_stream(req: ChatRequest):
    return sse_response(text_events(load_prompt("openui_system.txt"), req))


async def dil_events(system: str, req: ChatRequest) -> AsyncIterator[str]:
    source = ""
    pending = ""
    sent_constants: Dict[str, str] = {}
    last_code = None
    last_compile = 0.0

    def emit(final: bool) -> str:
        nonlocal pending, last_code
        result = compile_dil(source)
        constants_patch = {k: v for k, v in result.constants.items() if sent_constants.get(k) != v}
        sent_constants.update(constants_patch)
        payload = {
            "type": "dil",
            "raw_append": pending,
            "constants_patch": constants_patch,
            "diagnostics": result.diagnostics,
            "fallback_markdown": result.fallback_markdown,
            "final": final,
        }
        if result.code != last_code:
            payload["code"] = result.code
            last_code = result.code
        pending = ""
        return sse(payload)

    try:
        async for chunk in stream_text(system, [m.model_dump() for m in req.messages]):
            source += chunk
            pending += chunk
            now = time.monotonic()
            if now - last_compile >= RECOMPILE_INTERVAL_S:
                last_compile = now
                yield emit(final=False)
        yield emit(final=True)
        yield sse({"type": "done"})
    except Exception as e:
        yield sse({"type": "error", "message": str(e)})


@app.post("/api/dil/stream")
async def dil_stream(req: ChatRequest):
    system = load_prompt("dil_system.md").replace("{{CATALOG}}", catalog_summary())
    return sse_response(dil_events(system, req))


@app.get("/api/health")
async def health():
    return {"ok": True}
