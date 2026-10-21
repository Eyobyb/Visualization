import { Component, useContext, useMemo, type CSSProperties, type ErrorInfo, type ReactNode } from 'react'
import { Glyph, type IconName } from './Icon'
import { fontFaceCss, styleVars, type VizStyle } from './theme/config'
import { STYLE_PACKS, StyleContext, usePlaceholders } from './theme/context'
import { cx } from './utils'
import type { GoodWhen } from './types'
import './theme/fonts.css'
import './styles.css'

/**
 * Root container for every visualization component. It defines the theme variables, the font and a
 * size container that the responsive grids query, so all other components must render inside it.
 *
 * @example
 * <VizRoot>
 *   <Col><Title text="Q3 sales review" /></Col>
 * </VizRoot>
 */
export function VizRoot({ children, theme = 'light', stylePack, className }: {
  children: ReactNode
  /** `dark` switches every component to the dark palette. */
  theme?: 'light' | 'dark'
  /**
   * A built-in pack name (`STYLE_PACKS`) or a resolved style. Defaults to the enclosing VizRoot's style,
   * or the one selected at startup with VIZ_STYLE.
   */
  stylePack?: string | VizStyle
  className?: string
}) {
  const inherited = useContext(StyleContext)
  const style = typeof stylePack === 'string' ? STYLE_PACKS[stylePack] ?? inherited : stylePack ?? inherited
  const vars = useMemo(() => styleVars(style, theme) as CSSProperties, [style, theme])
  const faces = useMemo(() => fontFaceCss(style), [style])
  return (
    <StyleContext.Provider value={style}>
      {faces && <style href={'viz-fonts-' + hash(faces)} precedence="default">{faces}</style>}
      <div className={cx('viz', className)} data-theme={theme} data-style={style.name} data-skeleton={style.placeholders.skeleton} style={vars}>{children}</div>
    </StyleContext.Provider>
  )
}

const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/**
 * Shimmering placeholder shown while content (an image, a streamed block) is still on its way.
 *
 * @example <Skeleton height={120} />
 */
export function Skeleton({ height }: {
  /** Minimum height in pixels; defaults to 56. */
  height?: number
}) {
  const { loading } = usePlaceholders()
  return <div className="ui-skel" style={height ? { minHeight: height } : undefined} aria-label={loading} />
}

/**
 * Dashed placeholder that explains why a data component has nothing to show.
 *
 * @example <Empty text="No rows to chart" />
 */
export function Empty({ text }: { text: string }) {
  return <div className="ui-empty">{text}</div>
}

/**
 * Card header with an optional icon tile, title and subtitle. Renders nothing without a title or icon.
 *
 * @example <CardHead title="Top products" subtitle="Q3" icon="shopping-bag" />
 */
export function CardHead({ title, subtitle, icon }: { title?: string; subtitle?: string; icon?: IconName }) {
  if (!title && !icon) return null
  return (
    <header className="ui-card-head">
      {icon && <span className="ui-card-icon"><Glyph name={icon} size={17} /></span>}
      <div className="ui-card-titles">
        {title != null && <h3 className="ui-card-title">{title}</h3>}
        {subtitle != null && <p className="ui-card-sub">{subtitle}</p>}
      </div>
    </header>
  )
}

/**
 * Percentage change with a trend arrow, coloured green or red by whether the direction is good.
 * Uses `delta` when given, otherwise computes it from `value` and `prev`. Renders nothing when no change can be computed.
 *
 * @example <Delta value={4820000} prev={4310000} label="vs Q2" />
 */
export function Delta({ value, prev, delta, goodWhen = 'up', label }: {
  value?: number
  prev?: number
  /** Change as a fraction (0.12 = +12%), if already known. */
  delta?: number
  goodWhen?: GoodWhen
  /** Comparison text after the percentage, such as "vs last month". */
  label?: string
}) {
  let d = delta
  if (typeof d !== 'number' && typeof value === 'number' && typeof prev === 'number' && prev !== 0) d = (value - prev) / Math.abs(prev)
  if (typeof d !== 'number' || !Number.isFinite(d)) return null
  const up = d >= 0
  const good = goodWhen === 'down' ? !up : up
  return (
    <span className={cx('ui-delta', good ? 'is-good' : 'is-bad')}>
      <Glyph name={up ? 'trending-up' : 'trending-down'} size={14} />
      {(up ? '+' : '') + (d * 100).toFixed(1) + '%'}
      {label && <span className="ui-delta-label">{label}</span>}
    </span>
  )
}

interface BoundaryProps {
  /** Shown in the failure message so the broken block can be identified. */
  name: string
  children: ReactNode
  /** When this value changes, a caught error is cleared and the children render again. */
  resetKey?: unknown
}

/**
 * Error boundary for one generated block: a crash in a single component shows an inline failure note
 * instead of blanking the whole response.
 *
 * @example
 * <VizBoundary name="Chart" resetKey={data}>
 *   <Chart type="bar" data={data} x="region" y="revenue" />
 * </VizBoundary>
 */
export class VizBoundary extends Component<BoundaryProps, { err: Error | null; resetKey: unknown }> {
  state = { err: null as Error | null, resetKey: this.props.resetKey }
  static getDerivedStateFromError(err: Error) {
    return { err }
  }
  static getDerivedStateFromProps(props: BoundaryProps, state: { resetKey: unknown }) {
    return props.resetKey !== state.resetKey ? { err: null, resetKey: props.resetKey } : null
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(`[viz] ${this.props.name} failed`, err, info.componentStack)
  }
  render() {
    return this.state.err
      ? <div className="ui-failed">{this.props.name} failed at runtime: {this.state.err.message}</div>
      : this.props.children
  }
}
