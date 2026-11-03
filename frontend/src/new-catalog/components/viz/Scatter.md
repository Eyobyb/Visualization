# Scatter

**Main part:** `graph` · kind `scatter`  
**File:** [`Scatter.tsx`](./Scatter.tsx)

## Purpose

Two numeric dimensions; optional `group` for series coloring.

## Payload

```ts
{
  component: 'scatter'
  unit?: Unit
  x_unit?: Unit
  y_unit?: Unit
  x_label?: string
  y_label?: string
  data: { x: number; y: number; label?: string; group?: string }[]
}
```
