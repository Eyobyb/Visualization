import type { ReactNode } from 'react'

export type HeadlineProps = {
  children: ReactNode
  className?: string
}

/**
 * Card finding title — Adaly display face (~1.1875rem).
 *
 * See [Finding.md](./Finding.md).
 *
 * @example
 * <Headline>Net new ARR hit $366K this week</Headline>
 */
export function Headline({ children, className = '' }: HeadlineProps) {
  return (
    <h4 className={`nc-headline m-0 font-nc-display text-[1.1875rem] font-normal leading-[1.25] tracking-[-0.015em] text-balance text-nc-ink ${className}`.trim()}>
      {children}
    </h4>
  )
}

export type TakeawayProps = {
  children: ReactNode
  className?: string
}

/**
 * Short supporting line under the headline.
 *
 * See [Finding.md](./Finding.md).
 *
 * @example
 * <Takeaway>Highest week this quarter, driven by three enterprise upgrades.</Takeaway>
 */
export function Takeaway({ children, className = '' }: TakeawayProps) {
  return <p className={`nc-take m-0 text-[0.8125rem] leading-[1.5] text-nc-ink-2 ${className}`.trim()}>{children}</p>
}

export type BulletsProps = {
  items: string[]
  className?: string
}

/**
 * Compact bullet list under the finding (`resolveCard` caps at 3).
 *
 * See [Finding.md](./Finding.md).
 *
 * @example
 * <Bullets items={['3 enterprise upgrades closed early', 'Expansion was 61% of the total']} />
 */
export function Bullets({ items, className = '' }: BulletsProps) {
  if (!items.length) return null
  return (
    <ul className={`nc-bul m-0 flex list-none flex-col gap-1 p-0 text-[0.78125rem] text-nc-ink-2 ${className}`.trim()}>
      {items.map((b) => (
        <li key={b} className="flex gap-2 before:mt-2 before:size-1 before:shrink-0 before:rounded-full before:bg-nc-ink-3 before:content-['']">
          {b}
        </li>
      ))}
    </ul>
  )
}
