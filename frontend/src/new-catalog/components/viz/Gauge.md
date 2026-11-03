# Gauge

**Main part:** `graph` · kind `gauge`  
**File:** [`Gauge.tsx`](./Gauge.tsx)

## Purpose

Single metric on a scale, optional target tick.

## Payload

```ts
{
  component: 'gauge'
  unit?: Unit
  label?: string
  min?: number
  max?: number
  target?: number
  value: number
}
```
