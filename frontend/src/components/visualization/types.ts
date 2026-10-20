import type { ReactNode } from 'react'
import type { IconName } from './icons'

/** Semantic colour applied through the `--tone` CSS variable. */
export type Tone = 'ink' | 'muted' | 'accent' | 'info' | 'success' | 'warning' | 'danger'

/** Tint for cards that need to draw attention; `default` leaves the card neutral. */
export type CardTone = 'default' | 'accent' | 'info' | 'success' | 'warning' | 'danger'

/** How numbers display. Percent values are fractions (0.12 = 12%). */
export type NumberFormat = 'number' | 'currency' | 'percent' | 'compact'

/** Spacing step from 0 to 8, mapped to 0–32px in 4px increments. */
export type Space = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export type Align = 'start' | 'center' | 'end' | 'stretch'

/** Which direction of change counts as an improvement. */
export type GoodWhen = 'up' | 'down'

/** A loosely typed data row, as injected by the server. */
export type Row = Record<string, unknown>

/** A choice for selects, segmented controls and radio groups. A bare value is shown as its labelized form. */
export type OptionInput<V = string> = V | { value: V; label?: string; description?: string; icon?: IconName }

export interface NormalizedOption<V = string> {
  value: V
  label: string
  description?: string
  icon?: IconName
}

/**
 * An item for prose lists. A bare string or node is treated as `{ text }`.
 * `done` only applies to Steps and Checklist.
 */
export type ProseItem = ReactNode | { title?: string; text?: ReactNode; icon?: IconName; tone?: Tone; done?: boolean }
