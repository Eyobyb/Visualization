import type { ReactNode } from 'react'
import { useNcAppearance, useNcGap, type NcSpace } from '../config'
import { rem } from './format'

export type { NcSpace }

const GAP: Record<NcSpace, string> = {
  1: 'gap-1',
  2: 'gap-1.5',
  3: 'gap-2.5',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
}

const ALIGN = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const

const JUSTIFY = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
} as const

/**
 * Stacks blocks vertically. Usual root inside an IntelligenceCard body.
 *
 * Gap defaults to `appearance.layout.gap` from NcRoot when omitted.
 * See [layout.md](./layout.md).
 */
export type ColProps = {
  children: ReactNode
  gap?: NcSpace
  align?: keyof typeof ALIGN
  className?: string
}

export function Col({ children, gap, align = 'stretch', className = '' }: ColProps) {
  const configGap = useNcGap()
  const g = gap ?? configGap
  return <div className={`flex min-w-0 flex-col ${GAP[g]} ${ALIGN[align]} ${className}`.trim()}>{children}</div>
}

/**
 * Places items side by side; wraps on narrow widths by default.
 * See [layout.md](./layout.md).
 */
export type RowProps = {
  children: ReactNode
  gap?: NcSpace
  align?: keyof typeof ALIGN
  justify?: keyof typeof JUSTIFY
  wrap?: boolean
  className?: string
}

export function Row({
  children,
  gap = 2,
  align = 'center',
  justify = 'start',
  wrap = true,
  className = '',
}: RowProps) {
  return (
    <div
      className={`flex min-w-0 ${GAP[gap]} ${ALIGN[align]} ${JUSTIFY[justify]} ${wrap ? 'flex-wrap' : 'flex-nowrap'} ${className}`.trim()}
    >
      {children}
    </div>
  )
}

/**
 * Light grouped region when a full IntelligenceCard would be too heavy.
 * See [layout.md](./layout.md).
 */
export type BoxProps = {
  children: ReactNode
  gap?: NcSpace
  padded?: boolean
  className?: string
}

export function Box({ children, gap = 2, padded = true, className = '' }: BoxProps) {
  return (
    <div
      className={`flex min-w-0 flex-col rounded-[0.875rem] bg-nc-tile/55 ${GAP[gap]} ${padded ? 'p-3' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  )
}

/**
 * Equal-width tiles. Column count defaults to `appearance.layout.columns` when omitted.
 *
 * Use `columns={2}` for split main-part pairs. See [layout.md](./layout.md).
 */
export type GridProps = {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4
  gap?: NcSpace
  className?: string
}

export function Grid({ children, columns, gap = 3, className = '' }: GridProps) {
  const { layout } = useNcAppearance()
  const colsN = columns ?? layout.columns
  const cols =
    colsN === 1
      ? 'grid-cols-1'
      : colsN === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : colsN === 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  return <div className={`grid min-w-0 ${cols} ${GAP[gap]} ${className}`.trim()}>{children}</div>
}

/**
 * Horizontal rule between finding and viz (or between stacked viz).
 * Optional center `label`. See [layout.md](./layout.md).
 */
export type DividerProps = {
  label?: string
  className?: string
}

export function Divider({ label, className = '' }: DividerProps) {
  if (label) {
    return (
      <div className={`flex items-center gap-2.5 text-[0.6875rem] text-nc-ink-3 ${className}`.trim()} role="separator">
        <i className="h-px flex-1 bg-nc-line-2" />
        <span className="shrink-0">{label}</span>
        <i className="h-px flex-1 bg-nc-line-2" />
      </div>
    )
  }
  return <hr className={`m-0 border-0 border-t border-nc-line-2 ${className}`.trim()} />
}

/**
 * Empty vertical space for one-off spacing tweaks.
 * See [layout.md](./layout.md).
 */
export type SpacerProps = {
  size?: NcSpace
}

export function Spacer({ size = 3 }: SpacerProps) {
  const h: Record<NcSpace, number> = {
    1: 4,
    2: 6,
    3: 10,
    4: 16,
    5: 20,
    6: 24,
  }
  return <div style={{ height: rem(h[size]) }} aria-hidden />
}
