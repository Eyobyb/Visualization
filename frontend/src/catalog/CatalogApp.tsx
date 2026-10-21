import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import docs, { type ComponentDoc, type ExampleDoc } from 'virtual:viz-docs'
import { SELECTED_STYLE, STYLE_PACKS, VizBoundary, VizRoot, type VizStyle } from '../components/visualization'
import * as Examples from './examples'
import { Playground } from './Playground'
import { notify, useToast } from './toast'

/** Built-in packs, plus the VIZ_STYLE file when it is not one of them. */
const PACKS: Record<string, VizStyle> = { ...STYLE_PACKS, [SELECTED_STYLE.name]: STYLE_PACKS[SELECTED_STYLE.name] ?? SELECTED_STYLE }

type View = 'components' | 'playground'
const PLAYGROUND_HASH = '#playground'
const viewFromHash = (): View => (window.location.hash === PLAYGROUND_HASH ? 'playground' : 'components')

const EXAMPLES = Examples as unknown as Record<string, ComponentType>

const GETTING_STARTED = `import { VizRoot, Card, Chart } from './components/visualization'

export function RevenueByRegion({ rows }: { rows: { region: string; revenue: number }[] }) {
  return (
    <VizRoot>
      <Card title="Revenue by region" icon="chart">
        <Chart type="hbar" data={rows} x="region" y="revenue" format="currency" />
      </Card>
    </VizRoot>
  )
}`

/** Turns `code` spans in docstrings into <code> elements. */
function inlineCode(text: string): ReactNode {
  return text.split(/(`[^`]+`)/g).map((p, i) => (p.startsWith('`') && p.endsWith('`') && p.length > 2 ? <code key={i}>{p.slice(1, -1)}</code> : p))
}

function copy(text: string, what: string) {
  navigator.clipboard?.writeText(text).then(() => notify(`Copied ${what}`), () => notify('Copy failed'))
}

function Mark() {
  return (
    <svg width={30} height={30} viewBox="0 0 30 30" aria-hidden className="lab-mark">
      <rect x={3} y={4} width={11} height={9} rx={2.5} className="m1" />
      <rect x={16} y={4} width={11} height={9} rx={2.5} className="m2" />
      <rect x={3} y={15} width={24} height={11} rx={2.5} className="m3" />
      <path d="M7 22.5l4-3.5 3.5 2.5 5-4.5 3.5 3" className="m4" />
    </svg>
  )
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="lab-code-wrap">
      <button type="button" className="lab-code-copy" onClick={() => copy(code, label)}>Copy</button>
      <pre>{code}</pre>
    </div>
  )
}

function PropsTable({ doc }: { doc: ComponentDoc }) {
  if (!doc.props.length) return <p className="lab-note">No props.</p>
  return (
    <div className="lab-props-wrap">
      <table className="lab-props">
        <thead><tr><th>Prop</th><th>Type</th><th>Default</th></tr></thead>
        <tbody>
          {doc.props.map((p) => (
            <tr key={p.name}>
              <td>
                <code>{p.name}</code>
                {p.required && <span className="lab-req" title="Required">*</span>}
                {p.description && <div className="lab-pdesc">{inlineCode(p.description)}</div>}
              </td>
              <td className="ty">{p.type}</td>
              <td>{p.default ? <code>{p.default}</code> : <span className="lab-dim">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Demo({ example, theme }: { example: ExampleDoc; theme: 'light' | 'dark' }) {
  const Example = EXAMPLES[example.name]
  return (
    <div className="lab-ex">
      {example.label && <div className="lab-ex-label">{example.label}</div>}
      <div className="demo-frame">
        <VizRoot theme={theme}>
          <VizBoundary name={example.component}>{Example ? <Example /> : null}</VizBoundary>
        </VizRoot>
      </div>
      <details className="lab-ex-src" open>
        <summary>Usage</summary>
        <CodeBlock code={example.code} label={`${example.component} example`} />
      </details>
    </div>
  )
}

function ComponentCard({ doc, examples, theme }: { doc: ComponentDoc; examples: ExampleDoc[]; theme: 'light' | 'dark' }) {
  return (
    <article className="lab-comp" id={doc.name}>
      <div className="lab-comp-info">
        <h3 className="lab-comp-name">
          <a href={'#' + doc.name}>{doc.name}</a>
          <span className="lab-fam-tag">{doc.family}</span>
        </h3>
        <p className="lab-comp-desc">{inlineCode(doc.description.replace(/\n+/g, ' '))}</p>
        <PropsTable doc={doc} />
      </div>
      <div className="lab-comp-demo">
        {examples.length ? examples.map((e) => <Demo key={e.name} example={e} theme={theme} />) : <p className="lab-note pad">No example yet. Add one to src/catalog/examples.tsx.</p>}
      </div>
    </article>
  )
}

/**
 * Browsable reference for `src/components/visualization`: every exported component with its docstring,
 * a props table generated from its types, and live examples with their source.
 */
export function CatalogApp() {
  const [family, setFamily] = useState('All')
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [view, setView] = useState<View>(viewFromHash)
  const [style, setStyle] = useState<VizStyle>(() => PACKS[new URLSearchParams(window.location.search).get('style') ?? ''] ?? SELECTED_STYLE)
  const toast = useToast()

  const pickStyle = (name: string) => {
    setStyle(PACKS[name])
    const url = new URL(window.location.href)
    url.searchParams.set('style', name)
    history.replaceState(null, '', url)
  }

  useEffect(() => {
    const sync = () => setView(viewFromHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const openView = (v: View) => {
    setView(v)
    history.pushState(null, '', v === 'playground' ? PLAYGROUND_HASH : window.location.pathname + window.location.search)
  }

  const examplesFor = useMemo(() => {
    const m = new Map<string, ExampleDoc[]>()
    for (const e of docs.examples) m.set(e.component, [...(m.get(e.component) ?? []), e])
    return m
  }, [])
  const q = query.trim().toLowerCase()
  const visible = docs.components.filter((c) =>
    (family === 'All' || c.family === family) && (!q || `${c.name} ${c.description}`.toLowerCase().includes(q)))

  return (
    <VizRoot theme={theme} stylePack={style} className="lab">
      <header className="lab-top">
        <div className="lab-brand">
          <Mark />
          <div>
            <h1>Viz Catalog</h1>
            <p>{docs.components.length} components in <code>src/components/visualization</code>, with props read from their types and docstrings</p>
          </div>
        </div>
        <div className="lab-top-actions">
          <div className="lab-seg" role="radiogroup" aria-label="View">
            {(['components', 'playground'] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => openView(v)}>{v === 'components' ? 'Components' : 'Playground'}</button>
            ))}
          </div>
          <div className="lab-seg" role="radiogroup" aria-label="Theme">
            {(['light', 'dark'] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={theme === t} onClick={() => setTheme(t)}>{t === 'light' ? 'Light' : 'Dark'}</button>
            ))}
          </div>
          <select className="lab-select lab-style" aria-label="Style pack" value={style.name} onChange={(e) => pickStyle(e.target.value)}>
            {Object.values(PACKS).map((s) => <option key={s.name} value={s.name} title={s.description}>{s.label}</option>)}
          </select>
          <a className="lab-btn" href="/">Back to the app</a>
        </div>
      </header>

      {view === 'playground' ? (
        <main className="lab-main">
          <p className="lab-note">
            Programs in the viz statement language, compiled in the browser by <code>src/vizlang</code> and drawn with the visualization
            components. <code>data.*</code> reads the sample shop data; press Stream to watch a response arrive a few characters at a time.
          </p>
          <Playground theme={theme} />
        </main>
      ) : (
      <main className="lab-main">
        <details className="lab-panel lab-start">
          <summary className="lab-panel-h">Getting started</summary>
          <div className="lab-panel-b">
            <p className="lab-note">
              Import from <code>components/visualization</code> and render inside <code>VizRoot</code>, which provides the theme and the
              container the responsive grids measure. Inputs are controlled (<code>value</code> + <code>onChange</code>), and components that
              talk to the model take an <code>onSend(text)</code> callback.
            </p>
            <CodeBlock code={GETTING_STARTED} label="snippet" />
          </div>
        </details>

        <div className="lab-gal">
          <aside className="lab-side">
            <label className="lab-search">
              <input type="search" placeholder="Find a component" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find a component" />
            </label>
            <div className="lab-fams" role="group" aria-label="Families">
              {['All', ...docs.families].map((f) => (
                <button key={f} type="button" className="lab-fam" aria-pressed={family === f} onClick={() => setFamily(f)}>
                  {f}
                  <span>{f === 'All' ? docs.components.length : docs.components.filter((c) => c.family === f).length}</span>
                </button>
              ))}
            </div>
          </aside>
          <div className="lab-cards">
            {visible.length
              ? visible.map((c) => <ComponentCard key={c.name} doc={c} examples={examplesFor.get(c.name) ?? []} theme={theme} />)
              : <p className="lab-note">No component matches “{query}”.</p>}
          </div>
        </div>
      </main>
      )}

      {toast && <div className="lab-toast" role="status">{toast}</div>}
    </VizRoot>
  )
}
