import type { ReactNode } from 'react'
import type { VizPayload } from '../types'
import { Columns, ColumnsBaseline } from './Columns'
import { Funnel } from './Funnel'
import { Gauge } from './Gauge'
import { Heatmap } from './Heatmap'
import { Kpi } from './Kpi'
import { KpiStrip } from './KpiStrip'
import { Pie } from './Pie'
import { Radar } from './Radar'
import { RankedList } from './RankedList'
import { Sankey } from './Sankey'
import { Scatter } from './Scatter'
import { StackedBars } from './StackedBars'
import { Table } from './Table'
import { Trend } from './Trend'
import { Treemap } from './Treemap'

/**
 * Maps a {@link VizPayload} to the matching React viz, or `null` for text-only cards.
 *
 * Used by {@link Card} after `resolveCard`. See [renderViz.md](./renderViz.md).
 *
 * @param viz - Discriminated viz payload (`component` id) or null/undefined.
 */
export function renderViz(viz: VizPayload | null | undefined): ReactNode {
  if (!viz) return null
  switch (viz.component) {
    case 'kpi':
      return <Kpi viz={viz} />
    case 'kpi_strip':
      return <KpiStrip viz={viz} />
    case 'trend':
      return <Trend viz={viz} />
    case 'columns':
      return <Columns viz={viz} />
    case 'columns_baseline':
      return <ColumnsBaseline viz={viz} />
    case 'ranked_list':
      return <RankedList viz={viz} />
    case 'table':
      return <Table viz={viz} />
    case 'funnel':
      return <Funnel viz={viz} />
    case 'stacked_bars':
      return <StackedBars viz={viz} />
    case 'pie':
      return <Pie viz={viz} />
    case 'scatter':
      return <Scatter viz={viz} />
    case 'radar':
      return <Radar viz={viz} />
    case 'gauge':
      return <Gauge viz={viz} />
    case 'heatmap':
      return <Heatmap viz={viz} />
    case 'sankey':
      return <Sankey viz={viz} />
    case 'treemap':
      return <Treemap viz={viz} />
    default:
      return null
  }
}
