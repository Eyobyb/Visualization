import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { StreamEvent } from '../../lib/sse'
import { compile } from '../../vizlang'
import { isNode } from '../../vizlang/values'
import { applyVizEvent, EMPTY_TURN, isVisual, type VizTurnData } from '../turnData'
import { VizTurnView } from '../VizTurnView'

const route = (visual: number): StreamEvent => ({
  type: 'route', visual, layout: 'explainer', interactive: 0.3, hints: ['Use the explainer layout.'],
  layouts: { explainer: 0.98 }, model: 'jev-1.13.0', fallback: false,
})

const results = [
  { id: 'r1', title: 'Selling on Telegram', url: 'https://a.example', snippet: 'Chat commerce' },
  { id: 'r2', title: 'Why a website', url: 'https://b.example', snippet: 'Catalogues' },
]

const statement = (text: string, line: number, name: string, refs: string[] = []): StreamEvent =>
  ({ type: 'statement', name, text, line, refs })

/** A recorded visual turn, as /api/viz/stream sends it. */
const VISUAL: StreamEvent[] = [
  route(0.82),
  { type: 'data', bindings: { results } },
  statement('root = Col([title, picks, sources])', 1, 'root'),
  statement('title = Title("Telegram or a website?", size: "lg")', 2, 'title'),
  statement('$channel = "Telegram"', 3, '$channel'),
  statement('picks = SegmentedControl($channel, options: ["Telegram", "Website"])', 4, 'picks'),
  statement('sources = Sources(data.results)', 5, 'sources', ['results']),
  { type: 'done', diagnostics: [], statements: 5, markdown: '# Telegram or a website?\n', images: [] },
]

/** Folds events the way PlainColumn and useConversation do: turn data via the reducer, text into content. */
function replay(events: StreamEvent[]) {
  let turn: VizTurnData = EMPTY_TURN
  let content = ''
  for (const e of events) {
    turn = applyVizEvent(turn, e)
    if (e.type === 'statement') content += e.text + '\n'
    if (e.type === 'delta') content += e.text
  }
  return { turn, content }
}

const html = (source: string, turn: VizTurnData, streaming = false) =>
  renderToStaticMarkup(<VizTurnView source={source} turn={turn} streaming={streaming} onSend={() => {}} />)

describe('viz stream turns', () => {
  it('collects route, data, statements and done', () => {
    const { turn, content } = replay(VISUAL)
    expect(isVisual(turn)).toBe(true)
    expect(turn.route?.layout).toBe('explainer')
    expect(turn.data).toEqual({ results })
    expect(turn.statements).toBe(5)
    expect(turn.done?.markdown).toBe('# Telegram or a website?\n')

    const r = compile(content, { data: turn.data })
    expect(r.diagnostics).toEqual([])
    expect(isNode(r.root)).toBe(true)
  })

  it('renders the program with data from the bindings', () => {
    const { turn, content } = replay(VISUAL)
    const out = html(content, turn)
    expect(out).toContain('Telegram or a website?')
    expect(out).toContain('https://a.example')
    expect(out).toContain('Website')
  })

  it('renders skeletons for names that have not streamed yet', () => {
    const { turn, content } = replay(VISUAL.slice(0, 4))
    const r = compile(content, { data: turn.data, streaming: true })
    expect(r.diagnostics.filter((d) => !d.transient)).toEqual([])
    expect(html(content, turn, true)).toContain('Telegram or a website?')
  })

  it('keeps server diagnostics reported while streaming', () => {
    const { turn } = replay([route(0.9), { type: 'diagnostic', code: 'unknown_component', msg: 'Sparkle is not in the catalog, so it was dropped', where: 'a' }])
    expect(turn.diagnostics.map((d) => d.code)).toEqual(['unknown_component'])
  })

  it('shows prose as Markdown when Jev routes away from a visual', () => {
    const { turn, content } = replay([route(0.1), { type: 'delta', text: '## Thanks\n\nSay **amesegnalehu**.' }, { type: 'done' }])
    expect(isVisual(turn)).toBe(false)
    const out = html(content, turn)
    expect(out).toContain('<h2>Thanks</h2>')
    expect(out).toContain('<strong>amesegnalehu</strong>')
    expect(out).not.toContain('class="viz')
  })

  it('patches resolved photos into the program by image key', () => {
    const image = (key: string, query: string, url: string | null): StreamEvent => ({
      type: 'image', key, query, url, thumbnail: url && url + '?thumb', page: null, title: null, score: url ? 0.9 : 0.1, verified: true,
    })
    const { turn, content } = replay([
      route(0.9),
      { type: 'data', bindings: {} },
      statement('root = Col([photo, photos])', 1, 'root'),
      statement('photo = AsyncImage("jebena on charcoal")', 2, 'photo'),
      statement('photos = AsyncImageGroup(["a cup", "a pot"])', 3, 'photos'),
      image('photo', 'jebena on charcoal', 'https://img.example/jebena.jpg'),
      image('photos.0', 'a cup', null),
    ])
    expect(turn.resolved).toEqual({
      photo: { src: 'https://img.example/jebena.jpg', fallback: 'https://img.example/jebena.jpg?thumb' },
      'photos.0': null,
    })
    expect(turn.images.map((i) => i.key)).toEqual(['photo', 'photos.0'])
    const out = html(content, turn, true)
    expect(out).toContain('src="https://img.example/jebena.jpg"')
    expect(out).toContain('No matching photo')
    expect(out).toContain('Searching for “a pot”')
  })

  it('shows a status line before the route arrives', () => {
    expect(html('', EMPTY_TURN, true)).toContain('Routing with Jev')
    expect(html('', applyVizEvent(EMPTY_TURN, route(0.9)), true)).toContain('Writing the interface')
  })
})
