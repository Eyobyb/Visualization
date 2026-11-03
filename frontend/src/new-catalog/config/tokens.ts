/** Light and dark palettes from the Card Visualizations prototype (Adaly Intelligence Stream). */

export type NcTheme = 'light' | 'dark'

export const LIGHT = {
  ground: '#DEDEDB',
  stage: '#EDEDEA',
  surface: '#F7F7F5',
  tile: '#E4E4E0',
  plain: '#F9F8F6',
  ink: '#16171A',
  ink2: '#55575C',
  ink3: '#8A8C90',
  accent: '#FF6B00',
  lime: '#D6F04A',
  crit: '#B5341F',
  warn: '#8A6100',
  good: '#3F7A1F',
  info: '#3D4BB0',
  neutral: '#55575C',
} as const

export const DARK = {
  ground: '#0A0A0B',
  stage: '#121314',
  surface: '#1A1B1D',
  tile: '#222326',
  plain: '#1B1C1E',
  ink: '#F1F1EE',
  ink2: '#AEAFAB',
  ink3: '#7B7C79',
  accent: '#FF7A1A',
  lime: '#D6F04A',
  crit: '#FF8E78',
  warn: '#F2C85A',
  good: '#A6DB7C',
  info: '#A3AEFF',
  neutral: '#AEAFAB',
} as const

/** Prototype roles: Outfit for headlines/numbers, DM Sans for UI, DM Mono for ids. */
export const FONTS = {
  ui: '"DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  display: '"Outfit", "DM Sans", ui-sans-serif, system-ui, sans-serif',
  mono: '"DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const
