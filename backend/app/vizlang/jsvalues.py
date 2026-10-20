"""JavaScript value semantics the evaluator depends on, so Python and the browser agree.

JSON-style values map directly (dict, list, str, int/float, bool, None for null). `UNDEFINED`
stands in for JavaScript's `undefined`, which differs from null: it is dropped from objects
when serialized and skipped as a prop.
"""
import json
import math
import re
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

CURRENCY = "ETB"


class _Undefined:
    __slots__ = ()

    def __repr__(self) -> str:
        return "UNDEFINED"

    def __bool__(self) -> bool:
        return False


UNDEFINED: Any = _Undefined()


class _Pending:
    __slots__ = ()

    def __repr__(self) -> str:
        return "PENDING"


# Stands in for a value whose statement has not streamed in yet. Serializes as {"__pending": true}.
PENDING: Any = _Pending()


class Opaque:
    """A value that exists only at runtime, like a JavaScript function: dropped when serialized."""


def is_nullish(v: Any) -> bool:
    """`v == null` in JavaScript."""
    return v is None or v is UNDEFINED


def is_number(v: Any) -> bool:
    """`typeof v === 'number'`; bool is not a number in JavaScript."""
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def is_finite_number(v: Any) -> bool:
    return is_number(v) and math.isfinite(v)


def is_integer(v: Any) -> bool:
    """`Number.isInteger(v)`."""
    return is_finite_number(v) and float(v).is_integer()


def is_node(v: Any) -> bool:
    return isinstance(v, dict) and v.get("__c") is True


_INDEX = re.compile(r"0|[1-9]\d*")


def get_prop(o: Any, key: Any) -> Any:
    """`o[key]` for a non-null `o`: object fields, list and string indexes, and `length`."""
    k = key if isinstance(key, str) else js_str(key)
    if isinstance(o, dict):
        return o.get(k, UNDEFINED)
    if isinstance(o, (list, str)):
        if k == "length":
            return len(o)
        if _INDEX.fullmatch(k) and int(k) < len(o):
            return o[int(k)]
    return UNDEFINED


def arr(v: Any) -> list:
    return v if isinstance(v, list) else []


def pick(r: Any, f: Any) -> Any:
    """A row's field, or the row itself when no field is given."""
    if is_nullish(f):
        return r
    if isinstance(r, (dict, list)):
        return get_prop(r, js_str(f))
    return UNDEFINED


_JS_NUMBER = re.compile(r"[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?")


def to_number(v: Any) -> float:
    """`Number(v)` for the values the language can produce."""
    if v is UNDEFINED:
        return math.nan
    if v is None:
        return 0.0
    if isinstance(v, bool):
        return 1.0 if v else 0.0
    if is_number(v):
        return float(v)
    if isinstance(v, str):
        s = v.strip()
        if s == "":
            return 0.0
        if _JS_NUMBER.fullmatch(s):
            return float(s)
        m = re.fullmatch(r"([+-]?)Infinity", s)
        if m:
            return -math.inf if m.group(1) == "-" else math.inf
        low = s.lower()
        for prefix, base in (("0x", 16), ("0o", 8), ("0b", 2)):
            if low.startswith(prefix):
                try:
                    return float(int(s[2:], base))
                except ValueError:
                    return math.nan
        return math.nan
    if isinstance(v, list):
        if not v:
            return 0.0
        if len(v) == 1:
            return to_number(js_str(v[0]))
    return math.nan


def num(v: Any) -> float:
    """Coerces numbers and numeric strings to a finite number, anything else to 0."""
    if is_finite_number(v):
        return float(v)
    if isinstance(v, str) and v.strip() != "":
        n = to_number(v)
        if math.isfinite(n):
            return n
    return 0.0


def truthy(v: Any) -> bool:
    """JavaScript truthiness: empty lists and objects are truthy, NaN is falsy."""
    if v is None or v is UNDEFINED or v is False:
        return False
    if is_number(v):
        return v != 0 and not math.isnan(v)
    if isinstance(v, str):
        return v != ""
    return True


def strict_eq(a: Any, b: Any) -> bool:
    """`a === b`: no coercion, identity for lists and objects."""
    if is_number(a) and is_number(b):
        return a == b
    if isinstance(a, (list, dict)) or isinstance(b, (list, dict)):
        return a is b
    if type(a) is not type(b):
        return False
    return a == b


def same_value_zero(a: Any, b: Any) -> bool:
    """Equality used by `includes`, `Set` and `Map`: like `===` but NaN equals NaN."""
    if is_number(a) and is_number(b) and math.isnan(a) and math.isnan(b):
        return True
    return strict_eq(a, b)


def js_div(a: float, b: float) -> float:
    """`a / b` with IEEE results for a zero divisor instead of an exception."""
    if b != 0:
        return a / b
    if a == 0 or math.isnan(a):
        return math.nan
    return math.copysign(math.inf, a) * math.copysign(1, b)


def js_round(x: float) -> float:
    """`Math.round`: halves round toward +infinity."""
    if not math.isfinite(x):
        return x
    return float(math.floor(x + 0.5))


def _num_str(x: Any) -> str:
    if isinstance(x, int):
        if abs(x) < 10 ** 21:
            return str(x)
        x = float(x)
    if math.isnan(x):
        return "NaN"
    if math.isinf(x):
        return "Infinity" if x > 0 else "-Infinity"
    if x == 0:
        return "0"
    sign = "-" if x < 0 else ""
    d = Decimal(repr(abs(x))).normalize()
    _, digit_tuple, exp = d.as_tuple()
    digits = "".join(map(str, digit_tuple))
    k = len(digits)
    n = exp + k
    if k <= n <= 21:
        body = digits + "0" * (n - k)
    elif 0 < n <= 21:
        body = digits[:n] + "." + digits[n:]
    elif -6 < n <= 0:
        body = "0." + "0" * (-n) + digits
    else:
        e = n - 1
        body = digits[0] + ("." + digits[1:] if k > 1 else "") + "e" + ("+" if e >= 0 else "-") + str(abs(e))
    return sign + body


def js_str(v: Any) -> str:
    """`String(v)`."""
    if v is UNDEFINED:
        return "undefined"
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if is_number(v):
        return _num_str(v)
    if isinstance(v, str):
        return v
    if isinstance(v, list):
        return ",".join("" if is_nullish(x) else js_str(x) for x in v)
    return "[object Object]"


def to_fixed(x: float, digits: int) -> str:
    """`Number.prototype.toFixed`: rounds the exact binary value, ties away from zero."""
    if not math.isfinite(x):
        return _num_str(x)
    if abs(x) >= 1e21:
        return _num_str(x)
    if x == 0:
        x = 0.0
    q = Decimal(x).quantize(Decimal(1).scaleb(-digits), rounding=ROUND_HALF_UP)
    return format(q, "f")


def _locale_int(x: float) -> str:
    """`Math.round(x).toLocaleString('en-US')` for an integer-valued x."""
    return "{:,}".format(int(x))


def _compact(v: float) -> str:
    a = abs(v)
    if a >= 1e9:
        return to_fixed(v / 1e9, 1) + "B"
    if a >= 1e6:
        return to_fixed(v / 1e6, 1 if a >= 1e7 else 2) + "M"
    if a >= 1e3:
        return to_fixed(v / 1e3, 0 if a >= 1e4 else 1) + "K"
    return js_str(js_round(v * 10) / 10)


def fmt(v: Any, kind: Any = "number") -> str:
    """Formats a value for display, like `fmt` in `visualization/utils.tsx`."""
    if is_nullish(v) or (is_number(v) and not math.isfinite(v)):
        return "–"
    if not is_number(v):
        return js_str(v)
    a = abs(v)
    if kind == "percent":
        s = to_fixed(v * 100, 1)
        return (s[:-2] if s.endswith(".0") else s) + "%"
    if kind == "currency":
        if a >= 1e6:
            body = to_fixed(v / 1e6, 2) + "M"
        elif a >= 1e5:
            body = js_str(js_round(v / 1e3)) + "K"
        else:
            body = _locale_int(js_round(v))
        return CURRENCY + " " + body
    if kind == "compact":
        return _compact(v)
    if is_integer(v):
        return _locale_int(v)
    if a < 100:
        return js_str(js_round(v * 100) / 100)
    return _locale_int(js_round(v))


_DROP = object()


def to_json_value(v: Any) -> Any:
    """What `JSON.parse(JSON.stringify(v))` gives: `UNDEFINED` and `Opaque` values vanish from objects
    and become null in lists, non-finite numbers become null, and PENDING is `{"__pending": true}`.
    Returns `UNDEFINED` when the whole value would serialize to nothing."""
    out = _json(v)
    return UNDEFINED if out is _DROP else out


def _json(v: Any) -> Any:
    if v is UNDEFINED or isinstance(v, Opaque):
        return _DROP
    if v is PENDING:
        return {"__pending": True}
    if v is None or isinstance(v, (bool, str)):
        return v
    if is_number(v):
        return v if math.isfinite(v) else None
    if isinstance(v, (list, tuple)):
        return [None if x is _DROP else x for x in map(_json, v)]
    if isinstance(v, dict):
        out = {}
        for k, x in v.items():
            j = _json(x)
            if j is not _DROP:
                out[str(k)] = j
        return out
    return _DROP


def js_json(v: Any) -> str:
    """`JSON.stringify(v)` (compact). Returns "null" for a value that serializes to nothing."""
    j = to_json_value(v)
    if j is UNDEFINED:
        return "null"
    return json.dumps(j, ensure_ascii=False, separators=(",", ":"), allow_nan=False, default=str)


def js_quote(s: str) -> str:
    """`JSON.stringify` of a string."""
    return json.dumps(s, ensure_ascii=False)
