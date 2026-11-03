import { createContext, useContext, type ReactNode } from 'react'
import {
  appearanceVars,
  resolveAppearance,
  stageClass,
  stageStyle,
  type NcAppearance,
  type ResolvedAppearance,
} from './appearance'
import type { NcTheme } from './tokens'

const NcAppearanceContext = createContext<ResolvedAppearance>(resolveAppearance())

/** Resolved appearance from the nearest NcRoot. */
export function useNcAppearance(): ResolvedAppearance {
  return useContext(NcAppearanceContext)
}

/** Default Col gap from appearance.layout.gap. */
export function useNcGap() {
  return useNcAppearance().layout.gap
}

/**
 * Provides appearance config to IntelligenceCard / Col / Grid.
 * Used internally by NcRoot — prefer configuring via `<NcRoot appearance={…}>`.
 */
export function NcAppearanceProvider({
  appearance,
  theme = 'light',
  className = '',
  children,
}: {
  appearance?: NcAppearance
  theme?: NcTheme
  className?: string
  children: ReactNode
}) {
  const resolved = resolveAppearance(appearance)
  const namedStage = stageClass(resolved.background.stage)
  const customStage = stageStyle(resolved.background.stage)

  return (
    <NcAppearanceContext.Provider value={resolved}>
      <div
        className={`nc ${namedStage ?? ''} ${className}`.trim()}
        data-theme={theme}
        style={{ ...appearanceVars(resolved), ...customStage }}
      >
        {children}
      </div>
    </NcAppearanceContext.Provider>
  )
}
