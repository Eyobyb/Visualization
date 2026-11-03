# StackedBars

**Main part:** `graph` · kind `stacked_bars`  
**File:** [`StackedBars.tsx`](./StackedBars.tsx)

## Purpose

Horizontal stacked bars for share of a total across named segments.

## Payload

```ts
{
  component: 'stacked_bars'
  unit?: Unit
  segments: string[]
  data: { label: string; values: Record<string, number> }[]
}
```

`segments` defines series order and legend; each row’s `values` keys must match.
