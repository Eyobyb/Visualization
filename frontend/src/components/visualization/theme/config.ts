/*
 * Style config: the JSON shape every style pack follows, how packs extend each other, and how a resolved
 * config becomes the CSS variables and placeholder text the components read. No DOM or React here, so the
 * Vite plugin can validate a config file at startup with the same rules the browser uses.
 */

export type Mode = 'light' | 'dark'
export type SkeletonStyle = 'shimmer' | 'pulse' | 'static'
export type EmptyBorder = 'dashed' | 'solid' | 'none'

/** Colors for one mode. Values are any CSS color; `series` are the six chart colors in order. */
export interface Palette {
  bg: string
  panel: string
  surface: string
  sunk: string
  line: string
  lineStrong: string
  ink: string
  ink2: string
  ink3: string
  accent: string
  accentInk: string
  accentSoft: string
  good: string
  bad: string
  warn: string
  info: string
  series: string[]
  /** A CSS box-shadow for cards and popovers. */
  shadow: string
}

export interface Fonts {
  /** Body and control text. */
  ui: string
  /** Titles, card titles, big numbers and the verdict pick. */
  heading: string
  mono: string
  /** Decorative glyphs such as the quote mark. */
  display: string
  /** Multiplies every font size. */
  scale: number
  /** Body line height. */
  lineHeight: number
  weightMedium: number
  weightStrong: number
  /** Web fonts to load, for families the packs name that the browser may not have. */
  faces: FontFace[]
}

export interface FontFace {
  family: string
  /** Font file URL: absolute, or a path served by the app such as /fonts/brand.woff2. */
  src: string
  weight?: string
  style?: 'normal' | 'italic'
}

export interface Spacing {
  /** Multiplies padding, margins and gaps. Below 1 is denser, above 1 roomier. */
  scale: number
}

/** Fixed labels the components show. `{name}` parts are filled in. */
const LABEL_DESC = {
  showAllRows: 'Table expand button; {count} is the row count.',
  showFewerRows: 'Table collapse button.',
  yes: 'Screen-reader text for a check in a comparison table.',
  no: 'Screen-reader text for a cross in a comparison table.',
  progressOf: 'Progress with a format; {value} and {max}.',
  mapNoData: 'A region without data on the map.',
  mapShare: 'Region share in the map legend; {share} is a percentage.',
  mapNote: 'Region map caption.',
  mapNotPlaced: 'Rows the map could not place; {regions} lists them.',
  chartTotal: 'Total row in a chart tooltip.',
  lineChart: 'Line and area chart accessible name; {series}, {categories} and {peak}.',
  columnChart: 'Column chart accessible name; {series}, {categories} and {peak}.',
  oneCategory: 'Fills {categories} when there is one.',
  categories: 'Fills {categories}; {count} is the number.',
  barChart: 'Bar chart accessible name; {count} items, {series} series.',
  donutChart: 'Donut chart accessible name; {items} lists the slices.',
  sources: 'Heading of the sources strip.',
  previousSources: 'Sources strip back button.',
  nextSources: 'Sources strip forward button.',
  sourceItem: 'Accessible name of a source card; {n} and {title}.',
  recommendation: 'Verdict kicker.',
  chooseInstead: 'Verdict alternative; {name} (shown bold) and {when}.',
  confidenceLow: 'Verdict confidence badge.',
  confidenceMedium: 'Verdict confidence badge.',
  confidenceHigh: 'Verdict confidence badge.',
  cycleBack: 'Note under a cycle Flow; {first} is the first step.',
  copyCode: 'Code copy button.',
  viewProduct: 'Product card link.',
  feelsLike: 'Weather detail; {value} is the temperature.',
  humidity: 'Weather detail; {value} is a percentage.',
  wind: 'Weather detail; {value} is km/h.',
  weatherSun: 'Weather condition.',
  weatherPartly: 'Weather condition.',
  weatherCloud: 'Weather condition.',
  weatherRain: 'Weather condition.',
  weatherStorm: 'Weather condition.',
  weatherFog: 'Weather condition.',
  weatherWind: 'Weather condition.',
  weatherSnow: 'Weather condition.',
  options: 'Accessible name of an option group without a label.',
  rating: 'Accessible name of a clickable rating without a label.',
  dateTo: 'Between the two fields of a date range.',
  decrease: 'Number input minus button.',
  increase: 'Number input plus button.',
  startDate: 'Date range start field.',
  endDate: 'Date range end field.',
  starOf: 'Rating star button; {n} and {max}.',
  ratedOf: 'Rating accessible name; {value} and {max}.',
  send: 'Multi-select chips send button.',
  sendAgain: 'Form button after sending.',
  sentToAssistant: 'Confirmation after chips or a form were sent.',
  needsApproval: 'Approval card status.',
  approved: 'Approval card status.',
  cancelled: 'Approval card status.',
  editBeforeApproving: 'Approval card edit field label.',
  cancel: 'Approval card cancel button.',
  preview: 'Approval card preview label.',
  previewEdited: 'Approval card preview label after edits.',
  edit: 'Approval card edit button.',
  doneEditing: 'Approval card edit button while editing.',
  required: 'Form error for an empty required field; {field} is its lowercased label.',
  invalidEmail: 'Form error for a bad email.',
  invalidNumber: 'Form error for a bad number.',
} as const

export type Labels = { -readonly [K in keyof typeof LABEL_DESC]: string }

export interface Radius {
  /** Multiplies the small fixed corners: buttons, inputs, chips, bars and icon tiles. */
  scale: number
  /** Cards, boxes, tables and skeletons, in px. */
  md: number
  /** Large cards and panels, in px. */
  lg: number
  /** Badges, switches and other pill shapes, in px. */
  pill: number
}

export interface Placeholders {
  skeleton: SkeletonStyle
  emptyBorder: EmptyBorder
  loading: string
  /** `{query}` is the image search query. */
  imageSearching: string
  imageMissing: string
  /** `{kind}` is chart, table or map. */
  noData: string
  chartNoRows: string
  chartNeedsFields: string
  tableNoRows: string
  mapNoRows: string
  noTabs: string
  noItems: string
  noProducts: string
  selectPrompt: string
}

export interface VizStyle {
  name: string
  label: string
  description: string
  colors: Record<Mode, Palette>
  fonts: Fonts
  radius: Radius
  spacing: Spacing
  placeholders: Placeholders
  labels: Labels
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** What a style file on disk holds: any subset of VizStyle on top of the pack it extends. */
export type StyleFile = DeepPartial<VizStyle> & { $schema?: string; extends?: string | null }

/* Shape descriptor: drives validation, the generated JSON Schema and the catalog's theme builder. */
export type StyleLeaf =
  | { t: 'string'; desc: string; color?: boolean }
  | { t: 'number'; desc: string; min: number; max: number; integer?: boolean }
  | { t: 'enum'; desc: string; values: readonly string[] }
  | { t: 'colors'; desc: string; length: number }
  | { t: 'faces'; desc: string }
export type StyleShape = { [k: string]: StyleLeaf | StyleShape }
type Leaf = StyleLeaf
type Shape = StyleShape

const color = (desc: string): Leaf => ({ t: 'string', desc, color: true })
const str = (desc: string): Leaf => ({ t: 'string', desc })
const num = (desc: string, min: number, max: number, integer = false): Leaf => ({ t: 'number', desc, min, max, integer })

const PALETTE: Shape = {
  bg: color('Page background behind cards.'),
  panel: color('Raised panels such as the code block header.'),
  surface: color('Cards, inputs and table cells.'),
  sunk: color('Recessed areas: tracks, code, skeletons.'),
  line: color('Hairline borders and dividers.'),
  lineStrong: color('Input borders and strong dividers.'),
  ink: color('Main text.'),
  ink2: color('Secondary text.'),
  ink3: color('Muted text, captions and axis labels.'),
  accent: color('Brand color: primary buttons, links, highlights.'),
  accentInk: color('Text on the accent color.'),
  accentSoft: color('Tinted accent background for icon tiles and highlights.'),
  good: color('Positive deltas and success.'),
  bad: color('Negative deltas and errors.'),
  warn: color('Warnings.'),
  info: color('Informational callouts.'),
  series: { t: 'colors', desc: 'Six chart series colors, in order.', length: 6 },
  shadow: str('CSS box-shadow for cards and popovers.'),
}

export const STYLE_SHAPE: Shape = {
  name: str('Pack id, used to select it.'),
  label: str('Display name.'),
  description: str('One line on what sets this pack apart.'),
  colors: { light: PALETTE, dark: PALETTE },
  fonts: {
    ui: str('CSS font-family for body and control text.'),
    heading: str('CSS font-family for titles, card titles and big numbers.'),
    mono: str('CSS font-family for code.'),
    display: str('CSS font-family for decorative glyphs such as the quote mark.'),
    scale: num('Multiplies every font size.', 0.75, 1.5),
    lineHeight: num('Body line height.', 1, 2.2),
    weightMedium: num('Weight for buttons, badges and labels.', 100, 900, true),
    weightStrong: num('Weight for titles and values.', 100, 900, true),
    faces: { t: 'faces', desc: 'Web fonts to load: {family, src: font file URL, weight, style}. Name the family in ui, heading, mono or display.' },
  },
  spacing: {
    scale: num('Multiplies padding, margins and gaps. Below 1 is denser.', 0.5, 2),
  },
  radius: {
    scale: num('Multiplies the small corners on buttons, inputs, chips, bars and icon tiles. 0 is square.', 0, 3),
    md: num('Corner radius of cards, boxes and tables, in px.', 0, 40),
    lg: num('Corner radius of large cards and panels, in px.', 0, 48),
    pill: num('Corner radius of badges and switches, in px. 999 is fully round.', 0, 999),
  },
  placeholders: {
    skeleton: { t: 'enum', desc: 'Loading placeholder motion.', values: ['shimmer', 'pulse', 'static'] },
    emptyBorder: { t: 'enum', desc: 'Border of the empty-data box.', values: ['dashed', 'solid', 'none'] },
    loading: str('Accessible label of a loading skeleton.'),
    imageSearching: str('Shown while an image resolves; {query} is the search query.'),
    imageMissing: str('Shown when no photo matched.'),
    noData: str('A data component with no binding; {kind} is chart, table or map.'),
    chartNoRows: str('A chart whose data has no rows.'),
    chartNeedsFields: str('A chart missing its x or y field.'),
    tableNoRows: str('A table whose data has no rows.'),
    mapNoRows: str('A region map with no matching rows.'),
    noTabs: str('Tabs with no items.'),
    noItems: str('A list card with no items.'),
    noProducts: str('A product grid with no items.'),
    selectPrompt: str('First option of a dropdown with nothing picked.'),
  },
  labels: Object.fromEntries(Object.entries(LABEL_DESC).map(([k, d]) => [k, str(d)])),
}

export const isLeaf = (s: Leaf | Shape): s is Leaf => typeof (s as Leaf).t === 'string'
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function check(v: unknown, s: Leaf, path: string, errs: string[]) {
  if (s.t === 'string') {
    if (typeof v !== 'string' || !v.trim()) errs.push(path + ': expected a non-empty string' + (s.color ? ' (a CSS color)' : ''))
  } else if (s.t === 'number') {
    if (typeof v !== 'number' || !Number.isFinite(v)) errs.push(path + ': expected a number')
    else if (v < s.min || v > s.max) errs.push(`${path}: ${v} is outside ${s.min} to ${s.max}`)
    else if (s.integer && !Number.isInteger(v)) errs.push(path + ': expected a whole number')
  } else if (s.t === 'enum') {
    if (!s.values.includes(v as string)) errs.push(`${path}: expected one of ${s.values.join(', ')}`)
  } else if (s.t === 'faces') {
    if (!Array.isArray(v)) { errs.push(path + ': expected a list of font faces'); return }
    v.forEach((f, i) => {
      const p = `${path}[${i}]`
      if (!isObj(f)) { errs.push(p + ': expected {family, src, weight, style}'); return }
      for (const k of Object.keys(f)) if (!['family', 'src', 'weight', 'style'].includes(k)) errs.push(`${p}.${k}: unknown field`)
      for (const k of ['family', 'src']) if (typeof f[k] !== 'string' || !(f[k] as string).trim()) errs.push(`${p}.${k}: expected a non-empty string`)
      if (f.weight !== undefined && !(typeof f.weight === 'string' && /^(normal|bold|[1-9]00( [1-9]00)?)$/.test(f.weight))) errs.push(p + '.weight: expected a string such as "400" or "400 700"')
      if (f.style !== undefined && f.style !== 'normal' && f.style !== 'italic') errs.push(p + '.style: expected normal or italic')
    })
  } else if (!Array.isArray(v) || v.length !== s.length || v.some((c) => typeof c !== 'string' || !c.trim())) {
    errs.push(`${path}: expected ${s.length} CSS color strings`)
  }
}

function walk(v: unknown, shape: Shape, path: string, errs: string[], partial: boolean) {
  if (!isObj(v)) { errs.push((path || 'style') + ': expected an object'); return }
  for (const k of Object.keys(v)) {
    if (!path && (k === '$schema' || k === 'extends')) continue
    if (!(k in shape)) errs.push(`${path ? path + '.' : ''}${k}: unknown field`)
  }
  for (const [k, s] of Object.entries(shape)) {
    const p = path ? path + '.' + k : k
    if (!(k in v)) { if (!partial) errs.push(p + ': missing'); continue }
    if (isLeaf(s)) check(v[k], s, p, errs)
    else walk(v[k], s, p, errs, partial)
  }
}

/** Problems with a style file as written (`partial`) or a fully resolved style. Empty means valid. */
export function validateStyle(v: unknown, partial = false): string[] {
  const errs: string[] = []
  walk(v, STYLE_SHAPE, '', errs, partial)
  if (partial && isObj(v) && v.extends !== undefined && v.extends !== null && typeof v.extends !== 'string') errs.push('extends: expected a pack name')
  return errs
}

function merge(base: unknown, over: unknown): unknown {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(over)) out[k] = merge(base[k], v)
  return out
}

export class StyleError extends Error {
  readonly problems: string[]
  constructor(source: string, problems: string[]) {
    super(`Invalid viz style ${source}:\n` + problems.map((p) => '  - ' + p).join('\n'))
    this.problems = problems
  }
}

/**
 * Resolves a style file against the packs it extends. Every file extends `default` unless it says
 * otherwise; `"extends": null` means the file must be complete on its own.
 */
export function resolveStyle(file: unknown, packs: Record<string, unknown>, source: string, fallbackName = 'custom'): VizStyle {
  const seen = new Set<string>()
  const chain: unknown[] = []
  let cur: unknown = file
  let curName = source
  for (;;) {
    const errs = validateStyle(cur, true)
    if (errs.length) throw new StyleError(curName, errs)
    chain.unshift(cur)
    const f = cur as StyleFile
    const parent = f.extends !== undefined ? f.extends : f.name === 'default' ? null : 'default'
    if (parent === null) break
    if (seen.has(parent)) throw new StyleError(source, [`extends: "${parent}" forms a cycle`])
    seen.add(parent)
    if (!(parent in packs)) throw new StyleError(source, [`extends: no pack named "${parent}" (have ${Object.keys(packs).join(', ')})`])
    cur = packs[parent]
    curName = parent
  }
  let out: unknown = {}
  for (const f of chain) {
    const { $schema: _s, extends: _e, ...rest } = f as StyleFile
    out = merge(out, rest)
  }
  if (isObj(out) && (file as StyleFile).name === undefined) out.name = fallbackName
  if (isObj(out) && (file as StyleFile).label === undefined) out.label = String(out.name)
  const errs = validateStyle(out)
  if (errs.length) throw new StyleError(source, errs)
  return out as unknown as VizStyle
}

/** The fields of `style` that differ from `base`, as a style file that extends it. */
export function diffStyle(style: VizStyle, base: VizStyle): StyleFile {
  const d = (a: unknown, b: unknown): unknown => {
    if (isObj(a) && isObj(b)) {
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(a)) {
        const v = d(a[k], b[k])
        if (v !== undefined) out[k] = v
      }
      return Object.keys(out).length ? out : undefined
    }
    return JSON.stringify(a) === JSON.stringify(b) ? undefined : a
  }
  const { name: _n, label: _l, description: _d, ...rest } = (d(style, base) ?? {}) as Partial<VizStyle>
  return { name: style.name, label: style.label, description: style.description, extends: base.name, ...rest } as StyleFile
}

const px = (n: number) => n + 'px'

/** The CSS custom properties a VizRoot sets for a style in one mode. */
export function styleVars(s: VizStyle, mode: Mode): Record<string, string> {
  const c = s.colors[mode]
  const vars: Record<string, string> = {
    '--bg': c.bg, '--panel': c.panel, '--surface': c.surface, '--sunk': c.sunk, '--line': c.line, '--line-strong': c.lineStrong,
    '--ink': c.ink, '--ink-2': c.ink2, '--ink-3': c.ink3,
    '--accent': c.accent, '--accent-ink': c.accentInk, '--accent-soft': c.accentSoft,
    '--good': c.good, '--bad': c.bad, '--warn': c.warn, '--info': c.info,
    '--shadow': c.shadow,
    '--font-ui': s.fonts.ui, '--font-heading': s.fonts.heading, '--font-mono': s.fonts.mono, '--font-display': s.fonts.display,
    '--text-scale': String(s.fonts.scale), '--leading': String(s.fonts.lineHeight),
    '--fw-medium': String(s.fonts.weightMedium), '--fw-strong': String(s.fonts.weightStrong),
    '--space-scale': String(s.spacing.scale),
    '--r-scale': String(s.radius.scale), '--r-md': px(s.radius.md), '--r-lg': px(s.radius.lg), '--r-pill': px(s.radius.pill),
    '--empty-border': s.placeholders.emptyBorder,
  }
  c.series.forEach((v, i) => { vars['--c' + (i + 1)] = v })
  return vars
}

/** @font-face rules for a style's web fonts, or an empty string when it loads none. */
export function fontFaceCss(s: VizStyle): string {
  const q = (v: string) => JSON.stringify(v).replace(/</g, '\\3c ')
  return s.fonts.faces.map((f) =>
    `@font-face { font-family: ${q(f.family)}; src: url(${q(f.src)}); font-weight: ${f.weight ?? 'normal'}; font-style: ${f.style ?? 'normal'}; font-display: swap; }`,
  ).join('\n')
}

function leafSchema(s: Leaf): Record<string, unknown> {
  if (s.t === 'string') return { type: 'string', minLength: 1, description: s.desc }
  if (s.t === 'number') return { type: s.integer ? 'integer' : 'number', minimum: s.min, maximum: s.max, description: s.desc }
  if (s.t === 'enum') return { enum: [...s.values], description: s.desc }
  if (s.t === 'faces') {
    return {
      type: 'array',
      description: s.desc,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['family', 'src'],
        properties: { family: { type: 'string', minLength: 1 }, src: { type: 'string', minLength: 1 }, weight: { type: 'string', pattern: '^(normal|bold|[1-9]00( [1-9]00)?)$' }, style: { enum: ['normal', 'italic'] } },
      },
    }
  }
  return { type: 'array', items: { type: 'string', minLength: 1 }, minItems: s.length, maxItems: s.length, description: s.desc }
}

function shapeSchema(shape: Shape): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    properties: Object.fromEntries(Object.entries(shape).map(([k, s]) => [k, isLeaf(s) ? leafSchema(s) : shapeSchema(s)])),
  }
}

/** JSON Schema for style files, for editor completion. Fields are optional because files extend a pack. */
export function styleJsonSchema(): Record<string, unknown> {
  const root = shapeSchema(STYLE_SHAPE)
  const props = root.properties as Record<string, unknown>
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Viz style pack',
    description: 'Design tokens for the visualization components. Any field left out comes from the pack named in "extends" (default: "default").',
    ...root,
    properties: {
      $schema: { type: 'string' },
      extends: { type: ['string', 'null'], description: 'Pack this file builds on. null means the file is complete on its own.' },
      ...props,
    },
  }
}
