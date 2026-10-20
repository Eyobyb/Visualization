import type { ReactNode } from 'react'
import { Chart } from './Chart'
import { Progress, type StatBase } from './data'
import { Glyph, type IconName } from './Icon'
import { CardHead, Delta, Empty } from './shared'
import { cx, fmt, num, rowsOf, sortRows } from './utils'
import type { CardTone, GoodWhen, NumberFormat, Row } from './types'

function KpiTop({ label, icon }: { label: string; icon?: IconName }) {
  return (
    <div className="ui-kpi-top">
      <span className="ui-stat-label">{label}</span>
      {icon && <span className="ui-card-icon sm"><Glyph name={icon} size={15} /></span>}
    </div>
  )
}

/**
 * One number that answers the question, with its change and an optional progress bar toward a target.
 *
 * @example
 * <KpiCard label="Q3 revenue" value={4820000} prev={4310000} deltaLabel="vs Q2" format="currency" icon="wallet" target={5000000} />
 */
export function KpiCard({ label, value, format = 'number', prev, delta, deltaLabel = 'vs last period', goodWhen = 'up', icon, target, caption, tone = 'default' }: StatBase & {
  /** Comparison text after the change. */
  deltaLabel?: string
  /** Corner icon. */
  icon?: IconName
  /** Adds a progress bar toward this target. */
  target?: number
  /** Note at the bottom. */
  caption?: string
  tone?: CardTone
}) {
  return (
    <section className={cx('ui-card ui-kpi', tone !== 'default' && 'has-tone t-' + tone)}>
      <KpiTop label={label} icon={icon} />
      <div className="ui-stat-value big">{fmt(value, format)}</div>
      <Delta value={value} prev={prev} delta={delta} goodWhen={goodWhen} label={deltaLabel} />
      {typeof target === 'number' && <Progress value={value} max={target} label={'Target ' + fmt(target, format)} tone="accent" />}
      {caption && <p className="ui-caption t-muted">{caption}</p>}
    </section>
  )
}

/** One number inside a MultiKpiCard. */
export interface KpiItem {
  label: string
  value: number | undefined
  prev?: number
  delta?: number
  format?: NumberFormat
  goodWhen?: GoodWhen
}

/**
 * Two to four related headline numbers read together, separated by thin dividers.
 *
 * @example
 * <MultiKpiCard title="Q3 at a glance" items={[
 *   { label: 'Revenue', value: 4820000, prev: 4310000, format: 'currency' },
 *   { label: 'Orders', value: 12995, prev: 12213 },
 * ]} />
 */
export function MultiKpiCard({ title, items, columns }: {
  title?: string
  /** Two to four numbers. */
  items: KpiItem[]
  /** Defaults to the item count, capped at 4. */
  columns?: 2 | 3 | 4
}) {
  const cols = columns ?? Math.min(4, Math.max(1, items.length))
  return (
    <section className="ui-card pad">
      {title && <CardHead title={title} />}
      <div className="ui-multikpi" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((it, i) => (
          <div key={i} className="ui-stat">
            <div className="ui-stat-label">{it.label}</div>
            <div className="ui-stat-value">{fmt(it.value, it.format)}</div>
            <Delta value={it.value} prev={it.prev} delta={it.delta} goodWhen={it.goodWhen} />
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * A headline number plus the compact trend chart that produced it.
 *
 * @example
 * <KpiGraphCard label="Revenue, last week" value={412000} prev={389000} format="currency" data={weekly} x="week" y="revenue" />
 */
export function KpiGraphCard({ label, value, format = 'number', prev, delta, deltaLabel, goodWhen = 'up', data, x, y, chartType = 'area', icon, caption }: StatBase & {
  deltaLabel?: string
  /** Trend rows. */
  data: Row[] | undefined
  /** Time field. */
  x: string
  /** Value field. */
  y: string
  chartType?: 'line' | 'area' | 'bar'
  /** Corner icon. */
  icon?: IconName
  /** Note at the bottom. */
  caption?: string
}) {
  return (
    <section className="ui-card pad ui-kpigraph">
      <KpiTop label={label} icon={icon} />
      <div className="ui-kpigraph-num">
        <div className="ui-stat-value big">{fmt(value, format)}</div>
        <Delta value={value} prev={prev} delta={delta} goodWhen={goodWhen} label={deltaLabel} />
      </div>
      <Chart type={chartType} data={data} x={x} y={y} format={format} height="sm" legend={false} compact />
      {caption && <p className="ui-caption t-muted">{caption}</p>}
    </section>
  )
}

/**
 * A short ranked list sorted by value, with a proportional bar under each row.
 *
 * @example
 * <ListCard title="Top products" items={topProducts} primary="name" secondary="category" value="revenue" valueFormat="currency" />
 */
export function ListCard({ title, items, primary, secondary, value, valueFormat = 'number', limit = 5, rank = true, icon }: {
  title: string
  /** Rows from a binding. */
  items: Row[] | undefined
  /** Main label field. */
  primary: string
  /** Second-line field. */
  secondary?: string
  /** Value field; rows are ranked by it. */
  value?: string
  valueFormat?: NumberFormat
  /** Rows shown. */
  limit?: number
  /** Show rank numbers. */
  rank?: boolean
  /** Header icon. */
  icon?: IconName
}) {
  let rows = rowsOf(items)
  if (value) rows = sortRows(rows, value, 'desc')
  rows = rows.slice(0, num(limit) || 5)
  const mx = value ? Math.max(...rows.map((r) => num(r[value])), 1) : 1
  return (
    <section className="ui-card pad">
      <CardHead title={title} icon={icon} />
      {rows.length ? (
        <ol className={cx('ui-rank', !rank && 'no-rank')}>
          {rows.map((r, i) => (
            <li key={i}>
              {rank && <span className="n">{i + 1}</span>}
              <span className="m">
                <span className="p">{String(r[primary] ?? '')}</span>
                {secondary && <span className="s">{String(r[secondary] ?? '')}</span>}
              </span>
              {value && <span className="v">{fmt(r[value], valueFormat)}</span>}
              {value && <span className="bar" aria-hidden><i style={{ width: ((num(r[value]) / mx) * 100).toFixed(1) + '%' }} /></span>}
            </li>
          ))}
        </ol>
      ) : <Empty text="No items" />}
    </section>
  )
}

/**
 * A chart in a titled card, for when no headline number is needed.
 *
 * @example
 * <GraphCard title="Orders by channel" chart={<Chart type="donut" data={channels} x="channel" y="share" format="percent" />} />
 */
export function GraphCard({ title, subtitle, chart, caption, icon }: {
  title: string
  subtitle?: string
  /** Usually a Chart. */
  chart: ReactNode
  /** Takeaway under the chart. */
  caption?: string
  icon?: IconName
}) {
  return (
    <section className="ui-card pad">
      <CardHead title={title} subtitle={subtitle} icon={icon} />
      {chart}
      {caption && <p className="ui-caption t-muted">{caption}</p>}
    </section>
  )
}

/**
 * A chart the user explores: controls that change the chart's inputs, the chart itself, and follow-up actions.
 *
 * @example
 * <ActionableGraphCard
 *   title={`Regions by ${metric}`}
 *   controls={<SegmentedControl value={metric} onChange={setMetric} options={['revenue', 'orders']} />}
 *   chart={<Chart type="bar" data={rows} x="region" y={metric} />}
 *   actions={<Button label="Explain this chart" variant="outline" onClick={explain} />}
 * />
 */
export function ActionableGraphCard({ title, subtitle, controls, chart, actions, caption, icon }: {
  title: string
  subtitle?: string
  /** Inputs that drive the state the chart reads. */
  controls?: ReactNode
  /** A Chart whose data depends on that state. */
  chart: ReactNode
  /** Buttons, usually follow-up questions. */
  actions?: ReactNode
  caption?: string
  icon?: IconName
}) {
  return (
    <section className="ui-card pad">
      <CardHead title={title} subtitle={subtitle} icon={icon} />
      {controls && <div className="ui-controls">{controls}</div>}
      {chart}
      {caption && <p className="ui-caption t-muted">{caption}</p>}
      {actions && <div className="ui-actions">{actions}</div>}
    </section>
  )
}
