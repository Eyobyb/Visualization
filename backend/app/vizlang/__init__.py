"""Python port of the visualization language compiler in `frontend/src/vizlang`.

`catalog.json` and the parity fixtures are generated from the TypeScript side with
`npm run export-vizlang`; TypeScript stays the source of truth.
"""
from .analyze import data_refs, image_jobs, place_jobs, to_markdown
from .catalog import CATALOG
from .compile import Action, CompileResult, compile_program
from .jsvalues import PENDING, UNDEFINED, js_json, to_json_value
from .lexer import LangError
from .parser import Statement, StatementSplitter, StatementText, parse_statement, split_statements

__all__ = [
    "Action", "CATALOG", "CompileResult", "LangError", "PENDING", "Statement", "StatementSplitter",
    "StatementText", "UNDEFINED", "compile_program", "data_refs", "image_jobs", "js_json", "parse_statement", "place_jobs",
    "split_statements", "to_json_value", "to_markdown",
]
