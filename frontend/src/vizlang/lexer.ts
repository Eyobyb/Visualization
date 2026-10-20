/** A syntax error in one statement. The message is shown to the user and fed back to the model. */
export class LangError extends Error {}

export type Token =
  | { t: 'str'; v: string }
  | { t: 'num'; v: number }
  | { t: 'id' | 'state' | 'fn' | 'op'; v: string }

const TWO_CHAR_OPS = ['==', '!=', '>=', '<=', '&&', '||']
const ONE_CHAR_OPS = '()[]{},:=.+-*/%<>!?'

/** Splits one statement into tokens. `$name` is a state variable, `@Name` a function or action. */
export function tokenize(s: string): Token[] {
  const toks: Token[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue }
    if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; continue }
    if (c === '"' || c === "'") {
      let j = i + 1
      let out = ''
      while (j < s.length && s[j] !== c) {
        if (s[j] === '\\' && j + 1 < s.length) {
          const n = s[j + 1]
          out += n === 'n' ? '\n' : n === 't' ? '\t' : n
          j += 2
        } else out += s[j++]
      }
      if (j >= s.length) throw new LangError('A string never closes')
      toks.push({ t: 'str', v: out })
      i = j + 1
      continue
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1] || ''))) {
      let j = i
      while (j < s.length && /[0-9._]/.test(s[j])) j++
      toks.push({ t: 'num', v: parseFloat(s.slice(i, j).replace(/_/g, '')) })
      i = j
      continue
    }
    if (c === '$' || c === '@' || /[A-Za-z_]/.test(c)) {
      let j = i + 1
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++
      const w = s.slice(i, j)
      if ((c === '$' || c === '@') && w.length < 2) throw new LangError('"' + c + '" must be followed by a name')
      if (c === '$') toks.push({ t: 'state', v: w.slice(1) })
      else if (c === '@') toks.push({ t: 'fn', v: w.slice(1) })
      else toks.push({ t: 'id', v: w })
      i = j
      continue
    }
    const two = s.slice(i, i + 2)
    if (TWO_CHAR_OPS.includes(two)) { toks.push({ t: 'op', v: two }); i += 2; continue }
    if (ONE_CHAR_OPS.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue }
    throw new LangError('Unexpected character "' + c + '"')
  }
  return toks
}

/** How a token reads in an error message. */
export const tokText = (t: Token | undefined) =>
  !t ? 'end of line' : t.t === 'str' ? '"' + t.v + '"' : t.t === 'state' ? '$' + t.v : t.t === 'fn' ? '@' + t.v : String(t.v)
