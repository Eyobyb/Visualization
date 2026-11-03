import { Delta } from '../Delta'
import { fmt } from '../format'
import type { VizPayload } from '../types'

export type KpiStripProps = {
  viz: Extract<VizPayload, { component: 'kpi_strip' }>
}


/**
 * Two to four headline metric tiles in a responsive grid.
 *
 * Medium visual weight — preferred over a lone {@link Kpi} when splitting beside a chart.
 * See [KpiStrip.md](./KpiStrip.md).
 *
 * @param viz - `component: 'kpi_strip'` payload (`data` typically 2–4 `KpiItem`s).
 */
export function KpiStrip({ viz }: KpiStripProps) {
  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(7.375rem,1fr))] gap-2">
        {viz.data.map((r) => (
          <div
            key={r.label}
            className="flex min-w-0 flex-col gap-1.5 rounded-2xl bg-[color-mix(in_srgb,var(--color-nc-tile)_70%,var(--color-nc-plain))] px-3.5 pt-3.5 pb-3"
          >
            <span className="truncate text-[0.71875rem] text-nc-ink-2" title={r.label}>{r.label}</span>
            <b className="font-nc-display text-[1.75rem] font-light leading-[1.05] tracking-[-0.04em] tabular-nums">
              {fmt(r.value, r.unit || viz.unit)}
            </b>
            <Delta delta={r.delta} deltaUnit={r.delta_unit} good={r.good} />
          </div>
        ))}
      </div>
      {viz.data[0]?.period ? (
        <div className="mt-2 text-[0.6875rem] text-nc-ink-3">Change {viz.data[0].period}</div>
      ) : null}
    </div>
  )
}
