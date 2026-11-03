# KpiStrip

**Main part:** `kpi_strip`  
**File:** [`KpiStrip.tsx`](./KpiStrip.tsx)

## Purpose

Two to four headline metric tiles in a responsive grid. Prefer this over a lone `kpi` when pairing beside a chart in a **split** layout.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `viz` | `Extract<VizPayload, { component: 'kpi_strip' }>` | Strip payload |

## Payload shape

```ts
{
  component: 'kpi_strip'
  unit?: Unit
  data: KpiItem[]  // typically 2–4
}
```

`resolveCard` caps the strip at 4 tiles. The first item’s `period` is shown under the grid when present.

## Composition

Medium weight. Allowed with `graph` (stack or split), `table` (stack), `ranked_list` (split). Do not combine with `kpi` on the same card.

## Example

```tsx
<KpiStrip viz={{
  component: 'kpi_strip',
  data: [
    { label: 'Trials', value: 1284, delta: 6, delta_unit: '%', good: 'up' },
    { label: 'Activation', value: 42, unit: '%', delta: 3, delta_unit: 'pt', good: 'up' },
  ],
}} />
```
