# IntelligenceCard

**File:** [`IntelligenceCard.tsx`](./IntelligenceCard.tsx)

## Purpose

Card chrome only: source byline, severity, children slot, optional “+N more in thread”, feedback footer + Ask.

Does not know about viz payloads — put [`Headline`](./Finding.md) / viz / layout children inside.

## Props

| Prop | Description |
|------|-------------|
| `sources`, `updated`, `severity`, `attention` | Header metadata |
| `surface` | Override card background from appearance |
| `state` | `ready` / `updating` |
| `hidden` | Shows “+N more in thread” when > 0 |
| `onAsk`, `onUseful`, `onNotUseful` | Footer actions |
| `children` | Body |

Must render under [`NcRoot`](./Root.md).
