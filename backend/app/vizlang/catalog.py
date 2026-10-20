"""The component catalog, exported from the TypeScript specs by `npm run export-vizlang`."""
import json
from pathlib import Path
from typing import Any, Dict

from .jsvalues import PENDING, is_finite_number, is_integer, is_node, is_number, js_json, same_value_zero

CATALOG: Dict[str, Any] = json.loads((Path(__file__).with_name("catalog.json")).read_text(encoding="utf-8"))

COMPONENTS: Dict[str, Dict[str, Any]] = CATALOG["components"]
FUNCTION_DOCS: Dict[str, Dict[str, str]] = CATALOG["functions"]
ACTION_DOCS: Dict[str, Dict[str, str]] = CATALOG["actions"]
ICON_NAMES = frozenset(CATALOG["icons"])

_LABELS = {
    "space": "0–8", "nodes": "node[]", "data": "rows[]", "state": "$variable",
    "action": "action", "icon": "icon name", "fields": "field | field[]",
}


def check_type(ps: Dict[str, Any], v: Any) -> bool:
    """Whether an evaluated value fits a prop. Values that fail are dropped with `invalid_literal`."""
    t = ps["type"]
    if t == "string":
        return isinstance(v, str) or is_number(v)
    if t == "number":
        return is_finite_number(v)
    if t == "bool":
        return isinstance(v, bool)
    if t == "enum":
        return any(same_value_zero(v, x) for x in ps.get("values") or [])
    if t == "space":
        return is_integer(v) and 0 <= v <= 8
    if t == "node":
        return v is PENDING or isinstance(v, (str, list)) or is_number(v) or is_node(v)
    if t in ("nodes", "data", "list"):
        return isinstance(v, list)
    if t == "field":
        return isinstance(v, str)
    if t == "fields":
        return isinstance(v, str) or (isinstance(v, list) and all(isinstance(x, str) for x in v))
    if t == "icon":
        return isinstance(v, str) and v in ICON_NAMES
    return True


def type_label(ps: Dict[str, Any]) -> str:
    """How a prop's type reads in diagnostics and in the prompt."""
    if ps["type"] == "enum":
        return " | ".join(js_json(v) for v in ps.get("values") or [])
    return _LABELS.get(ps["type"], ps["type"])
