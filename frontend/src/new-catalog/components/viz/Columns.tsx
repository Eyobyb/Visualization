import { useMemo } from 'react'
import { fmt, rem } from '../format'
import type { BarItem, Unit, VizPayload } from '../types'
import { NcChart, NC_CHART, type EChartsOption } from './echarts'

function ColumnsChart({
  data,
  unit,
  highlight,
  baseline,
  good,
}: {
  data: BarItem[]
  unit?: Unit
  highlight?: number
  baseline?: { label: string; value: number }
  good?: 'up' | 'down'
}) {
  const option = useMemo<EChartsOption>(() => {
    const labels = data.map((r) => r.label)
    const seriesData = data.map((r, i) => {
      let color = 'rgba(22, 23, 26, 0.22)'
      if (baseline) {
        const met = good === 'down' ? r.value <= baseline.value : r.value >= baseline.value
        color = met ? 'rgba(22, 23, 26, 0.78)' : 'rgba(181, 52, 31, 0.7)'
      } else if (i === highlight) {
        color = NC_CHART.ink
      }
      return {
        value: r.value,
        itemStyle: {
          color,
          borderRadius: [5, 5, 2, 2],
          shadowBlur: i === highlight && !baseline ? 0 : 0,
          shadowColor: i === highlight && !baseline ? 'rgba(214, 240, 74, 0.55)' : undefined,
        },
        label: {
          show: true,
          position: 'top' as const,
          formatter: () => fmt(r.value, unit),
          color: i === highlight && !baseline ? NC_CHART.ink : NC_CHART.ink2,
          fontSize: rem(10.5),
          fontWeight: i === highlight && !baseline ? 600 : 400,
          fontFamily: NC_CHART.font,
        },
      }
    })

    return {
      animationDuration: 400,
      grid: { left: 4, right: 4, top: 28, bottom: 24, containLabel: false },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: NC_CHART.ink,
        borderWidth: 0,
        textStyle: { color: NC_CHART.plain, fontSize: rem(11.5) },
        valueFormatter: (v) => fmt(v as number, unit),
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: NC_CHART.ink3, fontSize: rem(10.5), interval: 0, hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: seriesData,
          barMaxWidth: 46,
          markLine: baseline
            ? {
                symbol: 'none',
                label: {
                  formatter: `${baseline.label || 'Baseline'} ${fmt(baseline.value, unit)}`,
                  position: 'insideEndTop',
                  color: NC_CHART.ink,
                  fontSize: rem(10.5),
                  backgroundColor: 'rgba(249, 248, 246, 0.82)',
                  padding: [2, 7],
                  borderRadius: 99,
                },
                lineStyle: { color: NC_CHART.ink, type: 'dashed', width: 1.5, opacity: 0.55 },
                data: [{ yAxis: baseline.value }],
              }
            : undefined,
        },
      ],
    }
  }, [baseline, data, good, highlight, unit])

  return (
    <div>
      <NcChart option={option} height={140} />
      {baseline ? (
        <div className="mt-1 flex flex-wrap gap-3.5 text-[0.6875rem] text-nc-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-sm bg-[color-mix(in_srgb,var(--color-nc-ink)_78%,transparent)]" />
            {good === 'down' ? 'At or under' : 'At or above'} {(baseline.label || 'baseline').toLowerCase()}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-sm bg-[color-mix(in_srgb,var(--color-nc-crit)_70%,transparent)]" />
            Misses it
          </span>
        </div>
      ) : null}
    </div>
  )
}

export type ColumnsProps = {
  viz: Extract<VizPayload, { component: 'columns' }>
}


/**
 * Vertical bars across categories or periods.
 *
 * Optional `highlight` index emphasizes one bar. Graph kind: `columns`.
 * See [Columns.md](./Columns.md).
 *
 * @param viz - `component: 'columns'` with `data: BarItem[]`.
 */
export function Columns({ viz }: ColumnsProps) {
  return <ColumnsChart data={viz.data} unit={viz.unit} highlight={viz.highlight} />
}

export type ColumnsBaselineProps = {
  viz: Extract<VizPayload, { component: 'columns_baseline' }>
}


/**
 * Vertical bars compared to a baseline / target markLine.
 *
 * Bars tint by whether they meet the target (`good: 'up' | 'down'`). Graph kind: `columns_baseline`.
 * See [Columns.md](./Columns.md).
 *
 * @param viz - `component: 'columns_baseline'` with `baseline` and `data: BarItem[]`.
 */
export function ColumnsBaseline({ viz }: ColumnsBaselineProps) {
  return (
    <ColumnsChart
      data={viz.data}
      unit={viz.unit}
      baseline={viz.baseline && Number.isFinite(viz.baseline.value) ? viz.baseline : undefined}
      good={viz.good}
    />
  )
}
