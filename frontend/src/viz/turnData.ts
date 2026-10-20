import type { ServerDiagnostic, StreamEvent, VizRoute } from '../lib/sse'

/** Everything a viz turn receives besides the program text, which accumulates in the turn's content. */
export interface VizTurnData {
  route: VizRoute | null
  data: Record<string, unknown>
  /** Problems the server reported while streaming. */
  diagnostics: ServerDiagnostic[]
  statements: number
  done: { diagnostics: ServerDiagnostic[]; statements: number; markdown: string; images: Array<{ key: string; query: string }> } | null
}

export const EMPTY_TURN: VizTurnData = { route: null, data: {}, diagnostics: [], statements: 0, done: null }

/** Folds one stream event into a turn. Events that carry no turn data return the turn unchanged. */
export function applyVizEvent(turn: VizTurnData, event: StreamEvent): VizTurnData {
  switch (event.type) {
    case 'route': {
      const { visual, layout, interactive, hints, layouts, model, fallback } = event
      return { ...turn, route: { visual, layout, interactive, hints, layouts, model, fallback } }
    }
    case 'data':
      return { ...turn, data: event.bindings }
    case 'statement':
      return { ...turn, statements: turn.statements + 1 }
    case 'diagnostic':
      return { ...turn, diagnostics: [...turn.diagnostics, { code: event.code, msg: event.msg, where: event.where }] }
    case 'done':
      return {
        ...turn,
        done: {
          diagnostics: event.diagnostics ?? [],
          statements: event.statements ?? turn.statements,
          markdown: event.markdown ?? '',
          images: event.images ?? [],
        },
      }
    default:
      return turn
  }
}

/** True when the turn renders a program; prose turns and turns still waiting for Jev do not. */
export const isVisual = (turn: VizTurnData) => turn.route !== null && turn.route.visual >= 0.5
