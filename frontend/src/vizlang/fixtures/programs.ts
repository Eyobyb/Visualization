import { PRESETS } from '../presets'
import { SPECS } from '../specs'

export interface Program {
  /** `Chart: donut` for a component example, `preset: dashboard` for a preset. */
  id: string
  src: string
}

/** Every component example in the specs, in catalog order. */
export const EXAMPLE_PROGRAMS: Program[] = Object.values(SPECS).flatMap((spec) =>
  spec.examples.map((ex) => ({ id: ex.label ? `${spec.name}: ${ex.label}` : spec.name, src: ex.src })),
)

/** The whole-response presets, except the deliberately broken diagnostics demo. */
export const PRESET_PROGRAMS: Program[] = PRESETS.filter((p) => p.id !== 'errors').map((p) => ({ id: 'preset: ' + p.id, src: p.src }))

export const ERRORS_PRESET = PRESETS.find((p) => p.id === 'errors')!.src
