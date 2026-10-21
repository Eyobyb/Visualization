import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Glyph, type IconName } from './Icon'
import { isIconName } from './icons'
import { asProse, cx, fmt, richText, safeUrl, TONES } from './utils'
import type { NumberFormat, ProseItem } from './types'

function ItemBody({ item }: { item: ProseItem }) {
  const o = asProse(item)
  return (
    <>
      {o.title != null && <b className="pi-title">{o.title}</b>}
      {o.text != null && <span className="pi-text">{richText(o.text)}</span>}
    </>
  )
}

const initiallyDone = (items: ProseItem[]) => new Set(items.flatMap((it, i) => (asProse(it).done ? [i] : [])))
const toggled = (s: Set<number>, i: number) => {
  const n = new Set(s)
  if (n.has(i)) n.delete(i)
  else n.add(i)
  return n
}

/**
 * A short answer up front: one lead sentence and up to four supporting points. Put it first in long answers.
 *
 * @example
 * <Summary text="Start on Telegram, then add a website past 300 orders a month." points={['Telegram brings 40% of orders']} />
 */
export function Summary({ text, points = [], title = 'In short', icon = 'zap' }: {
  /** Lead sentence: the answer itself. */
  text?: ReactNode
  /** Up to four short supporting points. */
  points?: ReactNode[]
  /** Label above the lead. */
  title?: string
  icon?: IconName
}) {
  return (
    <section className="ui-summary">
      <div className="ui-summary-label"><Glyph name={icon} size={14} />{title}</div>
      {text != null && <p className="ui-summary-lead">{richText(text)}</p>}
      {points.length > 0 && <ul className="ui-summary-points">{points.map((t, i) => <li key={i}>{richText(t)}</li>)}</ul>}
    </section>
  )
}

/**
 * The main takeaways, each with an optional bold title. Number them only when order matters.
 *
 * @example
 * <KeyPoints items={[{ title: 'Revenue is up.', text: 'ETB 4.82M in Q3.' }, { title: 'Refunds fell.', text: '2.1% of orders.' }]} />
 */
export function KeyPoints({ items, numbered = false, columns = 1 }: {
  /** Strings or `{ title, text, icon }`. */
  items: ProseItem[]
  /** Number the points when they are ranked or sequential. */
  numbered?: boolean
  /** Two columns suit short points. */
  columns?: 1 | 2
}) {
  const Tag = numbered ? 'ol' : 'ul'
  return (
    <Tag className={cx('ui-keypoints', columns === 2 && 'two')}>
      {items.map((it, i) => (
        <li key={i}>
          <span className="kp-mark" aria-hidden>{numbered ? i + 1 : <Glyph name={asProse(it).icon ?? 'check'} size={14} />}</span>
          <div className="pi"><ItemBody item={it} /></div>
        </li>
      ))}
    </Tag>
  )
}

/**
 * Points that each belong to a distinct category, marked by an icon tile in its own tone.
 *
 * @example
 * <IconList items={[{ icon: 'truck', title: 'Delivery', text: 'Same day inside Addis Ababa.' }, { icon: 'refresh', title: 'Returns', text: 'Within 7 days.', tone: 'warning' }]} />
 */
export function IconList({ items }: {
  /** `{ icon, title, text, tone }` entries; unknown icons fall back to `info`. */
  items: ProseItem[]
}) {
  return (
    <ul className="ui-iconlist">
      {items.map((it, i) => {
        const o = asProse(it)
        const tone = o.tone && TONES.includes(o.tone) ? o.tone : 'accent'
        return (
          <li key={i}>
            <span className={'ic t-' + tone} aria-hidden><Glyph name={isIconName(o.icon) ? o.icon : 'info'} size={16} /></span>
            <div className="pi"><ItemBody item={it} /></div>
          </li>
        )
      })}
    </ul>
  )
}

/** An outline entry with optional sub-points. */
export type NestedItem = ReactNode | { title?: string; text?: ReactNode; children?: NestedItem[] }

const asNested = (it: NestedItem): Exclude<NestedItem, ReactNode> =>
  it && typeof it === 'object' && !Array.isArray(it) && !('$$typeof' in it) ? (it as Exclude<NestedItem, ReactNode>) : { text: it as ReactNode }

/**
 * An outline with sub-points, up to four levels deep. Deeper levels render in a smaller, muted style.
 *
 * @example
 * <NestedList items={[{ title: 'Before launch', children: ['Photograph every product', { text: 'Write prices in ETB', children: ['Include delivery for Addis Ababa'] }] }]} />
 */
export function NestedList({ items, kind = 'bullet' }: {
  /** Strings or `{ title, text, children }`. */
  items: NestedItem[]
  kind?: 'bullet' | 'numbered'
}) {
  const Tag = kind === 'numbered' ? 'ol' : 'ul'
  const level = (list: NestedItem[], depth: number): ReactNode => (
    <Tag className={cx('ui-list', 'ui-nested', 'd' + depth)}>
      {list.map((it, i) => {
        const o = asNested(it)
        return (
          <li key={i}>
            {o.title != null
              ? <span><b>{o.title}</b>{o.text != null && <> {richText(o.text)}</>}</span>
              : richText(o.text ?? '')}
            {depth < 4 && o.children && o.children.length > 0 && level(o.children, depth + 1)}
          </li>
        )
      })}
    </Tag>
  )
  return level(items, 1)
}

/**
 * An ordered procedure. With `checkable`, the reader ticks steps off and a progress bar tracks them; ticks stay local.
 *
 * @example
 * <Steps checkable items={[{ title: 'Pack the order', text: 'Wrap fragile items twice.' }, { title: 'Book the courier' }]} />
 */
export function Steps({ items, checkable = false }: {
  /** Strings or `{ title, text, done }`. */
  items: ProseItem[]
  /** Let the reader mark steps done. */
  checkable?: boolean
}) {
  const [done, setDone] = useState(() => initiallyDone(items))
  return (
    <div className="ui-steps-wrap">
      {checkable && (
        <div className="ui-steps-progress">
          <span>{done.size} of {items.length} done</span>
          <span className="ui-track"><span className="ui-fill t-success" style={{ width: (items.length ? (done.size / items.length) * 100 : 0) + '%' }} /></span>
        </div>
      )}
      <ol className="ui-steps">
        {items.map((it, i) => {
          const d = done.has(i)
          return (
            <li key={i} className={d ? 'is-done' : ''}>
              {checkable ? (
                <button type="button" className="st-n" aria-pressed={d} onClick={() => setDone((s) => toggled(s, i))} aria-label={`Mark step ${i + 1} ${d ? 'not done' : 'done'}`}>
                  {d ? <Glyph name="check" size={14} /> : i + 1}
                </button>
              ) : <span className="st-n" aria-hidden>{i + 1}</span>}
              <div className="pi"><ItemBody item={it} /></div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/**
 * Items to tick off, with a running count in the header. Ticks are local UI state.
 *
 * @example <Checklist title="This week" items={['Restock coffee', { text: 'Reply to the Hawassa enquiry', done: true }]} />
 */
export function Checklist({ items, title = 'Checklist' }: {
  /** Strings or `{ title, text, done }`. */
  items: ProseItem[]
  title?: string
}) {
  const [done, setDone] = useState(() => initiallyDone(items))
  const base = useId()
  return (
    <div className="ui-checklist">
      <div className="ui-checklist-head">
        <span className="ui-label">{title}</span>
        <span className="ui-checklist-count">{done.size}/{items.length}</span>
      </div>
      <ul>
        {items.map((it, i) => {
          const o = asProse(it)
          return (
            <li key={i} className={done.has(i) ? 'is-done' : ''}>
              <input type="checkbox" id={`${base}-${i}`} checked={done.has(i)} onChange={() => setDone((s) => toggled(s, i))} />
              <label htmlFor={`${base}-${i}`}>{o.title != null && <b>{o.title} </b>}{richText(o.text ?? '')}</label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ProsConsColumn({ label, items, icon, tone }: { label: string; items: ProseItem[]; icon: IconName; tone: 'success' | 'danger' }) {
  return (
    <section className={'pc-col t-' + tone}>
      <h4><Glyph name={icon} size={15} />{label}</h4>
      <ul>
        {items.map((it, i) => <li key={i}><Glyph name={icon} size={14} /><span><ItemBody item={it} /></span></li>)}
      </ul>
    </section>
  )
}

/**
 * Advantages and drawbacks side by side; the columns stack on narrow screens.
 *
 * @example <ProsCons pros={['No setup cost']} cons={['Hard to browse a large catalogue']} prosLabel="Selling on Telegram" consLabel="Its limits" />
 */
export function ProsCons({ pros, cons, prosLabel = 'Pros', consLabel = 'Cons' }: {
  /** Strings or `{ title, text }`. */
  pros: ProseItem[]
  /** Strings or `{ title, text }`. */
  cons: ProseItem[]
  prosLabel?: string
  consLabel?: string
}) {
  return (
    <div className="ui-proscons">
      <ProsConsColumn label={prosLabel} items={pros} icon="check" tone="success" />
      <ProsConsColumn label={consLabel} items={cons} icon="x" tone="danger" />
    </div>
  )
}

/** One titled column of bullets. */
export interface BulletColumn {
  title: string
  icon?: IconName
  items: ReactNode[]
}

/**
 * Two or three titled bullet lists compared side by side.
 *
 * @example
 * <BulletColumns columns={[{ title: 'Telegram', icon: 'send', items: ['Fast to start'] }, { title: 'Website', icon: 'layers', items: ['Full catalogue'] }]} />
 */
export function BulletColumns({ columns }: { columns: BulletColumn[] }) {
  return (
    <div className="ui-bcols" style={{ gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, columns.length))}, minmax(0, 1fr))` }}>
      {columns.map((c, i) => (
        <section key={i} className="bc-col">
          <h4>{c.icon && <Glyph name={c.icon} size={15} />}{c.title}</h4>
          <ul className="ui-list">{c.items.map((t, j) => <li key={j}>{richText(t)}</li>)}</ul>
        </section>
      ))}
    </div>
  )
}

/** A label and value pair; numeric values are formatted like Stat. */
export interface Fact {
  label: string
  value: ReactNode
  format?: NumberFormat
  /** Small note under the value. */
  note?: string
}

/**
 * Label and value pairs for specs, key facts or terms. `grid` turns a few headline facts into tiles.
 *
 * @example <FactList layout="grid" items={[{ label: 'Regions served', value: 6 }, { label: 'Refund rate', value: 0.021, format: 'percent' }]} />
 */
export function FactList({ items, layout = 'rows' }: { items: Fact[]; layout?: 'rows' | 'grid' }) {
  return (
    <dl className={cx('ui-facts', layout === 'grid' && 'grid')}>
      {items.map((o, i) => (
        <div key={i} className="fact">
          <dt>{o.label}</dt>
          <dd>
            {typeof o.value === 'number' ? fmt(o.value, o.format) : richText(o.value ?? '')}
            {o.note && <small>{o.note}</small>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * A short attributed quotation, ideally under 25 words.
 *
 * @example <Quote text="I ordered on Telegram because I could ask about the colours first." source="Customer in Adama" role="Survey, September" />
 */
export function Quote({ text, source, role }: {
  text: ReactNode
  /** Who said it. */
  source?: string
  /** Their role, or where it was said. */
  role?: string
}) {
  return (
    <figure className="ui-quote">
      <span className="q-mark" aria-hidden>“</span>
      <blockquote><p>{richText(text)}</p></blockquote>
      {(source || role) && <figcaption>{source && <b>{source}</b>}{role && <span>{role}</span>}</figcaption>}
    </figure>
  )
}

/** One cited source. */
export interface Source {
  title: string
  url?: string
  publisher?: string
}

const hostOf = (href: string | undefined) => {
  if (!href) return undefined
  try {
    return new URL(href).hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}

function SourceIcon({ host, label }: { host?: string; label: string }) {
  const [failed, setFailed] = useState(false)
  if (!host || failed) return <span className="src-letter" aria-hidden>{(label.trim()[0] ?? '?').toUpperCase()}</span>
  return (
    <img
      className="src-icon"
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}

/**
 * The sources behind a researched answer, as a scrolling row of cards with each site's icon, name and
 * page title. Cards follow citation order, so the third card is source [3]. Only http(s) URLs become links.
 *
 * @example <Sources items={[{ title: 'Q3 order export', url: 'https://example.com/orders-q3', publisher: 'Order system' }]} />
 */
export function Sources({ items }: { items: Source[] }) {
  const strip = useRef<HTMLOListElement>(null)
  const [edges, setEdges] = useState({ start: true, end: items.length <= 1 })

  const measure = useCallback(() => {
    const el = strip.current
    if (el) setEdges({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 })
  }, [])

  useEffect(() => {
    measure()
    const el = strip.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure, items.length])

  const page = (dir: 1 | -1) => {
    const el = strip.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <section className="ui-sources" aria-label="Sources">
      <div className="ui-sources-h">
        <span>Sources</span>
        {!(edges.start && edges.end) && (
          <span className="ui-sources-nav">
            <button type="button" aria-label="Previous sources" disabled={edges.start} onClick={() => page(-1)}>
              <ChevronLeft size={16} />
            </button>
            <button type="button" aria-label="Next sources" disabled={edges.end} onClick={() => page(1)}>
              <ChevronRight size={16} />
            </button>
          </span>
        )}
      </div>
      <ol ref={strip} className="ui-sources-strip" onScroll={measure}>
        {items.map((o, i) => {
          const href = safeUrl(o.url)
          const host = hostOf(href)
          const name = o.publisher || host || o.title
          const body = (
            <>
              <span className="src-site">
                <SourceIcon host={host} label={name} />
                <span className="src-name">{name}</span>
              </span>
              {o.title && o.title !== name && <span className="src-title">{o.title}</span>}
            </>
          )
          return (
            <li key={i} aria-label={`Source ${i + 1}: ${o.title || name}`}>
              {href
                ? <a className="src-card" href={href} target="_blank" rel="noopener noreferrer" title={href}>{body}</a>
                : <div className="src-card">{body}</div>}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
