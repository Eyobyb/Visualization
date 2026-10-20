import { num } from '../components/visualization/utils'
import type { Expr, Statement } from './ast'
import { ACTIONS, FUNCS } from './functions'
import { parseStatement, splitStatements } from './parser'
import { checkType, typeLabel } from './schema'
import { SPECS } from './specs'
import { hasOwn, isNode, PENDING, type ComponentNode } from './values'

export type DiagnosticCode =
  | 'streaming' | 'unterminated_statement' | 'parse_error' | 'duplicate_name' | 'no_root'
  | 'unresolved_ref' | 'cycle' | 'eval_error' | 'unknown_state' | 'missing_binding'
  | 'action_outside_handler' | 'unknown_function' | 'unknown_component' | 'extra_argument'
  | 'unknown_prop' | 'invalid_literal' | 'missing_prop'

export interface Diagnostic {
  code: DiagnosticCode
  msg: string
  /** Statement name, `line N`, or `program`. */
  where: string
  /** True while streaming for problems that more text may fix. */
  transient: boolean
}

/** Something an action asks the host to do. */
export type ActionEvent =
  | { kind: 'newTurn' | 'copy' | 'open' | 'error'; text: string }

/** Side effects of actions. The renderer wires these to React state and the chat. */
export interface Effects {
  set(name: string, value: unknown): void
  reset(name: string): void
  event(e: ActionEvent): void
}

export interface CompileOptions {
  /** Treat missing names as still streaming: they evaluate to PENDING instead of failing. */
  streaming?: boolean
  /** The server's bindings, read as `data.<id>`. */
  data?: Record<string, unknown>
  /** Current values of `$variables`; keys not declared by the program are ignored. */
  userState?: Record<string, unknown>
  effects?: Effects
}

export interface CompileResult {
  root: unknown
  diagnostics: Diagnostic[]
  /** Declared `$variable` values. */
  defaults: Record<string, unknown>
  /** `defaults` overlaid with `userState`. */
  state: Record<string, unknown>
  statements: number
  ms: number
}

interface Env {
  stmts: Map<string, Statement>
  data: Record<string, unknown>
  diag: (code: DiagnosticCode, msg: string, where: string, transient?: boolean) => void
  streaming: boolean
  state: Record<string, unknown>
  effects: Effects
  visiting: Set<string>
  cache: Map<string, unknown>
}

const NOOP_EFFECTS: Effects = { set() {}, reset() {}, event() {} }

const short = (v: unknown) => {
  const s = typeof v === 'string' ? JSON.stringify(v)
    : Array.isArray(v) ? 'a list'
    : isNode(v) ? v.name + '(…)'
    : typeof v === 'object' && v ? 'an object'
    : String(v)
  return s.length > 28 ? s.slice(0, 26) + '…' : s
}

function binop(op: string, a: unknown, b: unknown): unknown {
  const str = (x: unknown) => (x == null ? '' : typeof x === 'number' ? String(Math.round(x * 100) / 100) : String(x))
  switch (op) {
    case '+': return typeof a === 'string' || typeof b === 'string' ? str(a) + str(b) : num(a) + num(b)
    case '-': return num(a) - num(b)
    case '*': return num(a) * num(b)
    case '/': return num(b) === 0 ? 0 : num(a) / num(b)
    case '%': return num(b) === 0 ? 0 : num(a) % num(b)
    case '==': return a === b
    case '!=': return a !== b
    case '<': return (a as number) < (b as number)
    case '>': return (a as number) > (b as number)
    case '<=': return (a as number) <= (b as number)
    case '>=': return (a as number) >= (b as number)
    case '&&': return a && b
    case '||': return a || b
  }
  return undefined
}

function evalRef(name: string, env: Env, where: string): unknown {
  if (env.cache.has(name)) return env.cache.get(name)
  const st = env.stmts.get(name)
  if (!st || st.isState) {
    if (env.streaming) return PENDING
    env.diag('unresolved_ref', '"' + name + '" is used but never defined', where)
    return undefined
  }
  if (env.visiting.has(name)) {
    env.diag('cycle', '"' + name + '" refers to itself', name)
    return undefined
  }
  env.visiting.add(name)
  let v: unknown
  try {
    v = evalExpr(st.expr, env, name, name)
  } catch (e) {
    env.diag('eval_error', (e as Error).message, name)
    v = undefined
  }
  env.visiting.delete(name)
  env.cache.set(name, v)
  return v
}

function evalExpr(n: Expr, env: Env, where: string, key: string): unknown {
  switch (n.k) {
    case 'lit': return n.v
    case 'state':
      if (hasOwn(env.state, n.name)) return env.state[n.name]
      if (env.streaming) return PENDING
      env.diag('unknown_state', '$' + n.name + ' is used but never declared', where)
      return undefined
    case 'ref': return n.name === 'data' ? env.data : evalRef(n.name, env, where)
    case 'member': {
      const b = evalExpr(n.o, env, where, key)
      if (b === PENDING) return PENDING
      if (b == null) return undefined
      if (b === env.data && !hasOwn(env.data, n.f)) {
        env.diag('missing_binding', 'data.' + n.f + ' was not injected by the server', where)
        return undefined
      }
      return (b as Record<string, unknown>)[n.f]
    }
    case 'index': {
      const b = evalExpr(n.o, env, where, key)
      const i = evalExpr(n.i, env, where, key)
      if (b === PENDING || i === PENDING) return PENDING
      return b == null ? undefined : (b as Record<string, unknown>)[i as string]
    }
    case 'list': return n.items.map((it, i) => evalExpr(it, env, where, key + '.' + i))
    case 'obj': {
      const o: Record<string, unknown> = {}
      for (const [k, v] of n.entries) o[k] = evalExpr(v, env, where, key + '.' + k)
      return o
    }
    case 'un': {
      const v = evalExpr(n.e, env, where, key)
      if (v === PENDING) return PENDING
      return n.op === '-' ? -num(v) : !v
    }
    case 'bin': {
      const a = evalExpr(n.l, env, where, key)
      const b = evalExpr(n.r, env, where, key)
      if (a === PENDING || b === PENDING) return PENDING
      return binop(n.op, a, b)
    }
    case 'tern': {
      const c = evalExpr(n.c, env, where, key)
      if (c === PENDING) return PENDING
      return evalExpr(c ? n.a : n.b, env, where, key)
    }
    case 'fn': return evalFn(n, env, where, key)
    case 'comp': return evalComponent(n, env, where, key)
  }
}

function evalFn(n: Extract<Expr, { k: 'fn' }>, env: Env, where: string, key: string): unknown {
  if (ACTIONS[n.name]) {
    env.diag('action_outside_handler', '@' + n.name + ' only works inside onClick', where)
    return undefined
  }
  const f = FUNCS[n.name]
  if (!f) {
    env.diag('unknown_function', '@' + n.name + ' is not a built-in function', where)
    return undefined
  }
  const args = n.args.map((a, i) => evalExpr(a.e, env, where, key + '.a' + i))
  if (args.some((a) => a === PENDING)) return PENDING
  try {
    return f.fn(...args)
  } catch (e) {
    env.diag('eval_error', '@' + n.name + ': ' + (e as Error).message, where)
    return undefined
  }
}

function evalComponent(n: Extract<Expr, { k: 'comp' }>, env: Env, where: string, key: string): ComponentNode | undefined {
  const spec = SPECS[n.name]
  if (!spec) {
    env.diag('unknown_component', n.name + ' is not in the catalog, so it was dropped', where)
    return undefined
  }
  const props: Record<string, unknown> = {}
  let pos = 0
  for (const a of n.args) {
    let pname = a.name
    if (!pname) {
      pname = spec.pos[pos++]
      if (!pname) {
        env.diag('extra_argument', n.name + ' takes ' + spec.pos.length + ' positional argument(s); the extra one was dropped', where)
        continue
      }
    }
    const ps = spec.props[pname]
    if (!ps) {
      env.diag('unknown_prop', n.name + ' has no prop "' + pname + '", so it was dropped', where)
      continue
    }
    if (ps.type === 'action') {
      const ast = a.e
      props[pname] = () => runAction(ast, env, where)
      continue
    }
    if (ps.type === 'state') {
      if (a.e.k !== 'state') {
        env.diag('invalid_literal', n.name + '.' + pname + ' must be a $variable', where)
        continue
      }
      if (!hasOwn(env.state, a.e.name) && !env.streaming) env.diag('unknown_state', '$' + a.e.name + ' is bound but never declared', where)
      props[pname] = { $state: a.e.name }
      continue
    }
    const v = evalExpr(a.e, env, where, key + '.' + pname)
    if (v === PENDING) { props[pname] = PENDING; continue }
    if (v === undefined || v === null) continue
    if (!checkType(ps, v)) {
      env.diag('invalid_literal', n.name + '.' + pname + ' got ' + short(v) + ', expected ' + typeLabel(ps), where)
      continue
    }
    props[pname] = v
  }
  for (const [pn, ps] of Object.entries(spec.props)) {
    if (props[pn] === undefined && hasOwn(ps, 'def')) props[pn] = ps.def
    if (ps.req && props[pn] === undefined) env.diag('missing_prop', n.name + ' needs "' + pn + '"', where)
  }
  return { __c: true, name: n.name, props, key }
}

function runAction(n: Expr, env: Env, where: string): void {
  const fx = env.effects
  if (n.k === 'list') { n.items.forEach((it) => runAction(it, env, where)); return }
  if (n.k !== 'fn' || !ACTIONS[n.name]) { fx.event({ kind: 'error', text: 'onClick in "' + where + '" is not an action' }); return }
  const name = n.name
  const a = n.args
  const stateArg = () => {
    const s = a[0]?.e
    if (!s || s.k !== 'state') throw new Error('@' + name + ' needs a $variable first')
    return s.name
  }
  const val = (i: number) => {
    if (!a[i]) throw new Error('@' + name + ' is missing an argument')
    return evalExpr(a[i].e, env, where, 'action')
  }
  try {
    switch (name) {
      case 'Set': fx.set(stateArg(), val(1)); break
      case 'Toggle': { const k = stateArg(); fx.set(k, !env.state[k]); break }
      case 'Reset': fx.reset(stateArg()); break
      case 'NewTurn': fx.event({ kind: 'newTurn', text: String(val(0)) }); break
      case 'Copy': fx.event({ kind: 'copy', text: String(val(0)) }); break
      case 'OpenUrl': fx.event({ kind: 'open', text: String(val(0)) }); break
    }
  } catch (e) {
    fx.event({ kind: 'error', text: (e as Error).message })
  }
}

/**
 * Compiles and evaluates a program. Never throws: problems become diagnostics, and whatever
 * cannot be validated is dropped so the rest still renders.
 */
export function compile(src: string, opts: CompileOptions = {}): CompileResult {
  const { streaming = false, userState = {}, data = {}, effects = NOOP_EFFECTS } = opts
  const t0 = performance.now()
  const diagnostics: Diagnostic[] = []
  const seen = new Set<string>()
  const diag: Env['diag'] = (code, msg, where, transient) => {
    const k = code + '|' + msg + '|' + where
    if (seen.has(k)) return
    seen.add(k)
    diagnostics.push({ code, msg, where, transient: !!transient })
  }

  const stmts = new Map<string, Statement>()
  for (const part of splitStatements(src, streaming)) {
    if (part.partial) {
      if (streaming) diag('streaming', 'Line ' + part.line + ' is still being written; it renders once complete', 'line ' + part.line, true)
      else diag('unterminated_statement', 'Line ' + part.line + ' never closes its brackets or string', 'line ' + part.line)
      continue
    }
    try {
      const st = parseStatement(part.text, part.line)
      if (!st) continue
      const id = st.isState ? '$' + st.name : st.name
      if (stmts.has(id)) diag('duplicate_name', '"' + id + '" is defined twice; the later one wins', id)
      stmts.set(id, st)
    } catch (e) {
      diag('parse_error', (e as Error).message, 'line ' + part.line)
    }
  }

  const env: Env = { stmts, data, diag, streaming, state: {}, effects, visiting: new Set(), cache: new Map() }
  const defaults: Record<string, unknown> = {}
  for (const [, st] of stmts) {
    if (!st.isState) continue
    try {
      const v = evalExpr(st.expr, env, '$' + st.name, '$' + st.name)
      defaults[st.name] = v === PENDING ? undefined : v
    } catch (e) {
      diag('eval_error', (e as Error).message, '$' + st.name)
    }
  }
  const state = { ...defaults }
  for (const k in userState) if (hasOwn(defaults, k)) state[k] = userState[k]
  env.state = state
  env.cache = new Map()

  let root: unknown = null
  if (stmts.has('root')) root = evalRef('root', env, 'root')
  else if (stmts.size) diag('no_root', 'Start the program with root = …', 'program', streaming)
  return { root, diagnostics, defaults, state, statements: stmts.size, ms: performance.now() - t0 }
}
