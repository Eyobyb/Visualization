import { useMemo } from 'react'
import { fmt, rem } from '../format'
import type { TreeMapItem, VizPayload } from '../types'
import { NcChart, NC_CHART, NC_PALETTE, type EChartsOption } from './echarts'

function toNode(item: TreeMapItem): { name: string; value: number; children?: ReturnType<typeof toNode>[] } {
  return {
    name: item.label,
    value: item.value,
    children: item.children?.map(toNode),
  }
}

export type TreemapProps = {
  viz: Extract<VizPayload, { component: 'treemap' }>
}


/**
 * Nested rectangles for hierarchical share (segment → plan, etc.).
 *
 * Graph kind: `treemap`. See [Treemap.md](./Treemap.md).
 *
 * @param viz - `component: 'treemap'` with nested `data: TreeMapItem[]`.
 */
export function Treemap({ viz }: TreemapProps) {
  const option = useMemo<EChartsOption>(() => {
    return {
      animationDuration: 400,
      color: [...NC_PALETTE],
      tooltip: {
        backgroundColor: NC_CHART.ink,
        borderWidth: 0,
        textStyle: { color: NC_CHART.plain, fontSize: rem(11.5) },
        formatter: (p: unknown) => {
          const item = p as { name: string; value: number; treePathInfo?: { name: string }[] }
          const path = (item.treePathInfo || []).slice(1).map((t) => t.name).join(' / ')
          return `${path || item.name}<br/><b>${fmt(item.value, viz.unit)}</b>`
        },
      },
      series: [
        {
          type: 'treemap',
          width: '100%',
          height: '100%',
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            formatter: (p: { name: string; value: number }) => `{name|${p.name}}\n{val|${fmt(p.value, viz.unit)}}`,
            rich: {
              name: { fontSize: rem(12), color: NC_CHART.plain, fontFamily: NC_CHART.font, lineHeight: rem(16) },
              val: { fontSize: rem(11), color: 'rgba(249,248,246,0.8)', fontFamily: NC_CHART.font, lineHeight: rem(14) },
            },
          },
          upperLabel: { show: false },
          itemStyle: {
            borderColor: NC_CHART.plain,
            borderWidth: 3,
            gapWidth: 3,
            borderRadius: 6,
          },
          levels: [
            { itemStyle: { borderWidth: 0, gapWidth: 4 } },
            {
              colorSaturation: [0.25, 0.55],
              itemStyle: { borderWidth: 2, gapWidth: 2, borderColorSaturation: 0.4 },
            },
          ],
          data: viz.data.map(toNode),
        },
      ],
    }
  }, [viz.data, viz.unit])

  if (!viz.data.length) return null
  return <NcChart option={option} height={188} />
}
