# Kpi

**Main part:** `kpi` (single metric)  
**File:** [`Kpi.tsx`](./Kpi.tsx)

## Purpose

One headline number with optional delta pill and sparkline. Use when the finding is a single metric.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `viz` | `Extract<VizPayload, { component: 'kpi' }>` | KPI payload |

## Payload shape

```ts
{
  component: 'kpi'
  unit?: Unit
  data: [{
    label: string
    value: number
    unit?: Unit
    delta?: number
    delta_unit?: Unit
    period?: string
    good?: 'up' | 'down'
    spark?: number[]
  }]
}
```

Only `data[0]` is rendered.

## Composition

Light visual weight. In pairs, **stack** with `graph` / `table` / `ranked_list` — never split beside a chart alone.

## Example

```tsx
<Kpi viz={{
  component: 'kpi',
  data: [{
    label: 'Net new ARR',
    value: 366000,
    unit: 'USD',
    delta: 18,
    delta_unit: '%',
    period: 'vs last week',
    good: 'up',
    spark: [210000, 240000, 290000, 366000],
  }],
}} />
```
