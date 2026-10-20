"""Tokenizer for one statement. Mirrors `frontend/src/vizlang/lexer.ts`."""
import re
from typing import List, Optional, Tuple, Union

from .jsvalues import js_str

# ("str", text) | ("num", number) | ("id" | "state" | "fn" | "op", text)
Token = Tuple[str, Union[str, int, float]]

TWO_CHAR_OPS = ("==", "!=", ">=", "<=", "&&", "||")
ONE_CHAR_OPS = "()[]{},:=.+-*/%<>!?"

_DIGITS = "0123456789"
_NAME_START = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_"
_NAME_CHARS = _NAME_START + _DIGITS
_NUM_PREFIX = re.compile(r"\d+(?:\.\d*)?|\.\d+")


class LangError(Exception):
    """A syntax error in one statement. The message is shown to the user and fed back to the model."""


def _parse_float(s: str) -> Union[int, float]:
    """`parseFloat` on a run of digits and dots: reads the longest valid prefix."""
    text = _NUM_PREFIX.match(s).group(0)
    return float(text) if "." in text else int(text)


def tokenize(s: str) -> List[Token]:
    """Splits one statement into tokens. `$name` is a state variable, `@Name` a function or action."""
    toks: List[Token] = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c in " \t\n\r":
            i += 1
            continue
        if c == "/" and s[i + 1:i + 2] == "/":
            while i < n and s[i] != "\n":
                i += 1
            continue
        if c in "\"'":
            j = i + 1
            out = []
            while j < n and s[j] != c:
                if s[j] == "\\" and j + 1 < n:
                    e = s[j + 1]
                    out.append("\n" if e == "n" else "\t" if e == "t" else e)
                    j += 2
                else:
                    out.append(s[j])
                    j += 1
            if j >= n:
                raise LangError("A string never closes")
            toks.append(("str", "".join(out)))
            i = j + 1
            continue
        if c in _DIGITS or (c == "." and s[i + 1:i + 2] != "" and s[i + 1] in _DIGITS):
            j = i
            while j < n and s[j] in "0123456789._":
                j += 1
            toks.append(("num", _parse_float(s[i:j].replace("_", ""))))
            i = j
            continue
        if c in "$@" or c in _NAME_START:
            j = i + 1
            while j < n and s[j] in _NAME_CHARS:
                j += 1
            w = s[i:j]
            if c in "$@" and len(w) < 2:
                raise LangError('"' + c + '" must be followed by a name')
            if c == "$":
                toks.append(("state", w[1:]))
            elif c == "@":
                toks.append(("fn", w[1:]))
            else:
                toks.append(("id", w))
            i = j
            continue
        two = s[i:i + 2]
        if two in TWO_CHAR_OPS:
            toks.append(("op", two))
            i += 2
            continue
        if c in ONE_CHAR_OPS:
            toks.append(("op", c))
            i += 1
            continue
        raise LangError('Unexpected character "' + c + '"')
    return toks


def tok_text(t: Optional[Token]) -> str:
    """How a token reads in an error message."""
    if t is None:
        return "end of line"
    kind, v = t
    if kind == "str":
        return '"' + str(v) + '"'
    if kind == "state":
        return "$" + str(v)
    if kind == "fn":
        return "@" + str(v)
    if kind == "num":
        return js_str(v)
    return str(v)
