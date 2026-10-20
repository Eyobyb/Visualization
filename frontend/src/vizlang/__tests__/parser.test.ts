import { describe, expect, it } from 'vitest'
import { LangError, tokenize } from '../lexer'
import { parseStatement, splitStatements } from '../parser'

const expr = (src: string) => parseStatement('x = ' + src)!.expr

describe('tokenize', () => {
  it('reads strings with escapes, numbers with underscores, state and function names', () => {
    expect(tokenize('a = "say \\"hi\\"\\n" + 1_000 + $n + @Sum(l)')).toEqual([
      { t: 'id', v: 'a' }, { t: 'op', v: '=' }, { t: 'str', v: 'say "hi"\n' }, { t: 'op', v: '+' },
      { t: 'num', v: 1000 }, { t: 'op', v: '+' }, { t: 'state', v: 'n' }, { t: 'op', v: '+' },
      { t: 'fn', v: 'Sum' }, { t: 'op', v: '(' }, { t: 'id', v: 'l' }, { t: 'op', v: ')' },
    ])
  })

  it('skips comments and rejects unclosed strings and stray characters', () => {
    expect(tokenize('a = 1 // note')).toHaveLength(3)
    expect(() => tokenize('a = "open')).toThrow('A string never closes')
    expect(() => tokenize('a = #')).toThrow('Unexpected character "#"')
    expect(() => tokenize('a = $')).toThrow(LangError)
  })
})

describe('parseStatement', () => {
  it('applies operator precedence', () => {
    expect(expr('1 + 2 * 3')).toEqual({
      k: 'bin', op: '+', l: { k: 'lit', v: 1 }, r: { k: 'bin', op: '*', l: { k: 'lit', v: 2 }, r: { k: 'lit', v: 3 } },
    })
    expect(expr('a || b && c')).toMatchObject({ k: 'bin', op: '||', r: { k: 'bin', op: '&&' } })
  })

  it('parses ternaries, right-nested', () => {
    expect(expr('$a ? 1 : $b ? 2 : 3')).toMatchObject({
      k: 'tern', c: { k: 'state', name: 'a' }, a: { k: 'lit', v: 1 }, b: { k: 'tern', c: { k: 'state', name: 'b' } },
    })
  })

  it('parses member and index access', () => {
    expect(expr('data.weekly[11].revenue')).toEqual({
      k: 'member', f: 'revenue',
      o: { k: 'index', i: { k: 'lit', v: 11 }, o: { k: 'member', f: 'weekly', o: { k: 'ref', name: 'data' } } },
    })
  })

  it('separates positional and named arguments', () => {
    expect(expr('Badge("Paid", tone: "success")')).toEqual({
      k: 'comp', name: 'Badge',
      args: [{ e: { k: 'lit', v: 'Paid' } }, { name: 'tone', e: { k: 'lit', v: 'success' } }],
    })
  })

  it('parses lists, objects and literals', () => {
    expect(expr('[{label: "A", "b c": true}, null]')).toEqual({
      k: 'list',
      items: [{ k: 'obj', entries: [['label', { k: 'lit', v: 'A' }], ['b c', { k: 'lit', v: true }]] }, { k: 'lit', v: null }],
    })
  })

  it('marks state declarations and keeps the line', () => {
    expect(parseStatement('$month = "All"', 4)).toEqual({ name: 'month', isState: true, expr: { k: 'lit', v: 'All' }, line: 4 })
    expect(parseStatement('// only a comment')).toBeNull()
  })

  it('explains syntax errors', () => {
    expect(() => parseStatement('Col([a])')).toThrow('Expected "=" but found (')
    expect(() => parseStatement('= 1')).toThrow('A statement starts with a name')
    expect(() => parseStatement('x = sum(1)')).toThrow('components start with a capital, functions with @')
    expect(() => parseStatement('x = Col([a b])')).toThrow('Expected "," or "]" but found b')
    expect(() => parseStatement('x = 1 2')).toThrow('Unexpected 2 after the value')
    expect(() => parseStatement('x = {1: 2}')).toThrow('Object keys must be names')
  })
})

describe('splitStatements', () => {
  it('ends statements at newlines outside brackets', () => {
    expect(splitStatements('a = 1\n\nb = Col([\n  x,\n  y\n])\nc = 2')).toEqual([
      { text: 'a = 1', line: 1, partial: false },
      { text: 'b = Col([\n  x,\n  y\n])', line: 3, partial: false },
      { text: 'c = 2', line: 7, partial: false },
    ])
  })

  it('ignores brackets inside strings and comments', () => {
    expect(splitStatements('a = "(" // [\nb = 1').map((s) => s.text)).toEqual(['a = "(" // [', 'b = 1'])
  })

  it('marks open brackets and, while streaming, the last line as partial', () => {
    expect(splitStatements('a = Col([x').at(-1)!.partial).toBe(true)
    expect(splitStatements('a = 1').at(-1)!.partial).toBe(false)
    expect(splitStatements('a = 1', true).at(-1)!.partial).toBe(true)
    expect(splitStatements('a = 1\n', true)).toEqual([{ text: 'a = 1', line: 1, partial: false }])
  })
})
