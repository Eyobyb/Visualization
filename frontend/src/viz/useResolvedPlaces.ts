import { useEffect, useMemo, useState } from 'react'
import { streamSSE } from '../lib/sse'
import type { ImageJob, ResolvedPlace } from '../vizlang'

const ENDPOINT = '/api/viz/places'
/** Waits for typing to pause before geocoding, so half-typed addresses are not looked up. */
const DEBOUNCE_MS = 600
/** The endpoint accepts at most this many jobs per request. */
const BATCH = 12

/** Places by query, shared by every program on the page so edits and re-runs never geocode twice. */
const cache = new Map<string, ResolvedPlace | null>()
const inflight = new Set<string>()

async function fetchBatch(queries: string[], onResolved: () => void) {
  queries.forEach((q) => inflight.add(q))
  try {
    await streamSSE(ENDPOINT, { places: queries.map((q) => ({ key: q, query: q })) }, (e) => {
      if (e.type !== 'place') return
      cache.set(e.query, e.found && e.lat != null && e.lng != null ? { lat: e.lat, lng: e.lng, label: e.label ?? undefined } : null)
      onResolved()
    })
  } catch (err) {
    console.warn('[places]', err)
  } finally {
    queries.forEach((q) => inflight.delete(q))
  }
}

/**
 * Geocodes PlaceMap jobs through the server (Nominatim) and returns the `places` map for rendering.
 * Queries that fail to fetch stay unresolved and are retried when they change.
 */
export function useResolvedPlaces(jobs: ImageJob[]): Record<string, ResolvedPlace | null> {
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
    const out: Record<string, ResolvedPlace | null> = {}
    for (const j of jobs) {
      const r = cache.get(j.query)
      if (r !== undefined) out[j.key] = r
    }
    return out
  }, [jobs, version])
}
