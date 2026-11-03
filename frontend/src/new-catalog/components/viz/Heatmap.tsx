import { useMemo } from 'react'
import { fmt, rem } from '../format'
import type { VizPayload } from '../types'
import { NcChart, NC_CHART, type EChartsOption } from './echarts'

export type HeatmapProps = {
  viz: Extract<VizPayload, { component: 'heatmap' }>
}


/**
 * Heatmap of intensity across two categorical axes (e.g. weekday × hour).
 *
 * Graph kind: `heatmap`. See [Heatmap.md](./Heatmap.md).
 *
 * @param viz - `component: 'heatmap'` with `data: { x, y, value }[]`.
 */
export function Heatmap({ viz }: HeatmapProps) {
  const xs = useMemo(() => [...new Set(viz.data.map((d) => d.x))], [viz.data])
  const ys = useMemo(() => [...new Set(viz.data.map((d) => d.y))], [viz.data])
  const values = viz.data.map((d) => d.value)
  const vmin = Math.min(...values, 0)
  const vmax = Math.max(...values, 1)

  const option = useMemo<EChartsOption>(() => {
    const map = new Map(viz.data.map((d) => [`${d.x}\0${d.y}`, d.value]))
    const cells = xs.flatMap((x, xi) =>
      ys.map((y, yi) => [xi, yi, map.get(`${x}\0${y}`) ?? 0] as [number, number, number]),
    )
    return {
      animationDuration: 400,
      grid: { left: 56, right: 16, top: 8, bottom: 36, containLabel: false },
      tooltip: {
        position: 'top',
        backgroundColor: NC_CHART.ink,
        borderWidth: 0,
        textStyle: { color: NC_CHART.plain, fontSize: rem(11.5) },
        formatter: (p: unknown) => {
          const item = p as { data: [number, number, number] }
          const [xi, yi, v] = item.data
          return `${ys[yi]} · ${xs[xi]}<br/><b>${fmt(v, viz.unit)}</b>`
        },
      },
      xAxis: {
        type: 'category',
        data: xs,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: NC_CHART.ink3, fontSize: rem(10.5) },
      },
      yAxis: {
        type: 'category',
        data: ys,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: NC_CHART.ink2, fontSize: rem(11) },
      },
      visualMap: {
        min: vmin,
        max: vmax,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemWidth: 10,
        itemHeight: 80,
        inRange: { color: ['#F9F8F6', '#9FB0CF', '#16171A'] },
        textStyle: { color: NC_CHART.ink3, fontSize: rem(10) },
        formatter: (v: string | number) => fmt(+v, viz.unit),
      },
      series: [
        {
          type: 'heatmap',
          data: cells,
          label: {
            show: xs.length * ys.length <= 24,
            color: NC_CHART.ink,
            fontSize: rem(10),
            formatter: (p: { data: [number, number, number] }) => fmt(p.data[2], viz.unit),
          },
          itemStyle: { borderColor: NC_CHART.plain, borderWidth: 2, borderRadius: 4 },
          emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(22,23,26,0.2)' } },
        },
      ],
    }
  }, [viz.data, viz.unit, vmax, vmin, xs, ys])

  if (!viz.data.length) return null
  return <NcChart option={option} height={Math.max(160, ys.length * 28 + 48)} />
}
