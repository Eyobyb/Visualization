import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { icons } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DILNode } from './sandbox'
import './dil.css'

type Invoke = (fnId: string, args: unknown[]) => void
const InvokeContext = createContext<Invoke>(() => {})

type Props = Record<string, unknown>
type FnRef = { __fn: string }

const isFn = (v: unknown): v is FnRef => typeof v === 'object' && v !== null && '__fn' in v

function useHandler(ref: unknown) {
  const invoke = useContext(InvokeContext)
  return isFn(ref) ? (...args: unknown[]) => invoke(ref.__fn, args) : undefined
}

const PALETTE = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d']

const ALIGN: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch', baseline: 'baseline' }
const JUSTIFY: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around' }

function layoutStyle(p: Props, defaults: CSSProperties = {}): CSSProperties {
  const style: CSSProperties = { ...defaults }
  if (typeof p.gap === 'number') style.gap = p.gap * 4
  if (typeof p.padding === 'number') style.padding = p.padding * 4
  if (typeof p.align === 'string') style.alignItems = ALIGN[p.align]
  if (typeof p.justify === 'string') style.justifyContent = JUSTIFY[p.justify]
  if (p.wrap) style.flexWrap = 'wrap'
  if (typeof p.flex === 'number') style.flex = p.flex
  if (p.width !== undefined) style.width = p.width as CSSProperties['width']
  if (p.maxWidth !== undefined) style.maxWidth = p.maxWidth as CSSProperties['maxWidth']
  return style
}

function layoutClass(base: string, p: Props) {
  return [
    base,
    p.border ? 'dil-border' : '',
    typeof p.radius === 'string' ? `dil-radius-${p.radius}` : '',
    typeof p.background === 'string' ? `dil-bg-${p.background}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

const toneClass = (p: Props) => (typeof p.color === 'string' ? `dil-tone-${p.color}` : '')

function Icon({ p }: { p: Props }) {
  const name = String(p.name ?? '')
  const pascal = name.replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase()) as keyof typeof icons
  const Cmp = icons[pascal] ?? icons.Circle
  const size = { sm: 14, md: 18, lg: 22, xl: 28 }[String(p.size ?? 'md')] ?? 18
  return <Cmp size={size} className={`dil-icon ${p.inline ? 'dil-icon-inline' : ''} ${toneClass(p)}`} />
}

function Chart({ p }: { p: Props }) {
  const data = Array.isArray(p.data) ? (p.data as Record<string, unknown>[]) : []
  const x = typeof p.x === 'string' ? p.x : 'name'
  const series = Array.isArray(p.series) ? (p.series as { key: string; label?: string; color?: string }[]).filter((s) => s && typeof s.key === 'string') : []
  const height = typeof p.height === 'number' ? p.height : 220
  const type = String(p.type ?? 'bar')
  if (!data.length || !series.length) return null
  const color = (i: number, s?: { color?: string }) => s?.color ?? PALETTE[i % PALETTE.length]

  let chart: ReactNode
  if (type === 'pie') {
    const s = series[0]
    chart = (
      <PieChart>
        <Pie data={data} dataKey={s.key} nameKey={x} innerRadius="45%" outerRadius="80%" paddingAngle={2} isAnimationActive>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    )
  } else {
    const Chart = type === 'line' ? LineChart : type === 'area' ? AreaChart : BarChart
    chart = (
      <Chart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eceef1" />
        <XAxis dataKey={x} fontSize={11} />
        <YAxis fontSize={11} width={48} />
        <Tooltip />
        {series.length > 1 && <Legend />}
        {series.map((s, i) =>
          type === 'line' ? (
            <Line key={s.key} dataKey={s.key} name={s.label ?? s.key} stroke={color(i, s)} strokeWidth={2} dot={false} />
          ) : type === 'area' ? (
            <Area key={s.key} dataKey={s.key} name={s.label ?? s.key} stroke={color(i, s)} fill={color(i, s)} fillOpacity={0.2} stackId={p.stacked ? 'a' : undefined} />
          ) : (
            <Bar key={s.key} dataKey={s.key} name={s.label ?? s.key} fill={color(i, s)} radius={[4, 4, 0, 0]} stackId={p.stacked ? 'a' : undefined} />
          ),
        )}
      </Chart>
    )
  }
  return (
    <div className="dil-chart">
      {typeof p.title === 'string' && <div className="dil-chart-title">{p.title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        {chart as ReactElement}
      </ResponsiveContainer>
    </div>
  )
}

type Option = { label: string; value: unknown }
const asOptions = (v: unknown): Option[] =>
  Array.isArray(v)
    ? v.map((o) => (typeof o === 'object' && o !== null ? { label: String((o as Option).label ?? (o as Option).value), value: (o as Option).value } : { label: String(o), value: o }))
    : []

function Slider({ p }: { p: Props }) {
  const onChange = useHandler(p.onChange)
  const min = typeof p.min === 'number' ? p.min : 0
  const max = typeof p.max === 'number' ? p.max : 100
  return (
    <label className="dil-field">
      {typeof p.label === 'string' && <span className="dil-label">{p.label}</span>}
      <input
        type="range"
        className="dil-slider"
        min={min}
        max={max}
        step={typeof p.step === 'number' ? p.step : 1}
        value={Number(p.value ?? min)}
        onChange={(e) => onChange?.(Number(e.target.value))}
      />
    </label>
  )
}

function TextInput({ p }: { p: Props }) {
  const onChange = useHandler(p.onChange)
  const external = p.value === undefined || p.value === null ? '' : String(p.value)
  const [local, setLocal] = useState(external)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setLocal(external)
  }, [external, focused])
  const numeric = p.type === 'number'
  return (
    <label className="dil-field">
      {typeof p.label === 'string' && <span className="dil-label">{p.label}</span>}
      <input
        className="dil-input"
        type={numeric ? 'number' : 'text'}
        placeholder={typeof p.placeholder === 'string' ? p.placeholder : undefined}
        value={local}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setLocal(e.target.value)
          onChange?.(numeric ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value)
        }}
      />
    </label>
  )
}

function Select({ p }: { p: Props }) {
  const onChange = useHandler(p.onChange)
  const options = asOptions(p.options)
  const idx = options.findIndex((o) => o.value === p.value)
  return (
    <label className="dil-field">
      {typeof p.label === 'string' && <span className="dil-label">{p.label}</span>}
      <select className="dil-input" value={idx} onChange={(e) => onChange?.(options[Number(e.target.value)]?.value)}>
        {options.map((o, i) => (
          <option key={i} value={i}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Segmented({ p }: { p: Props }) {
  const onChange = useHandler(p.onChange)
  return (
    <div className={`dil-segmented ${p.block ? 'dil-block' : ''} dil-size-${p.size ?? 'md'}`}>
      {asOptions(p.options).map((o, i) => (
        <button key={i} type="button" className={o.value === p.value ? 'active' : ''} onClick={() => onChange?.(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function RadioGroup({ p }: { p: Props }) {
  const onChange = useHandler(p.onChange)
  return (
    <div className="dil-field">
      {typeof p.label === 'string' && <span className="dil-label">{p.label}</span>}
      {asOptions(p.options).map((o, i) => (
        <label key={i} className="dil-check">
          <input type="radio" checked={o.value === p.value} onChange={() => onChange?.(o.value)} />
          {o.label}
        </label>
      ))}
    </div>
  )
}

function Checkbox({ p }: { p: Props }) {
  const onChange = useHandler(p.onChange)
  return (
    <label className="dil-check">
      <input type="checkbox" checked={Boolean(p.checked)} onChange={(e) => onChange?.(e.target.checked)} />
      {typeof p.label === 'string' ? p.label : null}
    </label>
  )
}

function Button({ p, children }: { p: Props; children: ReactNode }) {
  const onClick = useHandler(p.onClick)
  return (
    <button
      type="button"
      className={`dil-button dil-button-${p.variant ?? 'secondary'} dil-size-${p.size ?? 'md'} ${p.block ? 'dil-block' : ''}`}
      disabled={Boolean(p.disabled)}
      onClick={() => onClick?.()}
    >
      {children}
    </button>
  )
}

function Element({ node }: { node: Exclude<DILNode, string> }) {
  const { t, p } = node
  const children = node.c.map((c, i) => <Node key={i} node={c} />)
  switch (t) {
    case 'text':
      return <p className={`dil-text dil-text-${p.size ?? 'md'} ${toneClass(p)} dil-weight-${p.weight ?? 'normal'} ${p.tabularNums ? 'dil-tabular' : ''}`} style={{ textAlign: p.align as CSSProperties['textAlign'] }}>{children}</p>
    case 'title':
      return <div className={`dil-title dil-title-${p.size ?? 'md'} ${toneClass(p)} ${p.tabularNums ? 'dil-tabular' : ''}`} style={{ textAlign: p.align as CSSProperties['textAlign'] }}>{children}</div>
    case 'caption':
      return <div className={`dil-caption ${toneClass(p)} ${p.tabularNums ? 'dil-tabular' : ''}`}>{children}</div>
    case 'bold':
      return <strong>{children}</strong>
    case 'italic':
      return <em>{children}</em>
    case 'code':
      return <code className="dil-code">{children}</code>
    case 'link': {
      const href = typeof p.href === 'string' && /^https?:\/\//.test(p.href) ? p.href : undefined
      return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    }
    case 'list':
      return p.ordered ? <ol className="dil-list">{children}</ol> : <ul className="dil-list">{children}</ul>
    case 'list-item':
      return <li>{children}</li>
    case 'box':
      return <div className={layoutClass('dil-box', p)} style={layoutStyle(p, { flexDirection: p.direction === 'row' ? 'row' : 'column' })}>{children}</div>
    case 'row':
      return <div className={layoutClass('dil-row', p)} style={layoutStyle(p)}>{children}</div>
    case 'card':
      return <div className={layoutClass('dil-card', p)} style={layoutStyle(p)}>{children}</div>
    case 'grid': {
      // At most `columns` columns, but never narrower than 130px: narrow containers wrap instead of overflowing.
      const cols = typeof p.columns === 'number' && p.columns > 0 ? p.columns : 2
      const gap = typeof p.gap === 'number' ? p.gap * 4 : 8
      const track = `minmax(max(130px, calc((100% - ${(cols - 1) * gap}px) / ${cols})), 1fr)`
      return (
        <div className={layoutClass('dil-grid', p)} style={{ ...layoutStyle(p), gap, gridTemplateColumns: `repeat(auto-fill, ${track})` }}>
          {children}
        </div>
      )
    }
    case 'grid-item':
      return <div className="dil-grid-item" style={{ gridColumn: typeof p.span === 'number' ? `span ${p.span}` : undefined }}>{children}</div>
    case 'divider':
      return <hr className="dil-divider" />
    case 'badge':
      return <span className={`dil-badge dil-badge-${p.color ?? 'default'}`}>{children}</span>
    case 'icon':
      return <Icon p={p} />
    case 'progress': {
      const max = typeof p.max === 'number' && p.max > 0 ? p.max : 100
      const pct = Math.max(0, Math.min(100, (Number(p.value ?? 0) / max) * 100))
      return <div className="dil-progress"><div className={`dil-progress-bar dil-bg-${p.color ?? 'accent'}`} style={{ width: `${pct}%` }} /></div>
    }
    case 'chart':
      return <Chart p={p} />
    case 'table':
      return <div className="dil-table-wrap"><table className="dil-table"><tbody>{children}</tbody></table></div>
    case 'table-row':
      return <tr className={p.header ? 'dil-table-header' : ''}>{children}</tr>
    case 'table-cell':
      return <td style={{ textAlign: p.align as CSSProperties['textAlign'] }}>{children}</td>
    case 'button':
      return <Button p={p}>{children}</Button>
    case 'slider':
      return <Slider p={p} />
    case 'input':
      return <TextInput p={p} />
    case 'select':
      return <Select p={p} />
    case 'segmented-control':
      return <Segmented p={p} />
    case 'checkbox':
      return <Checkbox p={p} />
    case 'radio-group':
      return <RadioGroup p={p} />
    default:
      return null
  }
}

function Node({ node }: { node: DILNode }) {
  if (typeof node === 'string') return <>{node}</>
  return <Element node={node} />
}

export function HostRenderer({ tree, invoke }: { tree: DILNode[]; invoke: Invoke }) {
  return (
    <InvokeContext.Provider value={invoke}>
      <div className="dil-root">
        {tree.map((n, i) => (
          <Node key={i} node={n} />
        ))}
      </div>
    </InvokeContext.Provider>
  )
}
