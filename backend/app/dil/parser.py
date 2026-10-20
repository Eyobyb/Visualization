"""Recovering parser for DIL source.

The source may be cut off at any byte while streaming. Anything incomplete at the
end (a tag, a braced value) is dropped; open elements and blocks are closed
automatically. Each cut is recorded as a diagnostic.
"""
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Union

from .catalog import INLINE_ONLY


@dataclass
class Text:
    value: str


@dataclass
class Expr:
    code: str
    pos: int = 0


@dataclass
class Attr:
    name: str
    kind: str  # "string" | "expr" | "bool"
    value: str
    pos: int = 0


@dataclass
class Element:
    name: str
    attrs: List[Attr] = field(default_factory=list)
    children: List["Node"] = field(default_factory=list)
    pos: int = 0


@dataclass
class IfBlock:
    branches: List[Tuple[Optional[str], List["Node"]]] = field(default_factory=list)
    pos: int = 0


@dataclass
class EachBlock:
    expr: str
    item: str
    index: Optional[str]
    children: List["Node"] = field(default_factory=list)
    pos: int = 0


@dataclass
class Body:
    code: str
    pos: int = 0


Node = Union[Text, Expr, Element, IfBlock, EachBlock]

TAG_NAME = re.compile(r"[A-Za-z][\w-]*")
ATTR_NAME = re.compile(r"[A-Za-z_][\w:.-]*")
EACH_RE = re.compile(r"^(.*)\s+as\s+([A-Za-z_$][\w$]*)(?:\s*,\s*([A-Za-z_$][\w$]*))?\s*$", re.S)
INLINE_TAGS = {"bold", "italic", "code", "link", "icon", "badge"}


class Diagnostics:
    def __init__(self, src: str):
        self.src = src
        self.items: List[Dict] = []

    def add(self, code: str, pos: int, **extra) -> None:
        line = self.src.count("\n", 0, pos) + 1
        column = pos - (self.src.rfind("\n", 0, pos) + 1) + 1
        self.items.append(dict(code=code, line=line, column=column, **extra))


def skip_string(src: str, i: int) -> int:
    """i points at an opening quote; return index after the closing quote, or -1."""
    q = src[i]
    j = i + 1
    n = len(src)
    while j < n:
        c = src[j]
        if c == "\\":
            j += 2
            continue
        if c == q:
            return j + 1
        j += 1
    return -1


def find_brace_end(src: str, i: int) -> int:
    """i points at '{'; return index of the matching '}', or -1 if unterminated."""
    n = len(src)
    depth = 0
    j = i
    while j < n:
        c = src[j]
        if c in "\"'":
            j = skip_string(src, j)
            if j == -1:
                return -1
            continue
        if c == "`":
            j += 1
            while j < n and src[j] != "`":
                if src[j] == "\\":
                    j += 2
                elif src.startswith("${", j):
                    k = find_brace_end(src, j + 1)
                    if k == -1:
                        return -1
                    j = k + 1
                else:
                    j += 1
            if j >= n:
                return -1
            j += 1
            continue
        if src.startswith("//", j):
            k = src.find("\n", j)
            if k == -1:
                return -1
            j = k
            continue
        if src.startswith("/*", j):
            k = src.find("*/", j + 2)
            if k == -1:
                return -1
            j = k + 2
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return j
        j += 1
    return -1


def scan_open_tag(src: str, i: int, diags: Diagnostics):
    """Return (Element, self_closing, end_index) or None if the tag is incomplete."""
    m = TAG_NAME.match(src, i + 1)
    if not m:
        return None
    el = Element(name=m.group(0), pos=i)
    j = m.end()
    n = len(src)
    while True:
        while j < n and src[j].isspace():
            j += 1
        if j >= n:
            return None
        if src.startswith("/>", j):
            return el, True, j + 2
        if src[j] == ">":
            return el, False, j + 1
        am = ATTR_NAME.match(src, j)
        if not am:
            diags.add("invalid_attribute", j)
            j += 1
            continue
        name = am.group(0)
        apos = j
        j = am.end()
        k = j
        while k < n and src[k].isspace():
            k += 1
        if k < n and src[k] == "=":
            k += 1
            while k < n and src[k].isspace():
                k += 1
            if k >= n:
                return None
            if src[k] in "\"'":
                end = skip_string(src, k)
                if end == -1:
                    return None
                el.attrs.append(Attr(name, "string", src[k + 1 : end - 1], apos))
                j = end
            elif src[k] == "{":
                end = find_brace_end(src, k)
                if end == -1:
                    return None
                el.attrs.append(Attr(name, "expr", src[k + 1 : end].strip(), apos))
                j = end + 1
            else:
                diags.add("invalid_attribute", k, name=name)
                j = k
        else:
            el.attrs.append(Attr(name, "bool", "true", apos))


class _Frame:
    def __init__(self, kind: str, node, pos: int):
        self.kind = kind  # "root" | "element" | "if" | "each"
        self.node = node
        self.pos = pos

    @property
    def children(self) -> List[Node]:
        if self.kind == "element" or self.kind == "each":
            return self.node.children
        if self.kind == "if":
            return self.node.branches[-1][1]
        return self.node


def _has_content(nodes: List[Node]) -> bool:
    return any(not (isinstance(n, Text) and not n.value.strip()) for n in nodes)


def parse(src: str) -> Tuple[List[Body], List[Node], List[Dict]]:
    diags = Diagnostics(src)
    bodies: List[Body] = []
    root: List[Node] = []
    stack: List[_Frame] = [_Frame("root", root, 0)]
    i = 0
    n = len(src)

    def close_frame(frame: _Frame, reason: Optional[str]) -> None:
        stack.remove(frame)
        parent = stack[-1].children
        if frame.kind == "element":
            if reason:
                if not _has_content(frame.node.children):
                    idx = next(k for k, x in enumerate(parent) if x is frame.node)
                    del parent[idx]
                    return
                diags.add(reason, frame.pos, action="recovered_parse", tag=frame.node.name)
        elif reason:
            diags.add(reason, frame.pos, action="recovered_parse", directive=frame.kind)

    while i < n:
        c = src[i]
        if c == "{":
            end = find_brace_end(src, i)
            if end == -1:
                diags.add("unterminated_braced_value", i, action="recovered_parse")
                break
            inner = src[i + 1 : end]
            stripped = inner.strip()
            top = stack[-1]
            if stripped.startswith("@body"):
                bodies.append(Body(stripped[5:].strip(), i))
            elif stripped.startswith("#if"):
                block = IfBlock(branches=[(stripped[3:].strip(), [])], pos=i)
                top.children.append(block)
                stack.append(_Frame("if", block, i))
            elif stripped.startswith(":else"):
                if top.kind != "if":
                    diags.add("stray_branch", i)
                else:
                    rest = stripped[5:].strip()
                    cond = rest[2:].strip() if rest.startswith("if") else None
                    top.node.branches.append((cond, []))
            elif stripped.startswith("#each"):
                m = EACH_RE.match(stripped[5:].strip())
                if not m:
                    diags.add("invalid_each", i)
                    block = EachBlock("[]", "item", None, pos=i)
                else:
                    block = EachBlock(m.group(1).strip(), m.group(2), m.group(3), pos=i)
                top.children.append(block)
                stack.append(_Frame("each", block, i))
            elif stripped in ("/if", "/each"):
                kind = stripped[1:]
                target = next((f for f in reversed(stack) if f.kind == kind), None)
                if target is None:
                    diags.add("stray_close_block", i, directive=kind)
                else:
                    while stack[-1] is not target:
                        close_frame(stack[-1], "unclosed_element" if stack[-1].kind == "element" else "unclosed_block")
                    close_frame(target, None)
            elif stripped:
                top.children.append(Expr(stripped, i))
            i = end + 1
            continue

        if c == "<" and i + 1 < n and src[i + 1] == "/":
            m = re.compile(r"</\s*([A-Za-z][\w-]*)\s*>").match(src, i)
            if not m:
                if re.compile(r"</\s*[A-Za-z][\w-]*\s*$").match(src, i):
                    diags.add("unterminated_tag", i)
                    break
                stack[-1].children.append(Text(c))
                i += 1
                continue
            name = m.group(1)
            target = next((f for f in reversed(stack) if f.kind == "element" and f.node.name == name), None)
            if target is None:
                diags.add("stray_close_tag", i, tag=name)
            else:
                while stack[-1] is not target:
                    close_frame(stack[-1], "unclosed_element" if stack[-1].kind == "element" else "unclosed_block")
                close_frame(target, None)
            i = m.end()
            continue

        if c == "<" and i + 1 < n and src[i + 1].isalpha():
            res = scan_open_tag(src, i, diags)
            if res is None:
                diags.add("unterminated_tag", i)
                break
            el, self_closing, end = res
            stack[-1].children.append(el)
            if not self_closing:
                stack.append(_Frame("element", el, i))
            i = end
            continue

        if c == "<" and i + 1 >= n:
            break  # a lone '<' at the end is probably the start of a tag

        j = i + 1
        while j < n and src[j] not in "{<":
            j += 1
        stack[-1].children.append(Text(src[i:j]))
        i = j

    while len(stack) > 1:
        top = stack[-1]
        close_frame(top, "unclosed_element" if top.kind == "element" else "unclosed_block")

    return bodies, normalize(root, flow=True), diags.items


# ---------------------------------------------------------------------------
# Markdown and whitespace normalisation


INLINE_MD = re.compile(r"(\*\*[^*\n]+\*\*|`[^`\n]+`)")
LIST_RE = re.compile(r"^\s*(?:[-*]|\d+\.)\s+")
HEADING_RE = re.compile(r"^\s*(#{1,6})\s+")
HEADING_SIZES = {1: "xl", 2: "lg", 3: "md"}


def inline_markdown(text: str) -> List[Node]:
    out: List[Node] = []
    for part in INLINE_MD.split(text):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**") and len(part) > 4:
            out.append(Element("bold", children=[Text(part[2:-2])]))
        elif part.startswith("`") and part.endswith("`") and len(part) > 2:
            out.append(Element("code", children=[Text(part[1:-1])]))
        else:
            out.append(Text(part))
    return out


def _is_inline(node: Node) -> bool:
    return isinstance(node, (Text, Expr)) or (isinstance(node, Element) and node.name in INLINE_TAGS)


def _trim_inline(segs: List[Node]) -> List[Node]:
    out: List[Node] = []
    for s in segs:
        if isinstance(s, Text):
            v = re.sub(r"\s+", " ", s.value)
            if v:
                out.append(Text(v))
        else:
            out.append(s)
    while out and isinstance(out[0], Text) and not out[0].value.strip():
        out.pop(0)
    while out and isinstance(out[-1], Text) and not out[-1].value.strip():
        out.pop()
    if out and isinstance(out[0], Text):
        out[0] = Text(out[0].value.lstrip())
    if out and isinstance(out[-1], Text):
        out[-1] = Text(out[-1].value.rstrip())
    result: List[Node] = []
    for s in out:
        result.extend(inline_markdown(s.value) if isinstance(s, Text) else [s])
    return result


def _split_lines(run: List[Node]) -> List[List[Node]]:
    lines: List[List[Node]] = [[]]
    for node in run:
        if isinstance(node, Text):
            parts = node.value.split("\n")
            for k, p in enumerate(parts):
                if k > 0:
                    lines.append([])
                if p:
                    lines[-1].append(Text(p))
        else:
            lines[-1].append(node)
    return lines


def _line_text(line: List[Node]) -> str:
    return "".join(s.value if isinstance(s, Text) else "\x00" for s in line)


def _strip_prefix(line: List[Node], pattern) -> List[Node]:
    if line and isinstance(line[0], Text):
        return [Text(pattern.sub("", line[0].value, count=1))] + line[1:]
    return line


def _table_cells(line: List[Node]) -> List[List[Node]]:
    cells: List[List[Node]] = [[]]
    for s in line:
        if isinstance(s, Text):
            parts = s.value.split("|")
            for k, p in enumerate(parts):
                if k > 0:
                    cells.append([])
                if p:
                    cells[-1].append(Text(p))
        else:
            cells[-1].append(s)
    if cells and not _has_content(cells[0]):
        cells = cells[1:]
    if cells and not _has_content(cells[-1]):
        cells = cells[:-1]
    return cells


def markdown_blocks(run: List[Node]) -> List[Node]:
    blocks: List[Node] = []
    para: List[Node] = []
    list_items: List[List[Node]] = []
    list_ordered = False
    table_rows: List[List[Node]] = []

    def flush_para():
        nonlocal para
        segs = _trim_inline(para)
        if segs:
            blocks.append(Element("text", children=segs))
        para = []

    def flush_list():
        nonlocal list_items
        if list_items:
            attrs = [Attr("ordered", "bool", "true")] if list_ordered else []
            blocks.append(Element("list", attrs=attrs, children=[Element("list-item", children=_trim_inline(it)) for it in list_items]))
        list_items = []

    def flush_table():
        nonlocal table_rows
        if table_rows:
            rows = []
            for k, line in enumerate(table_rows):
                attrs = [Attr("header", "bool", "true")] if k == 0 else []
                rows.append(Element("table-row", attrs=attrs, children=[Element("table-cell", children=_trim_inline(c)) for c in _table_cells(line)]))
            blocks.append(Element("table", children=rows))
        table_rows = []

    def flush_all():
        flush_para()
        flush_list()
        flush_table()

    for line in _split_lines(run):
        text = _line_text(line)
        stripped = text.strip()
        if not stripped:
            flush_all()
            continue
        if stripped.startswith("|"):
            flush_para()
            flush_list()
            if not re.fullmatch(r"\|?[\s:|-]+\|?", stripped):
                table_rows.append(line)
            continue
        flush_table()
        hm = HEADING_RE.match(text)
        if hm:
            flush_all()
            size = HEADING_SIZES.get(len(hm.group(1)), "sm")
            blocks.append(Element("title", attrs=[Attr("size", "string", size)], children=_trim_inline(_strip_prefix(line, HEADING_RE))))
            continue
        if re.fullmatch(r"(-{3,}|\*{3,}|_{3,})", stripped):
            flush_all()
            blocks.append(Element("divider"))
            continue
        if LIST_RE.match(text):
            flush_para()
            ordered = bool(re.match(r"^\s*\d+\.", text))
            if list_items and ordered != list_ordered:
                flush_list()
            list_ordered = ordered
            list_items.append(_strip_prefix(line, LIST_RE))
            continue
        if list_items:
            flush_list()
        para.extend(line + [Text(" ")])
    flush_all()
    return blocks


def normalize(nodes: List[Node], flow: bool) -> List[Node]:
    """Flow contexts get Markdown block parsing; inline contexts get whitespace collapsing."""
    for node in nodes:
        if isinstance(node, Element):
            node.children = normalize(node.children, flow=node.name not in INLINE_ONLY and node.name not in INLINE_TAGS)
        elif isinstance(node, IfBlock):
            node.branches = [(cond, normalize(children, flow)) for cond, children in node.branches]
        elif isinstance(node, EachBlock):
            node.children = normalize(node.children, flow)

    if not flow:
        kept = [n for n in nodes if not (isinstance(n, Text) and not n.value.strip() and "\n" in n.value)]
        return _trim_inline(kept)

    out: List[Node] = []
    run: List[Node] = []
    for node in nodes:
        if _is_inline(node):
            run.append(node)
        else:
            if run:
                out.extend(markdown_blocks(run))
                run = []
            out.append(node)
    if run:
        out.extend(markdown_blocks(run))
    return out
