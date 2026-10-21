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
 * `photos.0` for each query of an AsyncImageGroup and each item image of a ProductGrid. Mirrors `image_jobs` on the server.
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
    }
  }
  return jobs
}
