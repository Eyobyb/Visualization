/**
 * Card composition rules: finding + 0–2 mains.
 * Shared allowlist for preview examples and (later) generation schema.
 */

export const MAIN_PARTS = ['kpi', 'kpi_strip', 'ranked_list', 'table', 'graph'] as const
export type MainPart = (typeof MAIN_PARTS)[number]

/** Chart kinds under the single `graph` main part. */
export const GRAPH_KINDS = [
  'trend',
  'columns',
  'columns_baseline',
  'stacked_bars',
  'funnel',
  'pie',
  'scatter',
  'radar',
  'gauge',
  'heatmap',
  'sankey',
  'treemap',
] as const
export type GraphKind = (typeof GRAPH_KINDS)[number]

export type PairLayout = 'stack' | 'split'
export type MainWeight = 'light' | 'medium' | 'heavy'

export const MAIN_WEIGHT: Record<MainPart, MainWeight> = {
  kpi: 'light',
  kpi_strip: 'medium',
  ranked_list: 'medium',
  table: 'heavy',
  graph: 'heavy',
}

/**
 * Allowed two-main combinations and which layouts they may use.
 * Order of `a`/`b` is canonical for labels; matching is order-insensitive
 * except `graph` + `graph`.
 */
export const ALLOWED_PAIRS: ReadonlyArray<{
  a: MainPart
  b: MainPart
  layouts: readonly PairLayout[]
}> = [
  { a: 'kpi', b: 'graph', layouts: ['stack'] },
  { a: 'kpi', b: 'table', layouts: ['stack'] },
  { a: 'kpi', b: 'ranked_list', layouts: ['stack'] },
  { a: 'kpi_strip', b: 'graph', layouts: ['stack', 'split'] },
  { a: 'kpi_strip', b: 'table', layouts: ['stack'] },
  { a: 'kpi_strip', b: 'ranked_list', layouts: ['split'] },
  { a: 'ranked_list', b: 'graph', layouts: ['stack', 'split'] },
  { a: 'ranked_list', b: 'table', layouts: ['stack'] },
  { a: 'table', b: 'graph', layouts: ['stack'] },
  { a: 'graph', b: 'graph', layouts: ['split'] },
]

function findPairEntry(a: MainPart, b: MainPart) {
  if (a === 'graph' && b === 'graph') {
    return ALLOWED_PAIRS.find((p) => p.a === 'graph' && p.b === 'graph')
  }
  return ALLOWED_PAIRS.find(
    (p) => (p.a === a && p.b === b) || (p.a === b && p.b === a),
  )
}

/** Layouts allowed for this unordered pair (empty if forbidden). */
export function layoutsForPair(a: MainPart, b: MainPart): PairLayout[] {
  const entry = findPairEntry(a, b)
  return entry ? [...entry.layouts] : []
}

/**
 * Whether two mains may appear together.
 * When `layout` is passed, also checks that layout is allowed.
 * Rejects kpi + kpi_strip and duplicate non-graph parts.
 */
export function isAllowedPair(a: MainPart, b: MainPart, layout?: PairLayout): boolean {
  if ((a === 'kpi' && b === 'kpi_strip') || (a === 'kpi_strip' && b === 'kpi')) return false
  if (a === b && a !== 'graph') return false

  const layouts = layoutsForPair(a, b)
  if (!layouts.length) return false
  if (layout == null) return true
  return layouts.includes(layout)
}

/** Flat list of every allowed (pair × layout) for preview coverage. */
export function enumerateAllowedCompositions(): Array<{
  a: MainPart
  b: MainPart
  layout: PairLayout
}> {
  const out: Array<{ a: MainPart; b: MainPart; layout: PairLayout }> = []
  for (const p of ALLOWED_PAIRS) {
    for (const layout of p.layouts) {
      out.push({ a: p.a, b: p.b, layout })
    }
  }
  return out
}
