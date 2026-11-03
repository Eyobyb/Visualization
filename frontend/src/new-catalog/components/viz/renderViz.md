# renderViz

**File:** [`renderViz.tsx`](./renderViz.tsx)

## Purpose

Maps a `VizPayload` (or null) to the matching React viz component. Used by `<Card>` after `resolveCard`.

```tsx
renderViz(viz) // → <Kpi /> | <Trend /> | … | null
```

Unknown / missing payloads return `null` (text-only card body).
