import { fmtX, isNum } from './format'
import type { CardPayload, VizPayload } from './types'

export type ResolveResult = {
  card: CardPayload
  viz: VizPayload | null
  hidden: number
}

/**
 * Normalizes a {@link CardPayload} before render: filter bad numbers, cap row counts,
 * and compute `hidden` from trimmed data / `total_rows`.
 *
 * Does not change viz component type. See [resolve.md](./resolve.md).
 */
export function resolveCard(raw: CardPayload): ResolveResult {
  const card: CardPayload = {
    ...raw,
    bullets: Array.isArray(raw.bullets) ? raw.bullets.slice(0, 3) : raw.bullets,
  }
  let viz = raw.viz ? ({ ...raw.viz } as VizPayload) : null
  let hidden = 0
  if (!viz) return { card, viz: null, hidden }

  if (
    Array.isArray((viz as { data?: unknown }).data)
    && viz.component !== 'table'
    && viz.component !== 'stacked_bars'
    && viz.component !== 'scatter'
    && viz.component !== 'heatmap'
    && viz.component !== 'treemap'
  ) {
    const key = viz.component === 'trend' ? 'y' : 'value'
    const data = (viz as { data: Record<string, unknown>[] }).data.filter((r) => r && isNum(r[key]))
    viz = { ...viz, data } as VizPayload
  }
  if (viz.component === 'scatter') {
    const data = viz.data.filter((r) => r && isNum(r.x) && isNum(r.y))
    viz = { ...viz, data }
  }
  if (viz.component === 'heatmap') {
    const data = viz.data.filter((r) => r && isNum(r.value))
    viz = { ...viz, data }
  }

  switch (viz.component) {
    case 'kpi':
      if (viz.data.length > 1) viz = { ...viz, data: viz.data.slice(0, 1) }
      if (!viz.data.length) return { card, viz: null, hidden }
      break
    case 'kpi_strip':
      if (viz.data.length > 4) {
        hidden = viz.data.length - 4
        viz = { ...viz, data: viz.data.slice(0, 4) }
      }
      if (!viz.data.length) return { card, viz: null, hidden }
      break
    case 'trend':
      if (viz.data.length > 30) viz = { ...viz, data: viz.data.slice(-30) }
      if (!viz.data.length) return { card, viz: null, hidden }
      break
    case 'columns':
    case 'columns_baseline': {
      let data = viz.data
      if (data.length > 8) {
        hidden = data.length - 8
        data = viz.component === 'columns' && viz.order === 'rank'
          ? [...data].sort((a, b) => b.value - a.value).slice(0, 8)
          : data.slice(-8)
      }
      viz = { ...viz, data }
      if (!viz.data.length) return { card, viz: null, hidden }
      break
    }
    case 'ranked_list': {
      const asc = viz.order === 'asc'
      let data = [...viz.data].sort((a, b) => (asc ? a.value - b.value : b.value - a.value))
      if (data.length > 5) {
        hidden = data.length - 5
        data = data.slice(0, 5)
      }
      viz = { ...viz, data }
      if (!viz.data.length) return { card, viz: null, hidden }
      break
    }
    case 'table': {
      let rows = viz.rows || []
      let columns = viz.columns || []
      if (rows.length > 3) {
        hidden = rows.length - 3
        rows = rows.slice(0, 3)
      }
      if (columns.length > 4) columns = columns.slice(0, 4)
      viz = { ...viz, rows, columns }
      if (!rows.length) return { card, viz: null, hidden }
      break
    }
    case 'funnel': {
      let data = viz.data
      if (data.length > 5) data = [...data.slice(0, 4), data[data.length - 1]]
      viz = { ...viz, data }
      if (!viz.data.length) return { card, viz: null, hidden }
      break
    }
    case 'stacked_bars': {
      let segments = viz.segments || []
      let data = viz.data
      if (segments.length > 4) {
        const tot = (s: string) => data.reduce((a, r) => a + (+r.values?.[s] || 0), 0)
        const ranked = [...segments].sort((a, b) => tot(b) - tot(a))
        const keep = ranked.slice(0, 3)
        const rest = ranked.slice(3)
        data = data.map((r) => {
          const o: Record<string, number> = {}
          keep.forEach((s) => {
            o[s] = r.values[s] || 0
          })
          o.Other = rest.reduce((a, s) => a + (+r.values[s] || 0), 0)
          return { ...r, values: o }
        })
        segments = [...keep, 'Other']
      }
      if (data.length > 6) {
        hidden = data.length - 6
        data = data.slice(-6)
      }
      viz = { ...viz, segments, data }
      if (!viz.data.length) return { card, viz: null, hidden }
      break
    }
    case 'pie': {
      let data = [...viz.data].sort((a, b) => b.value - a.value)
      if (data.length > 6) {
        const head = data.slice(0, 5)
        const rest = data.slice(5)
        hidden = rest.length
        data = [...head, { label: 'Other', value: rest.reduce((a, r) => a + r.value, 0) }]
      }
      viz = { ...viz, data }
      if (!viz.data.length) return { card, viz: null, hidden }
      break
    }
    case 'scatter': {
      let data = viz.data
      if (data.length > 40) {
        hidden = data.length - 40
        data = data.slice(0, 40)
      }
      viz = { ...viz, data }
      if (!viz.data.length) return { card, viz: null, hidden }
      break
    }
    case 'radar': {
      if (!viz.indicators.length || !viz.series.length) return { card, viz: null, hidden }
      if (viz.indicators.length > 8) viz = { ...viz, indicators: viz.indicators.slice(0, 8) }
      if (viz.series.length > 3) {
        hidden = viz.series.length - 3
        viz = { ...viz, series: viz.series.slice(0, 3) }
      }
      break
    }
    case 'gauge':
      if (!isNum(viz.value)) return { card, viz: null, hidden }
      break
    case 'heatmap': {
      let data = viz.data
      if (data.length > 48) {
        hidden = data.length - 48
        data = data.slice(0, 48)
      }
      viz = { ...viz, data }
      if (!viz.data.length) return { card, viz: null, hidden }
      break
    }
    case 'sankey': {
      if (!viz.nodes.length || !viz.links.length) return { card, viz: null, hidden }
      let links = viz.links.filter((l) => isNum(l.value) && l.value > 0)
      if (links.length > 16) {
        hidden = links.length - 16
        links = links.slice(0, 16)
      }
      const used = new Set(links.flatMap((l) => [l.source, l.target]))
      viz = { ...viz, links, nodes: viz.nodes.filter((n) => used.has(n.name)) }
      break
    }
    case 'treemap': {
      let data = viz.data.filter((d) => isNum(d.value))
      if (data.length > 12) {
        hidden = data.length - 12
        data = data.slice(0, 12)
      }
      viz = { ...viz, data }
      if (!viz.data.length) return { card, viz: null, hidden }
      break
    }
  }

  if (isNum(raw.total_rows)) {
    const shown = viz.component === 'table' ? (viz.rows?.length ?? 0) : Array.isArray((viz as { data?: unknown[] }).data) ? (viz as { data: unknown[] }).data.length : 0
    if (raw.total_rows > shown) hidden = Math.max(hidden, raw.total_rows - shown)
  }

  return { card, viz, hidden }
}

/** Label helper for trend → columns step-down callers (unused in render pass). */
export const trendPointLabel = (x: string) => fmtX(x)
