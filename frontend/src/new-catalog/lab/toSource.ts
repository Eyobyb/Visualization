import type { LabRecipe } from './types'

/** Pretty JSON for the editable recipe panel. */
export function recipeToJson(recipe: LabRecipe): string {
  return JSON.stringify(recipe, null, 2)
}

/** JSX-shaped string showing how the recipe assembles — for reading / copy. */
export function recipeToJsx(recipe: LabRecipe): string {
  const shell = recipe.shell ?? {}
  const f = recipe.finding
  const mains = recipe.mains ?? []
  const lines: string[] = []

  const brief = recipe.brief ?? (f ? { headline: f.headline, takeaway: f.takeaway } : undefined)
  const shellProps = [
    shell.sources ? `sources={${JSON.stringify(shell.sources)}}` : null,
    shell.updated ? `updated=${JSON.stringify(shell.updated)}` : null,
    shell.severity ? `severity=${JSON.stringify(shell.severity)}` : null,
    shell.attention ? 'attention' : null,
    recipe.foldable ? 'foldable' : null,
    recipe.foldable && brief ? `brief={${JSON.stringify(brief)}}` : null,
  ].filter(Boolean)

  lines.push(`<IntelligenceCard ${shellProps.join(' ')}>`)
  lines.push(`  <Col gap={3}>`)

  if (f?.headline) lines.push(`    <Headline>${f.headline}</Headline>`)
  if (f?.takeaway) lines.push(`    <Takeaway>${f.takeaway}</Takeaway>`)
  if (f?.bullets?.length) {
    lines.push(`    <Bullets items={${JSON.stringify(f.bullets)}} />`)
  }

  const vizLines = (m: (typeof mains)[0], indent: string) => {
    const name = componentName(m.viz.component)
    lines.push(`${indent}<${name} viz={${compact(m.viz)}} />`)
  }

  if (recipe.layout === 'split' && mains.length === 2) {
    lines.push(`    <Grid columns={2} gap={3}>`)
    vizLines(mains[0], '      ')
    vizLines(mains[1], '      ')
    lines.push(`    </Grid>`)
  } else {
    mains.forEach((m, i) => {
      if (i === 1 && recipe.layout === 'stack' && recipe.divider) {
        lines.push(`    <Divider label=${JSON.stringify(recipe.divider)} />`)
      }
      vizLines(m, '    ')
    })
  }

  lines.push(`  </Col>`)
  lines.push(`</IntelligenceCard>`)
  return lines.join('\n')
}

function componentName(id: string): string {
  const map: Record<string, string> = {
    kpi: 'Kpi',
    kpi_strip: 'KpiStrip',
    ranked_list: 'RankedList',
    table: 'Table',
    trend: 'Trend',
    columns: 'Columns',
    columns_baseline: 'ColumnsBaseline',
    stacked_bars: 'StackedBars',
    funnel: 'Funnel',
    pie: 'Pie',
    scatter: 'Scatter',
    radar: 'Radar',
    gauge: 'Gauge',
    heatmap: 'Heatmap',
    sankey: 'Sankey',
    treemap: 'Treemap',
  }
  return map[id] ?? 'Unknown'
}

function compact(v: unknown): string {
  return JSON.stringify(v)
}
