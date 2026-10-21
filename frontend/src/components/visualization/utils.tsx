import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import type { NormalizedOption, NumberFormat, OptionInput, ProseItem, Row, Space } from './types'

export const CURRENCY = 'ETB'
export const SERIES_COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)']
export const TONES = ['ink', 'muted', 'accent', 'info', 'success', 'warning', 'danger'] as const

const SPACE = [0, 4, 8, 12, 16, 20, 24, 28, 32]
export const space = (v: Space | undefined) => `calc(${SPACE[v ?? 3] ?? 12}px * var(--space-scale))`

export const FLEX_ALIGN = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch', between: 'space-between' } as const

export const cx = (...a: Array<string | false | null | undefined | 0>) => a.filter(Boolean).join(' ')

/** Coerces numbers and numeric strings to a finite number, anything else to 0. */
export const num = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(+v) ? +v : 0

export const labelize = (f: unknown) => {
  const s = String(f ?? '').replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const isRow = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v)
export const rowsOf = (v: unknown): Row[] => (Array.isArray(v) ? v.filter(isRow) : [])

export function compact(v: number) {
  const a = Math.abs(v)
  if (a >= 1e9) return (v / 1e9).toFixed(1) + 'B'
  if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M'
  if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'K'
  return String(Math.round(v * 10) / 10)
}

/** Formats a value for display; non-numbers pass through as text and missing values show as an en dash. */
export function fmt(v: unknown, kind: NumberFormat = 'number') {
  if (v == null || (typeof v === 'number' && !Number.isFinite(v))) return '–'
  if (typeof v !== 'number') return String(v)
  const a = Math.abs(v)
  switch (kind) {
    case 'percent':
      return (v * 100).toFixed(1).replace(/\.0$/, '') + '%'
    case 'currency':
      return CURRENCY + ' ' + (a >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : a >= 1e5 ? Math.round(v / 1e3) + 'K' : Math.round(v).toLocaleString('en-US'))
    case 'compact':
      return compact(v)
    default:
      return Number.isInteger(v) ? v.toLocaleString('en-US') : a < 100 ? String(Math.round(v * 100) / 100) : Math.round(v).toLocaleString('en-US')
  }
}

export const tickFmt = (t: number, format: NumberFormat) => (format === 'percent' ? Math.round(t * 100) + '%' : compact(t))

/** Renders `**bold**` and `` `code` `` inside plain strings; other nodes are returned unchanged. */
export function richText(s: ReactNode): ReactNode {
  if (typeof s !== 'string' && typeof s !== 'number') return s
  return String(s).split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) =>
    p.length > 4 && p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p.length > 2 && p.startsWith('`') && p.endsWith('`') ? <code key={i}>{p.slice(1, -1)}</code>
        : p)
}

export function normOption<V>(o: OptionInput<V>): NormalizedOption<V> {
  if (o && typeof o === 'object' && 'value' in o) return { value: o.value, label: String(o.label ?? o.value), description: o.description, icon: o.icon }
  return { value: o as V, label: labelize(o) }
}

type ProseObject = Exclude<ProseItem, ReactNode>
export const asProse = (it: ProseItem): ProseObject =>
  it && typeof it === 'object' && !Array.isArray(it) && !('$$typeof' in it) ? (it as ProseObject) : { text: it as ReactNode }

export function sortRows(list: Row[], field: string, dir: 'asc' | 'desc' = 'desc') {
  return [...list].sort((a, b) => {
    const x = a[field], y = b[field]
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
    return dir === 'asc' ? c : -c
  })
}

/** Replaces `{key}` placeholders; empty values become an em dash. */
export const fillTemplate = (t: string, vals: Record<string, unknown>) =>
  t.replace(/\{(\w+)\}/g, (_, k: string) => (vals[k] != null && vals[k] !== '' ? String(vals[k]) : '—'))

/** fillTemplate for JSX: each `{key}` becomes the given node, so a part can be bold or a link. */
export const fillNodes = (t: string, vals: Record<string, ReactNode>): ReactNode[] =>
  t.split(/\{(\w+)\}/g).map((part, i) => (i % 2 ? <Fragment key={i}>{vals[part] ?? '—'}</Fragment> : part))

export function copyText(t: string) {
  navigator.clipboard?.writeText(t).catch(() => {})
}

export const safeUrl = (href: unknown) => (/^https?:\/\//i.test(String(href ?? '')) ? String(href) : undefined)

/** Tracks an element's content width, for SVG charts that draw at pixel size. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((e) => setW(Math.floor(e[0].contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}
