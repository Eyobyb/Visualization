/// <reference types="node" />
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ICONS } from '../../components/visualization/icons'
import { compile } from '../compile'
import { ACTIONS, FUNCS } from '../functions'
import { splitStatements } from '../parser'
import { PRESETS } from '../presets'
import { SPECS } from '../specs'
import { EXAMPLE_PROGRAMS } from '../fixtures/programs'
import { labData } from '../fixtures/labData'
import { isNode, PENDING } from '../values'

/**
 * Exports the catalog and reference results for the Python port in `backend/app/vizlang`.
 * `npm run export-vizlang` rewrites the files; a plain `npm test` fails when they are stale.
 */

const backend = (p: string) => fileURLToPath(new URL('../../../../backend/' + p, import.meta.url))
const CATALOG_PATH = backend('app/vizlang/catalog.json')
const CASES_PATH = backend('tests/fixtures/vizlang_cases.json')

/** Small programs that exercise every diagnostic and the JavaScript value semantics the port must copy. */
const SNIPPETS: Array<[string, string]> = [
  ['parse: unclosed string', 'root = Text("open\nx = 1'],
  ['parse: bad character', 'root = Text(#)'],
  ['parse: bare $', 'root = Text($)'],
  ['parse: missing =', 'root Text("a")'],
  ['parse: no name', '= Text("a")\nroot = Text("b")'],
  ['parse: lowercase call', 'root = text("a")'],
  ['parse: bad argument separator', 'root = Text("a" "b")'],
  ['parse: bad list separator', 'root = Col([Text("a") Text("b")])'],
  ['parse: bad object key', 'root = Table(data: [{1: 2}])'],
  ['parse: bad object separator', 'root = Table(data: [{a: 1 b: 2}])'],
  ['parse: missing field', 'root = Text(data.)'],
  ['parse: trailing tokens', 'root = Text("a") Text("b")'],
  ['parse: empty value', 'root = '],
  ['parse: number forms', 'root = Text("" + 1_000 + " " + .5 + " " + 1.2.3)'],
  ['parse: escapes', "root = Text('it\\'s \\\"x\\\"\\tok\\n')"],
  ['unterminated', 'root = Col([\n  Text("a"),\n'],
  ['duplicate name', 'root = Text("a")\nroot = Text("b")'],
  ['no root', 'x = Text("a")'],
  ['comment only', '// nothing here'],
  ['unresolved ref', 'root = Col([missing])'],
  ['cycle', 'root = a\na = b\nb = a'],
  ['unknown state', 'root = Text($nope)'],
  ['unknown state binding', 'root = Slider(label: "x", value: $nope)'],
  ['state from state', '$a = 1\n$b = $a\nroot = Text("" + $b)'],
  ['missing binding', 'root = Table(data: data.nope)'],
  ['action outside handler', 'root = Text(@NewTurn("hi"))'],
  ['unknown function', 'root = Text(@Nope(1))'],
  ['unknown component', 'root = Col([Sparkle(), Text("kept")])'],
  ['extra argument', 'root = Title("a", "b", "c", "d")'],
  ['unknown prop', 'root = Text("a", glow: true)'],
  ['invalid: space', 'root = Col([Text("a")], gap: 9)'],
  ['invalid: space float', 'root = Col([Text("a")], gap: 2.5)'],
  ['invalid: icon', 'root = Icon("nope")'],
  ['invalid: enum', 'root = Chart(type: "pie3d", data: data.weekly, x: "week", y: "revenue")'],
  ['invalid: number', 'root = Progress(label: "x", value: "lots")'],
  ['invalid: bool', 'root = Row([Text("a")], wrap: 1)'],
  ['invalid: state literal', 'root = Slider(label: "x", value: 3)'],
  ['invalid: long string', 'root = Col([Text("a")], gap: "a very long string that will be cut short")'],
  ['invalid: node object', 'root = Col({a: 1})'],
  ['missing prop', 'root = Stat()'],
  ['action props', '$n = 1\nroot = Button("Go", onClick: [@Set($n, $n + 1), @NewTurn("again")])'],
  ['arithmetic', 'root = Col([Text("" + 1/3), Text("" + 0.1 * 3), Text("" + -7 % 3), Text("" + 5 / 0), Text("" + 2 * "3"), Text("" + (1 + true)), Text("x" + null + 1000000 * 1000000 * 1000000 * 1000)])'],
  ['comparisons', 'root = Col([Text("" + (2 < "10")), Text("" + ("2" < "10")), Text("" + (null >= 0)), Text("" + (1 == 1.0)), Text("" + ("1" == 1)), Text("" + (true != 1))])'],
  ['truthiness', 'root = Col([Text([] ? "list" : "no"), Text(0 ? "zero" : "no"), Text("" || "empty"), Text(0 && "x"), Text(!"" ? "not" : "yes")])'],
  ['format', 'root = Col([Text(@Format(0.0025, "percent")), Text(@Format(0.12, "percent")), Text(@Format(1234567, "currency")), Text(@Format(150000, "currency")), Text(@Format(999.5, "currency")), Text(@Format(1234, "compact")), Text(@Format(15600000, "compact")), Text(@Format(2500000000, "compact")), Text(@Format(12.345)), Text(@Format(1234.5)), Text(@Format(1234567)), Text(@Format("x"))])'],
  ['round and clamp', 'root = Col([Text("" + @Round(2.5)), Text("" + @Round(-2.5)), Text("" + @Round(1.005, 2)), Text("" + @Clamp(15, 0, 10)), Text("" + @Change(120, 100)), Text("" + @Change(5, 0)), Text("" + @Payment(100000, 0.06, 30)), Text("" + @Payment(1200, 0, 1))])'],
  ['lists', 'root = Col([Text("" + @Range(1, 5)), Text("" + @Count(@Range(0.5, 3))), Text("" + @Sum(data.weekly, "revenue")), Text("" + @Avg(data.weekly, "revenue")), Text("" + @Min([3, "1", true])), Text("" + @Max([])), Text("" + data.weekly.length), Text("abc"[1])])'],
  ['rows', 't = Table(data: @Top(data.top_products, 2.7, "revenue"))\nby = @GroupBy(data.top_products, "category", "revenue")\nu = @Unique([1, "1", true, 1, null, 1.0], null)\ns = @Sort([{n: "b"}, {n: "A"}, {n: "a"}, {n: 2}, {n: 10}], "n", "asc")\np = @Pluck([{a: 1}, {b: 2}, 3], "a")\nf = @Filter(data.top_products, "category", "All")\nroot = Col([t, Table(data: by), Text("" + u), Table(data: s), Text("" + p), Text("" + @Count(f)), Text("" + @First([])), Text("" + @Last([1, 2]))])'],
  ['indexing', 'k = data.kpis\nroot = Col([Text("" + k[0].label), Text("" + data["weekly"][1].week), Text("" + k[99]), Text("" + {a: 1}.a), Text("" + null.x)])'],
]

/** The component names, keys and PENDING markers of a root, depth first. Compact enough to record per stream cut. */
function shape(v: unknown, out: string[] = []): string[] {
  if (v === PENDING) out.push('…')
  else if (isNode(v)) {
    out.push(v.name + '@' + v.key)
    for (const x of Object.values(v.props)) shape(x, out)
  } else if (Array.isArray(v)) for (const x of v) shape(x, out)
  else if (v && typeof v === 'object') for (const x of Object.values(v)) shape(x, out)
  return out
}

const json = (v: unknown) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))

function buildCatalog() {
  const fn = (o: Record<string, { sig: string; desc: string }>) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { sig: v.sig, desc: v.desc }]))
  return { components: SPECS, functions: fn(FUNCS), actions: fn(ACTIONS), icons: Object.keys(ICONS), presets: PRESETS }
}

function buildCases() {
  const programs = [
    ...EXAMPLE_PROGRAMS,
    ...PRESETS.map((p) => ({ id: 'preset: ' + p.id, src: p.src })),
    ...SNIPPETS.map(([id, src]) => ({ id: 'snippet: ' + id, src })),
  ]
  const cutsOf = (src: string) => {
    const cuts = new Set<number>()
    for (let i = 0; i < src.length; i++) if (src[i] === '\n') cuts.add(i + 1)
    for (const f of [0.3, 0.55, 0.8]) cuts.add(Math.floor(src.length * f))
    cuts.add(src.length)
    return [...cuts].sort((a, b) => a - b)
  }
  const streamed = [...EXAMPLE_PROGRAMS, ...PRESETS.map((p) => ({ id: 'preset: ' + p.id, src: p.src }))]
  const stateCases: Array<{ program: string; user_state: Record<string, unknown> }> = [
    { program: 'preset: dashboard', user_state: { metric: 'orders', month: 'Sep' } },
    { program: 'preset: calculator', user_state: { seats: 20, billing: 'yearly', undeclared: 1 } },
    { program: 'preset: twoway', user_state: { region: 'North' } },
  ]
  const byId = new Map(programs.map((p) => [p.id, p.src]))
  return {
    data: labData,
    split: programs.flatMap((p) => [false, true].map((streaming) => ({ src: p.src, streaming, out: splitStatements(p.src, streaming) }))),
    programs: programs.map((p) => {
      const r = compile(p.src, { data: labData })
      return { id: p.id, src: p.src, diagnostics: r.diagnostics, root: json(r.root), defaults: json(r.defaults), state: json(r.state), statements: r.statements }
    }),
    streams: streamed.flatMap((p) => cutsOf(p.src).map((n) => {
      const r = compile(p.src.slice(0, n), { data: labData, streaming: true })
      return { program: p.id, n, diagnostics: r.diagnostics, shape: shape(r.root) }
    })),
    state: stateCases.map((c) => {
      const r = compile(byId.get(c.program)!, { data: labData, userState: c.user_state })
      return { ...c, diagnostics: r.diagnostics, root: json(r.root), state: json(r.state) }
    }),
  }
}

const text = (v: unknown) => JSON.stringify(v, null, 1) + '\n'

function sync(path: string, content: string) {
  if (process.env.VIZLANG_WRITE) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
    return
  }
  let disk = ''
  try { disk = readFileSync(path, 'utf8') } catch { /* missing counts as stale */ }
  expect(disk === content, path + ' is stale; run npm run export-vizlang').toBe(true)
}

describe('Python export', () => {
  it('catalog.json matches the specs', () => sync(CATALOG_PATH, text(buildCatalog())))
  it('vizlang_cases.json matches the compiler', () => sync(CASES_PATH, text(buildCases())))
})
