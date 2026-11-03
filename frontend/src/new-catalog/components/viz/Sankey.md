# Sankey

**Main part:** `graph` · kind `sankey`  
**File:** [`Sankey.tsx`](./Sankey.tsx)

## Purpose

Flow between named nodes (signup → activated → paid).

## Payload

```ts
{
  component: 'sankey'
  unit?: Unit
  nodes: { name: string }[]
  links: { source: string; target: string; value: number }[]
}
```

`source` / `target` must match node names.
