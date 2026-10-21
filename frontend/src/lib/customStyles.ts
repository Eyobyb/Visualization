import { useMemo, useSyncExternalStore } from 'react'
import { SELECTED_STYLE, STYLE_PACKS, validateStyle, type VizStyle } from '../components/visualization'

/** A theme saved from the catalog's theme builder: the full style plus the pack it started from. */
export interface CustomStyle {
  base: string
  style: VizStyle
}

/** Built-in packs, plus the VIZ_STYLE file when it is not one of them. */
export const BUILT_IN_PACKS: Record<string, VizStyle> = {
  ...STYLE_PACKS,
  [SELECTED_STYLE.name]: STYLE_PACKS[SELECTED_STYLE.name] ?? SELECTED_STYLE,
}

const KEY = 'viz-custom-styles'
const EMPTY: Record<string, CustomStyle> = {}
const listeners = new Set<() => void>()
let cachedRaw: string | null | undefined
let cached = EMPTY

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' ? localStorage : null
  } catch {
    return null
  }
}

const isEntry = (v: unknown): v is CustomStyle =>
  typeof v === 'object' && v !== null && typeof (v as CustomStyle).base === 'string' && validateStyle((v as CustomStyle).style).length === 0

/** Saved themes, skipping entries that no longer validate or that shadow a built-in pack. */
export function readCustomStyles(): Record<string, CustomStyle> {
  const raw = storage()?.getItem(KEY) ?? null
  if (raw === cachedRaw) return cached
  cachedRaw = raw
  let parsed: unknown
  try {
    parsed = raw ? JSON.parse(raw) : {}
  } catch {
    parsed = {}
  }
  const entries = typeof parsed === 'object' && parsed !== null ? Object.entries(parsed) : []
  cached = Object.fromEntries(entries.filter(([name, v]) => !(name in BUILT_IN_PACKS) && isEntry(v) && v.style.name === name))
  return cached
}

function write(all: Record<string, CustomStyle>) {
  storage()?.setItem(KEY, JSON.stringify(all))
  listeners.forEach((l) => l())
}

export function saveCustomStyle(entry: CustomStyle) {
  write({ ...readCustomStyles(), [entry.style.name]: entry })
}

export function deleteCustomStyle(name: string) {
  const { [name]: _, ...rest } = readCustomStyles()
  write(rest)
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) fn() }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('storage', onStorage)
  }
}

export const useCustomStyles = () => useSyncExternalStore(subscribe, readCustomStyles, () => EMPTY)

/** Built-in packs followed by saved themes, keyed by name. */
export function useStylePacks(): Record<string, VizStyle> {
  const custom = useCustomStyles()
  return useMemo(() => ({ ...BUILT_IN_PACKS, ...Object.fromEntries(Object.entries(custom).map(([n, c]) => [n, c.style])) }), [custom])
}

/** The built-in pack a saved theme ultimately starts from, so exported files extend something that exists on disk. */
export function builtInBase(name: string, custom = readCustomStyles()): string {
  const seen = new Set<string>()
  let cur = name
  while (!(cur in BUILT_IN_PACKS) && custom[cur] && !seen.has(cur)) {
    seen.add(cur)
    cur = custom[cur].base
  }
  return cur in BUILT_IN_PACKS ? cur : 'default'
}
