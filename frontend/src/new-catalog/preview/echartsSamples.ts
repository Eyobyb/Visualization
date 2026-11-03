import type { CardPayload, VizPayload } from '../components'

/** ECharts-backed card examples (finding + chart inside IntelligenceCard). */
export type EchartsCardSample = {
  id: string
  chart: string
  payload: CardPayload & { viz: VizPayload }
}

export const ECHARTS_SAMPLES: EchartsCardSample[] = [
  {
    id: 'echarts-kpi-spark',
    chart: 'line · spark',
    payload: {
      headline: 'Net new ARR hit $366K this week',
      takeaway: 'Sparkline is an ECharts line series with area fill and end mark.',
      bullets: ['3 enterprise upgrades closed 6 days early', 'Expansion was 61% of the total'],
      sources: ['Snowflake', 'Stripe'],
      updated: '2h ago',
      severity: 'good',
      attention: true,
      viz: {
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
      },
    },
  },
  {
    id: 'echarts-trend',
    chart: 'line · dual series',
    payload: {
      headline: 'Weekly active accounts up 14% since the redesign',
      takeaway: 'ECharts line + area for this year, dashed comparison series for last year.',
      sources: ['Amplitude'],
      updated: '1h ago',
      severity: 'good',
      viz: {
        component: 'trend',
        unit: '',
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
      },
    },
  },
  {
    id: 'echarts-columns',
    chart: 'bar · columns',
    payload: {
      headline: 'Meta CPA lowest in winter',
      takeaway: 'ECharts bar series with value labels and a highlighted season.',
      sources: ['Meta Ads'],
      updated: '4h ago',
      severity: 'neutral',
      viz: {
        component: 'columns',
        unit: 'USD',
        highlight: 0,
        data: [
          { label: 'Winter', value: 16.9 },
          { label: 'Spring', value: 18.4 },
          { label: 'Summer', value: 21.7 },
          { label: 'Fall', value: 19.2 },
        ],
      },
    },
  },
  {
    id: 'echarts-columns-baseline',
    chart: 'bar · markLine',
    payload: {
      headline: 'Two regions are below the 3× coverage target',
      takeaway: 'ECharts bars plus a dashed markLine for the baseline target.',
      sources: ['Salesforce'],
      updated: '30m ago',
      severity: 'warn',
      attention: true,
      viz: {
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
      },
    },
  },
  {
    id: 'echarts-funnel',
    chart: 'funnel',
    payload: {
      headline: 'Most shoppers drop between cart and checkout',
      takeaway: 'Native ECharts funnel with stage conversion in the tooltip.',
      sources: ['Shopify', 'GA4'],
      updated: '3h ago',
      severity: 'warn',
      attention: true,
      viz: {
        component: 'funnel',
        data: [
          { label: 'Sessions', value: 48200 },
          { label: 'Product view', value: 21400 },
          { label: 'Add to cart', value: 6900 },
          { label: 'Checkout', value: 3100 },
          { label: 'Purchase', value: 1480 },
        ],
      },
    },
  },
  {
    id: 'echarts-stacked',
    chart: 'bar · stack',
    payload: {
      headline: 'Paid search is now half of ad spend',
      takeaway: 'Horizontal stacked bars — one ECharts series per segment.',
      sources: ['GA4', 'Meta Ads'],
      updated: '5h ago',
      severity: 'neutral',
      viz: {
        component: 'stacked_bars',
        unit: 'USD',
        segments: ['Search', 'Social', 'Video', 'Display'],
        data: [
          { label: 'Jul', values: { Search: 76000, Social: 62000, Video: 38000, Display: 24000 } },
          { label: 'Aug', values: { Search: 88000, Social: 60000, Video: 37000, Display: 21000 } },
          { label: 'Sep', values: { Search: 104000, Social: 58000, Video: 39000, Display: 18000 } },
          { label: 'Oct', values: { Search: 121000, Social: 57000, Video: 40000, Display: 19000 } },
        ],
      },
    },
  },
  {
    id: 'echarts-pie',
    chart: 'polar · pie',
    payload: {
      headline: 'Self-serve is now 58% of new ARR',
      takeaway: 'Polar donut for channel mix — sales-assisted share slipped for the third month.',
      sources: ['Stripe', 'Salesforce'],
      updated: '45m ago',
      severity: 'info',
      viz: {
        component: 'pie',
        unit: 'USD',
        donut: true,
        data: [
          { label: 'Self-serve', value: 212000 },
          { label: 'Sales-assisted', value: 98000 },
          { label: 'Partners', value: 41000 },
          { label: 'Expansion', value: 15000 },
        ],
      },
    },
  },
  {
    id: 'echarts-scatter',
    chart: 'cartesian · scatter',
    payload: {
      headline: 'High-spend campaigns are not the best ROAS',
      takeaway: 'Cartesian scatter of spend vs return — brand search sits alone in the efficient corner.',
      sources: ['GA4', 'Meta Ads'],
      updated: '2h ago',
      severity: 'warn',
      attention: true,
      viz: {
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
      },
    },
  },
  {
    id: 'echarts-radar',
    chart: 'polar · radar',
    payload: {
      headline: 'EMEA still trails on product quality scores',
      takeaway: 'Radar compares region scores across five product dimensions this quarter.',
      sources: ['Amplitude', 'Zendesk'],
      updated: '1h ago',
      severity: 'warn',
      viz: {
        component: 'radar',
        unit: '',
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
      },
    },
  },
  {
    id: 'echarts-gauge',
    chart: 'polar · gauge',
    payload: {
      headline: 'NPS is 12 points under the Q4 target',
      takeaway: 'Gauge shows current score against the 55 target band.',
      sources: ['Delighted'],
      updated: '3h ago',
      severity: 'crit',
      attention: true,
      viz: {
        component: 'gauge',
        unit: '',
        label: 'NPS',
        min: 0,
        max: 100,
        target: 55,
        value: 43,
      },
    },
  },
  {
    id: 'echarts-heatmap',
    chart: 'cartesian · heatmap',
    payload: {
      headline: 'Support load peaks Tuesday mornings',
      takeaway: 'Heatmap of ticket volume by weekday and hour — staffing lag shows after 9am.',
      sources: ['Zendesk'],
      updated: '40m ago',
      severity: 'info',
      viz: {
        component: 'heatmap',
        unit: '',
        data: [
          { x: '9am', y: 'Mon', value: 42 }, { x: '12pm', y: 'Mon', value: 31 }, { x: '3pm', y: 'Mon', value: 28 }, { x: '6pm', y: 'Mon', value: 18 },
          { x: '9am', y: 'Tue', value: 61 }, { x: '12pm', y: 'Tue', value: 44 }, { x: '3pm', y: 'Tue', value: 36 }, { x: '6pm', y: 'Tue', value: 22 },
          { x: '9am', y: 'Wed', value: 48 }, { x: '12pm', y: 'Wed', value: 39 }, { x: '3pm', y: 'Wed', value: 33 }, { x: '6pm', y: 'Wed', value: 19 },
          { x: '9am', y: 'Thu', value: 45 }, { x: '12pm', y: 'Thu', value: 37 }, { x: '3pm', y: 'Thu', value: 30 }, { x: '6pm', y: 'Thu', value: 21 },
          { x: '9am', y: 'Fri', value: 39 }, { x: '12pm', y: 'Fri', value: 34 }, { x: '3pm', y: 'Fri', value: 26 }, { x: '6pm', y: 'Fri', value: 14 },
        ],
      },
    },
  },
  {
    id: 'echarts-sankey',
    chart: 'graph · sankey',
    payload: {
      headline: 'Most trial value leaks before first project',
      takeaway: 'Sankey of signup → activation → paid — the biggest drop is before first project create.',
      sources: ['Amplitude', 'Stripe'],
      updated: '2h ago',
      severity: 'warn',
      attention: true,
      viz: {
        component: 'sankey',
        unit: '',
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
      },
    },
  },
  {
    id: 'echarts-treemap',
    chart: 'hierarchy · treemap',
    payload: {
      headline: 'Enterprise still carries half of ARR',
      takeaway: 'Treemap of ARR by segment and plan — mid-market growth is still thin underneath.',
      sources: ['Salesforce', 'Stripe'],
      updated: '5h ago',
      severity: 'neutral',
      viz: {
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
      },
    },
  },
]
