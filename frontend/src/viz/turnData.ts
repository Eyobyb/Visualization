import type { ServerDiagnostic, StreamEvent, VizImage, VizRoute } from '../lib/sse'
import type { ResolvedImage } from '../vizlang'

/** Everything a viz turn receives besides the program text, which accumulates in the turn's content. */
export interface VizTurnData {
  route: VizRoute | null
  data: Record<string, unknown>
  /** Problems the server reported while streaming. */
  diagnostics: ServerDiagnostic[]
  statements: number
  /** Resolved photos by image key (`photo`, `photos.0`); null when nothing matched. */
  resolved: Record<string, ResolvedImage | null>
  /** The image events as received, for debugging. */
  images: VizImage[]
  done: {
    diagnostics: ServerDiagnostic[]
    statements: number
    markdown: string
    images: Array<{ key: string; query: string; url?: string | null }>
  } | null
}

export const EMPTY_TURN: VizTurnData = {
  route: null, data: {}, diagnostics: [], statements: 0, resolved: {}, images: [], done: null,
}

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
    case 'image': {
      const { key, query, url, thumbnail, page, title, score, verified } = event
      const image: VizImage = { key, query, url, thumbnail, page, title, score, verified }
      const resolved = image.url ? { src: image.url, fallback: image.thumbnail ?? undefined } : null
      return {
        ...turn,
        resolved: { ...turn.resolved, [image.key]: resolved },
        images: [...turn.images.filter((i) => i.key !== image.key), image],
      }
    }
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
