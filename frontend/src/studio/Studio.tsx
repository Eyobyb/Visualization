import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { SELECTED_STYLE } from '../components/visualization'
import { BUILT_IN_PACKS, useCustomStyles, useStylePacks } from '../lib/customStyles'
import type { StreamEvent } from '../lib/sse'
import { useConversation } from '../lib/useConversation'
import { applyVizEvent, EMPTY_TURN, type VizTurnData } from '../viz/turnData'
import { VizTurnView } from '../viz/VizTurnView'

const STYLE_KEY = 'viz-style'
const AGENT_KEY = 'viz-agent'
const MAX_CONTEXT_CHARS = 100_000
const CONTEXT_PROMPT = 'Use the attached context as the data and present it in the most useful way.'

function stored(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable */
  }
}

/**
 * The visualizer on its own: style along the top, the answer in the middle, a chat box at the
 * bottom. The context editor is closed until its toggle is opened.
 */
export function Studio() {
  const [text, setText] = useState('')
  const [context, setContext] = useState('')
  const [contextOpen, setContextOpen] = useState(false)
  const [style, setStyle] = useState(() => stored(STYLE_KEY) || SELECTED_STYLE.name)
  const [agentData, setAgentData] = useState(() => stored(AGENT_KEY) === '1')
  const [vizTurns, setVizTurns] = useState<Record<number, VizTurnData>>({})
  const contextMode = useRef(false)
  const stageRef = useRef<HTMLDivElement>(null)

  const packs = useStylePacks()
  const custom = useCustomStyles()
  const styleName = style in packs ? style : SELECTED_STYLE.name
  const extra = useMemo(() => (agentData ? { agent: true } : undefined), [agentData])

  const onEvent = useCallback((event: StreamEvent, turnId: number) => {
    setVizTurns((prev) => {
      const cur = prev[turnId] ?? EMPTY_TURN
      const next = applyVizEvent(cur, event)
      return next === cur ? prev : { ...prev, [turnId]: next }
    })
  }, [])

  const { turns, streaming, searching, error, send, searchAndSend, markFirstUI } = useConversation('/api/viz/stream', onEvent)
  const lastAssistant = turns.filter((t) => t.role === 'assistant').at(-1)
  const busy = streaming || searching

  useEffect(() => {
    const el = stageRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, streaming, vizTurns])

  const pickStyle = (name: string) => {
    setStyle(name)
    store(STYLE_KEY, name)
  }

  const toggleAgent = (on: boolean) => {
    setAgentData(on)
    store(AGENT_KEY, on ? '1' : '0')
  }

  const ask = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || busy) return
    contextMode.current = false
    setText('')
    void searchAndSend(trimmed, context.trim(), extra)
  }

  const sendContext = () => {
    const ctx = context.trim()
    if (!ctx || busy) return
    contextMode.current = true
    setText('')
    setContextOpen(false)
    void send(text.trim() || CONTEXT_PROMPT, null, ctx, extra)
  }

  const followUp = useCallback(
    (value: string) => {
      if (contextMode.current) void send(value, null, context.trim(), extra)
      else void searchAndSend(value, context.trim(), extra)
    },
    [context, extra, searchAndSend, send],
  )

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    ask(text)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      ask(text)
    }
  }

  const attached = context.trim().length

  return (
    <div className="studio">
      <header className="studio-top">
        <div className="studio-styles" role="radiogroup" aria-label="Style">
          {Object.entries(BUILT_IN_PACKS).map(([name, pack]) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={name === styleName}
              className={name === styleName ? 'on' : ''}
              onClick={() => pickStyle(name)}
            >
              {pack.label}
            </button>
          ))}
          {Object.entries(custom).map(([name, entry]) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={name === styleName}
              className={name === styleName ? 'on' : ''}
              onClick={() => pickStyle(name)}
            >
              {entry.style.label}
            </button>
          ))}
        </div>
        <div className="studio-tools">
          <label className="studio-agent">
            <input type="checkbox" checked={agentData} onChange={(e) => toggleAgent(e.target.checked)} />
            Agent
          </label>
          <button
            type="button"
            className={'studio-context-toggle' + (contextOpen ? ' on' : '')}
            aria-expanded={contextOpen}
            onClick={() => setContextOpen((open) => !open)}
          >
            Context{attached > 0 ? ` · ${attached.toLocaleString()}` : ''}
          </button>
          <a className="studio-back" href="/">Columns</a>
        </div>
      </header>

      {contextOpen && (
        <section className="studio-context">
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            maxLength={MAX_CONTEXT_CHARS}
            placeholder="Paste notes, a document, CSV, JSON, an email thread..."
            rows={6}
            autoFocus
          />
          <div className="studio-context-actions">
            <button type="button" className="primary" disabled={!attached || busy} onClick={sendContext}>
              Use context as the result
            </button>
            {attached > 0 && (
              <button type="button" onClick={() => setContext('')}>
                Clear
              </button>
            )}
          </div>
        </section>
      )}

      <div className="studio-stage" ref={stageRef}>
        {turns.length === 0 && <div className="studio-empty">Ask something below</div>}
        {turns.map((t) =>
          t.role === 'user' ? (
            <div key={t.id} className="studio-you">{t.content}</div>
          ) : (
            <VizTurnView
              key={t.id}
              source={t.content}
              turn={vizTurns[t.id] ?? EMPTY_TURN}
              streaming={streaming && t.id === lastAssistant?.id}
              onSend={followUp}
              onFirstUI={markFirstUI}
              stylePack={packs[styleName]}
              gathering={agentData && streaming && t.id === lastAssistant?.id}
            />
          ),
        )}
      </div>

      <form className="studio-chat" onSubmit={onSubmit}>
        {(searching || error) && (
          <div className="studio-status">{error ?? 'Searching…'}</div>
        )}
        <div className="studio-compose">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything"
            rows={1}
            autoFocus
          />
          <button type="submit" disabled={!text.trim() || busy}>
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
