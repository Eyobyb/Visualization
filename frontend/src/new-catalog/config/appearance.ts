import type { CSSProperties } from 'react'
import { rem } from './units'

/** Spacing steps for layout config (matches Col/Grid gap props). */
export type NcSpace = 1 | 2 | 3 | 4 | 5 | 6

/** Named surfaces for the page behind cards. */
export type NcStageSurface = 'stage' | 'ground' | 'surface' | 'plain' | 'none'

/** Named card body backgrounds. */
export type NcCardSurface = 'plain' | 'mesh' | 'tile' | 'surface' | 'transparent'

export type NcBackgroundConfig = {
  /** Page / NcRoot background. Named token or any CSS color. */
  stage?: NcStageSurface | (string & {})
  /**
   * Default card surface when `attention` is false.
   * `mesh` always uses severity mesh even without attention.
   */
  card?: NcCardSurface
  /** Surface used when `attention` is true (default `mesh`). */
  attention?: NcCardSurface
  /** Optional token overrides (applied as CSS vars on NcRoot). */
  colors?: Partial<{
    stage: string
    ground: string
    surface: string
    tile: string
    plain: string
    ink: string
    ink2: string
    ink3: string
    accent: string
  }>
}

export type NcLayoutConfig = {
  /** Default vertical stack gap inside cards (`Col`). */
  gap?: NcSpace
  /** Horizontal card padding (design px; emitted as rem). */
  cardPaddingX?: number
  /** Top / bottom card padding (design px; emitted as rem). */
  cardPaddingTop?: number
  cardPaddingBottom?: number
  /** Card corner radius (design px; emitted as rem). */
  cardRadius?: number
  /** Default gallery / content grid columns. */
  columns?: 1 | 2 | 3 | 4
}

/** Full appearance knobs for new-catalog. */
export type NcAppearance = {
  background?: NcBackgroundConfig
  layout?: NcLayoutConfig
}

export const DEFAULT_APPEARANCE: Required<{
  background: Required<Omit<NcBackgroundConfig, 'colors'>> & { colors?: NcBackgroundConfig['colors'] }
  layout: Required<NcLayoutConfig>
}> = {
  background: {
    stage: 'stage',
    card: 'plain',
    attention: 'mesh',
  },
  layout: {
    gap: 3,
    cardPaddingX: 20,
    cardPaddingTop: 18,
    cardPaddingBottom: 14,
    cardRadius: 22,
    columns: 2,
  },
}

const STAGE_CLASS: Record<NcStageSurface, string> = {
  stage: 'bg-nc-stage',
  ground: 'bg-nc-ground',
  surface: 'bg-nc-surface',
  plain: 'bg-nc-plain',
  none: 'bg-transparent',
}

const CARD_SURFACE_CLASS: Record<NcCardSurface, string> = {
  plain: 'bg-nc-plain shadow-[0_0_0_0.0625rem_var(--color-nc-plain-line)_inset]',
  tile: 'bg-nc-tile shadow-[0_0_0_0.0625rem_var(--color-nc-plain-line)_inset]',
  surface: 'bg-nc-surface shadow-[0_0_0_0.0625rem_var(--color-nc-plain-line)_inset]',
  transparent: 'bg-transparent',
  mesh: 'mesh',
}

/** Merge partial appearance onto defaults. */
export function resolveAppearance(partial?: NcAppearance) {
  return {
    background: {
      ...DEFAULT_APPEARANCE.background,
      ...partial?.background,
      colors: partial?.background?.colors,
    },
    layout: {
      ...DEFAULT_APPEARANCE.layout,
      ...partial?.layout,
    },
  }
}

export type ResolvedAppearance = ReturnType<typeof resolveAppearance>

/** Tailwind / utility class for the stage (when using a named surface). */
export function stageClass(stage: NcBackgroundConfig['stage']): string | null {
  if (!stage || stage in STAGE_CLASS) return STAGE_CLASS[(stage || 'stage') as NcStageSurface]
  return null
}

/** Inline style when stage is a custom CSS color. */
export function stageStyle(stage: NcBackgroundConfig['stage']): CSSProperties | undefined {
  if (!stage || stage in STAGE_CLASS) return undefined
  return { background: stage }
}

/** Card surface class for a given attention flag + config (+ optional per-card override). */
export function cardSurfaceClass(
  appearance: ResolvedAppearance,
  attention: boolean,
  override?: NcCardSurface,
): string {
  const surface = override ?? (attention ? appearance.background.attention : appearance.background.card)
  return CARD_SURFACE_CLASS[surface]
}

/** CSS variables for layout metrics + optional color overrides. */
export function appearanceVars(appearance: ResolvedAppearance): CSSProperties {
  const { layout, background } = appearance
  const vars: Record<string, string> = {
    '--nc-card-pad-x': rem(layout.cardPaddingX),
    '--nc-card-pad-top': rem(layout.cardPaddingTop),
    '--nc-card-pad-bottom': rem(layout.cardPaddingBottom),
    '--nc-card-radius': rem(layout.cardRadius),
    '--nc-body-gap': String(layout.gap),
  }
  const c = background.colors
  if (c?.stage) vars['--color-nc-stage'] = c.stage
  if (c?.ground) vars['--color-nc-ground'] = c.ground
  if (c?.surface) vars['--color-nc-surface'] = c.surface
  if (c?.tile) vars['--color-nc-tile'] = c.tile
  if (c?.plain) vars['--color-nc-plain'] = c.plain
  if (c?.ink) vars['--color-nc-ink'] = c.ink
  if (c?.ink2) vars['--color-nc-ink-2'] = c.ink2
  if (c?.ink3) vars['--color-nc-ink-3'] = c.ink3
  if (c?.accent) vars['--color-nc-accent'] = c.accent
  return vars as CSSProperties
}

/** Named presets you can pass as `appearance` on NcRoot. */
export const APPEARANCE_PRESETS = {
  default: {} satisfies NcAppearance,
  compact: {
    layout: { gap: 2, cardPaddingX: 16, cardPaddingTop: 14, cardPaddingBottom: 12, cardRadius: 16, columns: 2 },
  } satisfies NcAppearance,
  airy: {
    layout: { gap: 4, cardPaddingX: 24, cardPaddingTop: 22, cardPaddingBottom: 18, cardRadius: 28, columns: 2 },
  } satisfies NcAppearance,
  meshAlways: {
    background: { card: 'mesh', attention: 'mesh' },
  } satisfies NcAppearance,
  flatTile: {
    background: { stage: 'ground', card: 'tile', attention: 'tile' },
    layout: { cardRadius: 14 },
  } satisfies NcAppearance,
  inkStage: {
    background: {
      stage: '#16171A',
      colors: { plain: '#F9F8F6', tile: '#E8E8E4' },
    },
  } satisfies NcAppearance,
} as const

export type NcAppearancePreset = keyof typeof APPEARANCE_PRESETS
