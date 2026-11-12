# How the components work

Every new-catalog surface is built from the pieces in this folder. A card shows one finding. A source profile shows who produced findings. Charts never invent their own copy: the frontend formats numbers, and `resolveCard` trims a payload before anything paints.

All of these must render under [`NcRoot`](./Root.md). Tokens, fonts, and appearance live there.

Per-file notes are linked from each section. This page is the map of how they fit together.

## List

| Component | File | Role |
|-----------|------|------|
| [NcRoot](#ncroot) | [`Root.tsx`](./Root.tsx) | Theme, tokens, appearance |
| [IntelligenceCard](#intelligencecard) | [`IntelligenceCard.tsx`](./IntelligenceCard.tsx) | Card chrome: sources, severity, fold, footer |
| [Card](#card) | [`Card.tsx`](./Card.tsx) | One payload → finding + one viz |
| [Headline, Takeaway, Bullets](#finding) | [`Finding.tsx`](./Finding.tsx) | The sentence of the finding |
| [Col, Row, Grid, Box, Divider, Spacer](#layout) | [`layout.tsx`](./layout.tsx) | Place children without another card |
| [Sources, SourceMark](#sources-and-sourcemark) | [`Sources.tsx`](./Sources.tsx) | Logo tiles and the profile mark |
| [Delta](#delta) | [`Delta.tsx`](./Delta.tsx) | Change pill |
| [format](#format) | [`format.ts`](./format.ts) | Number, date, and delta strings |
| [resolveCard](#resolvecard) | [`resolve.ts`](./resolve.ts) | Trim and drop bad rows |
| [renderViz](#renderviz) | [`viz/renderViz.tsx`](./viz/renderViz.tsx) | Payload id → viz component |
| [SourceProfile](#sourceprofile) | [`SourceProfile.tsx`](./SourceProfile.tsx) | Source-agent drawer |
| [SourceFindingRow](#sourcefindingrow) | [`SourceProfile.tsx`](./SourceProfile.tsx) | One recent finding in that drawer |
| [FindingGlyph](#findingglyph) | [`FindingGlyph.tsx`](./FindingGlyph.tsx) | Line-art hint on a graph row |
| [Kpi](#kpi) | [`viz/Kpi.tsx`](./viz/Kpi.tsx) | One number |
| [KpiStrip](#kpistrip) | [`viz/KpiStrip.tsx`](./viz/KpiStrip.tsx) | Two to four numbers |
| [RankedList](#rankedlist) | [`viz/RankedList.tsx`](./viz/RankedList.tsx) | Ordered rows with bars |
| [Table](#table) | [`viz/Table.tsx`](./viz/Table.tsx) | Attribute rows |
| [Trend](#trend) | [`viz/Trend.tsx`](./viz/Trend.tsx) | Line over time |
| [Columns, ColumnsBaseline](#columns-and-columnsbaseline) | [`viz/Columns.tsx`](./viz/Columns.tsx) | Vertical bars, optional target |
| [Funnel](#funnel) | [`viz/Funnel.tsx`](./viz/Funnel.tsx) | Stages that lose volume |
| [StackedBars](#stackedbars) | [`viz/StackedBars.tsx`](./viz/StackedBars.tsx) | Share across segments |
| [Pie](#pie) | [`viz/Pie.tsx`](./viz/Pie.tsx) | Share of a whole |
| [Scatter](#scatter) | [`viz/Scatter.tsx`](./viz/Scatter.tsx) | Two numeric axes |
| [Radar](#radar) | [`viz/Radar.tsx`](./viz/Radar.tsx) | Series across indicators |
| [Gauge](#gauge) | [`viz/Gauge.tsx`](./viz/Gauge.tsx) | One value on a scale |
| [Heatmap](#heatmap) | [`viz/Heatmap.tsx`](./viz/Heatmap.tsx) | Intensity on two categories |
| [Sankey](#sankey) | [`viz/Sankey.tsx`](./viz/Sankey.tsx) | Flow between nodes |
| [Treemap](#treemap) | [`viz/Treemap.tsx`](./viz/Treemap.tsx) | Nested share |
| [NcChart](#ncchart) | [`viz/echarts.tsx`](./viz/echarts.tsx) | Shared chart host |

## How a card is assembled

A card has three layers.

1. **Chrome.** `IntelligenceCard` draws the source byline, the severity dot, the surface, and the useful / not-useful / Ask footer. It does not know what the finding says.
2. **Finding.** `Headline`, `Takeaway`, and `Bullets` are the words. A card can be text-only: headline and takeaway, no viz.
3. **Mains.** Zero, one, or two visual blocks. The main parts are `kpi`, `kpi_strip`, `ranked_list`, `table`, and `graph`. Every chart kind (trend, columns, funnel, pie, and the rest) is the single main part `graph`.

`Card` is the short path: pass a `CardPayload`, it runs `resolveCard`, then renders finding plus one viz. Pairs (a KPI stacked on a chart, two charts side by side) are composed by hand:

```tsx
<NcRoot>
  <IntelligenceCard sources={['Zendesk']} updated="40m ago" severity="info" foldable brief={brief}>
    <Col gap={3}>
      <Headline>Support load peaks Tuesday mornings</Headline>
      <Takeaway>Staff the queue earlier on Tue.</Takeaway>
      <Kpi viz={kpiViz} />
      <Divider label="By hour" />
      <Heatmap viz={heatViz} />
    </Col>
  </IntelligenceCard>
</NcRoot>
```

Allowed pairs and layouts live in [`../config/composition.ts`](../config/composition.ts).

| Pair | Layouts |
|------|---------|
| kpi + graph, kpi + table, kpi + ranked_list | stack |
| kpi_strip + graph, ranked_list + graph | stack or split |
| kpi_strip + table, ranked_list + table, table + graph | stack |
| kpi_strip + ranked_list, graph + graph | split |

`kpi` and `kpi_strip` do not share a card. Two of the same non-graph main do not share a card. `table` does not sit beside a graph in a split.

Weights: `kpi` is light, `kpi_strip` and `ranked_list` are medium, `table` and `graph` are heavy. Light pieces stack under a chart. Medium pieces can sit beside one.

## NcRoot

[`Root.tsx`](./Root.tsx) · [`Root.md`](./Root.md)

`NcRoot` mounts the catalog stylesheet, the DM Sans / Outfit / DM Mono faces, and the appearance context. `theme` is `light` or `dark`. `appearance` sets card padding, radius, gap, column count, and surface colors. Children read those values with `useNcAppearance` and `useNcGap`.

Without this wrapper, color tokens and fonts are missing. The lab and the gallery each mount one root around the whole page.

## IntelligenceCard

[`IntelligenceCard.tsx`](./IntelligenceCard.tsx) · [`IntelligenceCard.md`](./IntelligenceCard.md)

The shell. Props:

| Prop | What it does |
|------|----------------|
| `sources` | Up to two names in the byline, then `+N`. Logos come from `Sources`. |
| `updated` | Relative time on the right. |
| `severity` | `crit`, `warn`, `good`, `info`, or `neutral`. Sets the dot and, on a mesh surface, the gradient stops. |
| `attention` | Mesh gradient when true. Plain surface otherwise. |
| `surface` | Overrides the appearance default (`mesh` or plain). |
| `state` | `ready`, or `updating` which replaces the time with “Updating…”. |
| `hidden` | When greater than 0, the footer can show “+N more in thread”. |
| `onAsk`, `onUseful`, `onNotUseful` | Footer actions. A vote sticks for the session and shows “Thanks” or “Noted”. |
| `foldable` | Progressive disclosure, matching Signal Drawer Simplified. |
| `brief` | `{ headline, takeaway? }` shown while folded. |
| `glyph` | Small hint in the bottom-right of the folded brief. |
| `defaultOpen` / `open` / `onOpenChange` | Uncontrolled or controlled fold. |
| `children` | Body. Visible when the card is open, or always when it is not foldable. |

Folded behavior: hover, focus, click, or Enter / Space opens the card. Leaving the card or clicking the header closes it. The folded panel and the open panel cross-fade; the closed panel is `inert`. The footer is part of the open body.

The header click does not fire Ask. Ask is its own button.

## Card

[`Card.tsx`](./Card.tsx) · [`Card.md`](./Card.md)

`Card` accepts one `CardPayload` and always renders a single main. Flow:

1. `resolveCard(payload)` returns a cleaned card, a viz or `null`, and a `hidden` count.
2. `IntelligenceCard` receives sources, time, severity, attention, and `hidden`.
3. The body is a `Col`: `Headline`, optional `Takeaway`, optional `Bullets`, then `renderViz(viz)`.

An empty or fully trimmed viz becomes a text-only card. Multi-main layouts skip `Card` and compose `IntelligenceCard` directly.

`CardPayload` fields: `headline` (required), `takeaway`, `bullets`, `sources`, `updated`, `severity`, `attention`, `viz`, `total_rows`.

## Finding

[`Finding.tsx`](./Finding.tsx) · [`Finding.md`](./Finding.md)

| Component | Behavior |
|-----------|----------|
| `Headline` | Display-face title, about 1.1875rem. States the finding. |
| `Takeaway` | One supporting sentence in secondary ink. |
| `Bullets` | A compact list. Renders nothing when `items` is empty. `resolveCard` keeps the first three bullets before they reach this component. |

These components do not read the viz. Put them in the card body in that order.

## Layout

[`layout.tsx`](./layout.tsx) · [`layout.md`](./layout.md)

Gaps use the scale `1`–`6` (4px through 24px). When `Col` omits `gap`, it uses the gap from `NcRoot` appearance.

| Component | Behavior |
|-----------|----------|
| `Col` | Vertical stack. The usual body root. `align` defaults to stretch. |
| `Row` | Horizontal, wraps unless `wrap={false}`. Default gap is `2`, align center. |
| `Grid` | Equal columns. `columns` defaults to appearance. `2` is the split-pair layout and collapses to one column on small screens. |
| `Box` | A tinted group for a region that should not be its own card. Padded by default. |
| `Divider` | A rule. With `label`, the label sits in the center. |
| `Spacer` | Empty vertical space. Default size `3` (10px). |

## Sources and SourceMark

[`Sources.tsx`](./Sources.tsx) · [`Sources.md`](./Sources.md)

`Sources` draws up to three overlapping logo tiles for a card byline or a ranked-list row. Known marks are in [`logos.ts`](./logos.ts). An unknown name gets a two-letter monogram. `size` is in design pixels (default 24) and is emitted as rem.

`SourceMark` draws one logo with no stack and no overlap shadow.

| `size` | Use |
|--------|-----|
| `avatar` | 68px profile header, 20px corner radius |
| `chip` | 26px collaborator pill |

## Delta

[`Delta.tsx`](./Delta.tsx) · [`Delta.md`](./Delta.md)

A pill: arrow, formatted change, optional period. `good` is `'up'` or `'down'` and decides whether a rise is healthy. A missing or non-finite `delta` renders nothing. Zero is flat. `Kpi` and `KpiStrip` use this for each tile.

## format

[`format.ts`](./format.ts)

The frontend owns every displayed number. Callers pass a raw value and a unit.

| Function | Behavior |
|----------|----------|
| `fmt(value, unit)` | `USD` → `$366K` / `$1.2M`. `%` → `18%`. `x` → `2.1×`. `h` and `days` keep one decimal. `pt` → `3 pt`. Empty unit uses a compact magnitude. Negatives use a minus sign. |
| `compact` | Magnitude only: `M` from one million, `K` from one hundred thousand. |
| `fmtDelta` | Signed change. Bare unit defaults to percent. |
| `deltaTone` | `good`, `bad`, or `flat`, using `good: 'down'` when a decrease is the healthy direction. |
| `arrow` | `↑`, `↓`, or `→`. |
| `fmtX` | `YYYY-MM-DD` becomes `Oct 5`. Anything else is stringified. |
| `rem` | Design pixels to rem at a 16px root. |

## resolveCard

[`resolve.ts`](./resolve.ts) · [`resolve.md`](./resolve.md)

`resolveCard` copies the payload, caps bullets at three, drops rows whose measure is missing, and trims to the preview limit. It does not change the component id (a trend with two points stays a trend; step-down between kinds is a generation concern, not a render concern). When nothing usable remains, `viz` is `null` and the card is text-only.

`hidden` is how many rows were cut. `total_rows`, when larger than the shown count, raises `hidden` so the card can offer the rest in a thread.

| Component | Preview limit |
|-----------|----------------|
| kpi | 1 value |
| kpi_strip | 4 tiles |
| trend | latest 30 points |
| columns, columns_baseline | 8 bars. Ranked columns keep the top 8; time columns keep the latest 8 |
| ranked_list | 5 rows, sorted by `order` |
| table | 3 rows, 4 columns |
| funnel | 5 stages, keeping the first four and the last |
| stacked_bars | 6 bars, 4 segments. Extra segments fold into Other |
| pie | 6 slices. Extra slices fold into Other |
| scatter | 40 points |
| radar | 8 indicators, 3 series |
| gauge | requires a finite `value` |
| heatmap | 48 cells |
| sankey | 16 positive links. Unused nodes are dropped |
| treemap | 12 nodes |

## renderViz

[`viz/renderViz.tsx`](./viz/renderViz.tsx) · [`viz/renderViz.md`](./viz/renderViz.md)

Switches on `viz.component` and returns the matching component, or `null` when the payload is missing. `Card` is the caller. A hand-built card imports `Kpi`, `Trend`, and the rest directly so the tree stays explicit.

## SourceProfile

[`SourceProfile.tsx`](./SourceProfile.tsx) · [`SourceProfile.md`](./SourceProfile.md)

The source-agent drawer from the Signal Drawer. It identifies an agent. It is not an `IntelligenceCard`: there is no severity mesh, no Ask footer, and no chart.

From top to bottom:

1. Bar. The label “Intelligence source” and a close button (`onClose`).
2. Identity. `SourceMark` avatar, name, `kind` pill (“Data source agent”), and `status` pill (“Connected · Production”) with a lime dot.
3. `description`.
4. Three stats: `contributions` this month, `useful` percent, and `collaborators.length`.
5. Interested toggle. `interested` and `onInterestedChange` are controlled. Pressed state reads “Interested”; the resting label is “Interested?”. The note under it explains that interest ranks the agent higher and allows notifications.
6. Collaborator chips. Each chip is a `SourceMark` plus the name. `onCollaborator` receives the name.
7. Recent intelligence. A `SourceFindingRow` per item. `onFinding` receives the finding id.

`className` lands on the aside, so the lab can cap the height and let the body scroll.

## SourceFindingRow

[`SourceProfile.tsx`](./SourceProfile.tsx) · [`SourceFindingRow.md`](./SourceFindingRow.md)

One recent finding inside the profile. It carries the same facts as a card — title, tag, time, other sources — and chooses a lead from `kind`.

| `kind` | Lead | When to use |
|--------|------|-------------|
| `kpi` | The formatted `value` (`+38%`, `2.4h`) beside a medium title | The finding is one number |
| `text` | The title in the display face, then `takeaway` | The finding has no chart and no single number |
| `graph` | The same sentence as text, plus a `FindingGlyph` | The full card’s main is a graph |

If `kind` is omitted, a `value` selects `kpi`, a `graph` field selects `graph`, and anything else is `text`.

Shared chrome: `tag · when · with …`, a lime “In your stream” line when `live` is set, and `tone` of `plain` (grey, hairline) or `surface` (light fill). `onSelect` receives `finding.id`. An optional `glyph` slot can sit after the built-in hint; the sample rows leave it empty.

The row does not mount `Trend`, `Funnel`, or any other viz. Opening the row is what shows the real chart, on the card.

## FindingGlyph

[`FindingGlyph.tsx`](./FindingGlyph.tsx)

Private to the graph row. A 96×34 line drawing that names the chart shape. `kind` is a `GraphKind`:

`trend`, `columns`, `columns_baseline`, `stacked_bars`, `funnel`, `pie`, `scatter`, `radar`, `gauge`, `heatmap`, `sankey`, `treemap`.

Quiet marks use partial ink. The latest or emphasized mark is full ink. A trend’s last point carries the lime halo used on the Signal Drawer briefs. A missing `graph` on a graph row falls back to `trend`.

## Viz components

Each viz takes one prop, `viz`, whose `component` field matches the component. Numbers inside are raw; `fmt` prints them. Chart kinds render through [`NcChart`](#ncchart). Limits below are what `resolveCard` enforces before render. The component itself draws whatever it is given.

Full payload types are in [`types.ts`](./types.ts). Shorter notes live beside each file under [`viz/`](./viz/).

### Kpi

[`viz/Kpi.tsx`](./viz/Kpi.tsx) · [`viz/Kpi.md`](./viz/Kpi.md)

One `KpiItem`: label, formatted value, optional `Delta`, optional sparkline. Only `data[0]` is shown. Light weight. Stack it with a graph, table, or ranked list. Do not split it beside a chart by itself.

### KpiStrip

[`viz/KpiStrip.tsx`](./viz/KpiStrip.tsx) · [`viz/KpiStrip.md`](./viz/KpiStrip.md)

A responsive grid of the same tiles, capped at four. The first item’s `period` is printed under the grid when present. Medium weight. This is the strip to place beside a chart. Do not combine it with `kpi`.

### RankedList

[`viz/RankedList.tsx`](./viz/RankedList.tsx) · [`viz/RankedList.md`](./viz/RankedList.md)

Rows sorted by `order` (`desc` by default), each with a bar proportional to the max value and an optional source logo. Capped at five. Medium weight. Stack or split with a graph; stack with a table.

### Table

[`viz/Table.tsx`](./viz/Table.tsx) · [`viz/Table.md`](./viz/Table.md)

Columns declare `key`, `label`, and a `type` (`text`, `date`, `number`, `USD`, `%`, `h`). Cell values are formatted from that type. Preview is three rows by four columns. Heavy, and full width: stack it, including with a graph. Do not split it beside a chart.

### Trend

[`viz/Trend.tsx`](./viz/Trend.tsx) · [`viz/Trend.md`](./viz/Trend.md)

A line and area over `data[].x` / `y`. `y2` is a dashed comparison series. `series` supplies legend names. Dates in `YYYY-MM-DD` are labeled with `fmtX`. Capped at the latest 30 points.

### Columns and ColumnsBaseline

[`viz/Columns.tsx`](./viz/Columns.tsx) · [`viz/Columns.md`](./viz/Columns.md)

`Columns` draws vertical bars. `highlight` emphasizes one index. `order: 'rank'` tells `resolveCard` to keep the largest bars; `order: 'time'` keeps the latest.

`ColumnsBaseline` draws the same bars against `baseline.label` / `baseline.value`. `good: 'up' | 'down'` tints a bar by whether meeting the line is healthy. Both cap at eight bars.

### Funnel

[`viz/Funnel.tsx`](./viz/Funnel.tsx) · [`viz/Funnel.md`](./viz/Funnel.md)

Stages in order, top to bottom. Each label includes conversion from the stage above. The sharpest drop is marked. Cap is five stages: the first four and the last.

### StackedBars

[`viz/StackedBars.tsx`](./viz/StackedBars.tsx) · [`viz/StackedBars.md`](./viz/StackedBars.md)

Horizontal bars. `segments` names the stacks. Each row’s `values` map segment name to a number. More than four segments collapse the smallest into Other. More than six bars keep the latest six.

### Pie

[`viz/Pie.tsx`](./viz/Pie.tsx) · [`viz/Pie.md`](./viz/Pie.md)

Share of a whole. `donut` defaults to true and the center shows the total. Slices sort by value. More than six become the top five plus Other.

### Scatter

[`viz/Scatter.tsx`](./viz/Scatter.tsx) · [`viz/Scatter.md`](./viz/Scatter.md)

Points with `x`, `y`, optional `label` and `group`. Axis titles come from `x_label` / `y_label`, units from `x_unit` / `y_unit`. Rows need both coordinates. Cap is 40 points.

### Radar

[`viz/Radar.tsx`](./viz/Radar.tsx) · [`viz/Radar.md`](./viz/Radar.md)

`indicators` are the spokes (`name`, optional `max`). `series` are the polygons; `values` line up with the indicators. Empty indicators or series drop the viz. Caps: eight spokes, three series.

### Gauge

[`viz/Gauge.tsx`](./viz/Gauge.tsx) · [`viz/Gauge.md`](./viz/Gauge.md)

One `value` between `min` and `max`, with an optional `target` tick and `label`. A non-finite value drops the viz.

### Heatmap

[`viz/Heatmap.tsx`](./viz/Heatmap.tsx) · [`viz/Heatmap.md`](./viz/Heatmap.md)

Cells of `{ x, y, value }` for two categories, such as weekday by hour. Cap is 48 cells.

### Sankey

[`viz/Sankey.tsx`](./viz/Sankey.tsx) · [`viz/Sankey.md`](./viz/Sankey.md)

`nodes` are names. `links` are `{ source, target, value }`. Non-positive links are dropped. Cap is 16 links, and nodes that no remaining link touches are removed. Empty nodes or links drop the viz.

### Treemap

[`viz/Treemap.tsx`](./viz/Treemap.tsx) · [`viz/Treemap.md`](./viz/Treemap.md)

Rectangles sized by `value`. `children` nest a segment into plans or products. Cap is 12 top-level nodes.

### NcChart

[`viz/echarts.tsx`](./viz/echarts.tsx) · [`viz/echarts.md`](./viz/echarts.md)

The ECharts host used by the graph kinds. It applies the catalog font, ink, and tooltip colors so a chart matches the card. Viz components pass an option builder; screens do not use `NcChart` directly.
