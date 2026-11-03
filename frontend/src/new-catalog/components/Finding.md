# Finding (Headline, Takeaway, Bullets)

**File:** [`Finding.tsx`](./Finding.tsx)

Text block for the card finding — always present even when `viz` is null.

## Components

### Headline
Title of the finding. Display face, ~1.1875rem.

### Takeaway
One supporting sentence under the headline.

### Bullets
Compact list (`items: string[]`). `resolveCard` caps at 3.

## Example

```tsx
<Headline>Net new ARR hit $366K this week</Headline>
<Takeaway>Highest week this quarter.</Takeaway>
<Bullets items={['3 enterprise upgrades', 'Expansion was 61%']} />
```
