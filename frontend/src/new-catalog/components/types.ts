/** Card payload and viz contracts from the Card Visualizations prototype. */

export type Severity = 'crit' | 'warn' | 'good' | 'info' | 'neutral'
export type GoodWhen = 'up' | 'down'
export type CardState = 'ready' | 'updating'
export type Unit = 'USD' | '%' | 'x' | 'h' | 'days' | 'pt' | '' | (string & {})

export type KpiItem = {
  label: string
  value: number
  unit?: Unit
  delta?: number
  delta_unit?: Unit
  period?: string
  good?: GoodWhen
  spark?: number[]
}

export type TrendPoint = { x: string; y: number; y2?: number }
export type BarItem = { label: string; value: number; unit?: Unit }
export type RankItem = { label: string; value: number; unit?: Unit; source?: string }
export type TableCol = { key: string; label: string; type?: 'text' | 'date' | 'number' | 'USD' | '%' | 'h' }
export type StackRow = { label: string; values: Record<string, number> }
export type PieItem = { label: string; value: number }
export type ScatterPoint = { x: number; y: number; label?: string; group?: string }
export type RadarIndicator = { name: string; max?: number }
export type RadarSeries = { name: string; values: number[] }
export type HeatCell = { x: string; y: string; value: number }
export type SankeyNode = { name: string }
export type SankeyLink = { source: string; target: string; value: number }
export type TreeMapItem = { label: string; value: number; children?: TreeMapItem[] }

export type VizPayload =
  | { component: 'kpi'; unit?: Unit; data: KpiItem[] }
  | { component: 'kpi_strip'; unit?: Unit; data: KpiItem[] }
  | { component: 'trend'; unit?: Unit; series?: string[]; data: TrendPoint[] }
  | { component: 'columns'; unit?: Unit; highlight?: number; order?: 'time' | 'rank'; data: BarItem[] }
  | {
      component: 'columns_baseline'
      unit?: Unit
      good?: GoodWhen
      baseline?: { label: string; value: number }
      data: BarItem[]
    }
  | { component: 'ranked_list'; unit?: Unit; order?: 'asc' | 'desc'; data: RankItem[] }
  | { component: 'table'; columns: TableCol[]; rows: Record<string, unknown>[] }
  | { component: 'funnel'; unit?: Unit; data: BarItem[] }
  | { component: 'stacked_bars'; unit?: Unit; segments: string[]; data: StackRow[] }
  | { component: 'pie'; unit?: Unit; donut?: boolean; data: PieItem[] }
  | {
      component: 'scatter'
      unit?: Unit
      x_unit?: Unit
      y_unit?: Unit
      x_label?: string
      y_label?: string
      data: ScatterPoint[]
    }
  | {
      component: 'radar'
      unit?: Unit
      indicators: RadarIndicator[]
      series: RadarSeries[]
    }
  | {
      component: 'gauge'
      unit?: Unit
      label?: string
      min?: number
      max?: number
      target?: number
      value: number
    }
  | {
      component: 'heatmap'
      unit?: Unit
      data: HeatCell[]
    }
  | {
      component: 'sankey'
      unit?: Unit
      nodes: SankeyNode[]
      links: SankeyLink[]
    }
  | {
      component: 'treemap'
      unit?: Unit
      data: TreeMapItem[]
    }

export type CardPayload = {
  sources?: string[]
  updated?: string
  headline: string
  takeaway?: string
  bullets?: string[]
  attention?: boolean
  severity?: Severity
  viz?: VizPayload | null
  /** Extra rows beyond the trimmed view (thread link). */
  total_rows?: number
}

export type VizComponentId = VizPayload['component']
