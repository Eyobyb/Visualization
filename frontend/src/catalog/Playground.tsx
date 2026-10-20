import { useEffect, useState } from 'react'
import { VizRoot } from '../components/visualization'
import { PRESETS, SPECS, useVizProgram, type ActionEvent } from '../vizlang'
import { labData } from '../vizlang/fixtures/labData'
import { notify } from './toast'

/** Characters revealed per 40 ms tick, matching Catalog Lab. */
const SPEEDS = { slow: 3, normal: 10, fast: 32 } as const
type Speed = keyof typeof SPEEDS

interface Program {
  id: string
  label: string
  src: string
}

const PRESET_OPTIONS: Program[] = PRESETS.map((p) => ({ id: 'preset:' + p.id, label: p.label, src: p.src }))
const EXAMPLE_OPTIONS: Program[] = Object.values(SPECS).flatMap((s) =>
  s.examples.map((ex, i) => ({ id: `${s.name}:${i}`, label: ex.label ? `${s.name} (${ex.label})` : s.name, src: ex.src })))
const ALL_OPTIONS = [...PRESET_OPTIONS, ...EXAMPLE_OPTIONS]

const send = (text: string) => notify('Sent to the model: ' + text)
const onEvent = (e: ActionEvent) => {
  if (e.kind === 'copy') notify('Copied: ' + e.text)
  else if (e.kind === 'open') notify('Opened ' + e.text)
  else if (e.kind === 'error') notify('Action failed: ' + e.text)
}

const show = (v: unknown) => {
  const s = JSON.stringify(v)
  return s === undefined ? String(v) : s
}

/**
 * Edit or pick a program in the viz statement language and watch it compile live, with streaming
 * simulated by revealing the source a few characters at a time.
 */
export function Playground({ theme }: { theme: 'light' | 'dark' }) {
  const [programId, setProgramId] = useState(PRESET_OPTIONS[0].id)
  const [src, setSrc] = useState(PRESET_OPTIONS[0].src)
  const [speed, setSpeed] = useState<Speed>('normal')
  const [shown, setShown] = useState<number | null>(null)
  const streaming = shown !== null && shown < src.length

  useEffect(() => {
    if (!streaming) return
    const id = setInterval(() => setShown((n) => Math.min(src.length, (n ?? 0) + SPEEDS[speed])), 40)
    return () => clearInterval(id)
  }, [streaming, speed, src.length])

  const { result, element, resetState } = useVizProgram({
    source: streaming ? src.slice(0, shown ?? 0) : src,
    data: labData,
    streaming,
    onSend: send,
    onEvent,
  })

  const pick = (id: string) => {
    const p = ALL_OPTIONS.find((o) => o.id === id)
    if (!p) return
    setProgramId(id)
    setSrc(p.src)
    setShown(null)
    resetState()
  }

  const errors = result.diagnostics.filter((d) => !d.transient)
  const stateEntries = Object.entries(result.state)

  return (
    <div className="lab-play">
      <div className="lab-play-left">
        <section className="lab-panel">
          <div className="lab-play-bar">
            <select className="lab-select" value={programId} onChange={(e) => pick(e.target.value)} aria-label="Program">
              <optgroup label="Presets">
                {PRESET_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </optgroup>
              <optgroup label="Component examples">
                {EXAMPLE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </optgroup>
            </select>
            <div className="lab-seg" role="radiogroup" aria-label="Stream speed">
              {(Object.keys(SPEEDS) as Speed[]).map((s) => (
                <button key={s} type="button" role="radio" aria-checked={speed === s} onClick={() => setSpeed(s)}>{s[0].toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
            {streaming
              ? <button type="button" className="lab-btn" onClick={() => setShown(null)}>Stop</button>
              : <button type="button" className="lab-btn primary" onClick={() => { resetState(); setShown(0) }}>Stream</button>}
          </div>
          <textarea
            className="lab-editor"
            value={src}
            onChange={(e) => { setSrc(e.target.value); setShown(null) }}
            spellCheck={false}
            aria-label="Program source"
          />
          {streaming && (
            <div className="lab-progress" aria-label="Stream progress">
              <span style={{ width: `${((shown ?? 0) / src.length) * 100}%` }} />
            </div>
          )}
        </section>

        <section className="lab-panel">
          <div className="lab-panel-h static">
            Diagnostics <span className="lab-count">{errors.length}</span>
            <span className="lab-stats">{result.statements} statements · {result.ms.toFixed(1)} ms</span>
          </div>
          <div className="lab-panel-b">
            {result.diagnostics.length === 0
              ? <p className="lab-note">No problems. Everything validated against the catalog.</p>
              : (
                <ul className="lab-diags">
                  {result.diagnostics.map((d, i) => (
                    <li key={i} className={d.transient ? 'transient' : undefined}>
                      <code>{d.code}</code>
                      <span>{d.msg}</span>
                      <span className="lab-dim">{d.where}</span>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </section>

        <section className="lab-panel">
          <div className="lab-panel-h static">
            State
            {stateEntries.length > 0 && <button type="button" className="lab-link" onClick={resetState}>Reset</button>}
          </div>
          <div className="lab-panel-b">
            {stateEntries.length === 0
              ? <p className="lab-note">This program declares no <code>$variables</code>.</p>
              : (
                <dl className="lab-state">
                  {stateEntries.map(([k, v]) => (
                    <div key={k}><dt>${k}</dt><dd>{show(v)}</dd></div>
                  ))}
                </dl>
              )}
          </div>
        </section>
      </div>

      <section className="lab-panel lab-play-preview">
        <div className="lab-panel-h static">
          Preview
          {streaming && <span className="lab-live">streaming</span>}
        </div>
        <div className="demo-frame">
          <VizRoot theme={theme}>{element}</VizRoot>
        </div>
      </section>
    </div>
  )
}
