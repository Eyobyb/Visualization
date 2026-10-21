import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { VizRoot, type SendToModel, type VizStyle } from '../components/visualization'
import { useVizProgram } from '../vizlang'
import { isNode } from '../vizlang/values'
import { isVisual, type VizTurnData } from './turnData'

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
}

function ProgramTurn({ source, turn, streaming, onSend, onFirstUI, stylePack }: Props) {
  const { result, element } = useVizProgram({ source, data: turn.data, streaming, resolved: turn.resolved, onSend })
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

/** One assistant turn of the viz stream: a live program, or Markdown when Jev routed the answer to prose. */
export function VizTurnView(props: Props) {
  const { turn, source, streaming } = props
  if (!turn.route) return streaming ? <div className="viz-status">Routing with Jev…</div> : null
  if (isVisual(turn)) return <ProgramTurn {...props} />
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
      {streaming && !source && <div className="viz-status">Writing…</div>}
    </div>
  )
}
