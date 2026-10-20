import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import * as Viz from '../../components/visualization'
import { ERRORS_PRESET, EXAMPLE_PROGRAMS, PRESET_PROGRAMS } from '../fixtures/programs'
import { labData } from '../fixtures/labData'
import { registryMismatches, RENDERERS } from '../render'
import { VizProgram } from '../VizProgram'

const ALL = [...EXAMPLE_PROGRAMS, ...PRESET_PROGRAMS]

const html = (source: string, streaming = false, resolved?: Record<string, string>) =>
  renderToString(<Viz.VizRoot><VizProgram source={source} data={labData} streaming={streaming} resolved={resolved} /></Viz.VizRoot>)

describe('registry', () => {
  it('has a renderer for every spec and a spec for every renderer', () => {
    expect(registryMismatches()).toEqual([])
  })

  it('renders through real visualization exports', () => {
    const exports = new Set<unknown>(Object.values(Viz))
    for (const [name, r] of Object.entries(RENDERERS)) expect(exports.has(r.component), name).toBe(true)
  })
})

describe('rendering', () => {
  it.each(ALL.map((p) => [p.id, p.src]))('%s renders', (_id, src) => {
    const out = html(src)
    expect(out).not.toContain('failed at runtime')
    expect(out.length).toBeGreaterThan(60)
  })

  it.each(ALL.map((p) => [p.id, p.src]))('%s renders at every line while streaming', (_id, src) => {
    for (let i = src.indexOf('\n'); i !== -1; i = src.indexOf('\n', i + 1)) {
      expect(() => html(src.slice(0, i + 1), true)).not.toThrow()
    }
    for (const n of [5, 30, 90]) expect(() => html(src.slice(0, n), true)).not.toThrow()
  })

  it('renders the dashboard with real numbers, controls and no placeholders', () => {
    const out = html(PRESET_PROGRAMS.find((p) => p.id === 'preset: dashboard')!.src)
    for (const text of ['Q3 sales review', 'Q3 at a glance', 'ETB 4.82M', 'Regions by revenue', 'Top products', 'Habesha kemis']) {
      expect(out).toContain(text)
    }
    expect(out).toContain('role="radiogroup"')
    expect(out).toContain('<svg')
    expect(out).not.toContain('ui-skel')
  })

  it('renders the diagnostics preset with its broken parts dropped', () => {
    const out = html(ERRORS_PRESET)
    expect(out).toContain('Diagnostics demo')
    expect(out).not.toContain('Sparkle')
  })

  it('shows skeletons for pending blocks', () => {
    expect(html('root = Col([title, later])\ntitle = Title("Hi")\n', true)).toContain('ui-skel')
  })

  it('patches resolved image URLs in by node key', () => {
    const src = 'root = Col([photo, group])\nphoto = AsyncImage("jebena on charcoal")\ngroup = AsyncImageGroup(["a cup", "a pot"])'
    const out = html(src, false, { photo: 'https://img.example/p.jpg', 'group.1': 'https://img.example/pot.jpg' })
    expect(out).toContain('https://img.example/p.jpg')
    expect(out).toContain('https://img.example/pot.jpg')
  })
})
