import { arrow, deltaTone, fmtDelta } from './format'
import type { GoodWhen, Unit } from './types'

const TONE = {
  good: 'text-nc-good bg-nc-good/13',
  bad: 'text-nc-crit bg-nc-crit/13',
  flat: 'text-nc-ink-2 bg-nc-ink/7',
} as const

export type DeltaProps = {
  delta?: number
  deltaUnit?: Unit
  period?: string
  good?: GoodWhen
}

/**
 * Delta pill: arrow + formatted change, optional period, tone from `good`.
 *
 * Returns `null` when `delta` is missing or non-finite. See [Delta.md](./Delta.md).
 */
export function Delta({ delta, deltaUnit, period, good }: DeltaProps) {
  if (typeof delta !== 'number' || !Number.isFinite(delta)) return null
  const tone = deltaTone(delta, good)
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.71875rem] tabular-nums whitespace-nowrap ${TONE[tone]}`}>
      {arrow(delta)} {fmtDelta(delta, deltaUnit)}
      {period ? <small className="text-nc-ink-3 font-normal">{period}</small> : null}
    </span>
  )
}
