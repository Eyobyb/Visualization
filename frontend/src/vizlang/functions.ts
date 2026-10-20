import { fmt, num } from '../components/visualization/utils'
import type { NumberFormat } from '../components/visualization/types'
import { arr, pick } from './values'

export interface FunctionSpec {
  sig: string
  desc: string
  fn: (...args: unknown[]) => unknown
}

export interface ActionSpec {
  sig: string
  desc: string
}

function sortRows(l: unknown, f: unknown, d: unknown = 'desc') {
  return [...arr(l)].sort((a, b) => {
    const x = pick(a, f)
    const y = pick(b, f)
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
    return d === 'asc' ? c : -c
  })
}

const sum = (l: unknown, f?: unknown) => arr(l).reduce<number>((s, r) => s + num(pick(r, f)), 0)
const values = (l: unknown, f?: unknown) => arr(l).map((r) => num(pick(r, f)))

/** Pure built-in functions, called as `@Name(...)`. */
export const FUNCS: Record<string, FunctionSpec> = {
  Sum: { sig: '@Sum(list, field?)', desc: 'Total of a list, or of one field across rows.', fn: sum },
  Avg: { sig: '@Avg(list, field?)', desc: 'Mean of a list or a field.', fn: (l, f) => { const a = arr(l); return a.length ? sum(a, f) / a.length : 0 } },
  Min: { sig: '@Min(list, field?)', desc: 'Smallest value.', fn: (l, f) => { const a = values(l, f); return a.length ? Math.min(...a) : 0 } },
  Max: { sig: '@Max(list, field?)', desc: 'Largest value.', fn: (l, f) => { const a = values(l, f); return a.length ? Math.max(...a) : 0 } },
  Count: { sig: '@Count(list)', desc: 'Number of items.', fn: (l) => arr(l).length },
  Filter: {
    sig: '@Filter(list, field, value)', desc: 'Rows where field equals value. "All" or null keeps every row.',
    fn: (l, f, v) => (v == null || v === 'All' ? arr(l) : arr(l).filter((r) => pick(r, f) === v)),
  },
  Sort: { sig: '@Sort(list, field, "asc"|"desc")', desc: 'Rows ordered by a field (default descending).', fn: sortRows },
  Top: { sig: '@Top(list, n, field)', desc: 'The n rows with the highest field.', fn: (l, n, f) => sortRows(l, f, 'desc').slice(0, num(n)) },
  Unique: { sig: '@Unique(list, field)', desc: 'Distinct values of a field, in first-seen order.', fn: (l, f) => [...new Set(arr(l).map((r) => pick(r, f)))] },
  Pluck: { sig: '@Pluck(list, field)', desc: 'One field from every row, as a list.', fn: (l, f) => arr(l).map((r) => pick(r, f)) },
  GroupBy: {
    sig: '@GroupBy(list, field, valueField)', desc: 'One row per distinct field, summing valueField.',
    fn: (l, f, vf) => {
      const m = new Map<unknown, number>()
      arr(l).forEach((r) => { const k = pick(r, f); m.set(k, (m.get(k) || 0) + num(pick(r, vf))) })
      return [...m].map(([k, v]) => ({ [String(f)]: k, [String(vf)]: v }))
    },
  },
  Concat: { sig: '@Concat(listA, listB)', desc: 'Joins two lists.', fn: (a, b) => [...arr(a), ...arr(b)] },
  First: { sig: '@First(list)', desc: 'First item.', fn: (l) => arr(l)[0] },
  Last: { sig: '@Last(list)', desc: 'Last item.', fn: (l) => { const a = arr(l); return a[a.length - 1] } },
  Format: {
    sig: '@Format(value, "number"|"currency"|"percent"|"compact")', desc: 'A number as display text.',
    fn: (v, k) => fmt(num(v), (k ?? 'number') as NumberFormat),
  },
  Round: { sig: '@Round(value, digits?)', desc: 'Rounds to a number of decimal places.', fn: (v, d = 0) => { const p = Math.pow(10, num(d)); return Math.round(num(v) * p) / p } },
  Clamp: { sig: '@Clamp(value, min, max)', desc: 'Keeps a value inside a range.', fn: (v, a, b) => Math.min(num(b), Math.max(num(a), num(v))) },
  Change: { sig: '@Change(current, previous)', desc: 'Relative change as a fraction: 0.12 means +12%.', fn: (a, b) => (num(b) ? (num(a) - num(b)) / Math.abs(num(b)) : 0) },
  Payment: {
    sig: '@Payment(principal, annualRate, years)', desc: 'Monthly loan payment; annualRate as a fraction.',
    fn: (pr, r, y) => {
      const n = num(y) * 12
      const i = num(r) / 12
      if (!n) return 0
      if (!i) return num(pr) / n
      return (num(pr) * i) / (1 - Math.pow(1 + i, -n))
    },
  },
  Range: {
    sig: '@Range(from, to)', desc: 'Whole numbers from..to, inclusive.',
    fn: (a, b) => { const o: number[] = []; for (let i = num(a); i <= num(b) && o.length < 1000; i++) o.push(i); return o },
  },
}

/** Actions run only inside `onClick`. `@NewTurn` is the only way the UI talks to the model. */
export const ACTIONS: Record<string, ActionSpec> = {
  Set: { sig: '@Set($var, value)', desc: 'Changes a state variable. Runs locally, no model call.' },
  Toggle: { sig: '@Toggle($var)', desc: 'Flips a true/false variable.' },
  Reset: { sig: '@Reset($var)', desc: 'Puts a variable back to its declared default.' },
  NewTurn: { sig: '@NewTurn(text)', desc: 'Sends text to the model as a new user message. The only way the UI talks to the model.' },
  Copy: { sig: '@Copy(text)', desc: 'Copies text to the clipboard.' },
  OpenUrl: { sig: '@OpenUrl(url)', desc: 'Opens a link in a new tab.' },
}
