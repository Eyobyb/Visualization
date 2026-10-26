import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ColumnShell, UserBubble } from '../components/ColumnShell'
import { SELECTED_STYLE } from '../components/visualization'
import { BUILT_IN_PACKS, useCustomStyles, useStylePacks } from '../lib/customStyles'
import { useConversation } from '../lib/useConversation'
import type { StreamEvent } from '../lib/sse'
import { compile } from '../vizlang'
import { applyVizEvent, EMPTY_TURN, isVisual, type VizTurnData } from '../viz/turnData'
import { VizTurnView } from '../viz/VizTurnView'
import type { Submission } from '../App'

const TABS = ['Agent', 'Route', 'Program', 'Data', 'Media', 'Diagnostics', 'Markdown'] as const

const STYLE_KEY = 'viz-style'
const AGENT_KEY = 'viz-agent'

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

const initialStyle = () => stored(STYLE_KEY) || SELECTED_STYLE.name

const json = (v: unknown) => JSON.stringify(v, null, 2)

function agentSummary(t: VizTurnData) {
  if (!t.agent) return t.agentSteps.length ? `agent working (${t.agentSteps.length} steps)` : null
  if (t.agent.fallback) return 'agent fallback'
  const n = t.agent.datasets.length
  return `agent: ${n} dataset${n === 1 ? '' : 's'}`
}

function routeSummary(t: VizTurnData) {
  const r = t.route
  if (!r) return 'no route yet'
  if (r.fallback) return 'Jev fallback'
  if (r.visual < 0.5) return `prose (visual ${r.visual.toFixed(2)})`
  const top = Object.entries(r.layouts).sort((a, b) => b[1] - a[1])[0]
  return top ? `${r.layout ?? 'no layout'} ${top[1].toFixed(2)}` : 'visual'
}

/**
 * Shows the DuckDuckGo Markdown exactly as the backend returned it. With Visualize on, the same
 * submission goes to /api/viz/stream: Jev routes it and Claude's program renders natively.
 */
export function PlainColumn({ submission }: { submission: Submission | null }) {
  const [history, setHistory] = useState<Submission[]>([])
  const [visualize, setVisualize] = useState(false)
  const [vizTurns, setVizTurns] = useState<Record<number, VizTurnData>>({})
  const [tab, setTab] = useState<(typeof TABS)[number]>('Route')
  const [style, setStyle] = useState(initialStyle)
  const [agentData, setAgentData] = useState(() => stored(AGENT_KEY) === '1')
  const toggleAgent = (on: boolean) => {
    setAgentData(on)
    store(AGENT_KEY, on ? '1' : '0')
  }
  const extra = useMemo(() => (agentData ? { agent: true } : undefined), [agentData])
  const packs = useStylePacks()
  const custom = useCustomStyles()
  const styleName = style in packs ? style : SELECTED_STYLE.name
  const pickStyle = (name: string) => {
    setStyle(name)
    store(STYLE_KEY, name)
  }
  const sent = useRef(new Set<number>())

  useEffect(() => {
    if (submission) setHistory((h) => [...h, submission])
  }, [submission])

  const onEvent = useCallback((event: StreamEvent, turnId: number) => {
    setVizTurns((prev) => {
      const cur = prev[turnId] ?? EMPTY_TURN
      const next = applyVizEvent(cur, event)
      return next === cur ? prev : { ...prev, [turnId]: next }
    })
  }, [])

  const convo = useConversation('/api/viz/stream', onEvent)
  const { send, searchAndSend, markFirstUI, turns } = convo
  const last = history.at(-1)

  useEffect(() => {
    if (!visualize || !last || sent.current.has(last.id)) return
    sent.current.add(last.id)
    void send(last.text, last.search, last.context, extra)
  }, [visualize, last, send, extra])

  const followUp = useCallback(
    (text: string) => {
      if (last && !last.search) void send(text, null, last.context, extra)
      else void searchAndSend(text, last?.context, extra)
    },
    [last, send, searchAndSend, extra],
  )

  const lastAssistant = turns.filter((t) => t.role === 'assistant').at(-1)
  const lastTurn = lastAssistant ? vizTurns[lastAssistant.id] ?? EMPTY_TURN : EMPTY_TURN
  const browserDiagnostics = useMemo(
    () => (lastAssistant && isVisual(lastTurn)
      ? compile(lastAssistant.content, { data: lastTurn.data, streaming: convo.streaming }).diagnostics
      : []),
    [lastAssistant, lastTurn, convo.streaming],
  )
  const serverDiagnostics = lastTurn.done?.diagnostics ?? lastTurn.diagnostics

  const debugBody = () => {
    switch (tab) {
      case 'Agent':
        if (!lastTurn.agent && !lastTurn.agentSteps.length) return agentData ? 'No agent run yet' : 'Agent data is off'
        return json({ steps: lastTurn.agentSteps, result: lastTurn.agent })
      case 'Route':
        return lastTurn.route ? json(lastTurn.route) : 'No route yet'
      case 'Program':
        return lastAssistant?.content || 'No program yet'
      case 'Data':
        return Object.keys(lastTurn.data).length ? json(lastTurn.data) : 'No bindings for this turn'
      case 'Media':
        if (!lastTurn.images.length && !lastTurn.placeEvents.length) return 'No images or places resolved yet'
        return json({ images: lastTurn.images, places: lastTurn.placeEvents })
      case 'Diagnostics':
        return `Server (${serverDiagnostics.length}):\n${json(serverDiagnostics)}\n\nBrowser (${browserDiagnostics.length}):\n${json(browserDiagnostics)}`
      case 'Markdown':
        return lastTurn.done?.markdown || 'No Markdown yet'
    }
  }

  const switchEl = (
    <>
      <label className="switch">
        <button type="button" role="switch" aria-checked={visualize} onClick={() => setVisualize((v) => !v)} />
        Visualize
      </label>
      {visualize && (
        <label className="style-pick">
          Style
          <select value={styleName} onChange={(e) => pickStyle(e.target.value)}>
            <optgroup label="Built in">
              {Object.entries(BUILT_IN_PACKS).map(([name, s]) => <option key={name} value={name}>{s.label}</option>)}
            </optgroup>
            {Object.keys(custom).length > 0 && (
              <optgroup label="Your themes">
                {Object.entries(custom).map(([name, c]) => <option key={name} value={name}>{c.style.label}</option>)}
              </optgroup>
            )}
          </select>
        </label>
      )}
      {visualize && (
        <label className="agent-pick" title="A research agent searches and reads pages to gather datasets before the answer is written">
          <input type="checkbox" checked={agentData} onChange={(e) => toggleAgent(e.target.checked)} />
          Agent data
        </label>
      )}
    </>
  )

  if (visualize) {
    return (
      <ColumnShell
        title="Raw search results (DuckDuckGo)"
        subtitle="Visualized: Jev routes, Claude writes the statement language, rendered natively"
        metrics={convo.metrics}
        streaming={convo.streaming}
        searching={convo.searching}
        error={convo.error}
        toolbar={switchEl}
        footer={
          <details className="debug">
            <summary>
              Debug: {agentSummary(lastTurn) && `${agentSummary(lastTurn)}, `}{routeSummary(lastTurn)}, {lastTurn.done?.statements ?? lastTurn.statements} statements,{' '}
              {serverDiagnostics.length} diagnostics
              {lastTurn.images.length > 0 &&
                `, ${lastTurn.images.filter((i) => i.url).length}/${lastTurn.images.length} images`}
              {lastTurn.placeEvents.length > 0 &&
                `, ${lastTurn.placeEvents.filter((p) => p.found).length}/${lastTurn.placeEvents.length} places`}
            </summary>
            <div className="debug-tabs">
              {TABS.map((t) => (
                <button key={t} type="button" className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
                  {t}
                </button>
              ))}
            </div>
            <pre>{debugBody()}</pre>
          </details>
        }
      >
        {turns.length === 0 && <div className="column-empty">Search for something to visualize it</div>}
        {turns.map((t) =>
          t.role === 'user' ? (
            <UserBubble key={t.id} text={t.content} />
          ) : (
            <VizTurnView
              key={t.id}
              source={t.content}
              turn={vizTurns[t.id] ?? EMPTY_TURN}
              streaming={convo.streaming && t.id === lastAssistant?.id}
              onSend={followUp}
              onFirstUI={markFirstUI}
              stylePack={packs[styleName]}
              gathering={agentData && convo.streaming && t.id === lastAssistant?.id}
            />
          ),
        )}
      </ColumnShell>
    )
  }

  return (
    <ColumnShell
      title="Raw search results (DuckDuckGo)"
      subtitle="Unedited Markdown, also sent to both generative columns"
      metrics={last?.search ? { ttft: last.search.elapsed_ms, total: last.search.elapsed_ms } : {}}
      streaming={false}
      error={last?.search?.error ?? null}
      toolbar={switchEl}
    >
      {history.map((s) => (
        <div key={s.id}>
          <UserBubble text={s.text} />
          {s.context && (
            <div className="raw-context">
              <div className="raw-search-meta">
                {s.search ? 'Context' : 'Context, used as the result (no search)'} (
                {s.context.length.toLocaleString()} chars)
              </div>
              <pre className="raw-context-text">{s.context}</pre>
            </div>
          )}
          {s.search && (
            <>
              <div className="raw-search-meta">
                {s.search.results.length} results in {(s.search.elapsed_ms / 1000).toFixed(2)}s
                {s.search.cached ? ' (cached)' : ''}
              </div>
              <div className="markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.search.markdown}</ReactMarkdown>
              </div>
            </>
          )}
        </div>
      ))}
    </ColumnShell>
  )
}
