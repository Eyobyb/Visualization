"""DIL tree -> JavaScript program + constants table + fallback Markdown."""
import json
import re
from dataclasses import dataclass
from typing import Dict, List, Optional

from .catalog import CATALOG, prop_type
from .parser import Attr, Body, Diagnostics, EachBlock, Element, Expr, IfBlock, Node, Text, parse

PRELUDE = "function __dilSafe(evaluate, failureValue) {\n  try { return evaluate(); } catch { return failureValue; }\n}\n"

USE_STATE_RE = re.compile(
    r"^(const|let|var)\s+\[\s*([A-Za-z_$][\w$]*)\s*(?:,\s*([A-Za-z_$][\w$]*)\s*)?\]\s*=\s*DIL\.useState\((.*)\)\s*;?\s*$",
    re.S,
)
SIMPLE_DECL_RE = re.compile(r"^(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?)\s*;?\s*$", re.S)
NUMBER_RE = re.compile(r"^-?\d+(\.\d+)?$")
STRING_RE = re.compile(r"""^("([^"\\]|\\.)*"|'([^'\\]|\\.)*')$""")


@dataclass
class CompileResult:
    code: str
    constants: Dict[str, str]
    diagnostics: List[Dict]
    fallback_markdown: str


def _split_top_level(src: str, sep: str = ",") -> List[str]:
    parts, depth, cur, i = [], 0, [], 0
    while i < len(src):
        c = src[i]
        if c in "\"'`":
            j = i + 1
            while j < len(src) and src[j] != c:
                j += 2 if src[j] == "\\" else 1
            cur.append(src[i : j + 1])
            i = j + 1
            continue
        if c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
        if c == sep and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(c)
        i += 1
    parts.append("".join(cur))
    return parts


class Codegen:
    def __init__(self, diags: Diagnostics):
        self.constants: Dict[str, str] = {}
        self.diags = diags

    def const(self, value: str) -> str:
        key = str(len(self.constants))
        self.constants[key] = value
        return f'__dilConstants["{key}"]'

    # -- body statements ---------------------------------------------------

    def body(self, stmt: Body) -> str:
        code = stmt.code.strip()
        m = USE_STATE_RE.match(code)
        if m:
            kw, name, setter, args = m.groups()
            parts = _split_top_level(args)
            target = f"[{name}, {setter}]" if setter else f"[{name}]"
            if len(parts) == 1:
                return f'{kw} {target} = DIL.useState({args.strip()}, {{ key: {json.dumps(name)} }});'
            return f"{kw} {target} = DIL.useState({args.strip()});"
        m = SIMPLE_DECL_RE.match(code)
        if m and len(_split_top_level(m.group(3))) == 1 and ";" not in m.group(3):
            kw, name, init = m.groups()
            return f"{kw} {name} = __dilSafe(() => ({init}), undefined);"
        return code if code.endswith(("}", ";")) else code + ";"

    # -- nodes ---------------------------------------------------------------

    def children(self, nodes: List[Node]) -> List[str]:
        out = []
        for n in nodes:
            js = self.node(n)
            if js:
                out.append(js)
        return out

    def fragment(self, nodes: List[Node], key: Optional[str] = None) -> str:
        kids = self.children(nodes)
        props = f"{{ key: {key} }}" if key else "null"
        return f"__dil.jsx(__dil.Fragment, {props}{''.join(', ' + k for k in kids)})"

    def node(self, n: Node) -> Optional[str]:
        if isinstance(n, Text):
            return self.const(n.value) if n.value else None
        if isinstance(n, Expr):
            return f"__dilSafe(() => ({n.code}), null)"
        if isinstance(n, IfBlock):
            out = "null"
            for cond, kids in reversed(n.branches):
                frag = self.fragment(kids)
                out = frag if cond is None else f"(__dilSafe(() => ({cond}), false) ? {frag} : {out})"
            return out
        if isinstance(n, EachBlock):
            idx = n.index or "__i"
            frag = self.fragment(n.children, key=idx)
            return f"__dilSafe(() => ({n.expr}).map(({n.item}, {idx}) => {frag}), null)"
        if isinstance(n, Element):
            return self.element(n)
        return None

    def check_attr(self, el: Element, a: Attr) -> bool:
        t = prop_type(el.name, a.name)
        if t is None:
            self.diags.add("unknown_prop", a.pos, component=el.name, prop=a.name)
            return False
        ok = True
        if isinstance(t, tuple):
            literal = a.value if a.kind == "string" else (json.loads(a.value) if a.kind == "expr" and STRING_RE.match(a.value) and a.value.startswith('"') else None)
            if a.kind == "bool" or (a.kind == "expr" and NUMBER_RE.match(a.value)):
                ok = False
            elif literal is not None and literal not in t[1]:
                ok = False
        elif t in ("number", "boolean", "fn"):
            if a.kind == "string":
                ok = False
            elif a.kind == "bool" and t != "boolean":
                ok = False
            elif a.kind == "expr" and t == "boolean" and (NUMBER_RE.match(a.value) or STRING_RE.match(a.value)):
                ok = False
            elif a.kind == "expr" and t == "number" and STRING_RE.match(a.value):
                ok = False
        elif t == "string" and a.kind == "bool":
            ok = False
        if not ok:
            self.diags.add("invalid_literal", a.pos, component=el.name, prop=a.name, value=a.value)
        return ok

    def element(self, el: Element) -> Optional[str]:
        if el.name not in CATALOG:
            self.diags.add("unknown_component", el.pos, component=el.name)
            return None
        props = []
        has_expr = False
        for a in el.attrs:
            if not self.check_attr(el, a):
                continue
            if a.kind == "string":
                props.append(f"{json.dumps(a.name)}: {json.dumps(a.value)}")
            elif a.kind == "bool":
                props.append(f"{json.dumps(a.name)}: true")
            elif NUMBER_RE.match(a.value) or STRING_RE.match(a.value) or a.value in ("true", "false", "null"):
                props.append(f"{json.dumps(a.name)}: {a.value}")
            else:
                has_expr = True
                props.append(f"{json.dumps(a.name)}: ({a.value})")
        props_js = "{ " + ", ".join(props) + " }" if props else "null"
        kids = self.children(el.children)
        js = f"__dil.jsx({json.dumps(el.name)}, {props_js}{''.join(', ' + k for k in kids)})"
        return f"__dilSafe(() => {js}, null)" if has_expr else js


# -- fallback Markdown -------------------------------------------------------


def _inline_md(nodes: List[Node]) -> str:
    out = []
    for n in nodes:
        if isinstance(n, Text):
            out.append(n.value)
        elif isinstance(n, Element):
            inner = _inline_md(n.children)
            out.append(f"**{inner}**" if n.name == "bold" else f"`{inner}`" if n.name == "code" else inner)
    return "".join(out)


def fallback_markdown(nodes: List[Node]) -> str:
    """Static text only. Computed values and loop bodies are omitted, as in ChatGPT."""
    blocks: List[str] = []
    for n in nodes:
        if not isinstance(n, Element):
            continue
        if n.name == "title":
            size = next((a.value for a in n.attrs if a.name == "size"), "md")
            level = {"3xl": 1, "2xl": 1, "xl": 1, "lg": 2, "md": 3}.get(size, 4)
            blocks.append("#" * level + " " + _inline_md(n.children))
        elif n.name in ("text", "caption"):
            blocks.append(_inline_md(n.children))
        elif n.name == "list":
            blocks.append("\n".join("- " + _inline_md(i.children) for i in n.children if isinstance(i, Element)))
        elif n.name == "divider":
            blocks.append("---")
        elif n.name == "table":
            rows = [r for r in n.children if isinstance(r, Element)]
            lines = []
            for k, r in enumerate(rows):
                cells = [_inline_md(c.children) for c in r.children if isinstance(c, Element)]
                lines.append("| " + " | ".join(cells) + " |")
                if k == 0:
                    lines.append("|" + "---|" * len(cells))
            blocks.append("\n".join(lines))
        elif n.name in CATALOG and n.name not in ("button", "slider", "input", "select", "segmented-control", "checkbox", "radio-group", "chart", "icon"):
            inner = fallback_markdown(n.children)
            if inner:
                blocks.append(inner)
    return "\n\n".join(b for b in blocks if b.strip())


def compile_dil(source: str) -> CompileResult:
    bodies, tree, diag_items = parse(source)
    diags = Diagnostics(source)
    diags.items = diag_items
    gen = Codegen(diags)

    body_lines = [gen.body(b) for b in bodies]
    kids = gen.children(tree)
    lines = [
        "  const __dilConstants = DIL.useConstants();",
        "  const __dilModelDataBindings = DIL.useAppData((appData) => appData.opGenui?.modelDataBindings ?? {});",
    ]
    lines += ["  " + line for line in body_lines]
    lines.append("  return __dil.jsx(__dil.Fragment, null" + "".join(",\n    " + k for k in kids) + ");")
    code = (
        PRELUDE
        + "\nDIL.render(__dil.jsx(() => {\n"
        + "\n".join(lines)
        + f'\n}}, {{ key: "body:{len(bodies)}" }}));\n'
    )
    return CompileResult(
        code=code,
        constants=gen.constants,
        diagnostics=diags.items,
        fallback_markdown=fallback_markdown(tree),
    )
