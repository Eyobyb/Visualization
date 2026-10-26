"""Helpers the streaming endpoint uses on parsed statements and evaluated roots."""
import math
import re
from typing import Any, Iterable, List, Optional, Tuple, Union

from .jsvalues import PENDING, fmt, is_node, is_number, js_str
from .parser import Expr, Statement

Source = Union[Statement, Expr, Iterable[Statement]]


def _walk(e: Any, out: List[str]) -> None:
    if isinstance(e, list):
        for x in e:
            _walk(x, out)
        return
    if not isinstance(e, dict):
        return
    k = e.get("k")
    if k == "member" and e["o"] == {"k": "ref", "name": "data"}:
        if e["f"] not in out:
            out.append(e["f"])
    elif k == "index" and e["o"] == {"k": "ref", "name": "data"} and e["i"].get("k") == "lit" and isinstance(e["i"]["v"], str):
        if e["i"]["v"] not in out:
            out.append(e["i"]["v"])
    for key, v in e.items():
        if key == "entries":
            _walk([x for _, x in v], out)
        elif key == "args":
            _walk([a["e"] for a in v], out)
        elif isinstance(v, (dict, list)):
            _walk(v, out)


def data_refs(src: Source) -> List[str]:
    """The `data.<id>` bindings a statement (or expression, or list of statements) reads, in first-seen order."""
    out: List[str] = []
    if isinstance(src, Statement):
        _walk(src.expr, out)
    elif isinstance(src, dict):
        _walk(src, out)
    else:
        for st in src:
            _walk(st.expr, out)
    return out


def _nodes(v: Any) -> Iterable[dict]:
    """Every component node in an evaluated value, depth first."""
    if is_node(v):
        yield v
        for x in v["props"].values():
            yield from _nodes(x)
    elif isinstance(v, list):
        for x in v:
            yield from _nodes(x)
    elif isinstance(v, dict):
        for x in v.values():
            yield from _nodes(x)


def image_jobs(root: Any) -> List[Tuple[str, str]]:
    """`(key, query)` for each image to resolve, keyed like the browser's `resolved` map:
    `photo` for an AsyncImage, `photos.0` for each query of an AsyncImageGroup and each
    item image of a ProductGrid."""
    jobs: List[Tuple[str, str]] = []
    for n in _nodes(root):
        p = n["props"]
        if n["name"] == "AsyncImage" and isinstance(p.get("query"), str):
            jobs.append((n["key"], p["query"]))
        elif n["name"] == "AsyncImageGroup" and isinstance(p.get("queries"), list):
            for i, q in enumerate(p["queries"]):
                if q is not PENDING and not isinstance(q, (dict, list)):
                    jobs.append((n["key"] + "." + str(i), js_str(q)))
        elif n["name"] == "ProductGrid" and isinstance(p.get("items"), list):
            for i, it in enumerate(p["items"]):
                q = it.get("image") if isinstance(it, dict) else None
                if isinstance(q, str):
                    jobs.append((n["key"] + "." + str(i), q))
        elif n["name"] == "PlaceMap":
            for i, r in enumerate(place_rows(p)):
                if r.get("image"):
                    jobs.append((n["key"] + "." + str(i), r["image"]))
    return jobs


PLACE_FIELDS = ("name", "address", "lat", "lng", "image", "text", "rating", "url", "category")


def _str(v: Any) -> Optional[str]:
    if isinstance(v, str) and v.strip():
        return v.strip()
    if is_number(v) and math.isfinite(v):
        return js_str(v)
    return None


def _coord(v: Any, limit: float) -> Optional[float]:
    if is_number(v):
        n = float(v)
    elif isinstance(v, str) and v.strip():
        try:
            n = float(v)
        except ValueError:
            return None
    else:
        return None
    return n if math.isfinite(n) and abs(n) <= limit else None


def _geo_query(name: str, address: Optional[str], near: Optional[str]) -> str:
    """"name, address, near" with repeated comma parts removed; mirrors `geoQuery` in images.ts."""
    clean = " ".join(re.sub(r"\([^)]*\)", " ", name.split("|")[0]).split()) or name
    seen = set()
    parts = []
    for s in ",".join([clean, address or "", near or ""]).split(","):
        s = s.strip()
        if s and s.lower() not in seen:
            seen.add(s.lower())
            parts.append(s)
    return ", ".join(parts)


def place_rows(p: dict) -> List[dict]:
    """The places a PlaceMap shows, in order, from `places` or `data` rows read through the field props.
    Rows without a name are skipped so `map.0` keys match the browser's `placeRows`."""
    from_data = not isinstance(p.get("places"), list)
    rows = p.get("data") if from_data else p.get("places")
    if not isinstance(rows, list):
        return []

    def field(k: str) -> str:
        return p[k] if from_data and isinstance(p.get(k), str) else k

    near = _str(p.get("near"))
    out: List[dict] = []
    for r in rows:
        if not isinstance(r, dict) or r is PENDING:
            continue
        name = _str(r.get(field("name")))
        if not name:
            continue
        lat, lng = _coord(r.get(field("lat")), 90), _coord(r.get(field("lng")), 180)
        row = {"name": name}
        if lat is not None and lng is not None:
            row.update(lat=lat, lng=lng)
        else:
            row["query"] = _geo_query(name, _str(r.get(field("address"))), near)
        for k in ("image", "text", "url", "category"):
            v = _str(r.get(field(k)))
            if v:
                row[k] = v
        rating = _coord(r.get(field("rating")), 5)
        if rating is not None and rating >= 0:
            row["rating"] = rating
        out.append(row)
    return out


def place_jobs(root: Any) -> List[Tuple[str, str]]:
    """`(key, query)` for each PlaceMap place to geocode, keyed `map.0` like the browser's `places` map."""
    jobs: List[Tuple[str, str]] = []
    for n in _nodes(root):
        if n["name"] == "PlaceMap":
            for i, r in enumerate(place_rows(n["props"])):
                if r.get("query"):
                    jobs.append((n["key"] + "." + str(i), r["query"]))
    return jobs


def _text(v: Any) -> str:
    return js_str(v) if isinstance(v, str) or is_number(v) else ""


def _item(it: Any) -> str:
    if isinstance(it, dict):
        title, text = _text(it.get("title") or it.get("label")), _text(it.get("text"))
        return (("**" + title + "** " if title else "") + text).strip()
    return _text(it)


def _value(it: dict) -> str:
    v = it.get("value")
    if is_number(v):
        return fmt(v, it.get("format") or "number")
    return _text(v)


def to_markdown(root: Any) -> str:
    """A plain-text fallback of a rendered answer: titles, prose, lists and KPI values."""
    blocks: List[str] = []
    for n in _nodes(root):
        name, p = n["name"], n["props"]
        if name == "Title":
            blocks.append(("# " if p.get("size") == "lg" else "## ") + _text(p.get("text")))
        elif name in ("Text", "Caption", "Markdown", "Callout", "Quote"):
            body = _text(p.get("text") if name != "Markdown" else p.get("content"))
            if name == "Callout" and p.get("title"):
                body = "**" + _text(p["title"]) + "** " + body
            if name == "Quote":
                body = "> " + body + (" (" + _text(p["source"]) + ")" if p.get("source") else "")
            if body:
                blocks.append(body)
        elif name == "Summary":
            lines = [_text(p.get("text"))] + ["- " + _item(x) for x in p.get("points") or []]
            blocks.append("\n".join(x for x in lines if x))
        elif name in ("List", "KeyPoints", "Steps", "Checklist", "IconList"):
            numbered = name == "Steps" or p.get("numbered") is True or p.get("kind") == "numbered"
            lines = [(str(i + 1) + ". " if numbered else "- ") + _item(x) for i, x in enumerate(p.get("items") or [])]
            if lines:
                blocks.append("\n".join(lines))
        elif name in ("Stat", "KpiCard", "KpiGraphCard"):
            blocks.append("- **" + _text(p.get("label")) + ":** " + _value(p))
        elif name in ("MultiKpiCard", "FactList"):
            lines = ["- **" + _text(it.get("label")) + ":** " + _value(it) for it in p.get("items") or [] if isinstance(it, dict)]
            if p.get("title"):
                lines.insert(0, "**" + _text(p["title"]) + "**")
            if lines:
                blocks.append("\n".join(lines))
        elif name in ("Card", "GraphCard", "ActionableGraphCard", "ListCard") and p.get("title"):
            blocks.append("### " + _text(p["title"]))
        elif name == "Link" and isinstance(p.get("href"), str):
            blocks.append("[" + _text(p.get("text")) + "](" + p["href"] + ")")
        elif name == "PlaceMap":
            lines = [
                str(i + 1) + ". **" + r["name"] + "**" + (" — " + r["text"] if r.get("text") else "")
                for i, r in enumerate(place_rows(p))
            ]
            if p.get("title"):
                lines.insert(0, "### " + _text(p["title"]))
            if lines:
                blocks.append("\n".join(lines))
        elif name == "Sources":
            lines = [
                "- [" + _text(s.get("title")) + "](" + _text(s.get("url")) + ")"
                for s in p.get("items") or []
                if isinstance(s, dict)
            ]
            if lines:
                blocks.append("\n".join(lines))
    return "\n\n".join(b for b in blocks if b.strip()) + "\n"
