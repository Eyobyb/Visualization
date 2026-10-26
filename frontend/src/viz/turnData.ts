import type { AgentResult, AgentStep, ServerDiagnostic, StreamEvent, VizImage, VizPlace, VizRoute } from '../lib/sse'
import type { ResolvedImage, ResolvedPlace } from '../vizlang'

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
  /** Geocoded PlaceMap places by key (`map.0`); null when the geocoder found nothing. */
  places: Record<string, ResolvedPlace | null>
  /** The place events as received, for debugging. */
  placeEvents: VizPlace[]
  /** The data agent's tool calls, in order, when the turn gathered data. */
  agentSteps: AgentStep[]
  agent: AgentResult | null
  done: {
    diagnostics: ServerDiagnostic[]
    statements: number
    markdown: string
    images: Array<{ key: string; query: string; url?: string | null }>
    places: Array<{ key: string; query: string; lat: number | null; lng: number | null; found: boolean | null }>
  } | null
}

export const EMPTY_TURN: VizTurnData = {
  route: null, data: {}, diagnostics: [], statements: 0, resolved: {}, images: [], places: {}, placeEvents: [], agentSteps: [], agent: null, done: null,
}

/** Folds one stream event into a turn. Events that carry no turn data return the turn unchanged. */
export function applyVizEvent(turn: VizTurnData, event: StreamEvent): VizTurnData {
  switch (event.type) {
    case 'agent_step': {
      const { tool, query, url } = event
      return { ...turn, agentSteps: [...turn.agentSteps, { tool, query, url }] }
    }
    case 'agent': {
      const { datasets, notes, steps, fallback, error } = event
      return { ...turn, agent: { datasets, notes, steps, fallback, error } }
    }
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
    case 'place': {
      const { key, query, lat, lng, label, found } = event
      const place: VizPlace = { key, query, lat, lng, label, found }
      const at = found && lat != null && lng != null ? { lat, lng, label: label ?? undefined } : null
      return {
        ...turn,
        places: { ...turn.places, [key]: at },
        placeEvents: [...turn.placeEvents.filter((p) => p.key !== key), place],
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
          places: event.places ?? [],
        },
      }
    default:
      return turn
  }
}

/** True when the turn renders a program; prose turns and turns still waiting for Jev do not. */
export const isVisual = (turn: VizTurnData) => turn.route !== null && turn.route.visual >= 0.5
