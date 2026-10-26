import { isNode, PENDING, type ComponentNode } from './values'

export interface ImageJob {
  key: string
  query: string
}

function* nodes(v: unknown): Generator<ComponentNode> {
  if (isNode(v)) {
    yield v
    for (const x of Object.values(v.props)) yield* nodes(x)
  } else if (Array.isArray(v)) {
    for (const x of v) yield* nodes(x)
  } else if (v && typeof v === 'object') {
    for (const x of Object.values(v)) yield* nodes(x)
  }
}

/**
 * The images a compiled tree needs, keyed like the `resolved` map: `photo` for an AsyncImage,
 * `photos.0` for each query of an AsyncImageGroup and each item image of a ProductGrid or PlaceMap. Mirrors `image_jobs` on the server.
 */
export function imageJobs(root: unknown): ImageJob[] {
  const jobs: ImageJob[] = []
  for (const n of nodes(root)) {
    const p = n.props
    if (n.name === 'AsyncImage' && typeof p.query === 'string') jobs.push({ key: n.key, query: p.query })
    else if (n.name === 'AsyncImageGroup' && Array.isArray(p.queries)) {
      p.queries.forEach((q, i) => {
        if (q !== PENDING && (typeof q !== 'object' || q === null)) jobs.push({ key: n.key + '.' + i, query: String(q) })
      })
    } else if (n.name === 'ProductGrid' && Array.isArray(p.items)) {
      p.items.forEach((it, i) => {
        const q = it && typeof it === 'object' ? (it as Record<string, unknown>).image : undefined
        if (typeof q === 'string') jobs.push({ key: n.key + '.' + i, query: q })
      })
    } else if (n.name === 'PlaceMap') {
      placeRows(p).forEach((r, i) => {
        if (r.image) jobs.push({ key: n.key + '.' + i, query: r.image })
      })
    }
  }
  return jobs
}

/** One place of a PlaceMap, normalized from its `places` list or its `data` rows. */
export interface PlaceRow {
  name: string
  /** What to geocode, when the row has no coordinates. */
  query?: string
  lat?: number
  lng?: number
  image?: string
  text?: string
  rating?: number
  url?: string
  category?: string
}

const PLACE_FIELDS = ['name', 'address', 'lat', 'lng', 'image', 'text', 'rating', 'url', 'category'] as const

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' && Number.isFinite(v) ? String(v) : undefined)

const coord = (v: unknown, max: number) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  return Number.isFinite(n) && Math.abs(n) <= max ? n : undefined
}

/**
 * "name, address, near" with repeated comma parts removed. The name loses anything after "|" and any
 * "(…)" so bilingual or branch-annotated names still match. The server shortens it if nothing matches.
 */
function geoQuery(name: string, address: string | undefined, near: string | undefined) {
  const clean = name.split('|')[0].replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim() || name
  const seen = new Set<string>()
  return [clean, address ?? '', near ?? '']
    .flatMap((s) => s.split(','))
    .map((s) => s.trim())
    .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
    .join(', ')
}

/**
 * The places a PlaceMap shows, in order. Rows without a name are skipped, so indexes (and the
 * `map.0` keys built from them) match between the job list and the renderer. Mirrors `place_rows` on the server.
 */
export function placeRows(p: Record<string, unknown>): PlaceRow[] {
  const fromData = !Array.isArray(p.places)
  const rows = fromData ? p.data : p.places
  if (!Array.isArray(rows)) return []
  const field = (k: (typeof PLACE_FIELDS)[number]) => (fromData && typeof p[k] === 'string' ? (p[k] as string) : k)
  const near = text(p.near)
  return rows.flatMap((r): PlaceRow[] => {
    if (!r || typeof r !== 'object' || Array.isArray(r) || r === PENDING) return []
    const o = r as Record<string, unknown>
    const name = text(o[field('name')])
    if (!name) return []
    const lat = coord(o[field('lat')], 90)
    const lng = coord(o[field('lng')], 180)
    const located = lat !== undefined && lng !== undefined
    const query = geoQuery(name, text(o[field('address')]), near)
    const rating = coord(o[field('rating')], 5)
    return [{
      name,
      ...(located ? { lat, lng } : { query }),
      image: text(o[field('image')]),
      text: text(o[field('text')]),
      rating: rating !== undefined && rating >= 0 ? rating : undefined,
      url: text(o[field('url')]),
      category: text(o[field('category')]),
    }]
  })
}

/** The places a compiled tree needs geocoded, keyed `map.0` like the `places` map. Mirrors `place_jobs` on the server. */
export function placeJobs(root: unknown): ImageJob[] {
  const jobs: ImageJob[] = []
  for (const n of nodes(root)) {
    if (n.name !== 'PlaceMap') continue
    placeRows(n.props).forEach((r, i) => {
      if (r.query) jobs.push({ key: n.key + '.' + i, query: r.query })
    })
  }
  return jobs
}
