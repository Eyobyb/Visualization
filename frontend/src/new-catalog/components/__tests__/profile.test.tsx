import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NcRoot } from '../Root'
import { SourceProfile } from '../SourceProfile'
import { ZENDESK_PROFILE } from '../../lab/profileSample'

describe('SourceProfile', () => {
  it('renders the Zendesk drawer and its recent findings', () => {
    const html = renderToStaticMarkup(
      <NcRoot>
        <SourceProfile {...ZENDESK_PROFILE} />
      </NcRoot>,
    )
    expect(html).toContain('Zendesk')
    expect(html).toContain('Monitors support tickets and tags')
    expect(html).toContain('>9<')
    expect(html).toContain('84%')
    expect(html).toContain('Stripe')
    expect(html).toContain('Refunds are spiking on annual plans')
    expect(html).toContain('In your stream')
    expect(html).toContain('Interested?')
    expect(html).toContain('Billing-confusion tickets share one tag')
    expect(html).toContain('Ticket volume peaks on Tuesday mornings')
    expect(html).toContain('data-kind="text"')
    expect(html).toContain('data-kind="graph"')
  })
})
