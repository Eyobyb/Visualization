import json
import shutil
import subprocess
from pathlib import Path

import pytest

from app.dil import compile_dil

HARNESS = Path(__file__).parent / "js_harness.mjs"

TEAM_PLAN = """## Team plan estimate

Drag the slider to see the **monthly price** for your team.

{@body const [seats,setSeats] = DIL.useState(8)}
{@body const price = seats*29}
<box border padding={3} gap={2}>
  <slider min={1} max={50} value={seats} onChange={setSeats}/>
  <title size="xl">${price}/mo</title>
</box>
"""

DASHBOARD = """# Sales

{@body const [metric,setMetric] = DIL.useState("revenue")}
{@body const data = [{m:"Jan",revenue:10,units:3},{m:"Feb",revenue:14,units:5}]}
{@body const total = data.reduce((s,d)=>s+d[metric],0)}

<segmented-control value={metric} onChange={setMetric} options={[{"label":"Revenue","value":"revenue"},{"label":"Units","value":"units"}]}/>
{#if metric === "revenue"}
  <badge color="success">Money</badge>
{:else if metric === "units"}
  <badge color="info">Volume</badge>
{:else}
  <badge>?</badge>
{/if}
<grid columns={2} gap={2}>
  {#each data as d, i}
    <grid-item><caption>{d.m}</caption><title size="lg">{d[metric]}</title></grid-item>
  {/each}
</grid>
<chart type="bar" data={data} x="m" series={[{"key":metric,"label":"Value"}]}/>

| Month | Note |
|---|---|
| Jan | slow |

- Total is {total}
- Second **item**
"""


def run_js(results):
    if shutil.which("node") is None:
        pytest.skip("node is required to execute compiled programs")
    payload = json.dumps([{"code": r.code, "constants": r.constants} for r in results])
    out = subprocess.run(["node", str(HARNESS)], input=payload, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def find(tree, type_):
    for node in tree:
        if isinstance(node, dict):
            if node["type"] == type_:
                yield node
            yield from find(node["children"], type_)


def test_team_plan_golden():
    r = compile_dil(TEAM_PLAN)
    assert 'DIL.useState(8, { key: "seats" })' in r.code
    assert "const price = __dilSafe(() => (seats*29), undefined);" in r.code
    assert '__dil.jsx("box", { "border": true, "padding": 3, "gap": 2 }' in r.code
    assert r.constants == {
        "0": "Team plan estimate",
        "1": "Drag the slider to see the ",
        "2": "monthly price",
        "3": " for your team.",
        "4": "$",
        "5": "/mo",
    }
    assert r.diagnostics == []
    assert r.fallback_markdown.startswith("## Team plan estimate\n\nDrag the slider to see the **monthly price**")

    (res,) = run_js([r])
    tree = res["tree"]
    assert [n["type"] for n in tree] == ["title", "text", "box"]
    (slider,) = find(tree, "slider")
    assert slider["props"] == {"min": 1, "max": 50, "value": 8, "onChange": "<fn>"}
    price_title = list(find(tree, "title"))[1]
    assert price_title["children"] == ["$", "232", "/mo"]


def test_invalid_props_are_dropped_with_diagnostics():
    r = compile_dil('<box gap="1"><icon name="x" fill="red"/></box><mystery/>')
    codes = [d["code"] for d in r.diagnostics]
    assert codes == ["invalid_literal", "unknown_prop", "unknown_component"]
    assert '"gap"' not in r.code and '"fill"' not in r.code and "mystery" not in r.code


def test_dashboard_blocks_and_markdown():
    r = compile_dil(DASHBOARD)
    assert r.diagnostics == []
    (res,) = run_js([r])
    tree = res["tree"]
    badges = list(find(tree, "badge"))
    assert len(badges) == 1 and badges[0]["children"] == ["Money"]
    assert len(list(find(tree, "grid-item"))) == 2
    assert len(list(find(tree, "chart"))) == 1
    assert len(list(find(tree, "table-row"))) == 2
    items = list(find(tree, "list-item"))
    assert items[0]["children"] == ["Total is", "24"] or items[0]["children"] == ["Total is ", "24"]


@pytest.mark.parametrize("source", [TEAM_PLAN, DASHBOARD], ids=["team_plan", "dashboard"])
def test_every_prefix_compiles_and_runs(source):
    results = [compile_dil(source[:n]) for n in range(len(source) + 1)]
    outputs = run_js(results)
    errors = [(n, o["error"]) for n, o in enumerate(outputs) if "error" in o]
    assert errors == []


def test_partial_tag_is_dropped_and_recorded():
    cut = TEAM_PLAN.index("<slider") + 10
    r = compile_dil(TEAM_PLAN[:cut])
    assert "slider" not in r.code
    assert any(d["code"] == "unterminated_tag" for d in r.diagnostics)


def test_partial_body_statement_is_dropped():
    r = compile_dil("Hello\n{@body const [a,setA] = DIL.useSt")
    assert "useState" not in r.code
    assert r.diagnostics[0]["code"] == "unterminated_braced_value"
    assert r.constants == {"0": "Hello"}


def test_open_element_with_content_is_closed():
    r = compile_dil("<box gap={2}>\n  <text>partial te")
    (res,) = run_js([r])
    box = res["tree"][0]
    assert box["type"] == "box"
    assert box["children"][0]["children"] == ["partial te"]
    assert {d["code"] for d in r.diagnostics} == {"unclosed_element"}
