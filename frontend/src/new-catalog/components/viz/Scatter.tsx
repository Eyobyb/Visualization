import { useMemo } from 'react'
import { fmt, rem } from '../format'
import type { VizPayload } from '../types'
import { NcChart, NC_CHART, NC_PALETTE, type EChartsOption } from './echarts'

export type ScatterProps = {
  viz: Extract<VizPayload, { component: 'scatter' }>
}


/**
 * Cartesian scatter for two numeric dimensions; optional `group` series.
 *
 * Graph kind: `scatter`. See [Scatter.md](./Scatter.md).
 *
 * @param viz - `component: 'scatter'` with `data: ScatterPoint[]` and axis labels/units.
 */
export function Scatter({ viz }: ScatterProps) {
  const groups = useMemo(() => {
    const names = [...new Set(viz.data.map((d) => d.group || 'All'))]
    return names
  }, [viz.data])

  const option = useMemo<EChartsOption>(() => {
    return {
      animationDuration: 400,
      color: [...NC_PALETTE],
      grid: { left: 44, right: 12, top: 16, bottom: groups.length > 1 ? 36 : 28, containLabel: false },
      tooltip: {
        trigger: 'item',
        backgroundColor: NC_CHART.ink,
        borderWidth: 0,
        textStyle: { color: NC_CHART.plain, fontSize: rem(11.5), fontFamily: NC_CHART.font },
        formatter: (p: unknown) => {
          const item = p as { seriesName: string; data: [number, number, string?] }
          const [x, y, label] = item.data
          const title = label || item.seriesName
          return `${title}<br/>${viz.x_label || 'X'}: <b>${fmt(x, viz.x_unit || viz.unit)}</b><br/>${viz.y_label || 'Y'}: <b>${fmt(y, viz.y_unit || viz.unit)}</b>`
        },
      },
      legend: groups.length > 1
        ? {
            bottom: 0,
            left: 0,
            itemWidth: 8,
            itemHeight: 8,
            textStyle: { color: NC_CHART.ink2, fontSize: rem(11) },
          }
        : undefined,
      xAxis: {
        type: 'value',
        name: viz.x_label,
        nameLocation: 'middle',
        nameGap: 22,
        nameTextStyle: { color: NC_CHART.ink3, fontSize: rem(10.5) },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: NC_CHART.ink3,
          fontSize: rem(10.5),
          formatter: (v: number) => fmt(v, viz.x_unit || viz.unit),
        },
        splitLine: { lineStyle: { color: NC_CHART.line2, width: 1 } },
      },
      yAxis: {
        type: 'value',
        name: viz.y_label,
        nameTextStyle: { color: NC_CHART.ink3, fontSize: rem(10.5) },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: NC_CHART.ink3,
          fontSize: rem(10.5),
          formatter: (v: number) => fmt(v, viz.y_unit || viz.unit),
        },
        splitLine: { lineStyle: { color: NC_CHART.line2, width: 1 } },
      },
      series: groups.map((g) => ({
        name: g,
        type: 'scatter' as const,
        symbolSize: 11,
        itemStyle: { opacity: 0.85 },
        emphasis: { scale: 1.25 },
        data: viz.data
          .filter((d) => (d.group || 'All') === g)
          .map((d) => (d.label ? ([d.x, d.y, d.label] as [number, number, string]) : ([d.x, d.y] as [number, number]))),
      })),
    }
  }, [groups, viz])

  if (!viz.data.length) return null
  return <NcChart option={option} height={180} />
}
