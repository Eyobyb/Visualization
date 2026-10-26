import { useEffect, useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { VizRoot, type SendToModel, type VizStyle } from '../components/visualization'
import { placeJobs, renderNode, useVizProgram } from '../vizlang'
import { isNode } from '../vizlang/values'
import type { AgentStep } from '../lib/sse'
import { isVisual, type VizTurnData } from './turnData'
import { useResolvedPlaces } from './useResolvedPlaces'

interface Props {
  /** The program text so far (visual turns) or the prose so far. */
  source: string
  turn: VizTurnData
  streaming: boolean
  onSend: SendToModel
  /** Called once, when the first component renders. */
  onFirstUI?: () => void
  /** Style pack for this turn; defaults to the one selected at startup. */
  stylePack?: VizStyle
  /** The turn was sent with the data agent on, so its first events are agent steps. */
  gathering?: boolean
}

function ProgramTurn({ source, turn, streaming, onSend, onFirstUI, stylePack }: Props) {
  const { result, setState } = useVizProgram({ source, data: turn.data, streaming, onSend })
  const finished = !streaming && turn.done !== null
  const leftover = useMemo(
    () => (finished ? placeJobs(result.root).filter((j) => !(j.key in turn.places)) : []),
    [finished, result.root, turn.places],
  )
  const fallback = useResolvedPlaces(leftover)
  const element = useMemo(
    () => renderNode(result.root, {
      state: result.state, set: setState, onSend, resolved: turn.resolved, places: { ...fallback, ...turn.places },
    }),
    [result, setState, onSend, turn.resolved, turn.places, fallback],
  )
  const rendered = isNode(result.root)
  const reported = useRef(false)
  useEffect(() => {
    if (rendered && !reported.current) {
      reported.current = true
      onFirstUI?.()
    }
  }, [rendered, onFirstUI])

  if (!source && streaming) return <div className="viz-status">Writing the interface…</div>
  return <VizRoot className="viz-turn" stylePack={stylePack}>{element}</VizRoot>
}

const host = (url = '') => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const stepText = (s: AgentStep) =>
  s.tool === 'fetch_page' ? `Reading ${host(s.url)}`
    : s.tool === 'search_maps' ? `Reading Google Maps for “${s.query ?? ''}”`
      : s.tool === 'web_search' ? `Searching “${s.query ?? ''}”` : s.tool

/** The data agent's progress while it gathers, then what it found. */
function AgentProgress({ turn, streaming }: { turn: VizTurnData; streaming: boolean }) {
  const a = turn.agent
  const working = !a && streaming
  if (!turn.agentSteps.length && !a && !working) return null
  return (
    <div className="agent-progress" aria-live="polite">
      <ol>
        {turn.agentSteps.map((s, i) => <li key={i}>{stepText(s)}</li>)}
      </ol>
      <div className="viz-status">
        {working
          ? 'Gathering data…'
          : a && !a.fallback
            ? `Gathered ${a.datasets.map((d) => `${d.id} (${d.rows.length} rows)`).join(', ')}`
            : `No datasets${a?.error ? ` (${a.error})` : ''}; using the search results`}
      </div>
    </div>
  )
}

/** One assistant turn of the viz stream: a live program, or Markdown when Jev routed the answer to prose. */
export function VizTurnView(props: Props) {
  const { turn, source, streaming } = props
  const agentOn = props.gathering || turn.agentSteps.length > 0 || turn.agent !== null
  if (!turn.route) {
    if (agentOn) return <AgentProgress turn={turn} streaming={streaming} />
    return streaming ? <div className="viz-status">Routing with Jev…</div> : null
  }
  if (isVisual(turn)) return <ProgramTurn {...props} />
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
      {streaming && !source && <div className="viz-status">Writing…</div>}
    </div>
  )
}
