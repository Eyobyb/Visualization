# Pie

**Main part:** `graph` · kind `pie`  
**File:** [`Pie.tsx`](./Pie.tsx)

## Purpose

Share of a whole as pie or donut (default donut). Center shows total when donut.

## Payload

```ts
{
  component: 'pie'
  unit?: Unit
  donut?: boolean  // default true
  data: { label: string; value: number }[]
}
```

`resolveCard` may roll excess slices into “Other”.
