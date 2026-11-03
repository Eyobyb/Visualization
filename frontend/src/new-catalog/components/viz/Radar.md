# Radar

**Main part:** `graph` · kind `radar`  
**File:** [`Radar.tsx`](./Radar.tsx)

## Purpose

Compare one or more series across shared indicators on a polar radar.

## Payload

```ts
{
  component: 'radar'
  unit?: Unit
  indicators: { name: string; max?: number }[]
  series: { name: string; values: number[] }[]
}
```

Each series `values.length` must match `indicators.length`.
