# Heatmap

**Main part:** `graph` · kind `heatmap`  
**File:** [`Heatmap.tsx`](./Heatmap.tsx)

## Purpose

Intensity across two categorical axes (e.g. weekday × hour).

## Payload

```ts
{
  component: 'heatmap'
  unit?: Unit
  data: { x: string; y: string; value: number }[]
}
```
