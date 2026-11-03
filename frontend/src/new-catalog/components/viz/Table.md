# Table

**Main part:** `table`  
**File:** [`Table.tsx`](./Table.tsx)

## Purpose

Multi-attribute rows that do not fit a chart. Always needs width — **stack only** with other mains, never split beside a graph.

## Payload

```ts
{
  component: 'table'
  columns: { key: string; label: string; type?: 'text' | 'date' | 'number' | 'USD' | '%' | 'h' }[]
  rows: Record<string, unknown>[]
}
```

`resolveCard` trims to a small preview (e.g. 3×4) and sets `hidden` / `total_rows` for the thread affordance.
