"""Component catalog: the only components and props the model may use.

Prop types:
  "string" | "number" | "boolean" | "any" | "fn" | ("enum", [...])
"""
from typing import Dict, List, Tuple, Union

PropType = Union[str, Tuple[str, List[str]]]

RADIUS = ("enum", ["none", "sm", "md", "lg", "xl", "2xl", "full"])
TONE = ("enum", ["default", "secondary", "success", "warning", "danger", "info", "accent"])
ALIGN = ("enum", ["start", "center", "end", "stretch", "baseline"])
JUSTIFY = ("enum", ["start", "center", "end", "between", "around"])
BACKGROUND = ("enum", ["none", "surface", "surface-secondary", "accent", "success", "warning", "danger", "info"])

LAYOUT_PROPS: Dict[str, PropType] = {
    "gap": "number",
    "padding": "number",
    "align": ALIGN,
    "justify": JUSTIFY,
    "wrap": "boolean",
    "border": "boolean",
    "radius": RADIUS,
    "background": BACKGROUND,
    "width": "any",
    "maxWidth": "any",
    "flex": "number",
}

CATALOG: Dict[str, Dict[str, PropType]] = {
    # text
    "text": {"size": ("enum", ["sm", "md", "lg"]), "color": TONE, "weight": ("enum", ["normal", "medium", "bold"]), "align": ("enum", ["left", "center", "right"]), "tabularNums": "boolean"},
    "title": {"size": ("enum", ["sm", "md", "lg", "xl", "2xl", "3xl"]), "color": TONE, "tabularNums": "boolean", "align": ("enum", ["left", "center", "right"])},
    "caption": {"color": TONE, "tabularNums": "boolean"},
    "bold": {},
    "italic": {},
    "code": {},
    "link": {"href": "string"},
    "list": {"ordered": "boolean"},
    "list-item": {},
    # layout
    "box": dict(LAYOUT_PROPS, direction=("enum", ["row", "col"])),
    "row": dict(LAYOUT_PROPS),
    "card": dict(LAYOUT_PROPS),
    "grid": dict(LAYOUT_PROPS, columns="number"),
    "grid-item": {"span": "number"},
    "divider": {},
    # display
    "badge": {"color": TONE},
    "icon": {"name": "string", "size": ("enum", ["sm", "md", "lg", "xl"]), "inline": "boolean", "color": TONE},
    "progress": {"value": "number", "max": "number", "color": TONE},
    "chart": {
        "type": ("enum", ["bar", "line", "area", "pie"]),
        "data": "any",
        "x": "string",
        "series": "any",
        "height": "number",
        "title": "string",
        "stacked": "boolean",
    },
    "table": {},
    "table-row": {"header": "boolean"},
    "table-cell": {"align": ("enum", ["left", "center", "right"])},
    # inputs
    "button": {"onClick": "fn", "variant": ("enum", ["primary", "secondary", "ghost"]), "block": "boolean", "disabled": "boolean", "size": ("enum", ["sm", "md", "lg"])},
    "slider": {"min": "number", "max": "number", "step": "number", "value": "any", "onChange": "fn", "label": "string"},
    "input": {"value": "any", "onChange": "fn", "placeholder": "string", "type": ("enum", ["text", "number"]), "label": "string"},
    "select": {"value": "any", "onChange": "fn", "options": "any", "label": "string"},
    "segmented-control": {"value": "any", "onChange": "fn", "options": "any", "block": "boolean", "size": ("enum", ["sm", "md", "lg"])},
    "checkbox": {"checked": "any", "onChange": "fn", "label": "string"},
    "radio-group": {"value": "any", "onChange": "fn", "options": "any", "label": "string"},
}

COMMON_PROPS: Dict[str, PropType] = {"key": "any"}

# Components whose text children are inline (no Markdown block parsing).
INLINE_ONLY = {"text", "title", "caption", "bold", "italic", "code", "link", "badge", "button", "list-item", "table-cell"}


def prop_type(component: str, prop: str):
    spec = CATALOG.get(component)
    if spec is None:
        return None
    if prop in spec:
        return spec[prop]
    return COMMON_PROPS.get(prop)


def catalog_summary() -> str:
    """Human-readable catalog for the system prompt."""
    lines = []
    for name, props in CATALOG.items():
        parts = []
        for p, t in props.items():
            if isinstance(t, tuple):
                parts.append(f'{p}="{"|".join(t[1])}"')
            else:
                parts.append(f"{p}:{t}")
        lines.append(f"- <{name}> " + (", ".join(parts) if parts else "(no props)"))
    return "\n".join(lines)
