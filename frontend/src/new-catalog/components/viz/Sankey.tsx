import { useMemo } from 'react'
import { fmt, rem } from '../format'
import type { VizPayload } from '../types'
import { NcChart, NC_CHART, NC_PALETTE, type EChartsOption } from './echarts'

export type SankeyProps = {
  viz: Extract<VizPayload, { component: 'sankey' }>
}


/**
 * Sankey flow between named nodes (e.g. signup → activated → paid).
 *
 * Graph kind: `sankey`. See [Sankey.md](./Sankey.md).
 *
 * @param viz - `component: 'sankey'` with `nodes` and `links` (`source`/`target` = node names).
 */
export function Sankey({ viz }: SankeyProps) {
  const option = useMemo<EChartsOption>(() => {
    return {
      animationDuration: 450,
      color: [...NC_PALETTE],
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        backgroundColor: NC_CHART.ink,
        borderWidth: 0,
        textStyle: { color: NC_CHART.plain, fontSize: rem(11.5) },
        formatter: (p: unknown) => {
          const item = p as { dataType: string; name: string; data: { source?: string; target?: string; value?: number } }
          if (item.dataType === 'edge') {
            return `${item.data.source} → ${item.data.target}<br/><b>${fmt(item.data.value, viz.unit)}</b>`
          }
          return item.name
        },
      },
      series: [
        {
          type: 'sankey',
          emphasis: { focus: 'adjacency' },
          nodeAlign: 'justify',
          nodeGap: 12,
          nodeWidth: 14,
          layoutIterations: 32,
          lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.35 },
          itemStyle: { borderWidth: 0, borderRadius: 3 },
          label: {
            color: NC_CHART.ink,
            fontSize: rem(11.5),
            fontFamily: NC_CHART.font,
          },
          data: viz.nodes.map((n) => ({ name: n.name })),
          links: viz.links.map((l) => ({
            source: l.source,
            target: l.target,
            value: l.value,
          })),
        },
      ],
    }
  }, [viz.links, viz.nodes, viz.unit])

  if (!viz.nodes.length || !viz.links.length) return null
  return <NcChart option={option} height={200} />
}
