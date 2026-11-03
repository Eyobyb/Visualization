import { fmt } from '../format'
import { Sources } from '../Sources'
import type { VizPayload } from '../types'

export type RankedListProps = {
  viz: Extract<VizPayload, { component: 'ranked_list' }>
}


/**
 * Ordered list with proportional value bars and optional per-row source logos.
 *
 * Medium visual weight. Main part: `ranked_list`. See [RankedList.md](./RankedList.md).
 *
 * @param viz - `component: 'ranked_list'` with `data: RankItem[]`.
 */
export function RankedList({ viz }: RankedListProps) {
  const mx = Math.max(...viz.data.map((r) => Math.abs(r.value))) || 1
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {viz.data.map((r, i) => (
        <li
          key={r.label}
          className={`grid grid-cols-[1rem_minmax(0,1fr)_minmax(2.5rem,30%)_3.25rem] items-center gap-2.5 py-2 text-[0.78125rem] ${i ? 'border-t border-nc-line-2' : ''}`}
        >
          <span className="font-nc-mono text-[0.65625rem] text-nc-ink-3">{i + 1}</span>
          <span className="flex min-w-0 items-center gap-2">
            {r.source ? <Sources names={[r.source]} size={18} /> : null}
            <b className="truncate font-medium" title={r.label}>{r.label}</b>
          </span>
          <span className={`h-1.5 overflow-hidden rounded-full bg-nc-ink/9 ${r.value < 0 ? '[&>i]:bg-nc-crit' : '[&>i]:bg-nc-ink'}`}>
            <i className="block h-full rounded-full" style={{ width: `${((Math.abs(r.value) / mx) * 100).toFixed(1)}%` }} />
          </span>
          <em className="text-right not-italic tabular-nums">{fmt(r.value, r.unit || viz.unit)}</em>
        </li>
      ))}
    </ol>
  )
}
