import { IntelligenceCard, renderViz } from '../components'
import type { EchartsCardSample } from './echartsSamples'

/**
 * Builds a card from IntelligenceCard parts with an ECharts viz in the body.
 * Header / finding / chart / footer stay in the shell; only the viz slot is ECharts.
 */
export function EchartsCard({ sample }: { sample: EchartsCardSample }) {
  const { payload } = sample
  const { sources = [], updated, severity = 'neutral', attention, headline, takeaway, bullets, viz } = payload

  return (
    <IntelligenceCard
      sources={sources}
      updated={updated}
      severity={severity}
      attention={attention}
    >
      {/* Finding */}
      <h4 className="nc-headline mt-3.5 mb-0 font-nc-display text-[1.1875rem] font-normal leading-[1.25] tracking-[-0.015em] text-balance">
        {headline}
      </h4>
      {takeaway ? <p className="nc-take mt-1.5 mb-0 text-[0.8125rem] leading-[1.5] text-nc-ink-2">{takeaway}</p> : null}
      {bullets?.length ? (
        <ul className="nc-bul mt-2.5 mb-0 flex list-none flex-col gap-1 p-0 text-[0.78125rem] text-nc-ink-2">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2 before:mt-2 before:size-1 before:shrink-0 before:rounded-full before:bg-nc-ink-3 before:content-['']">
              {b}
            </li>
          ))}
        </ul>
      ) : null}

      {/* ECharts viz part */}
      <div className="nc-viz relative mt-4 min-w-0" data-echarts={viz.component}>
        {renderViz(viz)}
      </div>
    </IntelligenceCard>
  )
}
