# Layout primitives

**File:** [`layout.tsx`](./layout.tsx)

Compose card bodies without wrapping everything in cards. Gaps follow `NcRoot` appearance when omitted.

| Component | Role |
|-----------|------|
| `Col` | Vertical stack (usual body root) |
| `Row` | Horizontal, wraps by default |
| `Grid` | Equal-width tiles; `columns` from appearance or prop |
| `Box` | Light grouped region |
| `Divider` | Rule, optional center `label` |
| `Spacer` | Empty flex space |

## Example

```tsx
<Col gap={3}>
  <Headline>…</Headline>
  <Kpi viz={…} />
  <Divider label="By region" />
  <Heatmap viz={…} />
</Col>
```

Split pairs use `<Grid columns={2}>`.
