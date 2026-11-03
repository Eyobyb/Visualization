import { useMemo } from 'react'
import { Delta } from '../Delta'
import { fmt } from '../format'
import type { VizPayload } from '../types'
import { NcChart, NC_CHART, type EChartsOption } from './echarts'

function Spark({ vals }: { vals: number[] }) {
  const option = useMemo<EChartsOption>(() => {
    if (vals.length < 2) return {}
    return {
      animation: false,
      grid: { left: 0, right: 4, top: 4, bottom: 2 },
      xAxis: { type: 'category', show: false, data: vals.map((_, i) => i) },
      yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
      series: [
        {
          type: 'line',
          data: vals,
          smooth: 0.2,
          symbol: 'none',
          symbolSize: 6,
          showSymbol: false,
          endLabel: { show: false },
          lineStyle: { width: 1.6, color: NC_CHART.ink },
          areaStyle: { color: NC_CHART.fill },
          markPoint: {
            symbol: 'circle',
            symbolSize: 6,
            data: [{ coord: [vals.length - 1, vals[vals.length - 1]], itemStyle: { color: NC_CHART.ink } }],
            label: { show: false },
          },
        },
      ],
    }
  }, [vals])

  if (vals.length < 2) return null
  return <NcChart option={option} height={44} className="w-full min-w-[5rem]" />
}

export type KpiProps = {
  viz: Extract<VizPayload, { component: 'kpi' }>
}


/**
 * One headline number with optional delta pill and sparkline.
 *
 * Light visual weight — stack (don’t split) when pairing with a graph or table.
 * See [Kpi.md](./Kpi.md).
 *
 * @param viz - `component: 'kpi'` payload; only `data[0]` is shown.
 */
export function Kpi({ viz }: KpiProps) {
  const r = viz.data[0]
  if (!r) return null
  const unit = r.unit || viz.unit
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-x-[1.125rem] gap-y-1.5">
      <span className="col-span-full text-xs text-nc-ink-2">{r.label}</span>
      <span className="font-nc-display text-[3.25rem] font-light leading-none tracking-[-0.045em] tabular-nums text-nc-ink">
        {fmt(r.value, unit)}
      </span>
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <Delta delta={r.delta} deltaUnit={r.delta_unit} period={r.period} good={r.good} />
        {r.spark ? <Spark vals={r.spark} /> : null}
      </div>
    </div>
  )
}
