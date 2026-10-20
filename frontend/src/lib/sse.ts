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
      images?: Array<{ key: string; query: string }>
    }
  | { type: 'error'; message: string }
  | { type: 'app_data'; bindings: Record<string, Record<string, string>> }
  | ({ type: 'dil' } & Record<string, unknown>)
  | ({ type: 'route' } & VizRoute)
  | { type: 'data'; bindings: Record<string, unknown> }
  | { type: 'statement'; name: string | null; text: string; line: number; refs: string[] }
  | ({ type: 'diagnostic' } & ServerDiagnostic)

export async function streamSSE(
  url: string,
  body: { messages: ChatMessage[] } & Record<string, unknown>,
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
