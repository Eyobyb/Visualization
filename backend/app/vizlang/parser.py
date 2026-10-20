"""Statement parser and splitter. Mirrors `frontend/src/vizlang/parser.ts`.

Expressions are plain dicts shaped like the TypeScript AST, keyed by `k`:
lit, state, ref, member, index, list, obj, un, bin, tern, fn, comp.
Arguments are `{"name": str | None, "e": expr}`.
"""
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .lexer import LangError, tokenize, tok_text

Expr = Dict[str, Any]

PREC = {
    "||": 2, "&&": 3, "==": 4, "!=": 4, "<": 5, ">": 5, "<=": 5, ">=": 5,
    "+": 6, "-": 6, "*": 7, "/": 7, "%": 7,
}

_CAPITAL = re.compile(r"[A-Z]")


@dataclass
class Statement:
    """`name = expr`, or `$name = expr` for a state declaration."""

    name: str
    is_state: bool
    expr: Expr
    line: int


@dataclass
class StatementText:
    """One statement's source text. `partial` means its brackets or string are still open."""

    text: str
    line: int
    partial: bool


class _Parser:
    def __init__(self, toks):
        self.toks = toks
        self.p = 0

    def peek(self, o=0):
        i = self.p + o
        return self.toks[i] if i < len(self.toks) else None

    def is_op(self, v, o=0):
        t = self.peek(o)
        return t is not None and t[0] == "op" and t[1] == v

    def expect(self, v):
        if not self.is_op(v):
            raise LangError('Expected "' + v + '" but found ' + tok_text(self.peek()))
        self.p += 1

    def args(self) -> List[Dict[str, Any]]:
        self.expect("(")
        out = []
        while not self.is_op(")"):
            if self.p >= len(self.toks):
                raise LangError("Arguments never close")
            t = self.peek()
            if t is not None and t[0] == "id" and self.is_op(":", 1):
                self.p += 2
                out.append({"name": t[1], "e": self.expr(0)})
            else:
                out.append({"name": None, "e": self.expr(0)})
            if self.is_op(","):
                self.p += 1
            elif not self.is_op(")"):
                raise LangError('Expected "," or ")" but found ' + tok_text(self.peek()))
        self.p += 1
        return out

    def primary(self) -> Expr:
        t = self.peek()
        if t is None:
            raise LangError("The line ends before the value")
        kind, v = t
        if kind in ("num", "str"):
            self.p += 1
            return {"k": "lit", "v": v}
        if kind == "state":
            self.p += 1
            return {"k": "state", "name": v}
        if kind == "fn":
            self.p += 1
            return {"k": "fn", "name": v, "args": self.args()}
        if kind == "id":
            self.p += 1
            if v in ("true", "false"):
                return {"k": "lit", "v": v == "true"}
            if v == "null":
                return {"k": "lit", "v": None}
            if self.is_op("("):
                if _CAPITAL.match(v):
                    return {"k": "comp", "name": v, "args": self.args()}
                raise LangError('"' + v + '(" is not valid: components start with a capital, functions with @')
            return {"k": "ref", "name": v}
        if self.is_op("["):
            self.p += 1
            items = []
            while not self.is_op("]"):
                if self.p >= len(self.toks):
                    raise LangError("A list never closes")
                items.append(self.expr(0))
                if self.is_op(","):
                    self.p += 1
                elif not self.is_op("]"):
                    raise LangError('Expected "," or "]" but found ' + tok_text(self.peek()))
            self.p += 1
            return {"k": "list", "items": items}
        if self.is_op("{"):
            self.p += 1
            entries = []
            while not self.is_op("}"):
                kt = self.peek()
                if kt is None or kt[0] not in ("id", "str"):
                    raise LangError("Object keys must be names, found " + tok_text(kt))
                self.p += 1
                self.expect(":")
                entries.append((kt[1], self.expr(0)))
                if self.is_op(","):
                    self.p += 1
                elif not self.is_op("}"):
                    raise LangError('Expected "," or "}" but found ' + tok_text(self.peek()))
            self.p += 1
            return {"k": "obj", "entries": entries}
        if self.is_op("("):
            self.p += 1
            e = self.expr(0)
            self.expect(")")
            return e
        raise LangError("Unexpected " + tok_text(t))

    def postfix(self, e: Expr) -> Expr:
        while True:
            if self.is_op("."):
                self.p += 1
                t = self.peek()
                if t is None or t[0] != "id":
                    raise LangError('Expected a field name after "."')
                self.p += 1
                e = {"k": "member", "o": e, "f": t[1]}
            elif self.is_op("["):
                self.p += 1
                i = self.expr(0)
                self.expect("]")
                e = {"k": "index", "o": e, "i": i}
            else:
                return e

    def unary(self) -> Expr:
        if self.is_op("-") or self.is_op("!"):
            op = self.peek()[1]
            self.p += 1
            return {"k": "un", "op": op, "e": self.unary()}
        return self.postfix(self.primary())

    def expr(self, min_prec: int) -> Expr:
        left = self.unary()
        while True:
            t = self.peek()
            if t is None or t[0] != "op":
                break
            if t[1] == "?":
                if min_prec > 1:
                    break
                self.p += 1
                a = self.expr(0)
                self.expect(":")
                b = self.expr(1)
                left = {"k": "tern", "c": left, "a": a, "b": b}
                continue
            prec = PREC.get(t[1])
            if not prec or prec < min_prec:
                break
            self.p += 1
            left = {"k": "bin", "op": t[1], "l": left, "r": self.expr(prec + 1)}
        return left


def parse_statement(src: str, line: int = 1) -> Optional[Statement]:
    """Parses one complete statement. Returns None for a blank or comment-only statement;
    raises `LangError` on a syntax error."""
    toks = tokenize(src)
    if not toks:
        return None
    ps = _Parser(toks)
    first = ps.peek()
    if first is None or first[0] not in ("id", "state"):
        raise LangError('A statement starts with a name, like "root = ..."')
    ps.p += 1
    ps.expect("=")
    expr = ps.expr(0)
    if ps.p < len(toks):
        raise LangError("Unexpected " + tok_text(ps.peek()) + " after the value")
    return Statement(name=str(first[1]), is_state=first[0] == "state", expr=expr, line=line)


def split_statements(src: str, streaming: bool = False) -> List[StatementText]:
    """Splits a program into statements. A newline ends a statement unless brackets are open.
    With `streaming`, the last statement is always partial, since more text may still arrive."""
    out: List[StatementText] = []
    depth = 0
    q: Optional[str] = None
    start = 0
    line = 1
    start_line = 1
    n = len(src)

    def push(end: int, partial: bool) -> None:
        text = src[start:end].strip()
        if text:
            out.append(StatementText(text, start_line, partial))

    i = 0
    while i < n:
        c = src[i]
        if q:
            if c == "\\":
                i += 2
                continue
            if c == q:
                q = None
            elif c == "\n":
                q = None
                line += 1
                if depth == 0:
                    push(i, False)
                    start, start_line = i + 1, line
        elif c in "\"'":
            q = c
        elif c == "/" and src[i + 1:i + 2] == "/":
            j = src.find("\n", i)
            i = n if j < 0 else j
            continue
        elif c in "([{":
            depth += 1
        elif c in ")]}":
            depth = max(0, depth - 1)
        elif c == "\n":
            line += 1
            if depth == 0:
                push(i, False)
                start, start_line = i + 1, line
        i += 1
    if start < n:
        push(n, streaming or depth > 0 or q is not None)
    return out


class StatementSplitter:
    """Splits a program as it streams in, yielding each statement once it is complete.

    Uses the same depth, quote and comment rules as `split_statements`: a statement completes
    at a newline outside brackets, so text after it can never change it.
    """

    def __init__(self) -> None:
        self._buf = ""
        self._done = 0

    def feed(self, chunk: str) -> List[StatementText]:
        """Adds text and returns the statements it completed."""
        self._buf += chunk
        parts = split_statements(self._buf, streaming=True)
        complete = [p for p in parts if not p.partial]
        new = complete[self._done:]
        self._done = len(complete)
        return new

    def finish(self) -> List[StatementText]:
        """Ends the stream and returns the rest. A trailing statement with open brackets stays partial."""
        parts = split_statements(self._buf, streaming=False)
        rest = parts[self._done:]
        self._done = len(parts)
        return rest
