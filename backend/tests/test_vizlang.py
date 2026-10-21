"""Parity between the Python port and the TypeScript compiler.

The fixtures come from `npm run export-vizlang` in `frontend/`; regenerate them after
changing the TypeScript compiler or catalog.
"""
import json
import math
import random
from pathlib import Path

import pytest

from app.vizlang import (
    PENDING, UNDEFINED, StatementSplitter, compile_program, data_refs, image_jobs, split_statements, to_json_value,
    to_markdown,
)
from app.vizlang.jsvalues import fmt, is_node, js_round, js_str, strict_eq, to_fixed, truthy

CASES = json.loads((Path(__file__).parent / "fixtures" / "vizlang_cases.json").read_text(encoding="utf-8"))
DATA = CASES["data"]
SOURCES = {p["id"]: p["src"] for p in CASES["programs"]}


def same(a, b) -> bool:
    """JSON equality that keeps `true` and `1` apart but lets `3` equal `3.0`, as in JavaScript."""
    if isinstance(a, bool) or isinstance(b, bool):
        return type(a) is type(b) and a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return a == b
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(same(a[k], b[k]) for k in a)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    return type(a) is type(b) and a == b


def assert_json(actual, case, key):
    value = to_json_value(actual)
    if key not in case:
        assert value is UNDEFINED, key + " should be undefined"
    else:
        assert same(value, case[key]), json.dumps(value, ensure_ascii=False)[:2000]


def shape(v, out=None):
    out = [] if out is None else out
    if v is PENDING:
        out.append("…")
    elif is_node(v):
        out.append(v["name"] + "@" + v["key"])
        for x in v["props"].values():
            shape(x, out)
    elif isinstance(v, list):
        for x in v:
            shape(x, out)
    elif isinstance(v, dict):
        for x in v.values():
            shape(x, out)
    return out


@pytest.mark.parametrize("case", CASES["split"], ids=lambda c: ("stream " if c["streaming"] else "") + c["src"][:40])
def test_split_parity(case):
    out = [{"text": p.text, "line": p.line, "partial": p.partial} for p in split_statements(case["src"], case["streaming"])]
    assert out == case["out"]


@pytest.mark.parametrize("case", CASES["programs"], ids=lambda c: c["id"])
def test_program_parity(case):
    r = compile_program(case["src"], data=DATA)
    assert r.diagnostics == case["diagnostics"]
    assert r.statements == case["statements"]
    assert_json(r.root, case, "root")
    assert_json(r.defaults, case, "defaults")
    assert_json(r.state, case, "state")


@pytest.mark.parametrize("case", CASES["streams"], ids=lambda c: c["program"] + " @" + str(c["n"]))
def test_stream_parity(case):
    r = compile_program(SOURCES[case["program"]][:case["n"]], streaming=True, data=DATA)
    assert r.diagnostics == case["diagnostics"]
    assert shape(r.root) == case["shape"]


@pytest.mark.parametrize("case", CASES["state"], ids=lambda c: c["program"])
def test_user_state_parity(case):
    r = compile_program(SOURCES[case["program"]], data=DATA, user_state=case["user_state"])
    assert r.diagnostics == case["diagnostics"]
    assert_json(r.root, case, "root")
    assert_json(r.state, case, "state")


@pytest.mark.parametrize("pid", sorted(SOURCES))
def test_splitter_random_chunks(pid):
    src = SOURCES[pid]
    expected = [(p.text, p.line, p.partial) for p in split_statements(src)]
    rng = random.Random(pid)
    for _ in range(5):
        sp = StatementSplitter()
        got = []
        i = 0
        while i < len(src):
            n = rng.randint(1, 12)
            for p in sp.feed(src[i:i + n]):
                assert not p.partial
                got.append((p.text, p.line, p.partial))
            i += n
        got += [(p.text, p.line, p.partial) for p in sp.finish()]
        assert got == expected


def test_splitter_yields_each_statement_once_it_completes():
    sp = StatementSplitter()
    assert sp.feed('root = Col([\n  Text("a"),') == []
    assert [p.text for p in sp.feed('\n])\nx = "a // b"\n')] == ['root = Col([\n  Text("a"),\n])', 'x = "a // b"']
    assert sp.feed("y = 1") == []
    assert [(p.text, p.partial) for p in sp.finish()] == [("y = 1", False)]


def test_data_refs_on_dashboard():
    r = compile_program(SOURCES["preset: dashboard"], data=DATA)
    assert data_refs(r.stmts.values()) == ["kpis", "weekly", "sales_by_region", "top_products"]
    assert data_refs(r.stmts["trend"]) == ["weekly"]


def test_image_jobs_on_moodboard():
    r = compile_program(SOURCES["preset: moodboard"], data=DATA)
    jobs = image_jobs(r.root)
    assert [k for k, _ in jobs] == ["photos.0", "photos.1", "photos.2", "photos.3"]
    assert jobs[0][1] == "traditional jebena coffee pot on charcoal"


def test_image_jobs_single_image():
    r = compile_program('root = Col([photo])\nphoto = AsyncImage("injera platter", caption: "x")')
    assert image_jobs(r.root) == [("photo", "injera platter")]


def test_image_jobs_product_grid_items():
    r = compile_program('root = ProductGrid(shop)\nshop = [{name: "A", image: "laptop a"}, {name: "B"}, {name: "C", image: "laptop c"}]')
    assert image_jobs(r.root) == [("root.0", "laptop a"), ("root.2", "laptop c")]


def test_to_markdown_has_title_and_kpis():
    md = to_markdown(compile_program(SOURCES["preset: dashboard"], data=DATA).root)
    assert md.startswith("# Q3 sales review")
    assert "- **Revenue:** ETB 4.82M" in md
    assert "- **Orders:** 12,863" in md
    assert "- **Refund rate:** 2.1%" in md


def test_action_props_are_dropped_from_json():
    r = compile_program('root = Button("Go", onClick: @NewTurn("hi"))')
    assert "onClick" in r.root["props"]
    assert "onClick" not in to_json_value(r.root)["props"]


@pytest.mark.parametrize("value, expected", [
    (3.0, "3"), (0.1 + 0.2, "0.30000000000000004"), (1e21, "1e+21"), (1e16, "10000000000000000"),
    (1e-7, "1e-7"), (0.000001, "0.000001"), (-1.5, "-1.5"), (math.nan, "NaN"), (math.inf, "Infinity"),
    (True, "true"), (None, "null"), (UNDEFINED, "undefined"), ([1, None, [2, "a"]], "1,,2,a"), ({}, "[object Object]"),
])
def test_js_str(value, expected):
    assert js_str(value) == expected


def test_js_semantics():
    assert js_round(2.5) == 3 and js_round(-2.5) == -2
    assert to_fixed(0.25, 1) == "0.3" and to_fixed(-0.04, 1) == "-0.0" and to_fixed(1.005, 2) == "1.00"
    assert not strict_eq(True, 1) and strict_eq(1, 1.0) and not strict_eq([], [])
    assert truthy([]) and truthy({}) and not truthy(0) and not truthy("") and not truthy(math.nan)
    assert fmt(1234567, "currency") == "ETB 1.23M" and fmt(-1234.0) == "-1,234" and fmt(None) == "–"
