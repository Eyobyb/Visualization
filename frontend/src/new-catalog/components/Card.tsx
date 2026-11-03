import { Bullets, Headline, Takeaway } from './Finding'
import { IntelligenceCard } from './IntelligenceCard'
import { Col } from './layout'
import { resolveCard } from './resolve'
import type { CardPayload, CardState } from './types'
import { renderViz } from './viz/renderViz'

/**
 * Convenience composer: `resolveCard` → finding + one viz inside {@link IntelligenceCard}.
 *
 * For multi-main layouts (KPI + chart, split pairs), compose `IntelligenceCard` + layout
 * primitives yourself. See [Card.md](./Card.md).
 *
 * @param payload - Card JSON (`headline` required; optional `viz`).
 * @param onAsk - “Ask about this” — e.g. open the full answer for a teaser card.
 *
 * @example
 * <Card payload={{ headline: 'Net new ARR hit $366K', severity: 'good',
 *   viz: { component: 'kpi', data: [{ label: 'Net new ARR', value: 366000, unit: 'USD' }] } }} />
 */
export type CardProps = {
  payload: CardPayload
  state?: CardState
  onUseful?: () => void
  onNotUseful?: () => void
  onAsk?: () => void
  className?: string
}

export function Card({
  payload,
  state = 'ready',
  onUseful,
  onNotUseful,
  onAsk,
  className = '',
}: CardProps) {
  const { card, viz, hidden } = resolveCard(payload)

  return (
    <IntelligenceCard
      sources={card.sources}
      updated={card.updated}
      severity={card.severity}
      attention={card.attention}
      state={state}
      hidden={hidden}
      onUseful={onUseful}
      onNotUseful={onNotUseful}
      onAsk={onAsk}
      className={className}
    >
      <Col gap={3} className="mt-3.5">
        <Headline>{card.headline || 'Untitled'}</Headline>
        {card.takeaway ? <Takeaway>{card.takeaway}</Takeaway> : null}
        {card.bullets?.length ? <Bullets items={card.bullets} /> : null}
        {viz ? <div className="nc-viz relative min-w-0">{renderViz(viz)}</div> : null}
      </Col>
    </IntelligenceCard>
  )
}
