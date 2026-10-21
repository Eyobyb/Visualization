import { createContext, useContext } from 'react'
import { resolveStyle, type Labels, type Placeholders, type VizStyle } from './config'

const files = import.meta.glob('./packs/*.json', { eager: true, import: 'default' }) as Record<string, unknown>
const raw = Object.fromEntries(Object.entries(files).map(([p, f]) => [p.replace(/^.*\/|\.json$/g, ''), f]))
const order = ['default', ...Object.keys(raw).filter((n) => n !== 'default').sort()]

/** Every built-in style pack, resolved against the packs it extends. `default` comes first. */
export const STYLE_PACKS: Record<string, VizStyle> = Object.fromEntries(order.map((n) => [n, resolveStyle(raw[n], raw, n, n)]))

/** The style chosen at startup with VIZ_STYLE (a pack name or a JSON file), injected by the vizStyle Vite plugin. */
export const SELECTED_STYLE: VizStyle = typeof __VIZ_STYLE__ === 'undefined' ? STYLE_PACKS.default : __VIZ_STYLE__

export const StyleContext = createContext<VizStyle>(SELECTED_STYLE)

/** The style of the nearest VizRoot. */
export const useVizStyle = () => useContext(StyleContext)

/** Placeholder text of the nearest VizRoot's style. */
export const usePlaceholders = (): Placeholders => useContext(StyleContext).placeholders

/** Fixed labels of the nearest VizRoot's style. */
export const useLabels = (): Labels => useContext(StyleContext).labels
