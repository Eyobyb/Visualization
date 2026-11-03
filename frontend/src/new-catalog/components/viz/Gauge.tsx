import { useMemo } from 'react'
import { fmt, rem } from '../format'
import type { VizPayload } from '../types'
import { NcChart, NC_CHART, type EChartsOption } from './echarts'

export type GaugeProps = {
  viz: Extract<VizPayload, { component: 'gauge' }>
}


/**
 * Gauge for a single metric against a min/max scale and optional target.
 *
 * Graph kind: `gauge`. See [Gauge.md](./Gauge.md).
 *
 * @param viz - `component: 'gauge'` with `value` and optional `min`, `max`, `target`, `label`.
 */
export function Gauge({ viz }: GaugeProps) {
  const min = viz.min ?? 0
  const max = viz.max ?? Math.max(viz.value * 1.25, viz.target ?? 0, 1)
  const target = viz.target

  const option = useMemo<EChartsOption>(() => {
    return {
      animationDuration: 500,
      series: [
        {
          type: 'gauge',
          min,
          max,
          startAngle: 210,
          endAngle: -30,
          radius: '92%',
          center: ['50%', '58%'],
          progress: {
            show: true,
            width: 12,
            itemStyle: { color: NC_CHART.ink },
          },
          axisLine: {
            lineStyle: {
              width: 12,
              color: [
                [0.55, 'rgba(181, 52, 31, 0.35)'],
                [0.8, 'rgba(138, 97, 0, 0.35)'],
                [1, 'rgba(63, 122, 31, 0.4)'],
              ],
            },
          },
          pointer: {
            length: '58%',
            width: 4,
            itemStyle: { color: NC_CHART.ink },
          },
          anchor: {
            show: true,
            showAbove: true,
            size: 10,
            itemStyle: { color: NC_CHART.ink },
          },
          axisTick: { show: false },
          splitLine: { length: 8, lineStyle: { width: 1.5, color: NC_CHART.ink3 } },
          axisLabel: {
            color: NC_CHART.ink3,
            fontSize: rem(10.5),
            distance: 14,
            formatter: (v: number) => fmt(v, viz.unit),
          },
          title: {
            show: !!viz.label,
            offsetCenter: [0, '78%'],
            color: NC_CHART.ink2,
            fontSize: rem(12),
            fontFamily: NC_CHART.font,
          },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, '48%'],
            formatter: () => fmt(viz.value, viz.unit),
            color: NC_CHART.ink,
            fontSize: rem(22),
            fontFamily: NC_CHART.display,
            fontWeight: 500,
          },
          data: [{ value: viz.value, name: viz.label || '' }],
        },
      ],
      graphic: target != null
        ? [
            {
              type: 'text',
              left: 'center',
              bottom: 4,
              style: {
                text: `Target ${fmt(target, viz.unit)}`,
                fill: NC_CHART.ink3,
                font: `0.71875rem ${NC_CHART.font}`,
                textAlign: 'center',
              },
            },
          ]
        : undefined,
    }
  }, [max, min, target, viz.label, viz.unit, viz.value])

  return <NcChart option={option} height={188} />
}
