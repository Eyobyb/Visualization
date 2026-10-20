import type { Arg, Expr, Statement } from './ast'
import { LangError, tokenize, tokText } from './lexer'

const PREC: Record<string, number> = {
  '||': 2, '&&': 3, '==': 4, '!=': 4, '<': 5, '>': 5, '<=': 5, '>=': 5, '+': 6, '-': 6, '*': 7, '/': 7, '%': 7,
}

/**
 * Parses one complete statement such as `chart = Chart(type: "bar", data: data.weekly)`.
 * Returns null for a blank or comment-only statement; throws `LangError` on a syntax error.
 */
export function parseStatement(src: string, line = 1): Statement | null {
  const toks = tokenize(src)
  if (!toks.length) return null
  let p = 0
  const peek = (o = 0) => toks[p + o]
  const isOp = (v: string, o = 0) => {
    const t = peek(o)
    return !!t && t.t === 'op' && t.v === v
  }
  const expect = (v: string) => {
    if (!isOp(v)) throw new LangError('Expected "' + v + '" but found ' + tokText(peek()))
    p++
  }

  function parseArgs(): Arg[] {
    expect('(')
    const args: Arg[] = []
    while (!isOp(')')) {
      if (p >= toks.length) throw new LangError('Arguments never close')
      const t = peek()
      if (t && t.t === 'id' && isOp(':', 1)) {
        p += 2
        args.push({ name: t.v, e: parseExpr(0) })
      } else args.push({ e: parseExpr(0) })
      if (isOp(',')) p++
      else if (!isOp(')')) throw new LangError('Expected "," or ")" but found ' + tokText(peek()))
    }
    p++
    return args
  }

  function parsePrimary(): Expr {
    const t = peek()
    if (!t) throw new LangError('The line ends before the value')
    if (t.t === 'num' || t.t === 'str') { p++; return { k: 'lit', v: t.v } }
    if (t.t === 'state') { p++; return { k: 'state', name: t.v } }
    if (t.t === 'fn') { p++; return { k: 'fn', name: t.v, args: parseArgs() } }
    if (t.t === 'id') {
      p++
      if (t.v === 'true' || t.v === 'false') return { k: 'lit', v: t.v === 'true' }
      if (t.v === 'null') return { k: 'lit', v: null }
      if (isOp('(')) {
        if (/^[A-Z]/.test(t.v)) return { k: 'comp', name: t.v, args: parseArgs() }
        throw new LangError('"' + t.v + '(" is not valid: components start with a capital, functions with @')
      }
      return { k: 'ref', name: t.v }
    }
    if (isOp('[')) {
      p++
      const items: Expr[] = []
      while (!isOp(']')) {
        if (p >= toks.length) throw new LangError('A list never closes')
        items.push(parseExpr(0))
        if (isOp(',')) p++
        else if (!isOp(']')) throw new LangError('Expected "," or "]" but found ' + tokText(peek()))
      }
      p++
      return { k: 'list', items }
    }
    if (isOp('{')) {
      p++
      const entries: Array<[string, Expr]> = []
      while (!isOp('}')) {
        const kt = peek()
        if (!kt || (kt.t !== 'id' && kt.t !== 'str')) throw new LangError('Object keys must be names, found ' + tokText(kt))
        p++
        expect(':')
        entries.push([kt.v, parseExpr(0)])
        if (isOp(',')) p++
        else if (!isOp('}')) throw new LangError('Expected "," or "}" but found ' + tokText(peek()))
      }
      p++
      return { k: 'obj', entries }
    }
    if (isOp('(')) {
      p++
      const e = parseExpr(0)
      expect(')')
      return e
    }
    throw new LangError('Unexpected ' + tokText(t))
  }

  function parsePostfix(e: Expr): Expr {
    for (;;) {
      if (isOp('.')) {
        p++
        const t = peek()
        if (!t || t.t !== 'id') throw new LangError('Expected a field name after "."')
        p++
        e = { k: 'member', o: e, f: t.v }
      } else if (isOp('[')) {
        p++
        const i = parseExpr(0)
        expect(']')
        e = { k: 'index', o: e, i }
      } else return e
    }
  }

  function parseUnary(): Expr {
    if (isOp('-') || isOp('!')) {
      const op = peek()!.v as '-' | '!'
      p++
      return { k: 'un', op, e: parseUnary() }
    }
    return parsePostfix(parsePrimary())
  }

  function parseExpr(minPrec: number): Expr {
    let left = parseUnary()
    for (;;) {
      const t = peek()
      if (!t || t.t !== 'op') break
      if (t.v === '?') {
        if (minPrec > 1) break
        p++
        const a = parseExpr(0)
        expect(':')
        const b = parseExpr(1)
        left = { k: 'tern', c: left, a, b }
        continue
      }
      const prec = PREC[t.v]
      if (!prec || prec < minPrec) break
      p++
      left = { k: 'bin', op: t.v, l: left, r: parseExpr(prec + 1) }
    }
    return left
  }

  const first = peek()
  if (!first || (first.t !== 'id' && first.t !== 'state')) throw new LangError('A statement starts with a name, like "root = ..."')
  p++
  expect('=')
  const expr = parseExpr(0)
  if (p < toks.length) throw new LangError('Unexpected ' + tokText(peek()) + ' after the value')
  return { name: first.v as string, isState: first.t === 'state', expr, line }
}

/** One statement's source text. `partial` means its brackets or string are still open. */
export interface StatementText {
  text: string
  line: number
  partial: boolean
}

/**
 * Splits a program into statements. A newline ends a statement unless brackets are open.
 * With `streaming`, the last statement is always partial, since more text may still arrive.
 */
export function splitStatements(src: string, streaming = false): StatementText[] {
  const out: StatementText[] = []
  let depth = 0
  let q: string | null = null
  let start = 0
  let line = 1
  let startLine = 1
  const push = (end: number, partial: boolean) => {
    const text = src.slice(start, end).trim()
    if (text) out.push({ text, line: startLine, partial })
  }
  const newline = (i: number) => {
    line++
    if (depth === 0) {
      push(i, false)
      start = i + 1
      startLine = line
    }
  }
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (q) {
      if (c === '\\') { i++; continue }
      if (c === q) q = null
      else if (c === '\n') { q = null; newline(i) }
      continue
    }
    if (c === '"' || c === "'") { q = c; continue }
    if (c === '/' && src[i + 1] === '/') {
      const j = src.indexOf('\n', i)
      i = (j < 0 ? src.length : j) - 1
      continue
    }
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1)
    else if (c === '\n') newline(i)
  }
  if (start < src.length) push(src.length, streaming || depth > 0 || q !== null)
  return out
}
