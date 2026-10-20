import { isIconName } from '../components/visualization/icons'
import { isNode, PENDING } from './values'

export type PropType =
  | 'string' | 'number' | 'bool' | 'enum' | 'space' | 'node' | 'nodes' | 'data' | 'list'
  | 'action' | 'state' | 'field' | 'fields' | 'icon' | 'any'

/** One prop of a language component: its type, a one-line description for the prompt, and an optional default. */
export interface PropSpec {
  type: PropType
  desc: string
  req?: boolean
  def?: unknown
  values?: readonly unknown[]
}

export interface Example {
  label?: string
  src: string
}

/** A component as the language sees it. Rendering lives in `render.tsx`, so this stays free of React. */
export interface ComponentSpec {
  name: string
  family: string
  desc: string
  /** Prop names filled by positional arguments, in order. */
  pos: string[]
  props: Record<string, PropSpec>
  examples: Example[]
}

type Opts = Partial<Pick<PropSpec, 'req' | 'def'>>

export const P = {
  str: (desc: string, o?: Opts): PropSpec => ({ type: 'string', desc, ...o }),
  num: (desc: string, o?: Opts): PropSpec => ({ type: 'number', desc, ...o }),
  bool: (desc: string, o?: Opts): PropSpec => ({ type: 'bool', desc, ...o }),
  en: (values: readonly unknown[], desc: string, o?: Opts): PropSpec => ({ type: 'enum', values, desc, ...o }),
  space: (desc: string, o?: Opts): PropSpec => ({ type: 'space', desc, ...o }),
  node: (desc: string, o?: Opts): PropSpec => ({ type: 'node', desc, ...o }),
  nodes: (desc: string, o?: Opts): PropSpec => ({ type: 'nodes', desc, ...o }),
  data: (desc: string, o?: Opts): PropSpec => ({ type: 'data', desc, ...o }),
  list: (desc: string, o?: Opts): PropSpec => ({ type: 'list', desc, ...o }),
  action: (desc: string, o?: Opts): PropSpec => ({ type: 'action', desc, ...o }),
  state: (desc: string, o?: Opts): PropSpec => ({ type: 'state', desc, ...o }),
  field: (desc: string, o?: Opts): PropSpec => ({ type: 'field', desc, ...o }),
  fields: (desc: string, o?: Opts): PropSpec => ({ type: 'fields', desc, ...o }),
  icon: (desc: string, o?: Opts): PropSpec => ({ type: 'icon', desc, ...o }),
}

export const REQ = { req: true } as const

/** Whether an evaluated value fits a prop. Values that fail are dropped with an `invalid_literal` diagnostic. */
export function checkType(ps: PropSpec, v: unknown): boolean {
  switch (ps.type) {
    case 'string': return typeof v === 'string' || typeof v === 'number'
    case 'number': return typeof v === 'number' && Number.isFinite(v)
    case 'bool': return typeof v === 'boolean'
    case 'enum': return !!ps.values?.includes(v)
    case 'space': return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 8
    case 'node': return v === PENDING || typeof v === 'string' || typeof v === 'number' || Array.isArray(v) || isNode(v)
    case 'nodes': case 'data': case 'list': return Array.isArray(v)
    case 'field': return typeof v === 'string'
    case 'fields': return typeof v === 'string' || (Array.isArray(v) && v.every((x) => typeof x === 'string'))
    case 'icon': return typeof v === 'string' && isIconName(v)
    default: return true
  }
}

/** How a prop's type reads in diagnostics and in the prompt. */
export function typeLabel(ps: PropSpec): string {
  if (ps.type === 'enum') return (ps.values ?? []).map((v) => JSON.stringify(v)).join(' | ')
  const labels: Partial<Record<PropType, string>> = {
    space: '0–8', nodes: 'node[]', data: 'rows[]', state: '$variable', action: 'action', icon: 'icon name', fields: 'field | field[]',
  }
  return labels[ps.type] ?? ps.type
}
