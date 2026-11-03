# RankedList

**Main part:** `ranked_list`  
**File:** [`RankedList.tsx`](./RankedList.tsx)

## Purpose

Ordered list with proportional value bars and optional per-row source logo.

## Payload

```ts
{
  component: 'ranked_list'
  unit?: Unit
  order?: 'asc' | 'desc'
  data: { label: string; value: number; unit?: Unit; source?: string }[]
}
```

Medium weight; pairs with `graph` (stack/split) or `table` (stack).
