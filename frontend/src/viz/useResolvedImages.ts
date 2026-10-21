import { useEffect, useMemo, useState } from 'react'
import { streamSSE } from '../lib/sse'
import type { ImageJob, ResolvedImage } from '../vizlang'

const ENDPOINT = '/api/viz/images'
/** Waits for typing to pause before searching, so half-typed queries are not looked up. */
const DEBOUNCE_MS = 600
/** The endpoint accepts at most this many jobs per request. */
const BATCH = 12

/** Photos by query, shared by every program on the page so edits and re-runs never search twice. */
const cache = new Map<string, ResolvedImage | null>()
const inflight = new Set<string>()

async function fetchBatch(queries: string[], onResolved: () => void) {
  queries.forEach((q) => inflight.add(q))
  try {
    await streamSSE(ENDPOINT, { images: queries.map((q) => ({ key: q, query: q })) }, (e) => {
      if (e.type !== 'image') return
      cache.set(e.query, e.url ? { src: e.url, fallback: e.thumbnail ?? undefined } : null)
      onResolved()
    })
  } catch (err) {
    console.warn('[images]', err)
  } finally {
    queries.forEach((q) => inflight.delete(q))
  }
}

/**
 * Resolves image jobs through the server (Bing search checked by Jev) and returns the `resolved`
 * map for `useVizProgram`. Queries that fail to fetch stay unresolved and are retried when they change.
 */
export function useResolvedImages(jobs: ImageJob[]): Record<string, ResolvedImage | null> {
  const [version, setVersion] = useState(0)
  const missing = [...new Set(jobs.map((j) => j.query))].filter((q) => !cache.has(q) && !inflight.has(q)).join('\n')

  useEffect(() => {
    if (!missing) return
    const t = setTimeout(() => {
      const queries = missing.split('\n')
      const bump = () => setVersion((v) => v + 1)
      for (let i = 0; i < queries.length; i += BATCH) void fetchBatch(queries.slice(i, i + BATCH), bump)
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [missing])

  return useMemo(() => {
    void version
    const out: Record<string, ResolvedImage | null> = {}
    for (const j of jobs) {
      const r = cache.get(j.query)
      if (r !== undefined) out[j.key] = r
    }
    return out
  }, [jobs, version])
}
