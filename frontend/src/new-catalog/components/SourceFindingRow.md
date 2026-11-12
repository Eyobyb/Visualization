# SourceFindingRow

**File:** [`SourceProfile.tsx`](./SourceProfile.tsx)

## Purpose

One recent-intelligence row inside a source profile. It carries the same finding facts as a card — a display value, title, tag, time, and other sources — in the drawer’s compact layout.

It does not render a chart. A `kpi` row leads with the number. A `text` row leads with the sentence. A `graph` row uses that same sentence and a small line-art hint of the chart shape (`trend`, `columns`, and the other graph kinds). The real visualization stays on the card this row opens.

## Props

| Prop | Description |
|------|-------------|
| `finding.kind` | `kpi` (number lead), `text` (sentence), or `graph` (sentence + hint). Omitted: `kpi` when `value` is set, otherwise `text` |
| `finding.value` | Formatted number for `kpi`, e.g. `+38%` |
| `finding.takeaway` | One line under the title for `text` and `graph` |
| `finding.graph` | Hint shape when `kind` is `graph`: `trend`, `columns`, `columns_baseline`, `stacked_bars`, `funnel`, `pie`, `scatter`, `radar`, `gauge`, `heatmap`, `sankey`, `treemap` |
| `finding.title`, `tag`, `when` | Finding line and meta |
| `finding.with` | Other sources, rendered as “with …” |
| `finding.live` | Shows “In your stream” |
| `finding.tone` | `plain` (grey) or `surface` |
| `glyph` | Optional extra hint, after the graph glyph |
| `onSelect` | Called with `finding.id` |

## Example

```tsx
<SourceFindingRow
  finding={{
    id: 'refunds',
    value: '+38%',
    title: 'Refunds are spiking on annual plans',
    tag: 'Anomaly',
    when: '12 min ago',
    with: ['Stripe'],
    live: true,
    tone: 'surface',
  }}
/>

<SourceFindingRow
  finding={{
    id: 'handoff',
    kind: 'text',
    title: 'Support handoffs now run through Slack',
    takeaway: 'Nothing numeric — the finding is the answer.',
    tag: 'Trend',
    when: 'Yesterday',
  }}
/>

<SourceFindingRow
  finding={{
    id: 'volume',
    kind: 'graph',
    graph: 'trend',
    title: 'Ticket volume peaks on Tuesday mornings',
    takeaway: 'Staff the queue earlier on Tue.',
    tag: 'Trend',
    when: 'Oct 8',
  }}
/>
```
