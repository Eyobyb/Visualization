"""Renders the catalog as the reference section of the system prompt."""
from typing import Any, Dict, List, Optional

from .catalog import CATALOG, type_label
from .jsvalues import js_json

FAMILY_ORDER = ("Layout", "Text", "Prose", "Cards", "Data", "Inputs", "Media")


def _component(spec: Dict[str, Any]) -> List[str]:
    sig = ", ".join(spec["pos"] + ["…"]) if len(spec["props"]) > len(spec["pos"]) else ", ".join(spec["pos"])
    lines = ["#### " + spec["name"] + "(" + sig + ")", spec["desc"]]
    for name, ps in spec["props"].items():
        line = "- `" + name + "`: " + type_label(ps)
        if ps.get("req"):
            line += ", required"
        if "def" in ps:
            line += ", default " + js_json(ps["def"])
        lines.append(line + ". " + ps["desc"])
    if spec["examples"]:
        lines.append("```\n" + spec["examples"][0]["src"] + "\n```")
    return lines


def catalog_prompt() -> str:
    """Components by family with props and one example each, then functions, actions and icons."""
    by_family: Dict[str, List[Dict[str, Any]]] = {}
    for spec in CATALOG["components"].values():
        by_family.setdefault(spec["family"], []).append(spec)
    families = [f for f in FAMILY_ORDER if f in by_family] + sorted(set(by_family) - set(FAMILY_ORDER))
    out: List[str] = [
        "## Components",
        "Positional arguments fill the props in the order shown in parentheses. "
        "Examples read sample bindings such as `data.weekly`; use only the bindings listed for the current message.",
    ]
    for fam in families:
        out.append("\n### " + fam)
        for spec in by_family[fam]:
            out.append("\n".join(_component(spec)))
    out.append("\n## Functions\nPure helpers, usable anywhere in an expression.")
    out += ["- `" + f["sig"] + "`: " + f["desc"] for f in CATALOG["functions"].values()]
    out.append("\n## Actions\nOnly valid as an `onClick` value, alone or as a list.")
    out += ["- `" + a["sig"] + "`: " + a["desc"] for a in CATALOG["actions"].values()]
    out.append("\n## Icons\n" + ", ".join(CATALOG["icons"]))
    return "\n".join(out)


def preset_source(layout: Optional[str]) -> Optional[str]:
    for p in CATALOG.get("presets", []):
        if p["id"] == layout:
            return p["src"]
    return None
