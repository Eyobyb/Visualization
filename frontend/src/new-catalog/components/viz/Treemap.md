# Treemap

**Main part:** `graph` · kind `treemap`  
**File:** [`Treemap.tsx`](./Treemap.tsx)

## Purpose

Nested rectangles for hierarchical share (segment → plan).

## Payload

```ts
{
  component: 'treemap'
  unit?: Unit
  data: { label: string; value: number; children?: TreeMapItem[] }[]
}
```
