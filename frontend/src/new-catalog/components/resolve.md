# resolveCard

**File:** [`resolve.ts`](./resolve.ts)

## Purpose

Normalizes a [`CardPayload`](./types.ts) before render: filter bad numbers, cap row counts, compute `hidden` from `total_rows` / trimmed data.

Returns `{ card, viz, hidden }` for [`Card`](./Card.md).
