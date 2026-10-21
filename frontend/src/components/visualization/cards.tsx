import type { ReactNode } from 'react'
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun, Wind, type LucideIcon } from 'lucide-react'
import { Chart } from './Chart'
import { Progress, type StatBase } from './data'
import { Glyph, type IconName } from './Icon'
import { Rating } from './inputs'
import { AsyncImage } from './media'
import { CardHead, Delta, Empty } from './shared'
import { Badge } from './text'
import type { Labels } from './theme/config'
import { useLabels, usePlaceholders } from './theme/context'
import { cx, fillTemplate, fmt, num, rowsOf, safeUrl, sortRows } from './utils'
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
  const { noItems } = usePlaceholders()
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
      ) : <Empty text={noItems} />}
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

/** One product in a ProductGrid. */
export interface Product {
  name: string
  /** Search query for the product photo, 5 to 15 words. The server resolves it to a real image. */
  image?: string
  /** Resolved photo URL: undefined while searching, null when nothing matched. */
  src?: string | null
  fallbackSrc?: string
  price?: number
  /** Out of 5. */
  rating?: number
  /** Three or four short spec lines. */
  specs?: string[]
  /** Short tag, such as "Best value". */
  badge?: string
  url?: string
}

/**
 * Products to shop or rank: photo, name, price, star rating, key specs and a link.
 *
 * @example
 * <ProductGrid items={[{ name: 'MacBook Air M4', image: 'MacBook Air M4 laptop on a desk', price: 189000, rating: 4.7, specs: ['16 GB RAM', '18 h battery'] }]} />
 */
export function ProductGrid({ items, format = 'currency', columns = 3 }: {
  items: Product[]
  /** How prices display. */
  format?: NumberFormat
  /** Columns at full width; fewer on narrow screens. */
  columns?: 2 | 3 | 4
}) {
  const { noProducts } = usePlaceholders()
  const L = useLabels()
  if (!items.length) return <Empty text={noProducts} />
  return (
    <div className={cx('ui-products', 'c' + columns)}>
      {items.map((p, i) => {
        const href = safeUrl(p.url)
        return (
          <article key={i} className="ui-product">
            {p.image && <AsyncImage query={p.image} src={p.src} fallbackSrc={p.fallbackSrc} aspectRatio="4:3" />}
            <div className="ui-product-body">
              {p.badge && <Badge text={p.badge} tone="accent" />}
              <h4 className="ui-product-name">{p.name}</h4>
              {typeof p.rating === 'number' && <Rating value={p.rating} size="sm" />}
              {typeof p.price === 'number' && <div className="ui-product-price">{fmt(p.price, format)}</div>}
              {!!p.specs?.length && (
                <ul className="ui-product-specs">{p.specs.map((s, j) => <li key={j}>{s}</li>)}</ul>
              )}
              {href && (
                <a className="ui-link" href={href} target="_blank" rel="noopener noreferrer">
                  {L.viewProduct} <Glyph name="external" size={14} />
                </a>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

export type WeatherCondition = 'sun' | 'partly' | 'cloud' | 'rain' | 'storm' | 'fog' | 'wind' | 'snow'

const WEATHER: Record<WeatherCondition, { icon: LucideIcon; label: keyof Labels }> = {
  sun: { icon: Sun, label: 'weatherSun' },
  partly: { icon: CloudSun, label: 'weatherPartly' },
  cloud: { icon: Cloud, label: 'weatherCloud' },
  rain: { icon: CloudRain, label: 'weatherRain' },
  storm: { icon: CloudLightning, label: 'weatherStorm' },
  fog: { icon: CloudFog, label: 'weatherFog' },
  wind: { icon: Wind, label: 'weatherWind' },
  snow: { icon: Snowflake, label: 'weatherSnow' },
}
const weather = (c: unknown) => WEATHER[c as WeatherCondition] ?? WEATHER.cloud

/** Current conditions in a WeatherCard. */
export interface WeatherNow {
  temp: number
  condition?: WeatherCondition
  feelsLike?: number
  /** km/h. */
  wind?: number
  /** Percent, 0 to 100. */
  humidity?: number
  /** One short line, such as "Light rain after 3 pm". */
  summary?: string
}

/** One period in a WeatherCard forecast. */
export interface ForecastPeriod {
  /** "Tue", "14:00" or "Today". */
  label: string
  condition?: WeatherCondition
  high?: number
  low?: number
  /** Chance of rain, percent 0 to 100. */
  rain?: number
}

/**
 * Current weather for a place with an hourly or daily forecast strip. Use only figures from the sources.
 *
 * @example
 * <WeatherCard location="Addis Ababa" now={{ temp: 19, condition: 'partly', humidity: 62, wind: 11 }}
 *   forecast={[{ label: 'Wed', condition: 'rain', high: 21, low: 11, rain: 70 }]} />
 */
export function WeatherCard({ location, now, forecast = [], unit = 'C', updated }: {
  location: string
  now: WeatherNow
  forecast?: ForecastPeriod[]
  unit?: 'C' | 'F'
  /** As-of note, such as "Updated 09:00". */
  updated?: string
}) {
  const L = useLabels()
  const deg = (t: unknown) => (typeof t === 'number' ? Math.round(t) + '°' : '–')
  const cur = weather(now?.condition)
  const NowIcon = cur.icon
  const facts = [
    typeof now?.feelsLike === 'number' && fillTemplate(L.feelsLike, { value: deg(now.feelsLike) }),
    typeof now?.humidity === 'number' && fillTemplate(L.humidity, { value: Math.round(now.humidity) + '%' }),
    typeof now?.wind === 'number' && fillTemplate(L.wind, { value: Math.round(now.wind) }),
  ].filter(Boolean) as string[]
  return (
    <section className="ui-card pad ui-weather">
      <div className="ui-weather-now">
        <NowIcon size={44} strokeWidth={1.6} className="wx-icon" aria-hidden />
        <div className="wx-main">
          <span className="wx-loc">{location}</span>
          <span className="wx-temp">{deg(now?.temp)}<small>{unit}</small></span>
          <span className="wx-cond">{now?.summary ?? L[cur.label]}</span>
        </div>
        {facts.length > 0 && <ul className="wx-facts">{facts.map((f) => <li key={f}>{f}</li>)}</ul>}
      </div>
      {forecast.length > 0 && (
        <ol className="ui-weather-strip">
          {forecast.map((f, i) => {
            const w = weather(f.condition)
            const Icon = w.icon
            return (
              <li key={i} aria-label={`${f.label}: ${L[w.label]}`}>
                <span className="wx-label">{f.label}</span>
                <Icon size={22} strokeWidth={1.7} aria-hidden />
                <span className="wx-range"><b>{deg(f.high)}</b>{typeof f.low === 'number' && <span>{deg(f.low)}</span>}</span>
                {typeof f.rain === 'number' && <span className="wx-rain">{Math.round(f.rain)}%</span>}
              </li>
            )
          })}
        </ol>
      )}
      {updated && <p className="ui-caption t-muted">{updated}</p>}
    </section>
  )
}
