import os
from typing import AsyncIterator, Dict, List, Optional

import anthropic

DEFAULT_MODEL = "claude-sonnet-5-5"

_client = None


def client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic()
    return _client


async def stream_text(
    system: str,
    messages: List[Dict[str, str]],
    extra_system: Optional[str] = None,
    max_tokens: int = 8000,
) -> AsyncIterator[str]:
    """Yield text deltas from Claude.

    The static system prompt is cached since the UI prompts are large; `extra_system`
    carries per-request context after the cache breakpoint.
    """
    blocks = [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}]
    if extra_system:
        blocks.append({"type": "text", "text": extra_system})
    async with client().messages.stream(
        model=os.environ.get("ANTHROPIC_MODEL", DEFAULT_MODEL),
        max_tokens=max_tokens,
        system=blocks,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text
