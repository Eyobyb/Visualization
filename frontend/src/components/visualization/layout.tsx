import { useState, type ReactNode } from 'react'
import { Glyph, type IconName } from './Icon'
import { CardHead, Empty } from './shared'
import { cx, FLEX_ALIGN, space } from './utils'
import type { Align, CardTone, Space } from './types'

/**
 * Stacks blocks vertically. The usual root of a response.
 *
 * @example
 * <Col gap={2}>
 *   <Title text="Delivery status" size="md" />
 *   <Text text="Three orders left the Bole hub this morning." />
 * </Col>
 */
export function Col({ children, gap = 3, align = 'stretch' }: {
  children: ReactNode
  /** Space between blocks. */
  gap?: Space
  /** Horizontal alignment of the blocks. */
  align?: Align
}) {
  return <div className="ui-col" style={{ gap: space(gap), alignItems: FLEX_ALIGN[align] }}>{children}</div>
}

/**
 * Places items side by side and wraps them onto new lines on narrow screens.
 *
 * @example
 * <Row>
 *   <Badge text="Telegram" icon="send" />
 *   <Badge text="Walk-in" variant="outline" />
 * </Row>
 */
export function Row({ children, gap = 2, align = 'center', justify = 'start', wrap = true }: {
  children: ReactNode
  /** Space between items. */
  gap?: Space
  /** Vertical alignment. */
  align?: Align
  /** Horizontal distribution. */
  justify?: 'start' | 'center' | 'end' | 'between'
  /** Wrap to new lines when the row is full. */
  wrap?: boolean
}) {
  return (
    <div className="ui-row" style={{ gap: space(gap), alignItems: FLEX_ALIGN[align], justifyContent: FLEX_ALIGN[justify], flexWrap: wrap ? 'wrap' : 'nowrap' }}>
      {children}
    </div>
  )
}

/**
 * Groups a few elements with a light boundary, for when a Card would be too heavy.
 *
 * @example
 * <Box background="sunk" border={false} gap={1}>
 *   <Caption text="Pickup point" />
 *   <Text text="**Bole Medhanialem**, next to Edna Mall" />
 * </Box>
 */
export function Box({ children, padding = 3, gap = 2, border = true, background = 'none', radius = 'md' }: {
  children: ReactNode
  /** Inner padding. */
  padding?: Space
  /** Space between children. */
  gap?: Space
  /** Show a border. */
  border?: boolean
  /** Fill colour. */
  background?: 'none' | 'surface' | 'sunk' | 'accent' | 'info' | 'success' | 'warning' | 'danger'
  /** Corner rounding. */
  radius?: 'none' | 'sm' | 'md' | 'lg'
}) {
  return (
    <div className={cx('ui-box', border && 'bordered', background !== 'none' && 'bg-' + background, 'r-' + radius)} style={{ padding: space(padding), gap: space(gap) }}>
      {children}
    </div>
  )
}

/**
 * Equal-width tiles that reflow to fewer columns as the container narrows.
 *
 * @example
 * <Grid columns={3}>
 *   <Stat label="Orders" value={412} />
 *   <Stat label="Returns" value={9} />
 *   <Stat label="Avg basket" value={375} format="currency" />
 * </Grid>
 */
export function Grid({ children, columns = 2, gap = 3 }: {
  children: ReactNode
  /** Columns at full width; drops to 2 and then 1 on narrow containers. */
  columns?: 2 | 3 | 4
  /** Space between tiles. */
  gap?: Space
}) {
  return <div className={'ui-grid c' + columns} style={{ gap: space(gap) }}>{children}</div>
}

/**
 * A self-contained unit with an optional header. The base of every dashboard card.
 *
 * @example
 * <Card title="Quarter closed" subtitle="Jul to Sep 2026" icon="chart">
 *   <Text text="Your shop crossed ETB 4.8M in Q3, up 11.8% on Q2." />
 * </Card>
 */
export function Card({ children, title, subtitle, icon, tone = 'default', padding = 4 }: {
  children?: ReactNode
  /** Header title. */
  title?: string
  /** Line under the title. */
  subtitle?: string
  /** Header icon. */
  icon?: IconName
  /** Tints the card to draw attention. */
  tone?: CardTone
  /** Inner padding. */
  padding?: Space
}) {
  return (
    <section className={cx('ui-card', tone !== 'default' && 'has-tone t-' + tone)} style={{ padding: space(padding) }}>
      <CardHead title={title} subtitle={subtitle} icon={icon} />
      {children}
    </section>
  )
}

/** One tab: the label on the tab strip and the content shown when it is selected. */
export interface TabItem {
  label: string
  content: ReactNode
}

/**
 * Switches between alternative views of one subject. The selected tab is local UI state.
 *
 * @example
 * <Tabs items={[
 *   { label: 'Revenue', content: <Chart type="area" data={weekly} x="week" y="revenue" /> },
 *   { label: 'Orders', content: <Chart type="bar" data={weekly} x="week" y="orders" /> },
 * ]} />
 */
export function Tabs({ items }: { items: TabItem[] }) {
  const [selected, setSelected] = useState(0)
  if (!items.length) return <Empty text="No tabs" />
  const cur = Math.min(selected, items.length - 1)
  return (
    <div className="ui-tabs">
      <div className="ui-tablist" role="tablist">
        {items.map((t, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === cur} className={cx('ui-tab', i === cur && 'is-on')} onClick={() => setSelected(i)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="ui-tabpanel" role="tabpanel">{items[cur].content}</div>
    </div>
  )
}

/** One collapsible section. */
export interface AccordionItem {
  title: string
  content: ReactNode
}

/**
 * Collapsible sections for secondary detail the reader may skip: methods, assumptions, FAQ.
 *
 * @example
 * <Accordion items={[{ title: 'How is revenue counted?', content: 'Paid orders only, net of refunds.' }]} />
 */
export function Accordion({ items }: { items: AccordionItem[] }) {
  return (
    <div className="ui-acc">
      {items.map((it, i) => (
        <details key={i}>
          <summary><span>{it.title}</span><Glyph name="chevron-down" size={16} /></summary>
          <div className="ui-acc-body">{it.content}</div>
        </details>
      ))}
    </div>
  )
}

/**
 * A horizontal rule that separates sections, optionally with a label in the middle.
 *
 * @example <Divider label="Refunds" />
 */
export function Divider({ label }: {
  /** Text shown in the middle of the line. */
  label?: string
}) {
  return label
    ? <div className="ui-divider has-label" role="separator"><span>{label}</span></div>
    : <hr className="ui-divider" />
}
