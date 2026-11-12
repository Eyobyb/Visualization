import { useMemo, useState, type ReactNode } from 'react'
import { Empty } from './shared'
import { useLabels, usePlaceholders } from './theme/context'
import { fillTemplate, fmt, labelize, num, rowsOf, SERIES_COLORS, tickFmt, useWidth } from './utils'
import type { NumberFormat, Row } from './types'

export type ChartType = 'line' | 'area' | 'bar' | 'hbar' | 'groupedBar' | 'stackedBar' | 'donut'

interface Series {
  name: string
  values: number[]
}

type Highlight = number | null
const color = (i: number) => SERIES_COLORS[i % SERIES_COLORS.length]

/** Sums rows into one value per category per series; duplicates of the same category are added together. */
function normalizeChart(input: Row[] | undefined, x: string, y: string | string[], series?: string) {
  const rows = rowsOf(input)
  const cats = [...new Set(rows.map((r) => r[x]))]
  const sumWhere = (c: unknown, f: string, s?: unknown) =>
    rows.reduce((t, r) => (r[x] === c && (s === undefined || r[series!] === s) ? t + num(r[f]) : t), 0)
  let ser: Series[]
  if (series) {
    const f = Array.isArray(y) ? y[0] : y
    ser = [...new Set(rows.map((r) => r[series]))].map((n) => ({ name: String(n), values: cats.map((c) => sumWhere(c, f, n)) }))
  } else if (Array.isArray(y)) {
    ser = y.map((f) => ({ name: labelize(f), values: cats.map((c) => sumWhere(c, f)) }))
  } else {
    ser = [{ name: labelize(y), values: cats.map((c) => sumWhere(c, y)) }]
  }
  return { cats: cats.map(String), ser }
}

function niceScale(max: number, count = 4) {
  if (!(max > 0)) max = 1
  const raw = max / count
  const pw = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * pw >= raw) ?? 10) * pw
  const top = Math.ceil(max / step - 1e-9) * step
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(+v.toFixed(10))
  return { top, ticks }
}

function arcPath(cx0: number, cy0: number, r0: number, r1: number, a0: number, a1: number) {
  if (a1 - a0 >= Math.PI * 2 - 1e-4) a1 = a0 + Math.PI * 2 - 1e-4
  const lg = a1 - a0 > Math.PI ? 1 : 0
  const pt = (r: number, a: number) => [cx0 + r * Math.cos(a), cy0 + r * Math.sin(a)]
  const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0)
  return `M${x0},${y0}A${r1},${r1} 0 ${lg} 1 ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 ${lg} 0 ${x3},${y3}Z`
}

function Tip({ x, w, title, rows, total }: { x: number; w: number; title: string; rows: { name: string; color: string; value: string }[]; total: string | null }) {
  const L = useLabels()
  const tw = 160
  const left = Math.max(0, Math.min(w - tw, x + 14 + tw > w ? x - tw - 14 : x + 14))
  return (
    <div className="ui-tip" style={{ left, width: tw }}>
      <b>{title}</b>
      {rows.map((r, i) => (
        <div key={i}>
          <span className="tn"><i className="sw" style={{ background: r.color }} />{r.name}</span>
          <span className="tv">{r.value}</span>
        </div>
      ))}
      {total && <div className="tt"><span>{L.chartTotal}</span><span className="tv">{total}</span></div>}
    </div>
  )
}

interface PlotProps {
  cats: string[]
  ser: Series[]
  format: NumberFormat
  w: number
  hi: Highlight
  setHi: (i: Highlight) => void
}

function Cartesian({ type, cats, ser, format, w, H, hi, setHi, compact }: PlotProps & { type: ChartType; H: number; compact?: boolean }) {
  const L = useLabels()
  const m = { l: compact ? 40 : 50, r: 10, t: 12, b: 26 }
  const iw = Math.max(40, w - m.l - m.r), ih = H - m.t - m.b
  const stacked = type === 'stackedBar'
  const bars = type === 'bar' || type === 'groupedBar' || stacked
  const n = cats.length, band = iw / n
  const maxV = stacked
    ? Math.max(0, ...cats.map((_, i) => ser.reduce((s, se) => s + Math.max(0, se.values[i]), 0)))
    : Math.max(0, ...ser.flatMap((s) => s.values))
  const { top, ticks } = niceScale(maxV, compact ? 3 : 4)
  const yS = (v: number) => m.t + ih - (Math.max(0, v) / top) * ih
  const xC = (i: number) => m.l + band * i + band / 2
  const maxLab = Math.max(...cats.map((c) => c.length))
  const every = Math.max(1, Math.ceil((maxLab * 6.4 + 10) / band))
  const dim = (i: number) => (hi != null && hi !== i ? 'mark is-dim' : 'mark')
  const els: ReactNode[] = []

  ticks.forEach((t, i) => {
    els.push(<line key={'g' + i} x1={m.l} x2={w - m.r} y1={yS(t)} y2={yS(t)} className={t === 0 ? 'ax-base' : 'ax-grid'} />)
    els.push(<text key={'gt' + i} x={m.l - 8} y={yS(t)} dy="0.32em" textAnchor="end" className="ax-label">{tickFmt(t, format)}</text>)
  })
  cats.forEach((c, i) => {
    if (i % every === 0) els.push(<text key={'xl' + i} x={xC(i)} y={H - 7} textAnchor="middle" className="ax-label">{c}</text>)
  })

  if (bars) {
    const bw = Math.min(band * 0.68, 72)
    cats.forEach((_, i) => {
      if (stacked) {
        let acc = 0
        ser.forEach((s, j) => {
          const v = Math.max(0, s.values[i])
          const y0 = yS(acc), y1 = yS(acc + v)
          acc += v
          els.push(<rect key={`b${i}-${j}`} x={xC(i) - bw / 2} y={y1} width={bw} height={Math.max(0, y0 - y1 - (j < ser.length - 1 ? 1 : 0))} style={{ fill: color(j) }} className={dim(i)} />)
        })
      } else {
        const g = ser.length > 1 ? 2 : 0, sub = bw / ser.length
        ser.forEach((s, j) => {
          const y1 = yS(s.values[i])
          els.push(<rect key={`b${i}-${j}`} x={xC(i) - bw / 2 + j * sub + g / 2} y={y1} width={Math.max(1, sub - g)} height={Math.max(0, m.t + ih - y1)} rx={2} style={{ fill: color(j) }} className={dim(i)} />)
        })
      }
    })
  } else {
    ser.forEach((s, j) => {
      const pts = s.values.map((v, i) => [xC(i), yS(v)])
      const d = 'M' + pts.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L')
      if (type === 'area') {
        els.push(<path key={'a' + j} d={`${d}L${pts[pts.length - 1][0].toFixed(1)},${m.t + ih}L${pts[0][0].toFixed(1)},${m.t + ih}Z`} style={{ fill: color(j) }} className="area-fill" />)
      }
      els.push(<path key={'l' + j} d={d} style={{ stroke: color(j) }} className="line" />)
      const last = pts[pts.length - 1]
      els.push(<circle key={'e' + j} cx={last[0]} cy={last[1]} r={3.5} style={{ fill: color(j) }} />)
      if (hi != null && pts[hi]) els.push(<circle key={'h' + j} cx={pts[hi][0]} cy={pts[hi][1]} r={4.5} className="hover-dot" style={{ stroke: color(j) }} />)
    })
    if (hi != null) els.unshift(<line key="guide" x1={xC(hi)} x2={xC(hi)} y1={m.t} y2={m.t + ih} className="ax-guide" />)
  }
  cats.forEach((_, i) => {
    els.push(<rect key={'hit' + i} x={m.l + band * i} y={m.t} width={band} height={ih} className="hit" onMouseEnter={() => setHi(i)} onClick={() => setHi(i)} />)
  })

  const label = fillTemplate(type === 'line' || type === 'area' ? L.lineChart : L.columnChart, {
    series: ser.map((s) => s.name).join(', '),
    categories: n === 1 ? L.oneCategory : fillTemplate(L.categories, { count: n }),
    peak: fmt(maxV, format),
  })
  return (
    <div className="ui-chart-inner" onMouseLeave={() => setHi(null)}>
      <svg width={w} height={H} role="img" aria-label={label}>{els}</svg>
      {hi != null && (
        <Tip
          x={xC(hi)}
          w={w}
          title={cats[hi]}
          rows={ser.map((s, j) => ({ name: s.name, color: color(j), value: fmt(s.values[hi], format) }))}
          total={stacked && ser.length > 1 ? fmt(ser.reduce((t, s) => t + s.values[hi], 0), format) : null}
        />
      )}
    </div>
  )
}

function HBar({ cats, ser, format, w, hi, setHi }: PlotProps) {
  const L = useLabels()
  const s = ser[0], rowH = 30
  const order = cats.map((_, i) => i).sort((a, b) => s.values[b] - s.values[a])
  const labW = Math.min(150, Math.max(...cats.map((c) => c.length)) * 7 + 12), valW = 76
  const H = cats.length * rowH + 4, iw = Math.max(40, w - labW - valW)
  const mx = Math.max(0, ...s.values) || 1
  return (
    <svg width={w} height={H} role="img" aria-label={fillTemplate(L.barChart, { count: cats.length, series: s.name })} onMouseLeave={() => setHi(null)}>
      {order.map((i, r) => {
        const y = r * rowH + 4, bw = Math.max(2, (Math.max(0, s.values[i]) / mx) * iw)
        return (
          <g key={i} className={hi != null && hi !== i ? 'mark is-dim' : 'mark'} onMouseEnter={() => setHi(i)}>
            <text x={labW - 10} y={y + 11} dy="0.32em" textAnchor="end" className="hbar-lab">{cats[i]}</text>
            <rect x={labW} y={y + 2} width={bw} height={18} rx={3} style={{ fill: color(0) }} />
            <text x={labW + bw + 6} y={y + 11} dy="0.32em" className="hbar-val">{fmt(s.values[i], format)}</text>
          </g>
        )
      })}
    </svg>
  )
}

function Donut({ cats, ser, format, w, hi, setHi }: PlotProps) {
  const L = useLabels()
  const vals = ser[0].values.map((v) => Math.max(0, v))
  const total = vals.reduce((a, b) => a + b, 0) || 1
  const focus = hi ?? (format === 'percent' ? vals.indexOf(Math.max(...vals)) : null)
  const size = Math.round(Math.min(176, Math.max(120, w * 0.42))), R = size / 2, r0 = R * 0.6
  const start = -Math.PI / 2
  const arcs = vals.map((_, i) => {
    const before = vals.slice(0, i).reduce((s, v) => s + v, 0)
    const a0 = start + (before / total) * Math.PI * 2
    return { i, a0, a1: a0 + (vals[i] / total) * Math.PI * 2 }
  })
  return (
    <div className="ui-donut" onMouseLeave={() => setHi(null)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={fillTemplate(L.donutChart, { items: cats.map((c, i) => c + ' ' + fmt(vals[i], format)).join(', ') })}>
        {arcs.map(({ i, a0, a1 }) => (
          <path key={i} d={arcPath(R, R, r0, R - 1, a0, a1)} style={{ fill: color(i) }} className={hi != null && hi !== i ? 'mark is-dim' : 'mark'} onMouseEnter={() => setHi(i)} />
        ))}
        <text x={R} y={R - 3} textAnchor="middle" className="donut-val">{fmt(focus != null ? vals[focus] : total, format)}</text>
        <text x={R} y={R + 15} textAnchor="middle" className="ax-label">{focus != null ? cats[focus] : L.chartTotal}</text>
      </svg>
      <ul className="ui-donut-legend">
        {cats.map((c, i) => (
          <li key={i} className={hi === i ? 'is-on' : ''} onMouseEnter={() => setHi(i)}>
            <span className="sw" style={{ background: color(i) }} />
            <span className="nm">{c}</span>
            <span className="vl">{fmt(vals[i], format)}</span>
            {format !== 'percent' && <span className="pc">{Math.round((vals[i] / total) * 100)}%</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export interface ChartProps {
  type: ChartType
  /** Rows from a data binding; values are never typed in by hand. */
  data: Row[] | undefined
  /** Category or time field. */
  x: string
  /** Value field, or several fields for multiple series. */
  y: string | string[]
  /** Splits rows into one series per distinct value of this field. */
  series?: string
  format?: NumberFormat
  /** Plot height: 150, 220 or 300px. Ignored by `hbar` and `donut`, which size themselves. */
  height?: 'sm' | 'md' | 'lg'
  /** Show a legend when there are several series. */
  legend?: boolean
  /** Note under the chart. */
  caption?: string
  /** Tighter margins and fewer ticks, for charts inside small cards. */
  compact?: boolean
}

/**
 * The shape of data: trend, ranking or composition, drawn as responsive SVG with hover tooltips.
 * Rows with the same `x` are summed, so pre-aggregation is optional.
 *
 * @example <Chart type="groupedBar" data={salesByRegion} x="region" y="revenue" series="month" format="currency" />
 * @example <Chart type="donut" data={channels} x="channel" y="share" format="percent" />
 */
export function Chart({ type, data, x, y, series, format = 'number', height = 'md', legend = true, caption, compact }: ChartProps) {
  const ph = usePlaceholders()
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hi, setHi] = useState<Highlight>(null)
  const H = { sm: 150, md: 220, lg: 300 }[height]
  const { cats, ser } = useMemo(() => normalizeChart(data, x, y, series), [data, x, y, series])

  let body: ReactNode = null
  if (!x || !y || (Array.isArray(y) && !y.length)) body = <Empty text={ph.chartNeedsFields} />
  else if (!cats.length) body = <Empty text={data === undefined ? fillTemplate(ph.noData, { kind: 'chart' }) : ph.chartNoRows} />
  else if (w > 0) {
    const plot = { cats, ser, format, w, hi, setHi }
    body = type === 'donut' ? <Donut {...plot} /> : type === 'hbar' ? <HBar {...plot} /> : <Cartesian {...plot} type={type} H={H} compact={compact} />
  }
  const showLegend = legend && type !== 'donut' && type !== 'hbar' && ser.length > 1 && cats.length > 0
  const selfSized = type === 'hbar' || type === 'donut' || !cats.length

  return (
    <figure className="ui-chart">
      {showLegend && (
        <ul className="ui-legend">
          {ser.map((s, i) => <li key={i}><span className="sw" style={{ background: color(i) }} />{s.name}</li>)}
        </ul>
      )}
      <div ref={ref} className="ui-chart-box" style={{ minHeight: selfSized ? undefined : H }}>{body}</div>
      {caption && <figcaption className="ui-caption t-muted">{caption}</figcaption>}
    </figure>
  )
}
