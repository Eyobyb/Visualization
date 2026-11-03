import { useMemo } from 'react'
import type { VizPayload } from '../types'
import { rem } from '../format'
import { NcChart, NC_CHART, NC_PALETTE, type EChartsOption } from './echarts'

export type RadarProps = {
  viz: Extract<VizPayload, { component: 'radar' }>
}


/**
 * Polar radar for comparing series across shared indicators.
 *
 * Graph kind: `radar`. See [Radar.md](./Radar.md).
 *
 * @param viz - `component: 'radar'` with `indicators` and `series` (values aligned to indicators).
 */
export function Radar({ viz }: RadarProps) {
  const option = useMemo<EChartsOption>(() => {
    const indicators = viz.indicators.map((ind) => {
      const max =
        ind.max
        ?? Math.max(
          ...viz.series.flatMap((s) => s.values),
          1,
        ) * 1.15
      return { name: ind.name, max }
    })
    return {
      animationDuration: 400,
      color: [...NC_PALETTE],
      tooltip: {
        trigger: 'item',
        backgroundColor: NC_CHART.ink,
        borderWidth: 0,
        textStyle: { color: NC_CHART.plain, fontSize: rem(11.5) },
      },
      legend: viz.series.length > 1
        ? {
            bottom: 0,
            left: 0,
            itemWidth: 10,
            itemHeight: 10,
            textStyle: { color: NC_CHART.ink2, fontSize: rem(11) },
          }
        : undefined,
      radar: {
        indicator: indicators,
        center: ['50%', viz.series.length > 1 ? '46%' : '50%'],
        radius: '58%',
        axisName: { color: NC_CHART.ink2, fontSize: rem(11), fontFamily: NC_CHART.font },
        splitLine: { lineStyle: { color: NC_CHART.line2 } },
        splitArea: { show: true, areaStyle: { color: ['rgba(22,23,26,0.02)', 'rgba(22,23,26,0.05)'] } },
        axisLine: { lineStyle: { color: NC_CHART.line2 } },
      },
      series: [
        {
          type: 'radar',
          data: viz.series.map((s, i) => ({
            name: s.name,
            value: s.values,
            areaStyle: { opacity: i === 0 ? 0.18 : 0.08 },
            lineStyle: { width: 1.6 },
            symbol: 'circle',
            symbolSize: 5,
          })),
        },
      ],
    }
  }, [viz])

  if (!viz.indicators.length || !viz.series.length) return null
  return <NcChart option={option} height={200} />
}
