import type { PairLayout, Severity, VizPayload } from '../index'

/** Editable recipe that the lab renders into real components. */
export type LabShell = {
  sources?: string[]
  updated?: string
  severity?: Severity
  attention?: boolean
}

export type LabFinding = {
  headline: string
  takeaway?: string
  bullets?: string[]
}

/** One main slot: a viz payload (kpi / table / graph kind, etc.). */
export type LabMain = {
  /** Allowlist main part — `graph` when viz.component is a chart kind. */
  part: 'kpi' | 'kpi_strip' | 'ranked_list' | 'table' | 'graph'
  viz: VizPayload
}

/**
 * Full card recipe.
 * - Atoms: often `shell` + `finding` optional + single `mains[0]`, or finding-only.
 * - Compositions: finding + layout + up to two mains.
 * - Foldable: Signal Drawer Simplified — brief when closed, full finding+mains when open.
 */
export type LabRecipe = {
  shell?: LabShell
  finding?: LabFinding
  /** How mains are placed. `none` = finding only / bare atom without pairing. */
  layout: PairLayout | 'none'
  divider?: string
  mains: LabMain[]
  /** Progressive disclosure — collapsed brief, expand for finding + mains + footer. */
  foldable?: boolean
  /** Short copy while folded. Defaults to finding headline/takeaway when omitted. */
  brief?: { headline: string; takeaway?: string }
}

export type LabItem = {
  id: string
  group: 'chrome' | 'finding' | 'main' | 'graph' | 'composition'
  label: string
  blurb: string
  recipe: LabRecipe
}
