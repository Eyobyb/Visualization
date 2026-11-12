import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import {
  diffStyle, isLeaf, resolveStyle, STYLE_SHAPE, StyleError, validateStyle, VizBoundary, VizRoot,
  type Mode, type StyleLeaf, type StyleShape, type VizStyle,
} from '../components/visualization'
import { BUILT_IN_PACKS, builtInBase, deleteCustomStyle, saveCustomStyle, useCustomStyles, useStylePacks } from '../lib/customStyles'
import * as Examples from './examples'
import { notify } from './toast'

const EXAMPLES = Examples as unknown as Record<string, ComponentType>

/** Catalog examples the preview renders, chosen to touch every token at least once. Wide ones span the canvas. */
const PREVIEW: { names: string[]; wide?: boolean }[] = [
  { names: ['Title_', 'MultiKpiCard_', 'Chart_line_two_series'], wide: true },
  { names: ['Summary_', 'Verdict_', 'WeatherCard_', 'ChoiceChips_sends_to_the_model', 'Form_', 'Callout_', 'Badge_', 'Button_', 'Code_', 'Skeleton_', 'Empty_'] },
  { names: ['Table_', 'ProductGrid_'], wide: true },
]

const FONT_PRESETS: [string, string][] = [
  ['Inter / system', 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'],
  ['System UI', 'ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif'],
  ['IBM Plex Sans', '"IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif'],
  ['Nunito', 'Nunito, "Avenir Next", Avenir, ui-rounded, "Segoe UI", system-ui, sans-serif'],
  ['Atkinson Hyperlegible', '"Atkinson Hyperlegible", Inter, ui-sans-serif, system-ui, sans-serif'],
  ['Source Serif 4', '"Source Serif 4", "Iowan Old Style", Georgia, serif'],
  ['Georgia', 'Georgia, "Times New Roman", serif'],
  ['IBM Plex Mono', '"IBM Plex Mono", ui-monospace, Menlo, monospace'],
  ['System mono', 'ui-monospace, "SFMono-Regular", Menlo, monospace'],
]

const SECTIONS: { key: string; title: string; open?: boolean }[] = [
  { key: 'colors', title: 'Colors', open: true },
  { key: 'fonts', title: 'Typography', open: true },
  { key: 'radius', title: 'Corners' },
  { key: 'spacing', title: 'Spacing' },
  { key: 'effects', title: 'Glass effect' },
  { key: 'placeholders', title: 'Placeholders' },
  { key: 'labels', title: 'Labels' },
]

const DRAFT_KEY = 'viz-theme-draft'
const NAME_RE = /^[a-z0-9][a-z0-9-]*$/

type Path = string[]
type Draft = { base: string; style: VizStyle }

const humanize = (k: string) => k.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T

function getAt(o: unknown, path: Path): unknown {
  return path.reduce<unknown>((v, k) => (v as Record<string, unknown> | undefined)?.[k], o)
}

function setAt<T>(o: T, path: Path, value: unknown): T {
  if (!path.length) return value as T
  const [k, ...rest] = path
  const cur = o as Record<string, unknown>
  return { ...cur, [k]: setAt(cur[k], rest, value) } as T
}

/** `#abc` and `#aabbcc` to the `#aabbcc` form `<input type="color">` needs; null for anything else. */
function hex6(v: string): string | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v.trim())
  if (!m) return null
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return '#' + h.toLowerCase()
}

function starter(packs: Record<string, VizStyle>, base: string): VizStyle {
  const from = clone(packs[base] ?? BUILT_IN_PACKS.default)
  if (base in BUILT_IN_PACKS) {
    from.name = base === 'default' ? 'my-theme' : 'my-' + base
    from.label = base === 'default' ? 'My theme' : 'My ' + from.label
    from.description = `Started from ${packs[base]?.label ?? base}.`
  }
  return from
}

function loadDraft(packs: Record<string, VizStyle>): Draft {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null') as Draft | null
    if (d && typeof d.base === 'string' && validateStyle(d.style).length === 0) return d
  } catch {
    /* ignore a broken draft */
  }
  return { base: 'default', style: starter(packs, 'default') }
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const h = hex6(value)
  return (
    <span className="tb-color">
      <label className="tb-swatch" style={{ background: value }} title={h ? 'Pick a color' : 'Not a hex color; type to change'}>
        <input type="color" value={h ?? '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} />
      </label>
      <input className="tb-input mono" value={value} spellCheck={false} onChange={(e) => onChange(e.target.value)} />
    </span>
  )
}

function FontField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const preset = FONT_PRESETS.find(([, v]) => v === value)
  return (
    <span className="tb-font">
      <select className="tb-input" value={preset ? preset[1] : ''} onChange={(e) => e.target.value && onChange(e.target.value)}>
        {!preset && <option value="">Custom stack</option>}
        {FONT_PRESETS.map(([label, v]) => <option key={label} value={v}>{label}</option>)}
      </select>
      <input className="tb-input mono" value={value} spellCheck={false} onChange={(e) => onChange(e.target.value)} />
    </span>
  )
}

function NumberField({ leaf, value, onChange }: { leaf: Extract<StyleLeaf, { t: 'number' }>; value: number; onChange: (v: number) => void }) {
  const step = leaf.integer ? (leaf.max >= 900 && leaf.min >= 100 ? 100 : 1) : leaf.max - leaf.min <= 3 ? 0.05 : 0.5
  return (
    <span className="tb-num">
      <input type="range" min={leaf.min} max={leaf.max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
      <input className="tb-input mono" type="number" min={leaf.min} max={leaf.max} step={step} value={value} onChange={(e) => onChange(e.target.value === '' ? NaN : +e.target.value)} />
    </span>
  )
}

function FacesField({ value, onChange }: { value: VizStyle['fonts']['faces']; onChange: (v: VizStyle['fonts']['faces']) => void }) {
  const set = (i: number, k: 'family' | 'src' | 'weight', v: string) =>
    onChange(value.map((f, j) => {
      if (j !== i) return f
      const next = { ...f, [k]: v }
      if (k === 'weight' && !v) delete next.weight
      return next
    }))
  return (
    <div className="tb-faces">
      {value.map((f, i) => (
        <div key={i} className="tb-face">
          <input className="tb-input" placeholder="Family, e.g. Brand Sans" value={f.family} onChange={(e) => set(i, 'family', e.target.value)} />
          <input className="tb-input mono" placeholder="Font file URL (.woff2)" value={f.src} onChange={(e) => set(i, 'src', e.target.value)} />
          <input className="tb-input mono" placeholder="Weight, e.g. 400 700" value={f.weight ?? ''} onChange={(e) => set(i, 'weight', e.target.value)} />
          <button type="button" className="lab-btn" onClick={() => onChange(value.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      <button type="button" className="lab-btn" onClick={() => onChange([...value, { family: '', src: '' }])}>Add a font file</button>
    </div>
  )
}

function Field({ path, leaf, value, onChange }: { path: Path; leaf: StyleLeaf; value: unknown; onChange: (v: unknown) => void }) {
  const key = path[path.length - 1]
  let control: ReactNode
  if (leaf.t === 'string' && leaf.color) control = <ColorField value={String(value ?? '')} onChange={onChange} />
  else if (leaf.t === 'string' && path[0] === 'fonts') control = <FontField value={String(value ?? '')} onChange={onChange} />
  else if (leaf.t === 'string') control = <input className="tb-input" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
  else if (leaf.t === 'number') control = <NumberField leaf={leaf} value={value as number} onChange={onChange} />
  else if (leaf.t === 'enum') {
    control = (
      <span className="lab-seg" role="radiogroup" aria-label={humanize(key)}>
        {leaf.values.map((v) => <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>{v}</button>)}
      </span>
    )
  } else if (leaf.t === 'colors') {
    const list = (value as string[]) ?? []
    control = (
      <span className="tb-series">
        {list.map((c, i) => (
          <label key={i} className="tb-swatch lg" style={{ background: c }} title={`Series ${i + 1}: ${c}`}>
            <input type="color" value={hex6(c) ?? '#000000'} onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value.toUpperCase() : x)))} />
          </label>
        ))}
      </span>
    )
  } else control = <FacesField value={(value as VizStyle['fonts']['faces']) ?? []} onChange={onChange} />
  return (
    <div className={'tb-field' + (leaf.t === 'faces' ? ' wide' : '')}>
      <div className="tb-field-h">
        <span className="tb-field-name">{humanize(key)}</span>
        <span className="tb-field-desc">{leaf.desc}</span>
      </div>
      {control}
    </div>
  )
}

function Section({ title, shape, path, style, onChange, open, filter }: {
  title: string
  shape: StyleShape
  path: Path
  style: VizStyle
  onChange: (path: Path, v: unknown) => void
  open?: boolean
  filter?: string
}) {
  const q = filter?.trim().toLowerCase()
  const entries = Object.entries(shape).filter(([k, s]) => !q || (isLeaf(s) && `${k} ${s.desc} ${String(getAt(style, [...path, k]))}`.toLowerCase().includes(q)))
  return (
    <details className="lab-panel tb-section" open={open}>
      <summary className="lab-panel-h">{title}</summary>
      <div className="lab-panel-b">
        {entries.map(([k, s]) => (isLeaf(s)
          ? <Field key={k} path={[...path, k]} leaf={s} value={getAt(style, [...path, k])} onChange={(v) => onChange([...path, k], v)} />
          : null))}
        {!entries.length && <p className="lab-note">Nothing matches “{filter}”.</p>}
      </div>
    </details>
  )
}

function Preview({ style, mode, width }: { style: VizStyle; mode: Mode; width: 'wide' | 'chat' }) {
  return (
    <VizRoot theme={mode} stylePack={style} className={'tb-canvas ' + width}>
      {PREVIEW.map((group, g) => (
        <div key={g} className={group.wide ? 'tb-stack' : 'tb-grid'}>
          {group.names.filter((n) => EXAMPLES[n]).map((n) => {
            const Example = EXAMPLES[n]
            return (
              <div key={n} className="tb-item">
                <VizBoundary name={n.replace(/_.*$/, '')}><Example /></VizBoundary>
              </div>
            )
          })}
        </div>
      ))}
    </VizRoot>
  )
}

/**
 * Builds a style pack: start from any pack, change tokens with live controls, preview real components in
 * both modes, then save it to this browser (it joins every style list) or export a JSON file for VIZ_STYLE.
 */
export function ThemeBuilder() {
  const packs = useStylePacks()
  const custom = useCustomStyles()
  const [draft, setDraft] = useState<Draft>(() => loadDraft(packs))
  const [mode, setMode] = useState<Mode>('light')
  const [width, setWidth] = useState<'wide' | 'chat'>('wide')
  const [labelFilter, setLabelFilter] = useState('')
  const [importText, setImportText] = useState('')
  const [importErrors, setImportErrors] = useState<string[]>([])
  const { style, base } = draft

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft])

  const problems = useMemo(() => {
    const p = validateStyle(style)
    if (!NAME_RE.test(style.name)) p.unshift('name: use lowercase letters, digits and dashes, such as acme-dark')
    else if (style.name in BUILT_IN_PACKS) p.unshift(`name: "${style.name}" is a built-in pack; pick another name`)
    return p
  }, [style])

  const saved = custom[style.name]
  const dirty = !saved || JSON.stringify(saved.style) !== JSON.stringify(style)
  const exportBase = builtInBase(base, custom)
  const exported = useMemo(() => JSON.stringify(diffStyle(style, BUILT_IN_PACKS[exportBase]), null, 2) + '\n', [style, exportBase])

  const change = (path: Path, v: unknown) => setDraft((d) => ({ ...d, style: setAt(d.style, path, v) }))

  const startFrom = (name: string) => {
    if (dirty && !window.confirm('Start over from this pack? Unsaved changes to the current theme are lost.')) return
    setDraft({ base: name in custom ? custom[name].base : name, style: starter(packs, name) })
    setImportErrors([])
  }

  const save = () => {
    saveCustomStyle({ base, style })
    notify(`Saved “${style.label}”. Pick it from any Style list.`)
  }

  const remove = () => {
    if (!window.confirm(`Delete “${style.label}” from this browser?`)) return
    deleteCustomStyle(style.name)
    notify(`Deleted “${style.label}”`)
  }

  const runImport = () => {
    try {
      const file = JSON.parse(importText) as { extends?: string | null; name?: string }
      const next = resolveStyle(file, packs, 'the pasted file', 'imported')
      setDraft({ base: typeof file.extends === 'string' ? file.extends : 'default', style: next })
      setImportErrors([])
      setImportText('')
      notify(`Imported “${next.label}”`)
    } catch (e) {
      setImportErrors(e instanceof StyleError ? e.problems : [e instanceof Error ? e.message : String(e)])
    }
  }

  const copyExport = () =>
    navigator.clipboard?.writeText(exported).then(() => notify('Copied the style file'), () => notify('Copy failed'))

  const colorShape = (STYLE_SHAPE.colors as StyleShape)[mode] as StyleShape

  return (
    <div className="tb">
      <div className="tb-edit">
        <section className="lab-panel">
          <div className="lab-panel-h tb-static">Theme</div>
          <div className="lab-panel-b">
            <label className="tb-row">
              <span>Start from</span>
              <select className="lab-select" value="" onChange={(e) => e.target.value && startFrom(e.target.value)}>
                <option value="">Choose a pack…</option>
                <optgroup label="Built in">
                  {Object.values(BUILT_IN_PACKS).map((s) => <option key={s.name} value={s.name}>{s.label}</option>)}
                </optgroup>
                {Object.keys(custom).length > 0 && (
                  <optgroup label="Your themes">
                    {Object.values(custom).map((c) => <option key={c.style.name} value={c.style.name}>{c.style.label}</option>)}
                  </optgroup>
                )}
              </select>
            </label>
            <label className="tb-row"><span>Name</span><input className="tb-input mono" value={style.name} spellCheck={false} onChange={(e) => change(['name'], e.target.value.toLowerCase())} /></label>
            <label className="tb-row"><span>Label</span><input className="tb-input" value={style.label} onChange={(e) => change(['label'], e.target.value)} /></label>
            <label className="tb-row"><span>Description</span><input className="tb-input" value={style.description} onChange={(e) => change(['description'], e.target.value)} /></label>
            <p className="lab-note">Based on <b>{packs[base]?.label ?? base}</b>{saved ? (dirty ? ' · unsaved changes' : ' · saved') : ' · not saved yet'}</p>
            {problems.length > 0 && <ul className="tb-problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
            <div className="tb-actions">
              <button type="button" className="lab-btn tb-primary" disabled={problems.length > 0 || !dirty} onClick={save}>{saved ? 'Save changes' : 'Save theme'}</button>
              <button type="button" className="lab-btn" disabled={problems.length > 0} onClick={copyExport}>Copy JSON</button>
              <button type="button" className="lab-btn" disabled={problems.length > 0} onClick={() => download(style.name + '.json', exported)}>Download</button>
              {saved && <button type="button" className="lab-btn" onClick={remove}>Delete</button>}
            </div>
          </div>
        </section>

        <details className="lab-panel tb-section" open>
          <summary className="lab-panel-h">Colors</summary>
          <div className="lab-panel-b">
            <div className="tb-row">
              <span>Editing</span>
              <span className="lab-seg" role="radiogroup" aria-label="Palette">
                {(['light', 'dark'] as const).map((m) => <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}>{m === 'light' ? 'Light palette' : 'Dark palette'}</button>)}
              </span>
            </div>
            {Object.entries(colorShape).map(([k, s]) => isLeaf(s) && (
              <Field key={mode + k} path={['colors', mode, k]} leaf={s} value={getAt(style, ['colors', mode, k])} onChange={(v) => change(['colors', mode, k], v)} />
            ))}
          </div>
        </details>

        {SECTIONS.filter((s) => s.key !== 'colors').map((s) => (
          <div key={s.key} className="tb-section-wrap">
            {s.key === 'labels' && (
              <input className="tb-input tb-filter" type="search" placeholder="Filter labels, e.g. weather or Show all" value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)} />
            )}
            <Section title={s.title} shape={STYLE_SHAPE[s.key] as StyleShape} path={[s.key]} style={style} onChange={change} open={s.open || (s.key === 'labels' && !!labelFilter)} filter={s.key === 'labels' ? labelFilter : undefined} />
          </div>
        ))}

        <details className="lab-panel tb-section">
          <summary className="lab-panel-h">Export and import</summary>
          <div className="lab-panel-b">
            <p className="lab-note">
              The file lists only what differs from <b>{BUILT_IN_PACKS[exportBase].label}</b>. Save it in your project and start the package
              with <code>VIZ_STYLE=./{style.name}.json</code>.
            </p>
            <pre className="tb-json">{exported}</pre>
            <textarea className="tb-input mono tb-import" rows={6} placeholder="Paste a style JSON file to load it here" value={importText} onChange={(e) => setImportText(e.target.value)} />
            {importErrors.length > 0 && <ul className="tb-problems">{importErrors.map((p) => <li key={p}>{p}</li>)}</ul>}
            <div className="tb-actions"><button type="button" className="lab-btn" disabled={!importText.trim()} onClick={runImport}>Import</button></div>
          </div>
        </details>
      </div>

      <div className="tb-view">
        <div className="tb-view-bar">
          <span className="lab-seg" role="radiogroup" aria-label="Preview mode">
            {(['light', 'dark'] as const).map((m) => <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}>{m === 'light' ? 'Light' : 'Dark'}</button>)}
          </span>
          <span className="lab-seg" role="radiogroup" aria-label="Preview width">
            {(['wide', 'chat'] as const).map((w) => <button key={w} type="button" role="radio" aria-checked={width === w} onClick={() => setWidth(w)}>{w === 'wide' ? 'Wide' : 'Chat width'}</button>)}
          </span>
          <span className="lab-note">{style.label}</span>
        </div>
        {validateStyle(style).length === 0
          ? <Preview style={style} mode={mode} width={width} />
          : <p className="lab-note pad">Fix the problems on the left to see the preview.</p>}
      </div>
    </div>
  )
}
