import { useMemo } from 'react'
import { fmt, rem } from '../format'
import type { VizPayload } from '../types'
import { NcChart, NC_CHART, type EChartsOption } from './echarts'

export type FunnelProps = {
  viz: Extract<VizPayload, { component: 'funnel' }>
}


/**
 * Ordered stages that lose volume (ECharts funnel).
 *
 * Highlights the worst step-to-step conversion drop. Graph kind: `funnel`.
 * See [Funnel.md](./Funnel.md).
 *
 * @param viz - `component: 'funnel'` with ordered `data: BarItem[]`.
 */
export function Funnel({ viz }: FunnelProps) {
  let worst = -1
  let wv = 2
  viz.data.forEach((s, i) => {
    if (i) {
      const c = s.value / viz.data[i - 1].value
      if (c < wv) {
        wv = c
        worst = i
      }
    }
  })

  const option = useMemo<EChartsOption>(() => {
    const n = viz.data.length
    return {
      animationDuration: 400,
      tooltip: {
        trigger: 'item',
        backgroundColor: NC_CHART.ink,
        borderWidth: 0,
        textStyle: { color: NC_CHART.plain, fontSize: rem(11.5) },
        formatter: (p: unknown) => {
          const item = p as { name: string; value: number; dataIndex: number }
          const prev = item.dataIndex > 0 ? viz.data[item.dataIndex - 1].value : null
          const conv = prev ? Math.round((item.value / prev) * 100) + '%' : ''
          return `${item.name}<br/><b>${fmt(item.value, viz.unit)}</b>${conv ? ` · ${conv}` : ''}`
        },
      },
      series: [
        {
          type: 'funnel',
          left: '2%',
          top: 8,
          bottom: 8,
          width: '96%',
          minSize: '18%',
          maxSize: '100%',
          sort: 'none',
          gap: 4,
          label: {
            show: true,
            position: 'inside',
            formatter: (p: { name: string; value: number; dataIndex: number }) => {
              const prev = p.dataIndex > 0 ? viz.data[p.dataIndex - 1].value : null
              const conv = prev ? `  ${Math.round((p.value / prev) * 100)}%` : ''
              return `{name|${p.name}}  {val|${fmt(p.value, viz.unit)}}${conv ? `{conv|${conv}}` : ''}`
            },
            rich: {
              name: { color: NC_CHART.ink, fontSize: rem(12), fontFamily: NC_CHART.font },
              val: { color: NC_CHART.ink, fontSize: rem(12), fontWeight: 500, fontFamily: NC_CHART.font },
              conv: { color: NC_CHART.ink2, fontSize: rem(11), fontFamily: NC_CHART.font },
            },
          },
          labelLine: { show: false },
          itemStyle: { borderColor: NC_CHART.plain, borderWidth: 0, borderRadius: 9 },
          data: viz.data.map((s, i) => {
            const t = i / Math.max(n - 1, 1)
            const alpha = 0.12 + t * 0.28
            return {
              name: s.label,
              value: s.value,
              itemStyle: {
                color: i === worst ? 'rgba(181, 52, 31, 0.35)' : `rgba(22, 23, 26, ${alpha.toFixed(2)})`,
                borderColor: i === n - 1 ? NC_CHART.ink : 'transparent',
                borderWidth: i === n - 1 ? 1.5 : 0,
              },
            }
          }),
        },
      ],
    }
  }, [viz.data, viz.unit, worst])

  return (
    <div>
      <NcChart option={option} height={Math.max(140, viz.data.length * 34)} />
      <div className="mt-1 text-[0.6875rem] text-nc-ink-3">Percent is conversion from the stage above. Biggest drop in red.</div>
    </div>
  )
}
