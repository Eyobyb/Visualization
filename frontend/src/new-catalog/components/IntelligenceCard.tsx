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
const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

/**
 * Proactive Intelligence chrome: sources/time header, severity, children, feedback + Ask.
 *
 * With `foldable`, matches Signal Drawer Simplified: collapsed brief + optional glyph;
 * click expands in place to full children + footer (height + opacity animated).
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
  /**
   * Progressive disclosure (Signal Drawer Simplified).
   * Collapsed: brief headline/takeaway + optional glyph. Open: children + footer.
   */
  foldable?: boolean
  /** Initial open state when `foldable` (uncontrolled). */
  defaultOpen?: boolean
  /** Controlled open state when `foldable`. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Short copy shown while folded. Falls back to empty if omitted. */
  brief?: { headline: string; takeaway?: string }
  /** Tiny visual hint in the bottom-right while folded. */
  glyph?: ReactNode
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
  foldable = false,
  defaultOpen = false,
  open: openControlled,
  onOpenChange,
  brief,
  glyph,
  className = '',
  style,
  children,
}: IntelligenceCardProps) {
  const appearance = useNcAppearance()
  const byline = sources.slice(0, 2).join(', ')
  const bylineExtra = Math.max(0, sources.length - 2)
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  const [openUncontrolled, setOpenUncontrolled] = useState(defaultOpen)
  const open = openControlled ?? openUncontrolled
  const setOpen = (next: boolean) => {
    if (openControlled === undefined) setOpenUncontrolled(next)
    onOpenChange?.(next)
  }
  const surfaceClass = cardSurfaceClass(appearance, attention, surface)
  const folded = foldable && !open

  const toggle = () => {
    if (!foldable) return
    setOpen(!open)
  }

  const footer = (
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
  )

  return (
    <article
      className={`nc-card relative isolate flex min-w-0 flex-col overflow-hidden transition-[box-shadow,transform] duration-300 ${surfaceClass} ${
        state === 'updating' ? 'updating' : ''
      } ${!surfaceClass.includes('mesh') ? 'hover:shadow-[0_0_0_0.0625rem_var(--color-nc-plain-line)_inset,0_1.5rem_3.125rem_-1.875rem_rgba(var(--shadow-nc-rgb),0.4)]' : ''} ${
        foldable && folded ? 'cursor-pointer' : ''
      } ${className}`}
      data-sev={severity}
      data-fold={foldable ? (open ? 'open' : 'folded') : undefined}
      aria-expanded={foldable ? open : undefined}
      tabIndex={foldable && folded ? 0 : undefined}
      onMouseEnter={
        foldable
          ? () => {
              setOpen(true)
            }
          : undefined
      }
      onMouseLeave={
        foldable
          ? () => {
              setOpen(false)
            }
          : undefined
      }
      onFocus={
        foldable
          ? () => {
              setOpen(true)
            }
          : undefined
      }
      onBlur={
        foldable
          ? (e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setOpen(false)
              }
            }
          : undefined
      }
      onClick={
        foldable && folded
          ? () => {
              setOpen(true)
            }
          : undefined
      }
      onKeyDown={
        foldable && folded
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setOpen(true)
              }
            }
          : undefined
      }
      style={{
        borderRadius: 'var(--nc-card-radius)',
        paddingLeft: 'var(--nc-card-pad-x)',
        paddingRight: 'var(--nc-card-pad-x)',
        paddingTop: 'var(--nc-card-pad-top)',
        paddingBottom: 'var(--nc-card-pad-bottom)',
        ...style,
      }}
    >
      <div
        className={`flex min-w-0 items-center justify-between gap-2.5 ${foldable && open ? 'cursor-pointer' : ''}`}
        onClick={
          foldable && open
            ? (e) => {
                e.stopPropagation()
                toggle()
              }
            : undefined
        }
      >
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
          {foldable ? (
            <span
              className={`nc-fold-chevron ml-1 grid size-7 place-items-center rounded-full bg-nc-surface/60 text-nc-ink-2 ${
                open ? 'is-open' : ''
              }`}
              aria-hidden
            >
              <Chevron />
            </span>
          ) : null}
        </span>
      </div>

      {foldable ? (
        <>
          <div
            className={`nc-fold-panel ${folded ? 'is-shown' : 'is-hidden'}`}
            aria-hidden={!folded}
            {...(!folded ? ({ inert: true } as object) : null)}
          >
            <div className="nc-fold-panel-inner">
              <div className="relative mt-3 pr-[7.25rem]">
                {brief?.headline ? (
                  <h4 className="nc-headline m-0 font-nc-display text-[1.25rem] font-[300] leading-[1.22] tracking-[-0.02em] text-balance text-nc-ink">
                    {brief.headline}
                  </h4>
                ) : null}
                {brief?.takeaway ? (
                  <p className="nc-take mt-0.5 mb-0 line-clamp-1 text-[0.84375rem] leading-[1.45] text-nc-ink-2">{brief.takeaway}</p>
                ) : null}
                {glyph ? (
                  <span className="pointer-events-none absolute right-0 bottom-0 flex h-[2.125rem] w-24 items-end justify-end" aria-hidden>
                    {glyph}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className={`nc-fold-panel ${open ? 'is-shown' : 'is-hidden'}`}
            aria-hidden={!open}
            {...(!open ? ({ inert: true } as object) : null)}
          >
            <div className="nc-fold-panel-inner">
              {children}
              {hidden > 0 ? (
                <button type="button" className="mt-2.5 self-start rounded-full bg-nc-ink/7 px-2.5 py-1 text-[0.71875rem] text-nc-ink-2 hover:text-nc-ink">
                  +{hidden} more in thread
                </button>
              ) : null}
              {footer}
            </div>
          </div>
        </>
      ) : (
        <>
          {children}
          {hidden > 0 ? (
            <button type="button" className="mt-2.5 self-start rounded-full bg-nc-ink/7 px-2.5 py-1 text-[0.71875rem] text-nc-ink-2 hover:text-nc-ink">
              +{hidden} more in thread
            </button>
          ) : null}
          {footer}
        </>
      )}
    </article>
  )
}
