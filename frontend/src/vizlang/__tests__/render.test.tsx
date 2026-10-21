import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import * as Viz from '../../components/visualization'
import { ERRORS_PRESET, EXAMPLE_PROGRAMS, PRESET_PROGRAMS } from '../fixtures/programs'
import { labData } from '../fixtures/labData'
import { registryMismatches, RENDERERS, type ResolvedImage } from '../render'
import { compile } from '../compile'
import { imageJobs } from '../images'
import type { ComponentNode } from '../values'
import { VizProgram } from '../VizProgram'

const ALL = [...EXAMPLE_PROGRAMS, ...PRESET_PROGRAMS]

const html = (source: string, streaming = false, resolved?: Record<string, ResolvedImage | null>) =>
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

  it('lists image jobs with the same keys the renderer reads', () => {
    const src = 'root = Col([photo, group, Card([AsyncImage("inline " + "pot")])])\nphoto = AsyncImage("jebena on charcoal")\ngroup = AsyncImageGroup(["a cup", 3])'
    const { root } = compile(src, { data: labData })
    expect(imageJobs(root)).toEqual([
      { key: 'photo', query: 'jebena on charcoal' },
      { key: 'group.0', query: 'a cup' },
      { key: 'group.1', query: '3' },
      { key: 'root.children.2.children.0', query: 'inline pot' },
    ])
    expect(imageJobs(compile('root = Col([later])', { streaming: true }).root)).toEqual([])
  })

  it('patches resolved image URLs in by node key', () => {
    const src = 'root = Col([photo, group])\nphoto = AsyncImage("jebena on charcoal")\ngroup = AsyncImageGroup(["a cup", "a pot"])'
    const out = html(src, false, {
      photo: { src: 'https://img.example/p.jpg', fallback: 'https://tse.example/p' },
      'group.1': { src: 'https://img.example/pot.jpg' },
      'group.0': null,
    })
    expect(out).toContain('https://img.example/p.jpg')
    expect(out).toContain('https://img.example/pot.jpg')
    expect(out).toContain('No matching photo')
    expect(out).not.toContain('Searching for “a cup”')
    expect(out).not.toContain('Searching for “jebena on charcoal”')
  })

  it('binds NumberInput, DatePicker and Rating to their $variables', () => {
    const state: Record<string, unknown> = { guests: 8, from: '2026-11-02', to: '2026-11-06', stars: 2 }
    const ctx = { state, set: (k: string, v: unknown) => { state[k] = v }, onSend: () => {} }
    const adapt = (name: string, src: string) => {
      const root = compile(src, { data: labData }).root as ComponentNode
      expect(root.name).toBe(name)
      return RENDERERS[name].adapt!(root.props, root, ctx)
    }

    const num = adapt('NumberInput', '$guests = 8\nroot = NumberInput($guests, min: 1, max: 40)')
    expect(num.value).toBe(8)
    ;(num.onChange as (v: number) => void)(12)
    expect(state.guests).toBe(12)

    const dates = adapt('DatePicker', '$from = "2026-11-02"\n$to = "2026-11-06"\nroot = DatePicker($from, end: $to)')
    expect([dates.value, dates.end]).toEqual(['2026-11-02', '2026-11-06'])
    ;(dates.onChange as (v: string) => void)('2026-11-03')
    ;(dates.onEndChange as (v: string) => void)('2026-11-09')
    expect([state.from, state.to]).toEqual(['2026-11-03', '2026-11-09'])
    expect(adapt('DatePicker', '$from = "2026-11-02"\nroot = DatePicker($from)')).not.toHaveProperty('onEndChange')

    const rate = adapt('Rating', '$stars = 2\nroot = Rating(rate: $stars)')
    expect(rate.value).toBe(2)
    ;(rate.onChange as (v: number) => void)(4)
    expect(state.stars).toBe(4)
    const shown = adapt('Rating', 'root = Rating(4.6)')
    expect(shown.value).toBe(4.6)
    expect(shown).not.toHaveProperty('onChange')
  })

  it('renders Rating with a literal value as display-only and a bound one as clickable', () => {
    const shown = html('root = Rating(4.6)')
    expect(shown).toContain('4.6')
    expect(shown).not.toContain('<button')
    expect(html('$stars = 3\nroot = Rating(rate: $stars)').match(/<button/g)).toHaveLength(5)
  })

  it('disables the NumberInput steppers at its limits', () => {
    const atMin = html('$n = 1\nroot = NumberInput($n, min: 1, max: 3)')
    expect(atMin).toMatch(/aria-label="Decrease" disabled=""/)
    expect(atMin).not.toMatch(/aria-label="Increase" disabled=""/)
    expect(html('$n = 3\nroot = NumberInput($n, min: 1, max: 3)')).toMatch(/aria-label="Increase" disabled=""/)
  })

  it('resolves ProductGrid item photos by item index', () => {
    const src = 'root = ProductGrid(shop)\nshop = [{name: "A", image: "laptop a", price: 10}, {name: "B"}, {name: "C", image: "laptop c"}]'
    expect(imageJobs(compile(src).root)).toEqual([
      { key: 'root.0', query: 'laptop a' },
      { key: 'root.2', query: 'laptop c' },
    ])
    const out = html('root = ProductGrid([{name: "A", image: "laptop a"}, {name: "C", image: "laptop c"}])', false, {
      'root.0': { src: 'https://img.example/a.jpg' },
      'root.1': null,
    })
    expect(out).toContain('https://img.example/a.jpg')
    expect(out).toContain('No matching photo')
  })
})
