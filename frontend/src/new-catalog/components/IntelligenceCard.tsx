import { useState, type CSSProperties, type ReactNode } from 'react'
import { cardSurfaceClass, useNcAppearance, type NcCardSurface } from '../config'
import { Sources } from './Sources'
import type { CardState, Severity } from './types'

const Up = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[0.9375rem]">
    <path d="M7 10v11H3V10zM7 10l4-8a3 3 0 0 1 3 3v4h6a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.6 21H7" />
  </svg>
)
const Down = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[0.9375rem]">
    <path d="M17 14V3h4v11zM17 14l-4 8a3 3 0 0 1-3-3v-4H4a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 5.4 3H17" />
  </svg>
)
const Ask = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[0.8125rem]">
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
  </svg>
)

/**
 * Proactive Intelligence chrome: sources/time header, severity, children, feedback + Ask.
 *
 * Background + padding/radius come from `NcRoot` appearance (overridable via `surface`).
 * Does not render viz — pass finding/layout/viz as `children`. See [IntelligenceCard.md](./IntelligenceCard.md).
 *
 * @example
 * <IntelligenceCard sources={['Stripe']} updated="2h ago" severity="good" surface="mesh">
 *   <Headline>Net new ARR hit $366K</Headline>
 * </IntelligenceCard>
 */
export type IntelligenceCardProps = {
  sources?: string[]
  updated?: string
  severity?: Severity
  attention?: boolean
  /** Override card background from appearance config. */
  surface?: NcCardSurface
  state?: CardState
  hidden?: number
  onUseful?: () => void
  onNotUseful?: () => void
  onAsk?: () => void
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function IntelligenceCard({
  sources = [],
  updated,
  severity = 'neutral',
  attention = false,
  surface,
  state = 'ready',
  hidden = 0,
  onUseful,
  onNotUseful,
  onAsk,
  className = '',
  style,
  children,
}: IntelligenceCardProps) {
  const appearance = useNcAppearance()
  const byline = sources.slice(0, 2).join(', ')
  const bylineExtra = Math.max(0, sources.length - 2)
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  const surfaceClass = cardSurfaceClass(appearance, attention, surface)

  return (
    <article
      className={`nc-card relative isolate flex min-w-0 flex-col overflow-hidden transition-[box-shadow,transform] duration-300 ${surfaceClass} ${
        state === 'updating' ? 'updating' : ''
      } ${!surfaceClass.includes('mesh') ? 'hover:shadow-[0_0_0_0.0625rem_var(--color-nc-plain-line)_inset,0_1.5rem_3.125rem_-1.875rem_rgba(var(--shadow-nc-rgb),0.4)]' : ''} ${className}`}
      data-sev={severity}
      style={{
        borderRadius: 'var(--nc-card-radius)',
        paddingLeft: 'var(--nc-card-pad-x)',
        paddingRight: 'var(--nc-card-pad-x)',
        paddingTop: 'var(--nc-card-pad-top)',
        paddingBottom: 'var(--nc-card-pad-bottom)',
        ...style,
      }}
    >
      <div className="flex min-w-0 items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Sources names={sources} />
          <span className="min-w-0 truncate text-[0.78125rem] font-medium">
            {byline}
            {bylineExtra > 0 ? <em className="font-normal not-italic text-nc-ink-3"> +{bylineExtra}</em> : null}
          </span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.71875rem] text-nc-ink-3 tabular-nums whitespace-nowrap">
          <i className="size-1.5 rounded-full" style={{ background: 'var(--nc-sev)' }} />
          {state === 'updating' ? 'Updating…' : updated || ''}
        </span>
      </div>

      {children}

      {hidden > 0 ? (
        <button type="button" className="mt-2.5 self-start rounded-full bg-nc-ink/7 px-2.5 py-1 text-[0.71875rem] text-nc-ink-2 hover:text-nc-ink">
          +{hidden} more in thread
        </button>
      ) : null}

      <div className="nc-card-foot mt-3.5 flex items-center justify-between gap-2 border-t border-nc-line-2 pt-2.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className={`grid size-8 place-items-center rounded-full border-0 bg-transparent p-0 text-nc-ink-2 hover:bg-nc-tile hover:text-nc-ink ${vote === 'up' ? 'bg-nc-ink text-nc-stage hover:bg-nc-ink hover:text-nc-stage' : ''}`}
            aria-label="Useful"
            aria-pressed={vote === 'up'}
            onClick={() => {
              setVote('up')
              onUseful?.()
            }}
          >
            <Up />
          </button>
          <button
            type="button"
            className={`grid size-8 place-items-center rounded-full border-0 bg-transparent p-0 text-nc-ink-2 hover:bg-nc-tile hover:text-nc-ink ${vote === 'down' ? 'bg-nc-ink text-nc-stage hover:bg-nc-ink hover:text-nc-stage' : ''}`}
            aria-label="Not useful"
            aria-pressed={vote === 'down'}
            onClick={() => {
              setVote('down')
              onNotUseful?.()
            }}
          >
            <Down />
          </button>
          {vote ? <span className="ml-1.5 text-[0.71875rem] text-nc-ink-3">{vote === 'up' ? 'Thanks' : 'Noted'}</span> : null}
        </div>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border-0 bg-nc-ink px-3 pl-[0.6875rem] font-nc-ui text-[0.78125rem] font-medium whitespace-nowrap text-nc-stage transition-[transform,opacity] duration-200 hover:-translate-y-px hover:opacity-90"
          onClick={onAsk}
        >
          <Ask />
          Ask about this
        </button>
      </div>
    </article>
  )
}
