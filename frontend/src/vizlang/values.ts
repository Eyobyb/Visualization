/** Stands in for a value whose statement has not streamed in yet. Renders as a skeleton. */
export const PENDING: { readonly __pending: true } = Object.freeze({ __pending: true })
export type Pending = typeof PENDING

/** An evaluated component call, before it is turned into a React element. */
export interface ComponentNode {
  __c: true
  name: string
  props: Record<string, unknown>
  /** Stable path such as `photos` or `kpis.items.0`; used as the React key and the image-resolve key. */
  key: string
}

/** A prop bound to a `$variable`, as written for an input's `value`. */
export interface StateBinding {
  $state: string
}

export const hasOwn = (o: unknown, k: PropertyKey) => o != null && Object.prototype.hasOwnProperty.call(o, k)
export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
export const pick = (r: unknown, f: unknown): unknown =>
  f == null ? r : r != null && typeof r === 'object' ? (r as Record<string, unknown>)[String(f)] : undefined

export const isNode = (v: unknown): v is ComponentNode => !!v && typeof v === 'object' && (v as ComponentNode).__c === true
export const isBinding = (v: unknown): v is StateBinding => !!v && typeof v === 'object' && typeof (v as StateBinding).$state === 'string'
