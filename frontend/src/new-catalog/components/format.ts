import { rem } from '../config/units'
import type { GoodWhen, Unit } from './types'

export { rem }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Compact a magnitude for display (M / K / locale). */
export function compact(v: number, dec = 0): string {
  const a = Math.abs(v)
  if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M'
  if (a >= 1e5) return Math.round(v / 1e3) + 'K'
  return v.toLocaleString('en-US', { maximumFractionDigits: dec, minimumFractionDigits: 0 })
}

/** Format a value with a unit the backend sent. */
export function fmt(v: unknown, unit?: Unit): string {
  if (!isNum(v)) return ''
  const neg = v < 0
  const a = Math.abs(v)
  const s = neg ? '−' : ''
  switch (unit) {
    case 'USD':
      return s + '$' + (a < 100 && a % 1 ? a.toFixed(2) : compact(a, 0))
    case '%':
      return s + (a < 10 ? a.toFixed(a % 1 ? 1 : 0).replace(/\.0$/, '') : Math.round(a)) + '%'
    case 'x':
      return s + a.toFixed(1) + '×'
    case 'h':
      return s + a.toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'h'
    case 'days':
      return s + a.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' days'
    case 'pt':
      return s + a.toFixed(a % 1 ? 1 : 0) + ' pt'
    default:
      return s + compact(a, a < 10 ? 2 : 1)
  }
}

export function fmtDelta(d: unknown, du?: Unit): string {
  if (!isNum(d)) return ''
  const sign = d > 0 ? '+' : d < 0 ? '−' : ''
  const a = Math.abs(d)
  const n =
    du === 'pt'
      ? a.toFixed(a % 1 ? 1 : 0) + ' pt'
      : du === 'USD'
        ? '$' + compact(a, 0)
        : (a % 1 ? a.toFixed(1) : String(a)) + (du === '%' || !du ? '%' : ' ' + du)
  return sign + n
}

export function deltaTone(d: unknown, good?: GoodWhen): 'good' | 'bad' | 'flat' {
  if (!isNum(d) || d === 0) return 'flat'
  return (d > 0) === (good !== 'down') ? 'good' : 'bad'
}

export function arrow(d: number): string {
  return d > 0 ? '↑' : d < 0 ? '↓' : '→'
}

/** Short date label for axis / table cells. */
export function fmtX(x: unknown): string {
  if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) {
    const [y, m, d] = x.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return String(x ?? '')
}

export { isNum }
