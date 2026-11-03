import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { EChartsOption } from 'echarts'
import * as echarts from 'echarts/core'
import {
  BarChart,
  FunnelChart,
  GaugeChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  TreemapChart,
} from 'echarts/charts'
import {
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  RadarComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import { rem } from '../format'

echarts.use([
  LineChart,
  BarChart,
  FunnelChart,
  PieChart,
  ScatterChart,
  RadarChart,
  GaugeChart,
  HeatmapChart,
  SankeyChart,
  TreemapChart,
  GridComponent,
  GraphicComponent,
  RadarComponent,
  VisualMapComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  SVGRenderer,
])

/** Shared Adaly-leaning palette for multi-series / pie slices. */
export const NC_PALETTE = [
  '#16171A',
  '#8F9196',
  '#FF6B00',
  '#9FB0CF',
  '#3F7A1F',
  '#B5341F',
  '#3D4BB0',
  '#8A6100',
] as const

/** Fallback colors matching Adaly light tokens when CSS vars are not yet readable. */
export const NC_CHART = {
  ink: '#16171A',
  ink2: '#55575C',
  ink3: '#8A8C90',
  line2: 'rgba(22, 23, 26, 0.11)',
  crit: '#B5341F',
  plain: '#F9F8F6',
  c1: '#16171A',
  c2: '#8F9196',
  c3: '#FF6B00',
  c4: '#9FB0CF',
  fill: 'rgba(22, 23, 26, 0.07)',
  font: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  display: '"Outfit", "DM Sans", ui-sans-serif, system-ui, sans-serif',
} as const

export type NcChartProps = {
  option: EChartsOption
  /** Chart height in design px (emitted as rem). */
  height: number
  className?: string
  style?: CSSProperties
}

/**
 * ECharts host for new-catalog charts (SVG renderer, resize observer).
 *
 * Mounts only in the browser so SSR/tests stay clean. See [echarts.md](./echarts.md).
 * Uses the SVG renderer and echarts/core directly (avoids a second React from echarts-for-react).
 */
export function NcChart({ option, height, className = '', style }: NcChartProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.EChartsType | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  const merged = useMemo(
    () =>
      ({
        textStyle: { fontFamily: NC_CHART.font, color: NC_CHART.ink2 },
        ...option,
      }) satisfies EChartsOption,
    [option],
  )

  useEffect(() => {
    if (!ready || !hostRef.current) return
    const chart = echarts.init(hostRef.current, undefined, { renderer: 'svg' })
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(hostRef.current)
    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [ready])

  useEffect(() => {
    chartRef.current?.setOption(merged, { notMerge: true, lazyUpdate: true })
  }, [merged, ready])

  return (
    <div
      ref={hostRef}
      className={`w-full ${className}`.trim()}
      style={{ height: rem(height), width: '100%', ...style }}
      aria-hidden={!ready}
    />
  )
}

export type { EChartsOption }
