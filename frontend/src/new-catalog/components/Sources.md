# Sources

**File:** [`Sources.tsx`](./Sources.tsx)

## Purpose

Logo tiles for the card byline (and ranked-list row sources). Shows up to three names, then overflow is handled by the parent byline.

## Props

| Prop | Type |
|------|------|
| `names` | `string[]` |
| `size` | `number?` (default 24) |

Known logos live in `logos.ts`; unknown names get a two-letter mono tile.

## SourceMark

One logo, not a stack. Used by the source profile.

| Prop | Type |
|------|------|
| `name` | `string` |
| `size` | `'avatar' \| 'chip'` (default `chip`) |

`avatar` is the 68px header mark. `chip` is the 26px collaborator mark, with no byline overlap.
