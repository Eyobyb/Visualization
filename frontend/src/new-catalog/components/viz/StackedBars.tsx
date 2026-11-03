import { useMemo } from 'react'
import { fmt, rem } from '../format'
import type { VizPayload } from '../types'
import { NcChart, NC_CHART, type EChartsOption } from './echarts'

const COLS = [NC_CHART.c1, NC_CHART.c2, NC_CHART.c3, NC_CHART.c4]

export type StackedBarsProps = {
  viz: Extract<VizPayload, { component: 'stacked_bars' }>
}


/**
 * Horizontal stacked bars for share of a total across named segments.
 *
 * Graph kind: `stacked_bars`. See [StackedBars.md](./StackedBars.md).
 *
 * @param viz - `component: 'stacked_bars'` with `segments` and per-row `values`.
 */
export function StackedBars({ viz }: StackedBarsProps) {
  const segs = viz.segments || []

  const option = useMemo<EChartsOption>(() => {
    const cats = viz.data.map((r) => r.label)
    return {
      animationDuration: 400,
      grid: { left: 48, right: 56, top: 8, bottom: 28, containLabel: false },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: NC_CHART.ink,
        borderWidth: 0,
        textStyle: { color: NC_CHART.plain, fontSize: rem(11.5) },
        valueFormatter: (v) => fmt(v as number, viz.unit),
      },
      legend: {
        bottom: 0,
        left: 0,
        itemWidth: 9,
        itemHeight: 9,
        textStyle: { color: NC_CHART.ink2, fontSize: rem(11) },
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: cats,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: NC_CHART.ink2, fontSize: rem(11.5) },
      },
      series: segs.map((s, i) => ({
        name: s,
        type: 'bar' as const,
        stack: 'total',
        barWidth: 16,
        emphasis: { focus: 'series' as const },
        itemStyle: { color: COLS[i % 4], borderRadius: 3 },
        label: i === segs.length - 1
          ? {
              show: true,
              position: 'right' as const,
              formatter: (p: { dataIndex: number }) => {
                const row = viz.data[p.dataIndex]
                const t = segs.reduce((a, seg) => a + (+row.values?.[seg] || 0), 0)
                return fmt(t, viz.unit)
              },
              color: NC_CHART.ink,
              fontSize: rem(11.5),
              fontFamily: NC_CHART.font,
            }
          : undefined,
        data: viz.data.map((r) => +r.values?.[s] || 0),
      })),
    }
  }, [segs, viz.data, viz.unit])

  return <NcChart option={option} height={Math.max(120, viz.data.length * 36 + 28)} />
}
