import { useMemo, useState } from 'react'
import {
  APPEARANCE_PRESETS,
  enumerateAllowedCompositions,
  GRAPH_KINDS,
  Grid,
  MAIN_PARTS,
  NcRoot,
  type NcAppearance,
  type NcAppearancePreset,
  type NcTheme,
} from '../index'
import { AskDemo } from './AskDemo'
import { EXAMPLES, LayoutKitDemo, type ComposedExample } from './examples'

const PAIR_COUNT = enumerateAllowedCompositions().length

const FAMILIES: { id: ComposedExample['family']; title: string; blurb: string }[] = [
  {
    id: 'layout',
    title: 'Layouts',
    blurb: `Every allowed pair × layout (${PAIR_COUNT}): stack for light+heavy / full-width; split only for balanced medium/heavy pairs. Lone kpi never splits beside a chart.`,
  },
  {
    id: 'mains',
    title: 'Main parts',
    blurb: `Singles + finding-only. Allowlist: ${MAIN_PARTS.join(' · ')}. At most one of kpi / kpi_strip; max two mains per card.`,
  },
  {
    id: 'graph',
    title: 'Graph',
    blurb: `One main type. Supported kinds: ${GRAPH_KINDS.join(', ')}.`,
  },
]

const PRESET_LABELS: Record<NcAppearancePreset, string> = {
  default: 'Default',
  compact: 'Compact',
  airy: 'Airy',
  meshAlways: 'Mesh always',
  flatTile: 'Flat tile',
  inkStage: 'Ink stage',
}

/**
 * Preview gallery — appearance (background + layout) is configurable on NcRoot.
 * Open at /new-catalog.html
 */
export function Preview() {
  const [theme, setTheme] = useState<NcTheme>('light')
  const [preset, setPreset] = useState<NcAppearancePreset>('default')
  const appearance = useMemo<NcAppearance>(() => APPEARANCE_PRESETS[preset], [preset])

  return (
    <NcRoot theme={theme} appearance={appearance} className="min-h-full">
      <div className="mx-auto max-w-[68.75rem] px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 font-nc-mono text-[0.6875rem] tracking-wide text-nc-ink-3 uppercase">New catalog</p>
            <h1 className="m-0 font-nc-display text-3xl font-[300] tracking-[-0.03em] text-nc-ink sm:text-4xl">
              Card visualizations
            </h1>
            <p className="mt-2 max-w-[54ch] font-nc-ui text-[0.90625rem] text-nc-ink-2">
              Finding + up to two mains. Pairings follow a hard allowlist — Layouts shows every legal stack and split.{' '}
              <a href="/lab.html" className="text-nc-ink underline-offset-2 hover:underline">
                Open component lab
              </a>
            </p>
            <div className="mt-3">
              <LayoutKitDemo />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="inline-flex rounded-full bg-nc-tile p-0.5" role="group" aria-label="Theme">
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={theme === t}
                  className={`h-8 rounded-full px-3 text-xs capitalize ${
                    theme === t ? 'bg-nc-surface text-nc-ink shadow-sm' : 'bg-transparent text-nc-ink-2'
                  }`}
                  onClick={() => setTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-[0.75rem] text-nc-ink-2">
              <span className="font-nc-mono text-[0.6875rem] text-nc-ink-3">appearance</span>
              <select
                className="h-8 rounded-full border-0 bg-nc-tile px-3 text-xs text-nc-ink outline-none"
                value={preset}
                onChange={(e) => setPreset(e.target.value as NcAppearancePreset)}
              >
                {(Object.keys(PRESET_LABELS) as NcAppearancePreset[]).map((k) => (
                  <option key={k} value={k}>
                    {PRESET_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <AskDemo />

        {FAMILIES.map((fam) => {
          const items = EXAMPLES.filter((e) => e.family === fam.id)
          if (!items.length) return null
          return (
            <section key={fam.id} className="mb-10">
              <div className="mb-4">
                <h2 className="m-0 font-nc-display text-xl font-normal tracking-[-0.02em] text-nc-ink">{fam.title}</h2>
                <p className="mt-1 mb-0 text-[0.78125rem] text-nc-ink-3">{fam.blurb}</p>
              </div>
              <Grid gap={6}>
                {items.map((ex) => (
                  <section key={ex.id} id={ex.id} className="min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-2 font-nc-mono text-[0.6875rem] text-nc-ink-3">
                      <span>
                        {ex.id}
                        {ex.pair ? (
                          <span className="ml-2 text-nc-ink-2">
                            {ex.pair.layout} · {ex.pair.a} + {ex.pair.b}
                          </span>
                        ) : ex.graphKind ? (
                          <span className="ml-2 text-nc-ink-2">graph · {ex.graphKind}</span>
                        ) : null}
                      </span>
                      <span className="text-nc-ink-2">{ex.label}</span>
                    </div>
                    {ex.render()}
                  </section>
                ))}
              </Grid>
            </section>
          )
        })}
      </div>
    </NcRoot>
  )
}
