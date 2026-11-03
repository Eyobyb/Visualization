import type { VizPayload } from '../index'

export const HEAT = [
  { x: '9am', y: 'Mon', value: 42 }, { x: '12pm', y: 'Mon', value: 31 }, { x: '3pm', y: 'Mon', value: 28 },
  { x: '9am', y: 'Tue', value: 61 }, { x: '12pm', y: 'Tue', value: 44 }, { x: '3pm', y: 'Tue', value: 36 },
  { x: '9am', y: 'Wed', value: 48 }, { x: '12pm', y: 'Wed', value: 39 }, { x: '3pm', y: 'Wed', value: 33 },
]

export const VIZ = {
  kpi: {
    component: 'kpi',
    data: [{
      label: 'Peak hour tickets',
      value: 61,
      delta: 22,
      delta_unit: '%',
      period: 'vs last Tue',
      good: 'down',
      spark: [28, 31, 36, 42, 48, 55, 61],
    }],
  },
  kpi_strip: {
    component: 'kpi_strip',
    data: [
      { label: 'Trials', value: 1284, delta: 6, delta_unit: '%', good: 'up' },
      { label: 'Activation', value: 42, unit: '%', delta: 3, delta_unit: 'pt', good: 'up' },
      { label: 'Paid', value: 96, delta: -4, delta_unit: '%', good: 'up' },
    ],
  },
  ranked_list: {
    component: 'ranked_list',
    unit: 'x',
    data: [
      { label: 'Brand search', value: 6.2, source: 'GA4' },
      { label: 'Retargeting', value: 4.8, source: 'Meta Ads' },
      { label: 'Spring promo', value: 3.9, source: 'Meta Ads' },
    ],
  },
  table: {
    component: 'table',
    columns: [
      { key: 'deal', label: 'Deal', type: 'text' },
      { key: 'stage', label: 'Stage', type: 'text' },
      { key: 'value', label: 'Value', type: 'USD' },
    ],
    rows: [
      { deal: 'Acme renewal', stage: 'Negotiation', value: 280000 },
      { deal: 'Globex expansion', stage: 'Proposal', value: 200000 },
    ],
  },
  heatmap: { component: 'heatmap', data: HEAT },
  pie: {
    component: 'pie',
    unit: 'USD',
    donut: true,
    data: [
      { label: 'Self-serve', value: 212000 },
      { label: 'Sales-assisted', value: 98000 },
      { label: 'Partners', value: 41000 },
    ],
  },
  trend: {
    component: 'trend',
    series: ['This year', 'Last year'],
    data: [
      { x: '2026-08-01', y: 1822, y2: 1730 },
      { x: '2026-09-01', y: 1990, y2: 1780 },
      { x: '2026-10-01', y: 2108, y2: 1818 },
    ],
  },
  columns: {
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
} as const satisfies Record<string, VizPayload>

export function mainOf(
  part: 'kpi' | 'kpi_strip' | 'ranked_list' | 'table' | 'graph',
  viz: VizPayload,
) {
  return { part, viz }
}
