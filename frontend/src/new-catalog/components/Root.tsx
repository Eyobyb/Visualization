import type { ReactNode } from 'react'
import {
  NcAppearanceProvider,
  type NcAppearance,
  type NcTheme,
} from '../config'
import '../config/fonts.css'
import '../styles.css'
import './extras.css'

/**
 * Root for every new-catalog component. Loads fonts/tokens, theme, and optional
 * appearance (background + layout). All cards must render inside this.
 *
 * See [Root.md](./Root.md).
 *
 * @example
 * <NcRoot theme="light" appearance={{ layout: { gap: 4, cardRadius: 16 } }}>
 *   <IntelligenceCard>…</IntelligenceCard>
 * </NcRoot>
 */
export type NcRootProps = {
  children: ReactNode
  theme?: NcTheme
  /** Background surfaces + layout metrics (padding, radius, gaps, columns). */
  appearance?: NcAppearance
  className?: string
}

export function NcRoot({ children, theme = 'light', appearance, className = '' }: NcRootProps) {
  return (
    <NcAppearanceProvider theme={theme} appearance={appearance} className={className}>
      {children}
    </NcAppearanceProvider>
  )
}
