import { useState, type ReactNode } from 'react'
import { Glyph, type IconName } from './Icon'
import { copyText, cx, richText, safeUrl } from './utils'
import type { Tone } from './types'

/**
 * A heading. `xl` is reserved for the single headline answer of a response.
 *
 * @example <Title text="Q3 sales review" size="xl" />
 */
export function Title({ text, size = 'lg', tone = 'ink', icon }: {
  text: string
  size?: 'xl' | 'lg' | 'md' | 'sm'
  tone?: Tone
  /** Leading icon. */
  icon?: IconName
}) {
  const Tag = ({ xl: 'h1', lg: 'h2', md: 'h3', sm: 'h4' } as const)[size]
  return (
    <Tag className={cx('ui-title', 's-' + size, 't-' + tone)}>
      {icon && <Glyph name={icon} size={size === 'xl' ? 26 : 20} />}
      {text}
    </Tag>
  )
}

/**
 * A paragraph. Supports `**bold**` and `` `code` `` inline.
 *
 * @example <Text text="Sidama grew **38%** from July to September." size="lg" />
 */
export function Text({ text, size = 'md', tone = 'ink' }: {
  text: ReactNode
  size?: 'lg' | 'md' | 'sm'
  tone?: Tone
}) {
  return <p className={cx('ui-text', 's-' + size, 't-' + tone)}>{richText(text)}</p>
}

/**
 * Small supporting text for sources, units and as-of dates.
 *
 * @example <Caption text="Source: order system, as of 30 Sep 2026." />
 */
export function Caption({ text, tone = 'muted' }: { text: ReactNode; tone?: Tone }) {
  return <p className={cx('ui-caption', 't-' + tone)}>{richText(text)}</p>
}

/**
 * A short status or category tag, three words at most.
 *
 * @example <Badge text="Paid" tone="success" icon="check" />
 */
export function Badge({ text, tone = 'muted', icon, variant = 'soft' }: {
  text: string
  tone?: Tone
  /** Leading icon. */
  icon?: IconName
  /** Visual weight. */
  variant?: 'soft' | 'solid' | 'outline'
}) {
  return (
    <span className={cx('ui-badge', 'v-' + variant, 't-' + tone)}>
      {icon && <Glyph name={icon} size={13} />}
      {text}
    </span>
  )
}

/** A list entry: plain content, or `{ time, text }` for timelines. */
export type ListItem = ReactNode | { time?: string; text: ReactNode }

const isTimed = (it: ListItem): it is { time?: string; text: ReactNode } =>
  !!it && typeof it === 'object' && !Array.isArray(it) && !('$$typeof' in it) && 'text' in it

/**
 * Parallel items as bullets, numbers, checkmarks or a timeline.
 *
 * @example
 * <List kind="timeline" items={[{ time: '09:00', text: 'Order placed' }, { time: '14:10', text: 'Delivered' }]} />
 */
export function List({ items, kind = 'bullet' }: {
  /** Strings, nodes, or `{ time, text }` for timelines. */
  items: ListItem[]
  kind?: 'bullet' | 'numbered' | 'check' | 'timeline'
}) {
  const content = (it: ListItem) => richText(isTimed(it) ? it.text : it)
  if (kind === 'timeline') {
    return (
      <ol className="ui-timeline">
        {items.map((it, i) => (
          <li key={i}>
            <span className="tm">{isTimed(it) ? it.time ?? '' : ''}</span>
            <span className="dot" />
            <div>{content(it)}</div>
          </li>
        ))}
      </ol>
    )
  }
  if (kind === 'check') {
    return (
      <ul className="ui-list check">
        {items.map((it, i) => <li key={i}><Glyph name="check" size={15} /><span>{content(it)}</span></li>)}
      </ul>
    )
  }
  const Tag = kind === 'numbered' ? 'ol' : 'ul'
  return <Tag className="ui-list">{items.map((it, i) => <li key={i}>{content(it)}</li>)}</Tag>
}

const CALLOUT_ICON = { info: 'info', success: 'check', warning: 'alert-triangle', danger: 'alert-triangle' } as const

/**
 * The one message the reader must not miss. Use at most one per response.
 *
 * @example <Callout title="Partial month" text="September excludes 41 unpaid orders." tone="warning" />
 */
export function Callout({ text, title, tone = 'info', icon }: {
  text?: ReactNode
  /** Bold first line. */
  title?: string
  /** Severity. */
  tone?: 'info' | 'success' | 'warning' | 'danger'
  /** Overrides the icon chosen by `tone`. */
  icon?: IconName
}) {
  return (
    <div className={cx('ui-callout', 't-' + tone)} role="note">
      <Glyph name={icon ?? CALLOUT_ICON[tone]} size={18} />
      <div>
        {title && <strong>{title}</strong>}
        {text != null && <span>{richText(text)}</span>}
      </div>
    </div>
  )
}

/**
 * Lightweight Markdown: `#`–`####` headings, `-`/`*` bullets and paragraphs with inline bold and code.
 * Also the fallback when a generated program cannot compile.
 *
 * @example <Markdown content={'### What changed\nRevenue rose on **Telegram** orders.\n\n- Telegram: 40%'} />
 */
export function Markdown({ content }: { content: string }) {
  const out: ReactNode[] = []
  let list: string[] | null = null
  let para: string[] = []
  const flushPara = () => {
    if (para.length) out.push(<p key={out.length} className="ui-text t-ink">{richText(para.join(' '))}</p>)
    para = []
  }
  const flushList = () => {
    if (list) out.push(<ul key={out.length} className="ui-list">{list.map((t, i) => <li key={i}>{richText(t)}</li>)}</ul>)
    list = null
  }
  for (const raw of content.split('\n')) {
    const l = raw.trim()
    let m: RegExpMatchArray | null
    if (!l) { flushPara(); flushList(); continue }
    if ((m = l.match(/^(#{1,4})\s+(.*)$/))) {
      flushPara(); flushList()
      const s = m[1].length <= 2 ? 'lg' : m[1].length === 3 ? 'md' : 'sm'
      out.push(<h3 key={out.length} className={'ui-title t-ink s-' + s}>{m[2]}</h3>)
      continue
    }
    if ((m = l.match(/^[-*]\s+(.*)$/))) { flushPara(); (list ??= []).push(m[1]); continue }
    flushList()
    para.push(l)
  }
  flushPara(); flushList()
  return <div className="ui-md">{out}</div>
}

/**
 * A link to an outside page that opens in a new tab. Only absolute http(s) URLs become clickable.
 *
 * @example <Link text="Delivery zone map" href="https://example.com/delivery-zones" />
 */
export function Link({ text, href }: { text?: string; href: string }) {
  return (
    <a className="ui-link" href={safeUrl(href)} target="_blank" rel="noopener noreferrer">
      {text ?? href}
      <Glyph name="external" size={14} />
    </a>
  )
}

/**
 * A code or query block with a language label and a copy button.
 *
 * @example <Code code={'SELECT region, SUM(revenue)\nFROM orders\nGROUP BY region;'} language="sql" />
 */
export function Code({ code, language }: { code: string; language?: string }) {
  const [done, setDone] = useState(false)
  const copy = () => {
    copyText(code)
    setDone(true)
    setTimeout(() => setDone(false), 1400)
  }
  return (
    <div className="ui-codebox">
      {language && <span className="ui-code-lang">{language}</span>}
      <button type="button" className="ui-code-copy" aria-label="Copy code" onClick={copy}>
        <Glyph name={done ? 'check' : 'copy'} size={15} />
      </button>
      <pre className="ui-code">{code}</pre>
    </div>
  )
}
