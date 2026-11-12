# Components

Intelligence card building blocks for the new catalog.

In-depth guide — what each component does, how a card is assembled, and the trim limits: [components.md](./components.md).

| Area | Docs |
|------|------|
| Shell | [NcRoot](./Root.md), [IntelligenceCard](./IntelligenceCard.md), [Card](./Card.md) |
| Finding | [Finding](./Finding.md) |
| Layout | [layout](./layout.md) |
| Helpers | [Sources](./Sources.md), [Delta](./Delta.md), [resolveCard](./resolve.md) |
| Profile | [SourceProfile](./SourceProfile.md), [SourceFindingRow](./SourceFindingRow.md) |
| Viz | [viz/README.md](./viz/README.md) |

All trees must sit under `NcRoot`. Composition allowlist: [`../config/composition.ts`](../config/composition.ts).
