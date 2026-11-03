import { enumerateAllowedCompositions } from '../index'
import { mainOf, VIZ } from './samples'
import type { LabItem, LabMain, LabRecipe } from './types'

const findingSupport = {
  headline: 'Support load peaks Tuesday mornings',
  takeaway: 'Ticket volume spikes mid-morning — staff the queue earlier on Tue.',
}

function card(
  id: string,
  group: LabItem['group'],
  label: string,
  blurb: string,
  recipe: LabRecipe,
): LabItem {
  return { id, group, label, blurb, recipe }
}

function graphMain(viz: LabMain['viz']): LabMain {
  return mainOf('graph', viz)
}

const defaultVizForPart: Record<LabMain['part'], LabMain['viz']> = {
  kpi: VIZ.kpi,
  kpi_strip: VIZ.kpi_strip,
  ranked_list: VIZ.ranked_list,
  table: VIZ.table,
  graph: VIZ.heatmap,
}

function compositionItem(
  layout: 'stack' | 'split',
  a: LabMain['part'],
  b: LabMain['part'],
): LabItem {
  const vizA = a === 'graph' ? VIZ.heatmap : defaultVizForPart[a]
  const vizB = b === 'graph' ? (a === 'graph' ? VIZ.pie : VIZ.heatmap) : defaultVizForPart[b]
  return card(
    `${layout}-${a}-${b}`,
    'composition',
    `${layout} · ${a} + ${b}`,
    `Allowed ${layout}: finding + ${a} then ${b}.`,
    {
      shell: { sources: ['Zendesk', 'Amplitude'], updated: '40m ago', severity: 'info' },
      finding: {
        headline: findingSupport.headline,
        takeaway: `${layout} · ${a} + ${b}`,
      },
      layout,
      divider: layout === 'stack' ? 'Detail' : undefined,
      mains: [mainOf(a, vizA), mainOf(b, vizB)],
    },
  )
}

export const LAB_ITEMS: LabItem[] = [
  /* Chrome */
  card('chrome-card', 'chrome', 'IntelligenceCard', 'Shell only — sources, severity, Ask footer.', {
    shell: { sources: ['Stripe'], updated: '2h ago', severity: 'good', attention: true },
    finding: { headline: 'Card chrome with no mains', takeaway: 'Children slot is empty of viz.' },
    layout: 'none',
    mains: [],
  }),

  /* Finding */
  card('finding-headline', 'finding', 'Headline', 'Finding title only (inside chrome).', {
    shell: { sources: ['Amplitude'], updated: '1h ago' },
    finding: { headline: 'Weekly active accounts up 14%' },
    layout: 'none',
    mains: [],
  }),
  card('finding-full', 'finding', 'Headline + Takeaway + Bullets', 'Full finding block, no mains.', {
    shell: { sources: ['Zendesk'], updated: 'Yesterday', severity: 'info' },
    finding: {
      headline: 'Support handoffs now run through Slack',
      takeaway: 'Nothing numeric — finding only.',
      bullets: ['Escalations moved from email', 'Handoff notes on 92% of tickets'],
    },
    layout: 'none',
    mains: [],
  }),

  /* Mains */
  card('main-kpi', 'main', 'kpi', 'Light main — one number + optional spark.', {
    shell: { sources: ['Snowflake'], updated: '2h ago', severity: 'good', attention: true },
    finding: { headline: 'Net new ARR hit $366K', takeaway: 'Main part: kpi.' },
    layout: 'none',
    mains: [mainOf('kpi', VIZ.kpi)],
  }),
  card('main-kpi-strip', 'main', 'kpi_strip', 'Medium — several headline tiles.', {
    shell: { sources: ['HubSpot'], updated: '3h ago' },
    finding: { headline: 'Trial funnel held steady', takeaway: 'Main part: kpi_strip.' },
    layout: 'none',
    mains: [mainOf('kpi_strip', VIZ.kpi_strip)],
  }),
  card('main-ranked', 'main', 'ranked_list', 'Medium — ordered rows with bars.', {
    shell: { sources: ['GA4'], updated: '2h ago' },
    finding: { headline: 'Brand search leads ROAS', takeaway: 'Main part: ranked_list.' },
    layout: 'none',
    mains: [mainOf('ranked_list', VIZ.ranked_list)],
  }),
  card('main-table', 'main', 'table', 'Heavy — attribute rows (full width).', {
    shell: { sources: ['Salesforce'], updated: '15m ago', severity: 'good' },
    finding: { headline: 'Two deals could close early', takeaway: 'Main part: table.' },
    layout: 'none',
    mains: [mainOf('table', VIZ.table)],
  }),

  /* Graph kinds (still one main: graph) */
  card('graph-heatmap', 'graph', 'graph · heatmap', 'Graph kind used in stack · kpi + graph.', {
    shell: { sources: ['Zendesk'], updated: '40m ago', severity: 'info' },
    finding: { headline: findingSupport.headline, takeaway: 'Main part: graph · heatmap.' },
    layout: 'none',
    mains: [graphMain(VIZ.heatmap)],
  }),
  card('graph-pie', 'graph', 'graph · pie', 'Share of a whole (donut).', {
    shell: { sources: ['Stripe'], updated: '45m ago' },
    finding: { headline: 'Self-serve is 58% of new ARR', takeaway: 'Main part: graph · pie.' },
    layout: 'none',
    mains: [graphMain(VIZ.pie)],
  }),
  card('graph-trend', 'graph', 'graph · trend', 'Line over time.', {
    shell: { sources: ['Amplitude'], updated: '1h ago', severity: 'good' },
    finding: { headline: 'Weekly active accounts up', takeaway: 'Main part: graph · trend.' },
    layout: 'none',
    mains: [graphMain(VIZ.trend)],
  }),
  card('graph-columns', 'graph', 'graph · columns', 'Vertical bars.', {
    shell: { sources: ['Meta Ads'], updated: '4h ago' },
    finding: { headline: 'Meta CPA lowest in winter', takeaway: 'Main part: graph · columns.' },
    layout: 'none',
    mains: [graphMain(VIZ.columns)],
  }),

  /* Every allowed pairing × layout */
  ...enumerateAllowedCompositions().map(({ a, b, layout }) => compositionItem(layout, a, b)),
]

export const LAB_GROUPS: { id: LabItem['group']; title: string }[] = [
  { id: 'chrome', title: 'Chrome' },
  { id: 'finding', title: 'Finding' },
  { id: 'main', title: 'Main parts' },
  { id: 'graph', title: 'Graph kinds' },
  { id: 'composition', title: 'Compositions' },
]

export function labItemById(id: string): LabItem | undefined {
  return LAB_ITEMS.find((i) => i.id === id)
}
