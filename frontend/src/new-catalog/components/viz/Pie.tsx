import { useMemo } from 'react'
import { fmt, rem } from '../format'
import type { VizPayload } from '../types'
import { NcChart, NC_CHART, NC_PALETTE, type EChartsOption } from './echarts'

export type PieProps = {
  viz: Extract<VizPayload, { component: 'pie' }>
}


/**
 * Pie or donut for share of a whole (donut by default; center shows total).
 *
 * Graph kind: `pie`. See [Pie.md](./Pie.md).
 *
 * @param viz - `component: 'pie'` with `data: PieItem[]` and optional `donut`.
 */
export function Pie({ viz }: PieProps) {
  const total = viz.data.reduce((a, d) => a + d.value, 0)
  const donut = viz.donut !== false

  const option = useMemo<EChartsOption>(() => {
    return {
      animationDuration: 400,
      color: [...NC_PALETTE],
      tooltip: {
        trigger: 'item',
        backgroundColor: NC_CHART.ink,
        borderWidth: 0,
        textStyle: { color: NC_CHART.plain, fontSize: rem(11.5), fontFamily: NC_CHART.font },
        formatter: (p: unknown) => {
          const item = p as { name: string; value: number; percent: number }
          return `${item.name}<br/><b>${fmt(item.value, viz.unit)}</b> · ${Math.round(item.percent)}%`
        },
      },
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'middle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 10,
        textStyle: { color: NC_CHART.ink2, fontSize: rem(11.5), fontFamily: NC_CHART.font },
        formatter: (name: string) => {
          const row = viz.data.find((d) => d.label === name)
          if (!row || !total) return name
          const pct = Math.round((row.value / total) * 100)
          return `${name}  ${pct}%`
        },
      },
      series: [
        {
          type: 'pie',
          radius: donut ? ['42%', '68%'] : ['0%', '68%'],
          center: ['34%', '50%'],
          avoidLabelOverlap: true,
          padAngle: 1.5,
          itemStyle: { borderRadius: donut ? 5 : 3, borderColor: NC_CHART.plain, borderWidth: 2 },
          label: { show: false },
          labelLine: { show: false },
          emphasis: {
            scale: true,
            scaleSize: 4,
            itemStyle: { shadowBlur: 12, shadowColor: 'rgba(22, 23, 26, 0.18)' },
          },
          data: viz.data.map((d) => ({ name: d.label, value: d.value })),
        },
      ],
      graphic: donut
        ? [
            {
              type: 'group',
              left: '34%',
              top: '50%',
              bounding: 'raw',
              children: [
                {
                  type: 'text',
                  style: {
                    text: fmt(total, viz.unit),
                    fill: NC_CHART.ink,
                    font: `500 0.9375rem ${NC_CHART.display}`,
                    textAlign: 'center',
                    textVerticalAlign: 'bottom',
                  },
                  top: -2,
                },
                {
                  type: 'text',
                  style: {
                    text: 'Total',
                    fill: NC_CHART.ink3,
                    font: `0.6875rem ${NC_CHART.font}`,
                    textAlign: 'center',
                    textVerticalAlign: 'top',
                  },
                  top: 4,
                },
              ],
            },
          ]
        : undefined,
    }
  }, [donut, total, viz.data, viz.unit])

  if (!viz.data.length) return null
  return <NcChart option={option} height={168} />
}
