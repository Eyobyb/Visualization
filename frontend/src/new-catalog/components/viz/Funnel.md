# Funnel

**Main part:** `graph` · kind `funnel`  
**File:** [`Funnel.tsx`](./Funnel.tsx)

## Purpose

Ordered stages that lose volume. Highlights the worst step-to-step conversion drop in red.

## Payload

```ts
{ component: 'funnel'; unit?: Unit; data: { label: string; value: number }[] }
```

Stages should be ordered top → bottom (largest → smallest typical). Labels show conversion % from the stage above.
