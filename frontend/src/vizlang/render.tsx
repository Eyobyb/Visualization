import type { ComponentType, ReactNode } from 'react'
import * as V from '../components/visualization'
import type { SendToModel } from '../components/visualization'
import { SPECS } from './specs'
import type { PropSpec } from './schema'
import { hasOwn, isBinding, isNode, PENDING, type ComponentNode } from './values'

/** What rendering needs beyond the compiled tree. */
export interface RenderContext {
  /** Current `$variable` values, from the compile result. */
  state: Record<string, unknown>
  set: (name: string, value: unknown) => void
  onSend: SendToModel
  /** Server-resolved images, keyed by node key (`photo`) or node key plus index (`photos.0`). */
  resolved?: Record<string, ResolvedImage | null | undefined>
}

/** A photo the server found for an image query; `null` in the map means no photo matched. */
export interface ResolvedImage {
  src: string
  /** A smaller copy to show if `src` fails to load. */
  fallback?: string
}

const imageProps = (r: ResolvedImage | null | undefined) =>
  r ? { src: r.src, fallbackSrc: r.fallback } : { src: r }

type Props = Record<string, unknown>
type AnyComponent = ComponentType<Props>

interface Renderer {
  component: AnyComponent
  /** Rewrites language props into the TypeScript component's props, when they differ. */
  adapt?: (props: Props, node: ComponentNode, ctx: RenderContext) => Props
}

const as = (c: unknown) => c as AnyComponent

/** `value: $var` becomes `value` + `onChange`, the shape of every controlled input. */
const bindValue = (prop: string) => (p: Props, _n: ComponentNode, ctx: RenderContext): Props => {
  const { value, ...rest } = p
  if (!isBinding(value)) return rest
  return { ...rest, [prop]: ctx.state[value.$state], onChange: (v: unknown) => ctx.set(value.$state, v) }
}
const withSend = (p: Props, _n: ComponentNode, ctx: RenderContext): Props => ({ ...p, onSend: ctx.onSend })

/** Every language component and the visualization component that draws it. */
export const RENDERERS: Record<string, Renderer> = {
  Col: { component: as(V.Col) },
  Row: { component: as(V.Row) },
  Box: { component: as(V.Box) },
  Grid: { component: as(V.Grid) },
  Card: { component: as(V.Card) },
  Tabs: { component: as(V.Tabs) },
  Accordion: { component: as(V.Accordion) },
  Divider: { component: as(V.Divider) },
  Title: { component: as(V.Title) },
  Text: { component: as(V.Text) },
  Caption: { component: as(V.Caption) },
  Badge: { component: as(V.Badge) },
  List: { component: as(V.List) },
  Callout: { component: as(V.Callout) },
  Markdown: { component: as(V.Markdown) },
  Link: { component: as(V.Link) },
  Code: { component: as(V.Code) },
  Button: { component: as(V.Button) },
  Input: { component: as(V.Input), adapt: bindValue('value') },
  Select: { component: as(V.Select), adapt: bindValue('value') },
  SegmentedControl: { component: as(V.SegmentedControl), adapt: bindValue('value') },
  Slider: { component: as(V.Slider), adapt: bindValue('value') },
  Checkbox: { component: as(V.Checkbox), adapt: bindValue('checked') },
  Switch: { component: as(V.Switch), adapt: bindValue('checked') },
  RadioGroup: { component: as(V.RadioGroup), adapt: bindValue('value') },
  Table: { component: as(V.Table) },
  Chart: { component: as(V.Chart) },
  Stat: { component: as(V.Stat) },
  Progress: { component: as(V.Progress) },
  Sparkline: { component: as(V.Sparkline) },
  KpiCard: { component: as(V.KpiCard) },
  MultiKpiCard: { component: as(V.MultiKpiCard) },
  KpiGraphCard: { component: as(V.KpiGraphCard) },
  ListCard: { component: as(V.ListCard) },
  GraphCard: { component: as(V.GraphCard) },
  ActionableGraphCard: { component: as(V.ActionableGraphCard) },
  Icon: { component: as(V.Icon) },
  AsyncImage: {
    component: as(V.AsyncImage),
    adapt: (p, n, ctx) => ({ ...p, ...imageProps(ctx.resolved?.[n.key]) }),
  },
  AsyncImageGroup: {
    component: as(V.AsyncImageGroup),
    adapt: ({ queries, ...p }, n, ctx) => ({
      ...p,
      images: (queries as unknown[]).map((q, i) => ({ query: String(q), ...imageProps(ctx.resolved?.[n.key + '.' + i]) })),
    }),
  },
  Summary: { component: as(V.Summary) },
  KeyPoints: { component: as(V.KeyPoints) },
  IconList: { component: as(V.IconList) },
  NestedList: { component: as(V.NestedList) },
  Steps: { component: as(V.Steps) },
  Checklist: { component: as(V.Checklist) },
  ProsCons: { component: as(V.ProsCons) },
  BulletColumns: { component: as(V.BulletColumns) },
  FactList: { component: as(V.FactList) },
  Quote: { component: as(V.Quote) },
  Sources: { component: as(V.Sources) },
  ChoiceChips: {
    component: as(V.ChoiceChips),
    adapt: (p, n, ctx) => {
      if (isBinding(p.value)) {
        const { template: _t, multi: _m, submitLabel: _s, ...rest } = p
        return bindValue('value')(rest, n, ctx)
      }
      return withSend(p, n, ctx)
    },
  },
  Form: { component: as(V.Form), adapt: withSend },
  ApprovalCard: { component: as(V.ApprovalCard), adapt: withSend },
  ComparisonTable: { component: as(V.ComparisonTable) },
  RegionMap: { component: as(V.RegionMap) },
}

/** True when a value still holds a not-yet-streamed part outside any nested component. */
function hasPending(v: unknown): boolean {
  if (v === PENDING) return true
  if (isNode(v) || v == null || typeof v !== 'object') return false
  if (Array.isArray(v)) return v.some(hasPending)
  return Object.values(v).some(hasPending)
}

/** Renders component nodes nested inside list props (tab contents, list items) and leaves other values alone. */
function renderNested(v: unknown, ctx: RenderContext, key: string): unknown {
  if (isNode(v)) return renderNode(v, ctx, key)
  if (Array.isArray(v)) return v.map((x, i) => renderNested(x, ctx, key + '.' + i))
  if (v && typeof v === 'object' && !isBinding(v) && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, renderNested(x, ctx, key + '.' + k)]))
  }
  return v
}

function renderComponent(n: ComponentNode, ctx: RenderContext): ReactNode {
  const spec = SPECS[n.name]
  const renderer = RENDERERS[n.name]
  if (!spec || !renderer) return null
  const props: Props = {}
  for (const [name, value] of Object.entries(n.props)) {
    const ps: PropSpec | undefined = spec.props[name]
    if (ps?.type === 'node' || ps?.type === 'nodes') {
      props[name] = renderNode(value, ctx, n.key + '.' + name)
      continue
    }
    if (hasPending(value)) return <V.Skeleton key={n.key} />
    props[name] = ps?.type === 'list' || ps?.type === 'any' ? renderNested(value, ctx, n.key + '.' + name) : value
  }
  const Comp = renderer.component
  const finalProps = renderer.adapt ? renderer.adapt(props, n, ctx) : props
  return (
    <V.VizBoundary key={n.key} name={n.name} resetKey={n}>
      <Comp {...finalProps} />
    </V.VizBoundary>
  )
}

/**
 * Turns an evaluated value into React: pending values become skeletons, strings become paragraphs,
 * lists render each item, and component nodes render through `RENDERERS`.
 */
export function renderNode(n: unknown, ctx: RenderContext, key = 'root'): ReactNode {
  if (n === PENDING) return <V.Skeleton key={key} />
  if (n == null || typeof n === 'boolean') return null
  if (typeof n === 'string' || typeof n === 'number') return <V.Text key={key} text={String(n)} />
  if (Array.isArray(n)) return n.map((c, i) => renderNode(c, ctx, key + '.' + i))
  if (isNode(n)) return renderComponent(n, ctx)
  return null
}

/** Names the language accepts but that have no renderer, or the reverse. Empty when the registry is complete. */
export function registryMismatches(): string[] {
  const specNames = Object.keys(SPECS)
  return [
    ...specNames.filter((s) => !hasOwn(RENDERERS, s)).map((s) => 'no renderer for ' + s),
    ...Object.keys(RENDERERS).filter((r) => !hasOwn(SPECS, r)).map((r) => 'no spec for ' + r),
  ]
}
