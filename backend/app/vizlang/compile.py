"""Compiles and evaluates a program. Mirrors `frontend/src/vizlang/compile.ts`.

The server runs this to validate statements while they stream, so the diagnostics it
reports (and feeds back to the model) are exactly the ones the browser shows.
"""
import copy
import math
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

from .catalog import COMPONENTS, check_type, type_label
from .functions import ACTIONS, FUNCS
from .jsvalues import (
    PENDING, UNDEFINED, Opaque, get_prop, is_node, is_nullish, is_number, js_quote, js_round, js_str, num,
    strict_eq, to_number, truthy,
)
from .lexer import LangError
from .parser import Expr, Statement, parse_statement, split_statements


@dataclass
class Action(Opaque):
    """An `onClick` handler. Runs in the browser; the server keeps it only so the prop counts as set."""

    expr: Expr
    where: str


@dataclass
class CompileResult:
    root: Any
    diagnostics: List[Dict[str, Any]]
    # Declared `$variable` values.
    defaults: Dict[str, Any]
    # `defaults` overlaid with `user_state`.
    state: Dict[str, Any]
    statements: int
    ms: float
    stmts: Dict[str, Statement] = field(default_factory=dict)


class _Env:
    def __init__(self, stmts, data, diag, streaming):
        self.stmts: Dict[str, Statement] = stmts
        self.data: Dict[str, Any] = data
        self.diag = diag
        self.streaming: bool = streaming
        self.state: Dict[str, Any] = {}
        self.visiting: Set[str] = set()
        self.cache: Dict[str, Any] = {}


def _short(v: Any) -> str:
    if isinstance(v, str):
        s = js_quote(v)
    elif isinstance(v, list):
        s = "a list"
    elif is_node(v):
        s = v["name"] + "(…)"
    elif isinstance(v, dict):
        s = "an object"
    else:
        s = js_str(v)
    return s[:26] + "…" if len(s) > 28 else s


def _to_primitive(v: Any) -> Any:
    return js_str(v) if isinstance(v, (list, dict)) else v


def _compare(op: str, a: Any, b: Any) -> bool:
    a, b = _to_primitive(a), _to_primitive(b)
    if isinstance(a, str) and isinstance(b, str):
        x, y = a, b
    else:
        x, y = to_number(a), to_number(b)
        if math.isnan(x) or math.isnan(y):
            return False
    if op == "<":
        return x < y
    if op == ">":
        return x > y
    if op == "<=":
        return x <= y
    return x >= y


def _concat_str(x: Any) -> str:
    if is_nullish(x):
        return ""
    if is_number(x):
        return js_str(js_round(x * 100) / 100)
    return js_str(x)


def _binop(op: str, a: Any, b: Any) -> Any:
    if op == "+":
        if isinstance(a, str) or isinstance(b, str):
            return _concat_str(a) + _concat_str(b)
        return num(a) + num(b)
    if op == "-":
        return num(a) - num(b)
    if op == "*":
        return num(a) * num(b)
    if op == "/":
        return 0 if num(b) == 0 else num(a) / num(b)
    if op == "%":
        return 0 if num(b) == 0 else math.fmod(num(a), num(b))
    if op == "==":
        return strict_eq(a, b)
    if op == "!=":
        return not strict_eq(a, b)
    if op in ("<", ">", "<=", ">="):
        return _compare(op, a, b)
    if op == "&&":
        return b if truthy(a) else a
    if op == "||":
        return a if truthy(a) else b
    return UNDEFINED


def _eval_ref(name: str, env: _Env, where: str) -> Any:
    if name in env.cache:
        return env.cache[name]
    st = env.stmts.get(name)
    if st is None or st.is_state:
        if env.streaming:
            return PENDING
        env.diag("unresolved_ref", '"' + name + '" is used but never defined', where)
        return UNDEFINED
    if name in env.visiting:
        env.diag("cycle", '"' + name + '" refers to itself', name)
        return UNDEFINED
    env.visiting.add(name)
    try:
        v = _eval(st.expr, env, name, name)
    except Exception as e:  # noqa: BLE001 - any evaluation failure becomes a diagnostic
        env.diag("eval_error", str(e), name)
        v = UNDEFINED
    env.visiting.discard(name)
    env.cache[name] = v
    return v


def _eval(n: Expr, env: _Env, where: str, key: str) -> Any:
    k = n["k"]
    if k == "lit":
        return n["v"]
    if k == "state":
        if n["name"] in env.state:
            return env.state[n["name"]]
        if env.streaming:
            return PENDING
        env.diag("unknown_state", "$" + n["name"] + " is used but never declared", where)
        return UNDEFINED
    if k == "ref":
        return env.data if n["name"] == "data" else _eval_ref(n["name"], env, where)
    if k == "member":
        b = _eval(n["o"], env, where, key)
        if b is PENDING:
            return PENDING
        if is_nullish(b):
            return UNDEFINED
        if b is env.data and n["f"] not in env.data:
            env.diag("missing_binding", "data." + n["f"] + " was not injected by the server", where)
            return UNDEFINED
        return get_prop(b, n["f"])
    if k == "index":
        b = _eval(n["o"], env, where, key)
        i = _eval(n["i"], env, where, key)
        if b is PENDING or i is PENDING:
            return PENDING
        return UNDEFINED if is_nullish(b) else get_prop(b, i)
    if k == "list":
        return [_eval(it, env, where, key + "." + str(i)) for i, it in enumerate(n["items"])]
    if k == "obj":
        o: Dict[str, Any] = {}
        for ek, ev in n["entries"]:
            o[ek] = _eval(ev, env, where, key + "." + ek)
        return o
    if k == "un":
        v = _eval(n["e"], env, where, key)
        if v is PENDING:
            return PENDING
        return -num(v) if n["op"] == "-" else not truthy(v)
    if k == "bin":
        a = _eval(n["l"], env, where, key)
        b = _eval(n["r"], env, where, key)
        if a is PENDING or b is PENDING:
            return PENDING
        return _binop(n["op"], a, b)
    if k == "tern":
        c = _eval(n["c"], env, where, key)
        if c is PENDING:
            return PENDING
        return _eval(n["a"] if truthy(c) else n["b"], env, where, key)
    if k == "fn":
        return _eval_fn(n, env, where, key)
    if k == "comp":
        return _eval_component(n, env, where, key)
    return UNDEFINED


def _eval_fn(n: Expr, env: _Env, where: str, key: str) -> Any:
    name = n["name"]
    if name in ACTIONS:
        env.diag("action_outside_handler", "@" + name + " only works inside onClick", where)
        return UNDEFINED
    f = FUNCS.get(name)
    if f is None:
        env.diag("unknown_function", "@" + name + " is not a built-in function", where)
        return UNDEFINED
    args = [_eval(a["e"], env, where, key + ".a" + str(i)) for i, a in enumerate(n["args"])]
    if any(a is PENDING for a in args):
        return PENDING
    try:
        return f(*args)
    except Exception as e:  # noqa: BLE001
        env.diag("eval_error", "@" + name + ": " + str(e), where)
        return UNDEFINED


def _eval_component(n: Expr, env: _Env, where: str, key: str) -> Any:
    name = n["name"]
    spec = COMPONENTS.get(name)
    if spec is None:
        env.diag("unknown_component", name + " is not in the catalog, so it was dropped", where)
        return UNDEFINED
    props: Dict[str, Any] = {}
    pos = 0
    for a in n["args"]:
        pname = a["name"]
        if not pname:
            pname = spec["pos"][pos] if pos < len(spec["pos"]) else None
            pos += 1
            if not pname:
                env.diag(
                    "extra_argument",
                    name + " takes " + str(len(spec["pos"])) + " positional argument(s); the extra one was dropped",
                    where,
                )
                continue
        ps = spec["props"].get(pname)
        if ps is None:
            env.diag("unknown_prop", name + ' has no prop "' + pname + '", so it was dropped', where)
            continue
        if ps["type"] == "action":
            props[pname] = Action(a["e"], where)
            continue
        if ps["type"] == "state":
            e = a["e"]
            if e["k"] != "state":
                env.diag("invalid_literal", name + "." + pname + " must be a $variable", where)
                continue
            if e["name"] not in env.state and not env.streaming:
                env.diag("unknown_state", "$" + e["name"] + " is bound but never declared", where)
            props[pname] = {"$state": e["name"]}
            continue
        v = _eval(a["e"], env, where, key + "." + pname)
        if v is PENDING:
            props[pname] = PENDING
            continue
        if is_nullish(v):
            continue
        if not check_type(ps, v):
            env.diag("invalid_literal", name + "." + pname + " got " + _short(v) + ", expected " + type_label(ps), where)
            continue
        props[pname] = v
    for pn, ps in spec["props"].items():
        if props.get(pn, UNDEFINED) is UNDEFINED and "def" in ps:
            props[pn] = copy.deepcopy(ps["def"])
        if ps.get("req") and props.get(pn, UNDEFINED) is UNDEFINED:
            env.diag("missing_prop", name + ' needs "' + pn + '"', where)
    return {"__c": True, "name": name, "props": props, "key": key}


def compile_program(
    src: str,
    streaming: bool = False,
    data: Optional[Dict[str, Any]] = None,
    user_state: Optional[Dict[str, Any]] = None,
) -> CompileResult:
    """Compiles and evaluates a program. Never raises: problems become diagnostics, and whatever
    cannot be validated is dropped so the rest still renders.

    `streaming` treats missing names as not yet arrived (they evaluate to PENDING) and marks
    problems more text may fix as transient. `data` holds the bindings read as `data.<id>`.
    """
    data = {} if data is None else data
    user_state = user_state or {}
    t0 = time.perf_counter()
    diagnostics: List[Dict[str, Any]] = []
    seen: Set[str] = set()

    def diag(code: str, msg: str, where: str, transient: bool = False) -> None:
        k = code + "|" + msg + "|" + where
        if k in seen:
            return
        seen.add(k)
        diagnostics.append({"code": code, "msg": msg, "where": where, "transient": bool(transient)})

    stmts: Dict[str, Statement] = {}
    for part in split_statements(src, streaming):
        if part.partial:
            where = "line " + str(part.line)
            if streaming:
                diag("streaming", "Line " + str(part.line) + " is still being written; it renders once complete", where, True)
            else:
                diag("unterminated_statement", "Line " + str(part.line) + " never closes its brackets or string", where)
            continue
        try:
            st = parse_statement(part.text, part.line)
        except LangError as e:
            diag("parse_error", str(e), "line " + str(part.line))
            continue
        if st is None:
            continue
        sid = "$" + st.name if st.is_state else st.name
        if sid in stmts:
            diag("duplicate_name", '"' + sid + '" is defined twice; the later one wins', sid)
        stmts[sid] = st

    env = _Env(stmts, data, diag, streaming)
    defaults: Dict[str, Any] = {}
    for st in stmts.values():
        if not st.is_state:
            continue
        try:
            v = _eval(st.expr, env, "$" + st.name, "$" + st.name)
            defaults[st.name] = UNDEFINED if v is PENDING else v
        except Exception as e:  # noqa: BLE001
            diag("eval_error", str(e), "$" + st.name)
    state = dict(defaults)
    for k, v in user_state.items():
        if k in defaults:
            state[k] = v
    env.state = state
    env.cache = {}

    root: Any = None
    if "root" in stmts:
        root = _eval_ref("root", env, "root")
    elif stmts:
        diag("no_root", "Start the program with root = …", "program", streaming)
    ms = (time.perf_counter() - t0) * 1000
    return CompileResult(root, diagnostics, defaults, state, len(stmts), ms, stmts)
