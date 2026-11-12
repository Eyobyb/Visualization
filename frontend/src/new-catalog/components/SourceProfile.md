# SourceProfile

**File:** [`SourceProfile.tsx`](./SourceProfile.tsx)

## Purpose

Source-agent drawer from the Signal Drawer prototype. It identifies one agent: logo, kind, connection, description, monthly stats, an Interested toggle, collaborator chips, and recent findings.

It is not an [`IntelligenceCard`](./IntelligenceCard.md). A card shows one answer. This panel describes who contributed it.

Must render under [`NcRoot`](./Root.md).

## Props

| Prop | Description |
|------|-------------|
| `name`, `kind`, `status`, `description` | Identity |
| `contributions`, `useful` | Monthly count and percent rated useful |
| `collaborators` | Names. The third stat is `collaborators.length` |
| `interested`, `onInterestedChange` | Follow toggle |
| `findings` | [`SourceFinding`](./SourceFindingRow.md) list. No viz payloads |
| `onClose`, `onCollaborator`, `onFinding` | Bar, chips, and rows |

## Example

```tsx
<SourceProfile
  name="Zendesk"
  kind="Data source agent"
  status="Connected · Production"
  description="Monitors support tickets and tags…"
  contributions={9}
  useful={84}
  collaborators={['Stripe', 'HubSpot']}
  interested={false}
  findings={[]}
/>
```
