# NcRoot

**File:** [`Root.tsx`](./Root.tsx)

## Purpose

Required root for every new-catalog tree. Loads fonts/tokens, theme, and appearance (background + layout metrics).

## Props

| Prop | Type | Default |
|------|------|---------|
| `theme` | `'light' \| 'dark'` | `'light'` |
| `appearance` | `NcAppearance` | defaults / presets |
| `className` | `string` | |

## Example

```tsx
<NcRoot theme="light" appearance={APPEARANCE_PRESETS.default}>
  <Card payload={…} />
</NcRoot>
```
