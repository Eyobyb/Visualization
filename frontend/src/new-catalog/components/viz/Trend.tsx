import { useMemo } from 'react'
import { fmt, fmtX, isNum, rem } from '../format'
import type { VizPayload } from '../types'
import { NcChart, NC_CHART, type EChartsOption } from './echarts'

export type TrendProps = {
  viz: Extract<VizPayload, { component: 'trend' }>
}


/**
 * Line (+ area) chart for a metric over time.
 *
 * Optional dashed comparison series when points include `y2`. Graph kind: `trend`.
 * See [Trend.md](./Trend.md).
 *
 * @param viz - `component: 'trend'` with `data: { x, y, y2? }[]` and optional `series` labels.
 */
export function Trend({ viz }: TrendProps) {
  const d = viz.data
  const n = d.length
  const has2 = d.some((p) => isNum(p.y2))
  const series = viz.series || []
  const last = d[n - 1]

  const option = useMemo<EChartsOption>(() => {
    if (n < 1) return {}
    const cats = d.map((p) => fmtX(p.x))
    const y1 = d.map((p) => p.y)
    const y2 = has2 ? d.map((p) => (isNum(p.y2) ? p.y2 : null)) : null
    return {
      animationDuration: 400,
      grid: { left: 8, right: 48, top: 16, bottom: 28, containLabel: false },
      tooltip: {
        trigger: 'axis',
        backgroundColor: NC_CHART.ink,
        borderWidth: 0,
        textStyle: { color: NC_CHART.plain, fontSize: rem(11.5), fontFamily: NC_CHART.font },
        valueFormatter: (v) => fmt(v as number, viz.unit),
      },
      legend: has2 || series.length
        ? {
            bottom: 0,
            left: 0,
            itemWidth: 14,
            itemHeight: 2,
            textStyle: { color: NC_CHART.ink2, fontSize: rem(11) },
            data: [
              { name: series[0] || 'This period', icon: 'path://M0,0H14V2H0Z' },
              ...(has2 ? [{ name: series[1] || 'Comparison', icon: 'path://M0,0H14V2H0Z' }] : []),
            ],
          }
        : undefined,
      xAxis: {
        type: 'category',
        data: cats,
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: NC_CHART.ink3,
          fontSize: rem(10.5),
          interval: (i: number) => i === 0 || i === Math.floor((n - 1) / 2) || i === n - 1,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { lineStyle: { color: NC_CHART.line2, width: 1 } },
      },
      series: [
        {
          name: series[0] || 'This period',
          type: 'line',
          data: y1,
          smooth: 0.15,
          symbol: 'circle',
          symbolSize: 0,
          showSymbol: false,
          lineStyle: { width: 1.8, color: NC_CHART.ink },
          areaStyle: { color: NC_CHART.fill },
          endLabel: {
            show: true,
            formatter: () => fmt(last.y, viz.unit),
            color: NC_CHART.ink,
            fontFamily: NC_CHART.display,
            fontSize: rem(11.5),
            fontWeight: 500,
            distance: 6,
          },
          markPoint: {
            symbol: 'circle',
            symbolSize: 9,
            data: [{ coord: [cats[n - 1], last.y], itemStyle: { color: NC_CHART.ink, borderColor: 'rgba(214,240,74,0.55)', borderWidth: 4 } }],
            label: { show: false },
          },
        },
        ...(y2
          ? [
              {
                name: series[1] || 'Comparison',
                type: 'line' as const,
                data: y2,
                smooth: 0.15,
                symbol: 'none' as const,
                lineStyle: { width: 1.4, color: NC_CHART.ink3, type: 'dashed' as const },
              },
            ]
          : []),
      ],
    }
  }, [d, has2, n, series, viz.unit, last])

  if (n < 1) return null
  return <NcChart option={option} height={148} />
}
