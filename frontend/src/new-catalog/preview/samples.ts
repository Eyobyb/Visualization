import type { CardPayload } from '../components'

/** Non-chart sample cards (KPI strip, ranked list, table, text-only). */
export const SAMPLES: { id: string; name: string; payload: CardPayload }[] = [
  {
    id: 'kpi_strip',
    name: 'KPI strip',
    payload: {
      headline: 'Trial funnel held steady this week',
      takeaway: 'Activation is up, but paid conversions slipped after the pricing page test.',
      sources: ['HubSpot', 'Amplitude'],
      updated: '3h ago',
      severity: 'neutral',
      viz: {
        component: 'kpi_strip',
        data: [
          { label: 'Trials', value: 1284, delta: 6, delta_unit: '%', period: 'vs last week', good: 'up' },
          { label: 'Activation', value: 42, unit: '%', delta: 3, delta_unit: 'pt', good: 'up' },
          { label: 'Paid', value: 96, delta: -4, delta_unit: '%', good: 'up' },
          { label: 'Time to value', value: 2.4, unit: 'days', delta: -0.6, delta_unit: 'days', good: 'down' },
        ],
      },
    },
  },
  {
    id: 'ranked_list',
    name: 'Ranked list',
    payload: {
      headline: 'Brand search returns 6.2× on ad spend',
      takeaway: 'Your top two campaigns drive 58% of attributed revenue on 31% of spend.',
      sources: ['GA4', 'Meta Ads'],
      updated: '2h ago',
      severity: 'neutral',
      viz: {
        component: 'ranked_list',
        unit: 'x',
        data: [
          { label: 'Brand search', value: 6.2, source: 'GA4' },
          { label: 'Retargeting', value: 4.8, source: 'Meta Ads' },
          { label: 'Spring promo', value: 3.9, source: 'Meta Ads' },
          { label: 'Lookalike audiences', value: 2.7, source: 'Meta Ads' },
          { label: 'Prospecting video', value: 1.6, source: 'GA4' },
        ],
      },
    },
  },
  {
    id: 'table',
    name: 'Table',
    payload: {
      headline: 'Two Q1 deals could close in Q4',
      takeaway: 'Both are past legal review. Pulling them in adds $480K to Q4.',
      sources: ['Salesforce'],
      updated: '15m ago',
      severity: 'good',
      attention: true,
      viz: {
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
      },
    },
  },
  {
    id: 'text',
    name: 'Text only',
    payload: {
      headline: 'Support handoffs now run through Slack',
      takeaway: 'Nothing in this answer is a number worth charting, so the card stays text only.',
      sources: ['Zendesk'],
      updated: 'Yesterday',
      severity: 'info',
      bullets: [
        'Escalations moved from email to Slack in September',
        'Handoff notes are now attached to 92% of tickets',
      ],
      viz: null,
    },
  },
]
