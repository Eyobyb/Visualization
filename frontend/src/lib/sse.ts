export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type ServerDiagnostic = { code: string; msg: string; where: string }

/** Jev's routing for one turn. `visual` below 0.5 means the answer streams as prose. */
export type VizRoute = {
  visual: number
  layout: string | null
  interactive: number
  hints: string[]
  layouts: Record<string, number>
  model: string | null
  fallback: boolean
}

export type StreamEvent =
  | { type: 'delta'; text: string }
  | {
      type: 'done'
      diagnostics?: ServerDiagnostic[]
      statements?: number
      markdown?: string
      images?: Array<{ key: string; query: string; url?: string | null }>
      /** `found` is null for places the turn had not finished locating. */
      places?: Array<{ key: string; query: string; lat: number | null; lng: number | null; found: boolean | null }>
      /** `/api/card/stream`: full prose answer + teaser card payload. */
      answer?: string
      card?: Record<string, unknown>
    }
  | { type: 'error'; message: string }
  | { type: 'app_data'; bindings: Record<string, Record<string, string>> }
  | ({ type: 'dil' } & Record<string, unknown>)
  | ({ type: 'route' } & VizRoute)
  | { type: 'data'; bindings: Record<string, unknown> }
  | { type: 'statement'; name: string | null; text: string; line: number; refs: string[] }
  | ({ type: 'diagnostic' } & ServerDiagnostic)
  | ({ type: 'image' } & VizImage)
  | ({ type: 'place' } & VizPlace)
  | ({ type: 'agent_step' } & AgentStep)
  | ({ type: 'agent' } & AgentResult)
  | { type: 'card'; payload: Record<string, unknown>; error?: string }

/** One tool call of the data agent, reported while it works. */
export type AgentStep = { tool: string; query?: string; url?: string }

/** A validated dataset the agent gathered; its rows are bound as `data.<id>`. */
export type AgentDataset = {
  id: string
  description: string
  fields: Record<string, 'string' | 'number' | 'bool' | 'date'>
  rows: Record<string, unknown>[]
  sources: Array<{ title: string; url: string }>
}

/** The data agent's outcome. With `fallback`, the turn used the search results instead. */
export type AgentResult = {
  datasets: AgentDataset[]
  notes: string[]
  steps: number
  fallback: boolean
  error: string | null
}

/** A resolved AsyncImage query. `url` is null when no photo matched or Jev rejected every candidate. */
export type VizImage = {
  key: string
  query: string
  url: string | null
  thumbnail: string | null
  page: string | null
  title: string | null
  score: number | null
  verified: boolean
}

/** A geocoded PlaceMap place. `lat` and `lng` are null when the geocoder found nothing. */
export type VizPlace = {
  key: string
  query: string
  lat: number | null
  lng: number | null
  label: string | null
  found: boolean
}

export async function streamSSE(
  url: string,
  body: Record<string, unknown>,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) {
    throw new Error(`${res.status} ${res.statusText}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      for (const line of frame.split('\n')) {
        if (line.startsWith('data: ')) onEvent(JSON.parse(line.slice(6)))
      }
    }
  }
}
