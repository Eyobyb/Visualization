import { describe, expect, it, vi } from 'vitest'
import { compile, type ActionEvent, type Effects } from '../compile'
import { ERRORS_PRESET, EXAMPLE_PROGRAMS, PRESET_PROGRAMS } from '../fixtures/programs'
import { labData } from '../fixtures/labData'
import { isNode, type ComponentNode } from '../values'

const ALL = [...EXAMPLE_PROGRAMS, ...PRESET_PROGRAMS]

/** Depth-first search for the first component node with this name. */
function find(v: unknown, name: string): ComponentNode | undefined {
  if (isNode(v)) {
    if (v.name === name) return v
    return find(Object.values(v.props), name)
  }
  if (Array.isArray(v)) for (const x of v) { const f = find(x, name); if (f) return f }
  else if (v && typeof v === 'object') return find(Object.values(v), name)
  return undefined
}

describe('lab programs', () => {
  it('covers every component example and preset', () => {
    expect(EXAMPLE_PROGRAMS).toHaveLength(64)
    expect(PRESET_PROGRAMS).toHaveLength(6)
  })

  it.each(ALL.map((p) => [p.id, p.src]))('%s compiles cleanly', (_id, src) => {
    const r = compile(src, { data: labData })
    expect(r.diagnostics).toEqual([])
    expect(isNode(r.root)).toBe(true)
  })

  it('reports each deliberate mistake in the diagnostics preset and keeps the rest', () => {
    const r = compile(ERRORS_PRESET, { data: labData })
    expect(r.diagnostics.map((d) => [d.code, d.where])).toEqual([
      ['unknown_prop', 'chart'],
      ['unknown_component', 'sparkle'],
      ['missing_binding', 'stock'],
      ['missing_prop', 'stock'],
      ['invalid_literal', 'tiles'],
      ['missing_prop', 'tiles'],
      ['invalid_literal', 'tiles'],
      ['unresolved_ref', 'root'],
    ])
    expect(r.diagnostics.map((d) => d.msg)).toContain('Chart has no prop "glow", so it was dropped')
    const chart = find(r.root, 'Chart')!
    expect(chart.props).not.toHaveProperty('glow')
    expect(chart.props.type).toBe('bar')
  })
})

describe('streaming', () => {
  const settled = (src: string) => JSON.stringify(compile(src, { data: labData }).root)

  it.each(ALL.map((p) => [p.id, p.src]))('%s streams in prefixes without errors', (_id, src) => {
    for (const step of [1, 7, 40]) {
      for (let n = step; n < src.length; n += step) {
        const r = compile(src.slice(0, n), { data: labData, streaming: true })
        const lasting = r.diagnostics.filter((d) => !d.transient)
        expect(lasting, `after ${n} chars`).toEqual([])
      }
    }
    const final = compile(src + '\n', { data: labData, streaming: true })
    expect(final.diagnostics).toEqual([])
    expect(JSON.stringify(final.root)).toBe(settled(src))
  })

  it('renders forward references as pending until their statement arrives', () => {
    const r = compile('root = Col([title, later])\ntitle = Title("Hi")\nlater = Te', { data: labData, streaming: true })
    const col = r.root as ComponentNode
    expect(col.props.children).toEqual([expect.objectContaining({ name: 'Title' }), expect.objectContaining({ __pending: true })])
    expect(r.diagnostics.map((d) => d.code)).toEqual(['streaming'])
  })
})

describe('state and actions', () => {
  it('overlays user state on declared defaults', () => {
    const src = EXAMPLE_PROGRAMS.find((p) => p.id === 'Slider')!.src
    const text = (state?: Record<string, unknown>) => find(compile(src, { data: labData, userState: state }).root, 'Text')!.props.text
    expect(text()).toBe('Buy 2.1 kg of lamb and 12 injera.')
    expect(text({ guests: 10 })).toBe('Buy 3.5 kg of lamb and 20 injera.')
    expect(compile(src, { userState: { undeclared: 1 } }).state).toEqual({ guests: 6 })
  })

  it('binds inputs to their $variable', () => {
    const r = compile('$on = true\nroot = Switch($on, label: "VAT")')
    expect((r.root as ComponentNode).props.value).toEqual({ $state: 'on' })
  })

  it('runs actions through the effects', () => {
    const events: ActionEvent[] = []
    const effects: Effects = { set: vi.fn(), reset: vi.fn(), event: (e) => events.push(e) }
    const src = '$open = false\nroot = Row([a, b, c])\n'
      + 'a = Button("Ask", onClick: @NewTurn("Why " + $open))\n'
      + 'b = Button("Flip", onClick: [@Toggle($open), @Copy("done")])\n'
      + 'c = Button("Bad", onClick: @Sum([1]))'
    const r = compile(src, { effects })
    const buttons = (r.root as ComponentNode).props.children as ComponentNode[]
    buttons.forEach((b) => (b.props.onClick as () => void)())
    expect(events).toEqual([
      { kind: 'newTurn', text: 'Why false' },
      { kind: 'copy', text: 'done' },
      { kind: 'error', text: 'onClick in "c" is not an action' },
    ])
    expect(effects.set).toHaveBeenCalledWith('open', true)
  })

  it('rejects actions outside handlers and unknown names', () => {
    const r = compile('root = Col([Text(@NewTurn("x")), Text(@Nope(1)), Text($missing)])')
    expect(r.diagnostics.map((d) => d.code)).toEqual(['action_outside_handler', 'missing_prop', 'unknown_function', 'unknown_state'])
  })
})
