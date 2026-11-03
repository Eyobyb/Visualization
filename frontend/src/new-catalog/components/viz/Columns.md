# Columns & ColumnsBaseline

**Main part:** `graph` · kinds `columns`, `columns_baseline`  
**File:** [`Columns.tsx`](./Columns.tsx)

## Purpose

- **Columns** — vertical bars across categories/periods; optional `highlight` index.
- **ColumnsBaseline** — same bars vs a target `markLine`; bars tint by whether they meet the target (`good: 'up' | 'down'`).

## Props

| Component | Prop |
|-----------|------|
| `Columns` | `viz: Extract<VizPayload, { component: 'columns' }>` |
| `ColumnsBaseline` | `viz: Extract<VizPayload, { component: 'columns_baseline' }>` |

## Payload shapes

```ts
// columns
{ component: 'columns'; unit?: Unit; highlight?: number; data: BarItem[] }

// columns_baseline
{
  component: 'columns_baseline'
  unit?: Unit
  good?: 'up' | 'down'
  baseline: { label: string; value: number }
  data: BarItem[]
}
```

## Example

```tsx
<Columns viz={{
  component: 'columns',
  unit: 'USD',
  highlight: 0,
  data: [
    { label: 'Winter', value: 16.9 },
    { label: 'Spring', value: 18.4 },
  ],
}} />
```
