import { fmt, fmtX } from '../format'
import type { TableCol, VizPayload } from '../types'

function cell(c: TableCol, val: unknown): string {
  if (c.type && c.type !== 'text' && c.type !== 'date') {
    return fmt(val, c.type === 'number' ? '' : c.type)
  }
  if (c.type === 'date') return fmtX(val)
  return String(val ?? '')
}

function isNumericCol(c: TableCol) {
  return !!(c.type && c.type !== 'text' && c.type !== 'date')
}

export type TableProps = {
  viz: Extract<VizPayload, { component: 'table' }>
}


/**
 * Multi-attribute rows that do not fit a chart.
 *
 * Heavy / full-width — stack with other mains; never split beside a graph.
 * Main part: `table`. See [Table.md](./Table.md).
 *
 * @param viz - `component: 'table'` with `columns` and `rows`.
 */
export function Table({ viz }: TableProps) {
  const cols = viz.columns || []
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[0.78125rem] tabular-nums">
        <thead>
          <tr>
            {cols.map((c) => (
              <th
                key={c.key}
                className={`pb-1.5 font-normal text-[0.6875rem] text-nc-ink-3 whitespace-nowrap ${isNumericCol(c) ? 'pl-3 text-right' : 'text-left'}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {viz.rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c, j) => (
                <td
                  key={c.key}
                  className={`border-t border-nc-line-2 py-2 whitespace-nowrap text-nc-ink ${j === 0 ? 'max-w-[11.25rem] truncate font-medium' : ''} ${isNumericCol(c) ? 'pl-3 text-right' : ''}`}
                >
                  {cell(c, r[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
