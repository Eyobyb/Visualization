# Trend

**Main part:** `graph` · kind `trend`  
**File:** [`Trend.tsx`](./Trend.tsx)

## Purpose

Line (+ area) over time. Optional dashed comparison series via `y2`.

## Props

| Prop | Type |
|------|------|
| `viz` | `Extract<VizPayload, { component: 'trend' }>` |

## Payload shape

```ts
{
  component: 'trend'
  unit?: Unit
  series?: [string, string?]  // legend labels
  data: { x: string; y: number; y2?: number }[]
}
```

## When to use

Time-series change, YoY / prior-period compare. Cap ~30 points after `resolveCard`.

## Example

```tsx
<Trend viz={{
  component: 'trend',
  series: ['This year', 'Last year'],
  data: [
    { x: '2026-09-01', y: 1810, y2: 1700 },
    { x: '2026-10-01', y: 2108, y2: 1818 },
  ],
}} />
```
