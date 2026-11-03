import type { ReactNode } from 'react'
import {
  Bullets,
  Col,
  Columns,
  ColumnsBaseline,
  Divider,
  Funnel,
  Gauge,
  Grid,
  Headline,
  Heatmap,
  IntelligenceCard,
  Kpi,
  KpiStrip,
  Pie,
  Radar,
  RankedList,
  Row,
  Sankey,
  Scatter,
  StackedBars,
  Table,
  Takeaway,
  Trend,
  Treemap,
  type GraphKind,
  type MainPart,
  type PairLayout,
  type Severity,
} from '../index'

export { GRAPH_KINDS, MAIN_PARTS, type GraphKind, type MainPart } from '../index'

/** Shared chrome wrapper — old-catalog Card equivalent for Adaly Intelligence. */
function Shell({
  sources,
  updated,
  severity = 'neutral',
  attention,
  children,
}: {
  sources?: string[]
  updated?: string
  severity?: Severity
  attention?: boolean
  children: ReactNode
}) {
  return (
    <IntelligenceCard sources={sources} updated={updated} severity={severity} attention={attention}>
      <Col gap={3} className="mt-3.5">
        {children}
      </Col>
    </IntelligenceCard>
  )
}

export type ComposedExample = {
  id: string
  /** Preview section: layout demos, non-graph mains, or graph kinds. */
  family: 'layout' | 'mains' | 'graph'
  label: string
  /** For family=graph, which chart kind this example shows. */
  graphKind?: GraphKind
  /** For family=layout pair demos. */
  pair?: { a: MainPart; b: MainPart; layout: PairLayout }
  render: () => ReactNode
}

const HEAT = [
  { x: '9am', y: 'Mon', value: 42 }, { x: '12pm', y: 'Mon', value: 31 }, { x: '3pm', y: 'Mon', value: 28 }, { x: '6pm', y: 'Mon', value: 18 },
  { x: '9am', y: 'Tue', value: 61 }, { x: '12pm', y: 'Tue', value: 44 }, { x: '3pm', y: 'Tue', value: 36 }, { x: '6pm', y: 'Tue', value: 22 },
  { x: '9am', y: 'Wed', value: 48 }, { x: '12pm', y: 'Wed', value: 39 }, { x: '3pm', y: 'Wed', value: 33 }, { x: '6pm', y: 'Wed', value: 19 },
  { x: '9am', y: 'Thu', value: 45 }, { x: '12pm', y: 'Thu', value: 37 }, { x: '3pm', y: 'Thu', value: 30 }, { x: '6pm', y: 'Thu', value: 21 },
  { x: '9am', y: 'Fri', value: 39 }, { x: '12pm', y: 'Fri', value: 34 }, { x: '3pm', y: 'Fri', value: 26 }, { x: '6pm', y: 'Fri', value: 14 },
]

/* ── Shared sample mains (reuse across pair examples) ── */

function SampleKpi() {
  return (
    <Kpi
      viz={{
        component: 'kpi',
        data: [{
          label: 'Net new ARR',
          value: 366000,
          unit: 'USD',
          delta: 18,
          delta_unit: '%',
          period: 'vs last week',
          good: 'up',
          spark: [210000, 240000, 228000, 260000, 251000, 290000, 310000, 366000],
        }],
      }}
    />
  )
}

function SampleKpiStrip() {
  return (
    <KpiStrip
      viz={{
        component: 'kpi_strip',
        data: [
          { label: 'Trials', value: 1284, delta: 6, delta_unit: '%', period: 'vs last week', good: 'up' },
          { label: 'Activation', value: 42, unit: '%', delta: 3, delta_unit: 'pt', good: 'up' },
          { label: 'Paid', value: 96, delta: -4, delta_unit: '%', good: 'up' },
          { label: 'Time to value', value: 2.4, unit: 'days', delta: -0.6, delta_unit: 'days', good: 'down' },
        ],
      }}
    />
  )
}

function SampleRankedList() {
  return (
    <RankedList
      viz={{
        component: 'ranked_list',
        unit: 'x',
        data: [
          { label: 'Brand search', value: 6.2, source: 'GA4' },
          { label: 'Retargeting', value: 4.8, source: 'Meta Ads' },
          { label: 'Spring promo', value: 3.9, source: 'Meta Ads' },
          { label: 'Lookalike audiences', value: 2.7, source: 'Meta Ads' },
          { label: 'Prospecting video', value: 1.6, source: 'GA4' },
        ],
      }}
    />
  )
}

function SampleTable() {
  return (
    <Table
      viz={{
        component: 'table',
        columns: [
          { key: 'deal', label: 'Deal', type: 'text' },
          { key: 'stage', label: 'Stage', type: 'text' },
          { key: 'value', label: 'Value', type: 'USD' },
          { key: 'close', label: 'Close', type: 'date' },
        ],
        rows: [
          { deal: 'Acme renewal', stage: 'Negotiation', value: 280000, close: '2027-01-14' },
          { deal: 'Globex expansion', stage: 'Proposal', value: 200000, close: '2027-01-22' },
          { deal: 'Initech pilot', stage: 'Discovery', value: 95000, close: '2027-02-03' },
        ],
      }}
    />
  )
}

function SamplePie() {
  return (
    <Pie
      viz={{
        component: 'pie',
        unit: 'USD',
        donut: true,
        data: [
          { label: 'Self-serve', value: 212000 },
          { label: 'Sales-assisted', value: 98000 },
          { label: 'Partners', value: 41000 },
          { label: 'Expansion', value: 15000 },
        ],
      }}
    />
  )
}

function SampleHeatmap() {
  return <Heatmap viz={{ component: 'heatmap', data: HEAT }} />
}

function SampleTrend() {
  return (
    <Trend
      viz={{
        component: 'trend',
        series: ['This year', 'Last year'],
        data: [
          { x: '2026-07-20', y: 1810, y2: 1700 },
          { x: '2026-07-27', y: 1835, y2: 1716 },
          { x: '2026-08-03', y: 1822, y2: 1730 },
          { x: '2026-08-10', y: 1860, y2: 1741 },
          { x: '2026-08-17', y: 1848, y2: 1752 },
          { x: '2026-08-24', y: 1902, y2: 1760 },
          { x: '2026-08-31', y: 1950, y2: 1771 },
          { x: '2026-09-07', y: 1990, y2: 1780 },
          { x: '2026-09-14', y: 2010, y2: 1790 },
          { x: '2026-09-21', y: 2064, y2: 1801 },
          { x: '2026-09-28', y: 2081, y2: 1806 },
          { x: '2026-10-05', y: 2108, y2: 1818 },
          { x: '2026-10-12', y: 2131, y2: 1825 },
        ],
      }}
    />
  )
}

function SampleColumns() {
  return (
    <Columns
      viz={{
        component: 'columns',
        unit: 'USD',
        highlight: 0,
        data: [
          { label: 'Winter', value: 16.9 },
          { label: 'Spring', value: 18.4 },
          { label: 'Summer', value: 21.7 },
          { label: 'Fall', value: 19.2 },
        ],
      }}
    />
  )
}

function pairBody(layout: PairLayout, left: ReactNode, right: ReactNode, divider?: string) {
  if (layout === 'split') {
    return (
      <Grid columns={2} gap={3}>
        {left}
        {right}
      </Grid>
    )
  }
  return (
    <>
      {left}
      {divider ? <Divider label={divider} /> : null}
      {right}
    </>
  )
}

function pairExample(
  a: MainPart,
  b: MainPart,
  layout: PairLayout,
  opts: {
    headline: string
    takeaway: string
    sources?: string[]
    updated?: string
    severity?: Severity
    attention?: boolean
    left: ReactNode
    right: ReactNode
    divider?: string
  },
): ComposedExample {
  const id = `${layout}-${a}-${b}`.replace(/_/g, '-')
  return {
    id,
    family: 'layout',
    label: `${layout} · ${a} + ${b}`,
    pair: { a, b, layout },
    render: () => (
      <Shell
        sources={opts.sources}
        updated={opts.updated}
        severity={opts.severity}
        attention={opts.attention}
      >
        <Headline>{opts.headline}</Headline>
        <Takeaway>{opts.takeaway}</Takeaway>
        {pairBody(layout, opts.left, opts.right, opts.divider)}
      </Shell>
    ),
  }
}

/**
 * Composed examples — finding + 0–2 mains.
 * Layouts section covers every allowed pair × layout from composition.ts.
 */
export const EXAMPLES: ComposedExample[] = [
  /* ── Layouts: stack pairs ── */
  pairExample('kpi', 'graph', 'stack', {
    headline: 'Support load peaks Tuesday mornings',
    takeaway: 'stack · kpi + graph — light metric full width, then heavy chart.',
    sources: ['Zendesk'],
    updated: '40m ago',
    severity: 'info',
    left: (
      <Kpi
        viz={{
          component: 'kpi',
          data: [{ label: 'Peak hour tickets', value: 61, delta: 22, delta_unit: '%', period: 'vs last Tue', good: 'down' }],
        }}
      />
    ),
    right: <SampleHeatmap />,
    divider: 'By weekday × hour',
  }),
  pairExample('kpi', 'table', 'stack', {
    headline: 'Pipeline value is concentrated in two late-stage deals',
    takeaway: 'stack · kpi + table — headline number, then detail rows.',
    sources: ['Salesforce'],
    updated: '15m ago',
    severity: 'good',
    attention: true,
    left: (
      <Kpi
        viz={{
          component: 'kpi',
          data: [{ label: 'Open pipeline', value: 575000, unit: 'USD', delta: 12, delta_unit: '%', period: 'vs last week', good: 'up' }],
        }}
      />
    ),
    right: <SampleTable />,
    divider: 'Top deals',
  }),
  pairExample('kpi', 'ranked_list', 'stack', {
    headline: 'Paid search still leads channel efficiency',
    takeaway: 'stack · kpi + ranked_list — one number, then ordered drivers.',
    sources: ['GA4', 'Meta Ads'],
    updated: '2h ago',
    left: (
      <Kpi
        viz={{
          component: 'kpi',
          data: [{ label: 'Blended ROAS', value: 3.8, unit: 'x', delta: 0.4, delta_unit: 'x', period: 'vs last month', good: 'up' }],
        }}
      />
    ),
    right: <SampleRankedList />,
    divider: 'By campaign',
  }),
  pairExample('kpi_strip', 'graph', 'stack', {
    headline: 'Trial funnel held; self-serve mix rose',
    takeaway: 'stack · kpi_strip + graph — strip of metrics, then supporting chart.',
    sources: ['HubSpot', 'Amplitude'],
    updated: '3h ago',
    left: <SampleKpiStrip />,
    right: <SamplePie />,
    divider: 'New ARR mix',
  }),
  pairExample('kpi_strip', 'table', 'stack', {
    headline: 'Funnel is steady; late deals need owner attention',
    takeaway: 'stack · kpi_strip + table — strip above a wide table.',
    sources: ['HubSpot', 'Salesforce'],
    updated: '1h ago',
    left: <SampleKpiStrip />,
    right: <SampleTable />,
    divider: 'Deals at risk',
  }),
  pairExample('ranked_list', 'graph', 'stack', {
    headline: 'Brand search still outperforms; spend mix shifted',
    takeaway: 'stack · ranked_list + graph — ranking full width, then chart.',
    sources: ['GA4', 'Meta Ads'],
    updated: '5h ago',
    left: <SampleRankedList />,
    right: <SampleColumns />,
    divider: 'Seasonal CPA',
  }),
  pairExample('ranked_list', 'table', 'stack', {
    headline: 'Top campaigns and the deals they influence',
    takeaway: 'stack · ranked_list + table — both need full width.',
    sources: ['GA4', 'Salesforce'],
    updated: '45m ago',
    left: <SampleRankedList />,
    right: <SampleTable />,
    divider: 'Linked deals',
  }),
  pairExample('table', 'graph', 'stack', {
    headline: 'Two Q1 deals could close early; coverage still uneven',
    takeaway: 'stack · table + graph — table never shares a split column.',
    sources: ['Salesforce'],
    updated: '30m ago',
    severity: 'warn',
    attention: true,
    left: <SampleTable />,
    right: (
      <ColumnsBaseline
        viz={{
          component: 'columns_baseline',
          unit: 'x',
          good: 'up',
          baseline: { label: 'Target', value: 3 },
          data: [
            { label: 'NA', value: 3.4 },
            { label: 'EMEA', value: 2.7 },
            { label: 'APAC', value: 2.2 },
            { label: 'LATAM', value: 3.1 },
          ],
        }}
      />
    ),
    divider: 'Coverage by region',
  }),

  /* ── Layouts: split pairs ── */
  pairExample('kpi_strip', 'ranked_list', 'split', {
    headline: 'Acquisition metrics and channel efficiency side by side',
    takeaway: 'split · kpi_strip + ranked_list — balanced medium + medium.',
    sources: ['HubSpot', 'GA4'],
    updated: '2h ago',
    left: <SampleKpiStrip />,
    right: <SampleRankedList />,
  }),
  pairExample('kpi_strip', 'graph', 'split', {
    headline: 'Activation held; mix shifted to self-serve',
    takeaway: 'split · kpi_strip + graph — medium strip beside a chart (not a lone kpi).',
    sources: ['Amplitude', 'Stripe'],
    updated: '1h ago',
    severity: 'good',
    attention: true,
    left: <SampleKpiStrip />,
    right: <SamplePie />,
  }),
  pairExample('ranked_list', 'graph', 'split', {
    headline: 'Channel ROAS beside seasonal CPA',
    takeaway: 'split · ranked_list + graph — similar visual weight.',
    sources: ['GA4', 'Meta Ads'],
    updated: '4h ago',
    left: <SampleRankedList />,
    right: <SampleColumns />,
  }),
  pairExample('graph', 'graph', 'split', {
    headline: 'Trend and mix tell the same activation story',
    takeaway: 'split · graph + graph — two chart kinds side by side.',
    sources: ['Amplitude', 'Stripe'],
    updated: '1h ago',
    severity: 'good',
    left: <SampleTrend />,
    right: <SamplePie />,
  }),

  /* ── Main parts: singles + finding-only ── */
  {
    id: 'finding-only',
    family: 'mains',
    label: 'finding only',
    render: () => (
      <Shell sources={['Zendesk']} updated="Yesterday" severity="info">
        <Headline>Support handoffs now run through Slack</Headline>
        <Takeaway>No main part — finding (title + description + bullets) only.</Takeaway>
        <Bullets
          items={[
            'Escalations moved from email to Slack in September',
            'Handoff notes are now attached to 92% of tickets',
          ]}
        />
      </Shell>
    ),
  },
  {
    id: 'main-kpi',
    family: 'mains',
    label: 'kpi',
    render: () => (
      <Shell sources={['Snowflake', 'Stripe']} updated="2h ago" severity="good" attention>
        <Headline>Net new ARR hit $366K this week</Headline>
        <Takeaway>Main part: kpi — one number with optional spark.</Takeaway>
        <Bullets items={['3 enterprise upgrades closed 6 days early', 'Expansion was 61% of the total']} />
        <SampleKpi />
      </Shell>
    ),
  },
  {
    id: 'main-kpi-strip',
    family: 'mains',
    label: 'kpi_strip',
    render: () => (
      <Shell sources={['HubSpot', 'Amplitude']} updated="3h ago">
        <Headline>Trial funnel held steady this week</Headline>
        <Takeaway>Main part: kpi_strip — several headline numbers side by side.</Takeaway>
        <SampleKpiStrip />
      </Shell>
    ),
  },
  {
    id: 'main-ranked-list',
    family: 'mains',
    label: 'ranked_list',
    render: () => (
      <Shell sources={['GA4', 'Meta Ads']} updated="2h ago">
        <Headline>Brand search returns 6.2× on ad spend</Headline>
        <Takeaway>Main part: ranked_list — top or bottom items.</Takeaway>
        <SampleRankedList />
      </Shell>
    ),
  },
  {
    id: 'main-table',
    family: 'mains',
    label: 'table',
    render: () => (
      <Shell sources={['Salesforce']} updated="15m ago" severity="good" attention>
        <Headline>Two Q1 deals could close in Q4</Headline>
        <Takeaway>Main part: table — attributes that don’t fit a chart.</Takeaway>
        <SampleTable />
      </Shell>
    ),
  },
  {
    id: 'main-graph',
    family: 'mains',
    label: 'graph',
    render: () => (
      <Shell sources={['Amplitude']} updated="1h ago" severity="good">
        <Headline>Weekly active accounts up 14% since the redesign</Headline>
        <Takeaway>Main part: graph — chart kinds live under Graph below.</Takeaway>
        <SampleTrend />
      </Shell>
    ),
  },

  /* ── Graph kinds (one each) ── */
  {
    id: 'graph-trend',
    family: 'graph',
    graphKind: 'trend',
    label: 'graph · trend',
    render: () => (
      <Shell sources={['Amplitude']} updated="1h ago" severity="good">
        <Headline>Weekly active accounts up 14% since the redesign</Headline>
        <Takeaway>Main part: graph · trend — line + area, optional comparison series.</Takeaway>
        <SampleTrend />
      </Shell>
    ),
  },
  {
    id: 'graph-columns',
    family: 'graph',
    graphKind: 'columns',
    label: 'graph · columns',
    render: () => (
      <Shell sources={['Meta Ads']} updated="4h ago">
        <Headline>Meta CPA lowest in winter</Headline>
        <Takeaway>Main part: graph · columns — vertical bars with optional highlight.</Takeaway>
        <SampleColumns />
      </Shell>
    ),
  },
  {
    id: 'graph-columns-baseline',
    family: 'graph',
    graphKind: 'columns_baseline',
    label: 'graph · columns_baseline',
    render: () => (
      <Shell sources={['Salesforce']} updated="30m ago" severity="warn" attention>
        <Headline>Two regions are below the 3× coverage target</Headline>
        <Takeaway>Main part: graph · columns_baseline — bars vs a target markLine.</Takeaway>
        <ColumnsBaseline
          viz={{
            component: 'columns_baseline',
            unit: 'x',
            good: 'up',
            baseline: { label: 'Target', value: 3 },
            data: [
              { label: 'NA', value: 3.4 },
              { label: 'EMEA', value: 2.7 },
              { label: 'APAC', value: 2.2 },
              { label: 'LATAM', value: 3.1 },
            ],
          }}
        />
      </Shell>
    ),
  },
  {
    id: 'graph-funnel',
    family: 'graph',
    graphKind: 'funnel',
    label: 'graph · funnel',
    render: () => (
      <Shell sources={['Shopify', 'GA4']} updated="3h ago" severity="warn" attention>
        <Headline>Most shoppers drop between cart and checkout</Headline>
        <Takeaway>Main part: graph · funnel — stages that lose volume.</Takeaway>
        <Funnel
          viz={{
            component: 'funnel',
            data: [
              { label: 'Sessions', value: 48200 },
              { label: 'Product view', value: 21400 },
              { label: 'Add to cart', value: 6900 },
              { label: 'Checkout', value: 3100 },
              { label: 'Purchase', value: 1480 },
            ],
          }}
        />
      </Shell>
    ),
  },
  {
    id: 'graph-stacked-bars',
    family: 'graph',
    graphKind: 'stacked_bars',
    label: 'graph · stacked_bars',
    render: () => (
      <Shell sources={['GA4', 'Meta Ads']} updated="5h ago">
        <Headline>Paid search is now half of ad spend</Headline>
        <Takeaway>Main part: graph · stacked_bars — share of a total across categories.</Takeaway>
        <StackedBars
          viz={{
            component: 'stacked_bars',
            unit: 'USD',
            segments: ['Search', 'Social', 'Video', 'Display'],
            data: [
              { label: 'Jul', values: { Search: 76000, Social: 62000, Video: 38000, Display: 24000 } },
              { label: 'Aug', values: { Search: 88000, Social: 60000, Video: 37000, Display: 21000 } },
              { label: 'Sep', values: { Search: 104000, Social: 58000, Video: 39000, Display: 18000 } },
              { label: 'Oct', values: { Search: 121000, Social: 57000, Video: 40000, Display: 19000 } },
            ],
          }}
        />
      </Shell>
    ),
  },
  {
    id: 'graph-pie',
    family: 'graph',
    graphKind: 'pie',
    label: 'graph · pie',
    render: () => (
      <Shell sources={['Stripe', 'Salesforce']} updated="45m ago" severity="info">
        <Headline>Self-serve is now 58% of new ARR</Headline>
        <Takeaway>Main part: graph · pie — share of a whole (donut).</Takeaway>
        <SamplePie />
      </Shell>
    ),
  },
  {
    id: 'graph-scatter',
    family: 'graph',
    graphKind: 'scatter',
    label: 'graph · scatter',
    render: () => (
      <Shell sources={['GA4', 'Meta Ads']} updated="2h ago" severity="warn" attention>
        <Headline>High-spend campaigns are not the best ROAS</Headline>
        <Takeaway>Main part: graph · scatter — two numeric dimensions.</Takeaway>
        <Scatter
          viz={{
            component: 'scatter',
            x_unit: 'USD',
            y_unit: 'x',
            x_label: 'Spend',
            y_label: 'ROAS',
            data: [
              { x: 42000, y: 6.2, label: 'Brand search', group: 'Search' },
              { x: 38000, y: 4.8, label: 'Retargeting', group: 'Social' },
              { x: 61000, y: 3.9, label: 'Spring promo', group: 'Social' },
              { x: 54000, y: 2.7, label: 'Lookalikes', group: 'Social' },
              { x: 29000, y: 1.6, label: 'Prospecting video', group: 'Video' },
              { x: 18000, y: 3.1, label: 'Competitor terms', group: 'Search' },
              { x: 22000, y: 2.2, label: 'Display remarket', group: 'Display' },
              { x: 47000, y: 1.9, label: 'Awareness video', group: 'Video' },
              { x: 15000, y: 4.1, label: 'Email capture', group: 'Display' },
              { x: 33000, y: 5.4, label: 'Brand + category', group: 'Search' },
            ],
          }}
        />
      </Shell>
    ),
  },
  {
    id: 'graph-radar',
    family: 'graph',
    graphKind: 'radar',
    label: 'graph · radar',
    render: () => (
      <Shell sources={['Amplitude', 'Zendesk']} updated="1h ago" severity="warn">
        <Headline>EMEA still trails on product quality scores</Headline>
        <Takeaway>Main part: graph · radar — multi-dimension compare.</Takeaway>
        <Radar
          viz={{
            component: 'radar',
            indicators: [
              { name: 'Reliability', max: 100 },
              { name: 'Speed', max: 100 },
              { name: 'UX', max: 100 },
              { name: 'Support', max: 100 },
              { name: 'Docs', max: 100 },
            ],
            series: [
              { name: 'NA', values: [88, 82, 91, 79, 84] },
              { name: 'EMEA', values: [74, 69, 78, 71, 66] },
            ],
          }}
        />
      </Shell>
    ),
  },
  {
    id: 'graph-gauge',
    family: 'graph',
    graphKind: 'gauge',
    label: 'graph · gauge',
    render: () => (
      <Shell sources={['Delighted']} updated="3h ago" severity="crit" attention>
        <Headline>NPS is 12 points under the Q4 target</Headline>
        <Takeaway>Main part: graph · gauge — single metric vs scale / target.</Takeaway>
        <Gauge viz={{ component: 'gauge', label: 'NPS', min: 0, max: 100, target: 55, value: 43 }} />
      </Shell>
    ),
  },
  {
    id: 'graph-heatmap',
    family: 'graph',
    graphKind: 'heatmap',
    label: 'graph · heatmap',
    render: () => (
      <Shell sources={['Zendesk']} updated="40m ago" severity="info">
        <Headline>Support load peaks Tuesday mornings</Headline>
        <Takeaway>Main part: graph · heatmap — intensity across two categorical axes.</Takeaway>
        <SampleHeatmap />
      </Shell>
    ),
  },
  {
    id: 'graph-sankey',
    family: 'graph',
    graphKind: 'sankey',
    label: 'graph · sankey',
    render: () => (
      <Shell sources={['Amplitude', 'Stripe']} updated="2h ago" severity="warn" attention>
        <Headline>Most trial value leaks before first project</Headline>
        <Takeaway>Main part: graph · sankey — flow between nodes.</Takeaway>
        <Sankey
          viz={{
            component: 'sankey',
            nodes: [
              { name: 'Signups' },
              { name: 'Activated' },
              { name: 'First project' },
              { name: 'Paid' },
              { name: 'Churned' },
            ],
            links: [
              { source: 'Signups', target: 'Activated', value: 1280 },
              { source: 'Signups', target: 'Churned', value: 420 },
              { source: 'Activated', target: 'First project', value: 740 },
              { source: 'Activated', target: 'Churned', value: 540 },
              { source: 'First project', target: 'Paid', value: 410 },
              { source: 'First project', target: 'Churned', value: 330 },
            ],
          }}
        />
      </Shell>
    ),
  },
  {
    id: 'graph-treemap',
    family: 'graph',
    graphKind: 'treemap',
    label: 'graph · treemap',
    render: () => (
      <Shell sources={['Salesforce', 'Stripe']} updated="5h ago">
        <Headline>Enterprise still carries half of ARR</Headline>
        <Takeaway>Main part: graph · treemap — nested hierarchical share.</Takeaway>
        <Treemap
          viz={{
            component: 'treemap',
            unit: 'USD',
            data: [
              {
                label: 'Enterprise',
                value: 4200000,
                children: [
                  { label: 'Platform', value: 2400000 },
                  { label: 'Add-ons', value: 1800000 },
                ],
              },
              {
                label: 'Mid-market',
                value: 2100000,
                children: [
                  { label: 'Annual', value: 1400000 },
                  { label: 'Monthly', value: 700000 },
                ],
              },
              {
                label: 'SMB',
                value: 980000,
                children: [
                  { label: 'Self-serve', value: 620000 },
                  { label: 'Assisted', value: 360000 },
                ],
              },
            ],
          }}
        />
      </Shell>
    ),
  },
]

/** Tiny layout kit demo for the preview header strip. */
export function LayoutKitDemo() {
  return (
    <Row gap={2} className="text-[0.75rem] text-nc-ink-2">
      <code className="rounded bg-nc-tile px-1.5 py-0.5 font-nc-mono text-[0.6875rem] text-nc-ink">Col</code>
      <code className="rounded bg-nc-tile px-1.5 py-0.5 font-nc-mono text-[0.6875rem] text-nc-ink">Row</code>
      <code className="rounded bg-nc-tile px-1.5 py-0.5 font-nc-mono text-[0.6875rem] text-nc-ink">Grid</code>
      <code className="rounded bg-nc-tile px-1.5 py-0.5 font-nc-mono text-[0.6875rem] text-nc-ink">Box</code>
      <code className="rounded bg-nc-tile px-1.5 py-0.5 font-nc-mono text-[0.6875rem] text-nc-ink">Divider</code>
    </Row>
  )
}
