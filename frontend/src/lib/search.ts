export type SearchResult = { id: string; title: string; url: string; snippet: string }

export type SearchPayload = {
  query: string
  results: SearchResult[]
  markdown: string
  elapsed_ms: number
  cached?: boolean
  error?: string
}

export async function searchFor(query: string, signal?: AbortSignal): Promise<SearchPayload> {
  const res = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal,
  })
  if (!res.ok) throw new Error(`Search failed: ${res.status} ${res.statusText}`)
  return res.json()
}
