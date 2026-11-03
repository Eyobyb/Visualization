import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Card } from '../Card'
import { IntelligenceCard } from '../IntelligenceCard'
import { NcRoot } from '../Root'
import { resolveCard } from '../resolve'
import type { CardPayload } from '../types'

const sample: CardPayload = {
  headline: 'Net new ARR hit $366K this week',
  takeaway: 'Highest week this quarter.',
  bullets: ['3 enterprise upgrades'],
  sources: ['Snowflake', 'Stripe'],
  updated: '2h ago',
  severity: 'good',
  attention: true,
  viz: {
    component: 'kpi',
    data: [{ label: 'Net new ARR', value: 366000, unit: 'USD', delta: 18, delta_unit: '%', period: 'vs last week', good: 'up' }],
  },
}

describe('Card', () => {
  it('renders the shell and a KPI inside NcRoot', () => {
    const html = renderToStaticMarkup(
      <NcRoot>
        <Card payload={sample} />
      </NcRoot>,
    )
    expect(html).toContain('nc')
    expect(html).toContain('data-theme="light"')
    expect(html).toContain('Net new ARR hit $366K this week')
    expect(html).toContain('$366K')
    expect(html).toContain('Ask about this')
    expect(html).toContain('mesh')
  })

  it('rolls pie slices beyond five into Other', () => {
    const { viz, hidden } = resolveCard({
      headline: 'Share',
      viz: {
        component: 'pie',
        data: [
          { label: 'A', value: 50 },
          { label: 'B', value: 30 },
          { label: 'C', value: 20 },
          { label: 'D', value: 10 },
          { label: 'E', value: 8 },
          { label: 'F', value: 5 },
          { label: 'G', value: 2 },
        ],
      },
    })
    expect(viz?.component).toBe('pie')
    expect(viz && viz.component === 'pie' ? viz.data.length : 0).toBe(6)
    expect(viz && viz.component === 'pie' ? viz.data.some((d) => d.label === 'Other') : false).toBe(true)
    expect(hidden).toBe(2)
  })

  it('trims kpi_strip to four tiles', () => {
    const { viz, hidden } = resolveCard({
      headline: 'Six tiles',
      viz: {
        component: 'kpi_strip',
        data: [
          { label: 'A', value: 1 },
          { label: 'B', value: 2 },
          { label: 'C', value: 3 },
          { label: 'D', value: 4 },
          { label: 'E', value: 5 },
          { label: 'F', value: 6 },
        ],
      },
    })
    expect(viz?.component).toBe('kpi_strip')
    expect(viz && viz.component === 'kpi_strip' ? viz.data.length : 0).toBe(4)
    expect(hidden).toBe(2)
  })

  it('renders text-only when viz is missing', () => {
    const html = renderToStaticMarkup(
      <NcRoot>
        <Card payload={{ headline: 'Support handoffs now run through Slack', takeaway: 'Nothing to chart.' }} />
      </NcRoot>,
    )
    expect(html).toContain('Support handoffs')
    expect(html).not.toContain('nc-viz')
  })
})

describe('IntelligenceCard', () => {
  it('renders header, footer, and arbitrary children without a viz', () => {
    const html = renderToStaticMarkup(
      <NcRoot>
        <IntelligenceCard sources={['Zendesk']} updated="1h ago" severity="info" hidden={3}>
          <p className="nc-take">Custom finding body</p>
        </IntelligenceCard>
      </NcRoot>,
    )
    expect(html).toContain('Zendesk')
    expect(html).toContain('1h ago')
    expect(html).toContain('Custom finding body')
    expect(html).toContain('Ask about this')
    expect(html).toContain('Useful')
    expect(html).toContain('+3 more in thread')
    expect(html).not.toContain('nc-viz')
  })
})
