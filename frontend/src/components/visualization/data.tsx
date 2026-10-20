import { useState, type ReactNode } from 'react'
import { Glyph, type IconName } from './Icon'
import { Delta, Empty } from './shared'
import { compact, cx, fmt, labelize, num, richText, rowsOf, sortRows } from './utils'
import type { GoodWhen, NumberFormat, Row, Tone } from './types'

/** A table column: a bare field name, or a field with its label, number format and alignment. */
export type TableColumn = string | { field: string; label?: string; format?: NumberFormat; align?: 'left' | 'right' }

/**
 * Exact values across items. Click a header to sort; numeric columns align right and
 * array cells render as sparklines. Long tables collapse behind a "Show all" button.
 *
 * @example
 * <Table data={topProducts} columns={[{ field: 'name', label: 'Product' }, 'category', { field: 'revenue', format: 'currency' }]} />
 */
export function Table({ data, columns, limit = 8, striped = false }: {
  /** Rows from a data binding. */
  data: Row[] | undefined
  /** Defaults to every field of the first row. */
  columns?: TableColumn[]
  /** Rows shown before "Show all". */
  limit?: number
  /** Alternate row shading. */
  striped?: boolean
}) {
  const [sort, setSort] = useState<{ f: string; d: 'asc' | 'desc' } | null>(null)
  const [all, setAll] = useState(false)
  const rows = rowsOf(data)
  if (!rows.length) return <Empty text={data === undefined ? 'No data bound to this table' : 'No rows'} />

  const cols = (columns?.length ? columns : Object.keys(rows[0]))
    .map((c) => (typeof c === 'string' ? { field: c } : c))
    .filter((c): c is Exclude<TableColumn, string> => !!c?.field)
  const numeric = (f: string) => rows.every((r) => typeof r[f] === 'number' || r[f] == null)
  const right = (c: Exclude<TableColumn, string>) => c.align === 'right' || (!c.align && numeric(c.field))
  const lim = num(limit) || 8
  const sorted = sort ? sortRows(rows, sort.f, sort.d) : rows
  const cut = !all && sorted.length > lim
  const shown = cut ? sorted.slice(0, lim) : sorted
  const toggleSort = (f: string) => setSort((s) => (s && s.f === f ? { f, d: s.d === 'desc' ? 'asc' : 'desc' } : { f, d: 'desc' }))

  return (
    <div className="ui-table-wrap">
      <div className="ui-table-scroll">
        <table className={cx('ui-table', striped && 'is-striped')}>
          <thead>
            <tr>
              {cols.map((c) => {
                const on = sort?.f === c.field
                return (
                  <th key={c.field} className={right(c) ? 'r' : ''} aria-sort={on ? (sort!.d === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => toggleSort(c.field)}>
                      {c.label || labelize(c.field)}{on ? (sort!.d === 'desc' ? ' ↓' : ' ↑') : ''}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>
                {cols.map((c) => {
                  const v = r[c.field]
                  return (
                    <td key={c.field} className={right(c) ? 'r' : ''}>
                      {Array.isArray(v) ? <Sparkline data={v} /> : typeof v === 'number' ? fmt(v, c.format ?? 'number') : String(v ?? '')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(cut || (all && rows.length > lim)) && (
        <button type="button" className="ui-table-more" onClick={() => setAll((a) => !a)}>
          {all ? 'Show fewer rows' : `Show all ${rows.length} rows`}
        </button>
      )}
    </div>
  )
}

/** Props shared by every headline-number component. */
export interface StatBase {
  /** What the number is. */
  label: string
  value: number | undefined
  format?: NumberFormat
  /** Previous value; the change is computed from it. */
  prev?: number
  /** Change as a fraction, if already known. */
  delta?: number
  goodWhen?: GoodWhen
}

/**
 * One headline number with an optional change. The building block of KPI cards.
 *
 * @example <Stat label="Refund rate" value={0.021} prev={0.026} format="percent" goodWhen="down" />
 */
export function Stat({ label, value, format = 'number', prev, delta, goodWhen = 'up', icon, caption, size = 'md' }: StatBase & {
  /** Label icon. */
  icon?: IconName
  /** Note under the number. */
  caption?: string
  size?: 'md' | 'lg'
}) {
  return (
    <div className={cx('ui-stat', 's-' + size)}>
      <div className="ui-stat-label">{icon && <Glyph name={icon} size={14} />}{label}</div>
      <div className="ui-stat-value">{fmt(value, format)}</div>
      <Delta value={value} prev={prev} delta={delta} goodWhen={goodWhen} />
      {caption && <p className="ui-caption t-muted">{caption}</p>}
    </div>
  )
}

/**
 * Progress toward a target such as a quota, budget or completion rate.
 * Shows a percentage, or "value of max" when a `format` is given.
 *
 * @example <Progress value={4820000} max={5000000} label="Q3 revenue target" format="currency" />
 */
export function Progress({ value, max = 100, label, tone = 'accent', format }: {
  value: number | undefined
  /** The target. */
  max?: number
  /** What is measured. */
  label?: string
  tone?: Tone
  format?: NumberFormat
}) {
  const top = num(max) || 100
  const pct = Math.max(0, Math.min(1, num(value) / top))
  const right = format ? `${fmt(value, format)} of ${fmt(top, format)}` : Math.round(pct * 100) + '%'
  return (
    <div className="ui-progress">
      <div className="ui-progress-top">
        <span className="ui-label">{label ?? ''}</span>
        <span className="ui-progress-val">{right}</span>
      </div>
      <div className="ui-track" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Progress'}>
        <div className={'ui-fill t-' + tone} style={{ width: (pct * 100).toFixed(1) + '%' }} />
      </div>
    </div>
  )
}

/**
 * A tiny trend line with no axes, for table cells and KPI rows. Needs at least two points.
 *
 * @example <Sparkline data={[41, 48, 45, 52, 58, 63]} tone="success" />
 */
export function Sparkline({ data, y, tone = 'accent' }: {
  /** Numbers, or rows read through `y`. */
  data: unknown[]
  /** Field to read when `data` holds rows. */
  y?: string
  tone?: Tone
}) {
  const vals = data.map((d) => num(d && typeof d === 'object' && y ? (d as Row)[y] : d))
  if (vals.length < 2) return null
  const mn = Math.min(...vals), mx = Math.max(...vals)
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * 100, 27 - ((v - mn) / (mx - mn || 1)) * 24])
  const d = 'M' + pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L')
  const dir = vals[vals.length - 1] >= vals[0] ? 'up' : 'down'
  return (
    <svg className={'ui-spark t-' + tone} viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label={`Trend ${dir} from ${fmt(vals[0])} to ${fmt(vals[vals.length - 1])}`}>
      <path d={d + ' L100 30 L0 30 Z'} className="spark-area" />
      <path d={d} className="spark-line" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** One option being compared. */
export type ComparisonColumn = string | { name: string; subtitle?: string }

/** One feature row; `values` holds one entry per column. Booleans render as a check or a cross. */
export interface ComparisonRow {
  label: string
  values: Array<string | number | boolean | null | undefined>
  format?: NumberFormat
}

/**
 * Options compared across features, with one column optionally marked as recommended.
 *
 * @example
 * <ComparisonTable
 *   columns={[{ name: 'Starter', subtitle: 'ETB 950 / month' }, { name: 'Growth', subtitle: 'ETB 2,400 / month' }]}
 *   rows={[{ label: 'Weekly report', values: [false, true] }, { label: 'Team seats', values: [1, 3] }]}
 *   highlight="Growth"
 * />
 */
export function ComparisonTable({ columns, rows, highlight, highlightLabel = 'Recommended' }: {
  columns: ComparisonColumn[]
  rows: ComparisonRow[]
  /** Index or name of the recommended column. */
  highlight?: number | string
  /** Badge text on the highlighted column. */
  highlightLabel?: string
}) {
  const cols = columns.map((c) => (typeof c === 'string' ? { name: c } : c))
  const hi = typeof highlight === 'number' ? highlight : cols.findIndex((c) => c.name === highlight)
  const cell = (v: ComparisonRow['values'][number], row: ComparisonRow): ReactNode =>
    v === true ? <span className="cmp-yes"><Glyph name="check" size={16} /><span className="sr">Yes</span></span>
      : v === false ? <span className="cmp-no"><Glyph name="x" size={15} /><span className="sr">No</span></span>
        : v == null || v === '' ? <span className="cmp-na">—</span>
          : typeof v === 'number' ? fmt(v, row.format) : richText(v)
  return (
    <div className="ui-table-wrap">
      <div className="ui-table-scroll">
        <table className="ui-compare">
          <thead>
            <tr>
              <td className="cmp-corner" />
              {cols.map((c, i) => (
                <th key={i} scope="col" className={i === hi ? 'is-hi' : ''}>
                  {i === hi && <span className="cmp-badge">{highlightLabel}</span>}
                  <span className="cmp-name">{c.name}</span>
                  {'subtitle' in c && c.subtitle != null && <span className="cmp-sub">{c.subtitle}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                <th scope="row">{r.label}</th>
                {cols.map((_, i) => <td key={i} className={i === hi ? 'is-hi' : ''}>{cell(r.values[i], r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Tile positions approximate each region's place on the map of Ethiopia. */
const ET_REGIONS = [
  { k: 'tigray', n: 'Tigray', c: 'TIG', x: 2, y: 0 }, { k: 'afar', n: 'Afar', c: 'AFR', x: 3, y: 0 },
  { k: 'benishangulgumuz', n: 'Benishangul-Gumuz', c: 'BEN', x: 1, y: 1 }, { k: 'amhara', n: 'Amhara', c: 'AMH', x: 2, y: 1 },
  { k: 'diredawa', n: 'Dire Dawa', c: 'DIR', x: 3, y: 1 }, { k: 'harari', n: 'Harari', c: 'HAR', x: 4, y: 1 },
  { k: 'gambela', n: 'Gambela', c: 'GAM', x: 0, y: 2 }, { k: 'oromia', n: 'Oromia', c: 'ORO', x: 1, y: 2 },
  { k: 'addisababa', n: 'Addis Ababa', c: 'ADD', x: 2, y: 2 }, { k: 'somali', n: 'Somali', c: 'SOM', x: 3, y: 2 },
  { k: 'southwestethiopia', n: 'South West Ethiopia', c: 'SWE', x: 0, y: 3 }, { k: 'centralethiopia', n: 'Central Ethiopia', c: 'CEN', x: 1, y: 3 },
  { k: 'sidama', n: 'Sidama', c: 'SID', x: 2, y: 3 }, { k: 'southethiopia', n: 'South Ethiopia', c: 'SOU', x: 1, y: 4 },
]
const ET_ALIAS: Record<string, string> = {
  addis: 'addisababa', finfinne: 'addisababa', benishangul: 'benishangulgumuz', gambella: 'gambela', harar: 'harari',
  southwest: 'southwestethiopia', southwestethiopiapeoples: 'southwestethiopia', central: 'centralethiopia', south: 'southethiopia', dire: 'diredawa',
}
const etKey = (s: unknown) => {
  const k = String(s ?? '').toLowerCase().replace(/[^a-z]/g, '').replace(/(regionalstate|region|state)$/, '')
  return ET_ALIAS[k] ?? k
}

/**
 * Values by Ethiopian region on a tile map, one tile per region, shaded by value.
 * Region names match loosely ("Addis", "Harar Region", "Gambella"); rows that match no region are listed in the caption.
 *
 * @example <RegionMap data={customersByRegion} region="region" value="customers" caption="Active customers, Q3." />
 */
export function RegionMap({ data, region, value, format = 'number', legend = true, caption }: {
  /** Rows from a data binding. */
  data: Row[] | undefined
  /** Field holding the region name. */
  region: string
  /** Field holding the value; rows for the same region are summed. */
  value: string
  format?: NumberFormat
  /** Show the ranked list beside the map. */
  legend?: boolean
  /** Note under the map. */
  caption?: string
}) {
  const [hi, setHi] = useState<string | null>(null)
  const vals: Record<string, number> = {}
  const unmatched: string[] = []
  rowsOf(data).forEach((r) => {
    const k = etKey(r[region])
    if (ET_REGIONS.some((g) => g.k === k)) vals[k] = (vals[k] ?? 0) + num(r[value])
    else if (r[region] != null) unmatched.push(String(r[region]))
  })
  const nums = Object.values(vals)
  if (!nums.length) return <Empty text={data === undefined ? 'No data bound to this map' : 'No rows matched a region of Ethiopia'} />

  const mn = Math.min(...nums), mx = Math.max(...nums)
  const total = nums.reduce((a, b) => a + b, 0) || 1
  const mix = (v: number) => 14 + ((v - mn) / (mx - mn || 1)) * 76
  const share = (k: string) => Math.round((vals[k] / total) * 100) + '%'
  const ranked = ET_REGIONS.filter((g) => g.k in vals).sort((a, b) => vals[b.k] - vals[a.k])
  const focus = hi ?? ranked[0]?.k
  const fg = ET_REGIONS.find((g) => g.k === focus)

  return (
    <figure className="ui-regionmap">
      <div className="rm-body">
        <div className="rm-tiles" role="img" aria-label={`Tile map of Ethiopian regions by ${labelize(value)}. ${ranked.slice(0, 3).map((g) => g.n + ' ' + fmt(vals[g.k], format)).join(', ')}`}>
          {ET_REGIONS.map((g) => {
            const has = g.k in vals, m = has ? mix(vals[g.k]) : 0
            return (
              <button
                key={g.k}
                type="button"
                className={cx('rm-tile', !has && 'no-data', focus === g.k && 'is-focus')}
                style={{
                  gridColumn: g.x + 1,
                  gridRow: g.y + 1,
                  background: has ? `color-mix(in oklab, var(--accent) ${m.toFixed(0)}%, var(--surface))` : undefined,
                  color: has && m > 55 ? 'var(--surface)' : undefined,
                }}
                onMouseEnter={() => setHi(g.k)}
                onFocus={() => setHi(g.k)}
                onClick={() => setHi(g.k)}
                aria-label={`${g.n}: ${has ? fmt(vals[g.k], format) : 'no data'}`}
              >
                <span className="rm-code">{g.c}</span>
                <span className="rm-val">{has ? (format === 'percent' ? fmt(vals[g.k], 'percent') : compact(vals[g.k])) : '–'}</span>
              </button>
            )
          })}
        </div>
        {legend && (
          <ol className="rm-rank">
            {ranked.map((g) => (
              <li key={g.k} className={focus === g.k ? 'is-on' : ''} onMouseEnter={() => setHi(g.k)}>
                <span className="nm">{g.n}</span>
                <span className="vl">{fmt(vals[g.k], format)}</span>
                {format !== 'percent' && <span className="pc">{share(g.k)}</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
      {fg && (
        <p className="rm-detail">
          <b>{fg.n}</b>
          {fg.k in vals ? ` · ${fmt(vals[fg.k], format)}${format !== 'percent' ? ` · ${share(fg.k)} of total` : ''}` : ' · no data'}
        </p>
      )}
      <div className="rm-scale" aria-hidden><span>{fmt(mn, format)}</span><i /><span>{fmt(mx, format)}</span></div>
      <figcaption className="ui-caption t-muted">
        {caption ? caption + ' ' : ''}Tile map: one tile per region, positions approximate.
        {unmatched.length > 0 && ` Not placed: ${[...new Set(unmatched)].join(', ')}.`}
      </figcaption>
    </figure>
  )
}
