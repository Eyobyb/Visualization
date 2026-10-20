import { useMemo, useState, type ReactNode } from 'react'
import type { SendToModel } from '../components/visualization'
import { copyText, safeUrl } from '../components/visualization/utils'
import { compile, type ActionEvent, type CompileResult, type Effects } from './compile'
import { renderNode } from './render'

export interface VizProgramOptions {
  /** Program text. While streaming, pass everything received so far. */
  source: string
  /** The server's bindings, read as `data.<id>`. */
  data?: Record<string, unknown>
  /** Missing names render as skeletons and the unfinished last line is skipped. */
  streaming?: boolean
  /** Server-resolved image URLs, keyed like `photo` or `photos.0`. */
  resolved?: Record<string, string | undefined>
  /** Receives `@NewTurn` text and messages from ChoiceChips, Form and ApprovalCard. */
  onSend?: SendToModel
  /** Every action event, including copies, opened links and action errors. */
  onEvent?: (e: ActionEvent) => void
}

export interface VizProgramHandle {
  result: CompileResult
  element: ReactNode
  /** Changes one `$variable` locally, as an input would. */
  setState: (name: string, value: unknown) => void
  /** Puts every `$variable` back to its declared default. */
  resetState: () => void
}

/**
 * Compiles a program, keeps its `$state`, and renders it. Recompiles on every source, data or state change,
 * and when `onSend` or `onEvent` change identity, so pass stable callbacks.
 */
export function useVizProgram({ source, data, streaming = false, resolved, onSend, onEvent }: VizProgramOptions): VizProgramHandle {
  const [userState, setUserState] = useState<Record<string, unknown>>({})

  const effects = useMemo<Effects>(() => ({
    set: (name, value) => setUserState((s) => ({ ...s, [name]: value })),
    reset: (name) => setUserState((s) => {
      const next = { ...s }
      delete next[name]
      return next
    }),
    event: (e) => {
      if (e.kind === 'newTurn') onSend?.(e.text)
      else if (e.kind === 'copy') copyText(e.text)
      else if (e.kind === 'open') {
        const url = safeUrl(e.text)
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
      } else console.warn('[vizlang]', e.text)
      onEvent?.(e)
    },
  }), [onSend, onEvent])

  const result = useMemo(
    () => compile(source, { streaming, data, userState, effects }),
    [source, streaming, data, userState, effects],
  )
  const element = useMemo(
    () => renderNode(result.root, {
      state: result.state,
      set: effects.set,
      onSend: (text) => effects.event({ kind: 'newTurn', text }),
      resolved,
    }),
    [result, effects, resolved],
  )
  return { result, element, setState: effects.set, resetState: () => setUserState({}) }
}
