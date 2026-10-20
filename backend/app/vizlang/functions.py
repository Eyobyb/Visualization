"""Pure built-in functions, called as `@Name(...)`. Mirrors `frontend/src/vizlang/functions.ts`.

Missing arguments arrive as `UNDEFINED`, and extra ones are ignored, as in JavaScript.
Signatures and descriptions for the prompt live in `catalog.json`.
"""
import math
from functools import cmp_to_key
from typing import Any, Callable, Dict, List

from .jsvalues import (
    UNDEFINED, arr, fmt, is_nullish, is_number, js_div, js_round, js_str, num, pick, same_value_zero, strict_eq,
)

U = UNDEFINED


def locale_compare(a: str, b: str) -> int:
    """Approximates `a.localeCompare(b)`: case-insensitive first, then lowercase before uppercase."""
    ka = (a.casefold(), a.swapcase())
    kb = (b.casefold(), b.swapcase())
    return -1 if ka < kb else 1 if ka > kb else 0


def _sort(l=U, f=U, d="desc", *_) -> List[Any]:
    if d is U:
        d = "desc"

    def cmp(a, b):
        x, y = pick(a, f), pick(b, f)
        c = x - y if is_number(x) and is_number(y) else locale_compare(js_str(x), js_str(y))
        return c if d == "asc" else -c

    return sorted(arr(l), key=cmp_to_key(cmp))


def _sum(l=U, f=U, *_) -> float:
    s = 0.0
    for r in arr(l):
        s += num(pick(r, f))
    return s


def _values(l, f) -> List[float]:
    return [num(pick(r, f)) for r in arr(l)]


def _avg(l=U, f=U, *_):
    a = arr(l)
    return _sum(a, f) / len(a) if a else 0


def _min(l=U, f=U, *_):
    a = _values(l, f)
    return min(a) if a else 0


def _max(l=U, f=U, *_):
    a = _values(l, f)
    return max(a) if a else 0


def _count(l=U, *_):
    return len(arr(l))


def _filter(l=U, f=U, v=U, *_):
    if is_nullish(v) or (isinstance(v, str) and v == "All"):
        return arr(l)
    return [r for r in arr(l) if strict_eq(pick(r, f), v)]


def _slice_end(n: float) -> int:
    return int(math.trunc(n)) if math.isfinite(n) else (10 ** 9 if n > 0 else -(10 ** 9))


def _top(l=U, n=U, f=U, *_):
    return _sort(l, f, "desc")[:_slice_end(num(n))]


def _unique(l=U, f=U, *_):
    out: List[Any] = []
    for r in arr(l):
        v = pick(r, f)
        if not any(same_value_zero(v, x) for x in out):
            out.append(v)
    return out


def _pluck(l=U, f=U, *_):
    return [pick(r, f) for r in arr(l)]


def _group_by(l=U, f=U, vf=U, *_):
    keys: List[Any] = []
    sums: List[float] = []
    for r in arr(l):
        k = pick(r, f)
        for i, x in enumerate(keys):
            if same_value_zero(k, x):
                sums[i] += num(pick(r, vf))
                break
        else:
            keys.append(k)
            sums.append(0 + num(pick(r, vf)))
    fk, vk = js_str(f), js_str(vf)
    out = []
    for k, v in zip(keys, sums):
        row = {fk: k}
        row[vk] = v
        out.append(row)
    return out


def _concat(a=U, b=U, *_):
    return arr(a) + arr(b)


def _first(l=U, *_):
    a = arr(l)
    return a[0] if a else U


def _last(l=U, *_):
    a = arr(l)
    return a[-1] if a else U


def _format(v=U, k=U, *_):
    return fmt(num(v), "number" if is_nullish(k) else k)


def _pow(a: float, b: float) -> float:
    try:
        return math.pow(a, b)
    except OverflowError:
        return math.inf
    except ValueError:
        return math.nan


def _round(v=U, d=0, *_):
    if d is U:
        d = 0
    p = _pow(10, num(d))
    return js_div(js_round(num(v) * p), p)


def _clamp(v=U, a=U, b=U, *_):
    return min(num(b), max(num(a), num(v)))


def _change(a=U, b=U, *_):
    return (num(a) - num(b)) / abs(num(b)) if num(b) else 0


def _payment(pr=U, r=U, y=U, *_):
    n = num(y) * 12
    i = num(r) / 12
    if not n:
        return 0
    if not i:
        return num(pr) / n
    return js_div(num(pr) * i, 1 - _pow(1 + i, -n))


def _range(a=U, b=U, *_):
    out: List[float] = []
    i = num(a)
    end = num(b)
    while i <= end and len(out) < 1000:
        out.append(i)
        i += 1
    return out


FUNCS: Dict[str, Callable[..., Any]] = {
    "Sum": _sum,
    "Avg": _avg,
    "Min": _min,
    "Max": _max,
    "Count": _count,
    "Filter": _filter,
    "Sort": _sort,
    "Top": _top,
    "Unique": _unique,
    "Pluck": _pluck,
    "GroupBy": _group_by,
    "Concat": _concat,
    "First": _first,
    "Last": _last,
    "Format": _format,
    "Round": _round,
    "Clamp": _clamp,
    "Change": _change,
    "Payment": _payment,
    "Range": _range,
}

ACTIONS = ("Set", "Toggle", "Reset", "NewTurn", "Copy", "OpenUrl")
