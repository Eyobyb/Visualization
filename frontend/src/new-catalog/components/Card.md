# Card

**File:** [`Card.tsx`](./Card.tsx)

## Purpose

Convenience composer: runs `resolveCard`, then renders finding + one viz inside [`IntelligenceCard`](./IntelligenceCard.md).

For multi-main layouts (KPI + heatmap, split pairs), compose `IntelligenceCard` + layout primitives + viz components yourself — see the preview gallery.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `payload` | `CardPayload` | Headline, optional takeaway/bullets/viz |
| `state` | `'ready' \| 'updating'` | Updating shows chrome “Updating…” |
| `onAsk` | `() => void` | “Ask about this” |
| `onUseful` / `onNotUseful` | `() => void` | Feedback footer |

## Example

```tsx
<Card
  payload={{
    headline: 'Net new ARR hit $366K',
    severity: 'good',
    viz: { component: 'kpi', data: [{ label: 'Net new ARR', value: 366000, unit: 'USD' }] },
  }}
  onAsk={() => setOpenFull(true)}
/>
```
