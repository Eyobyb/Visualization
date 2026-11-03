# echarts helpers

**File:** [`echarts.tsx`](./echarts.tsx)

## Exports

| Export | Role |
|--------|------|
| `NcChart` | Browser-only ECharts host (SVG renderer, resize observer) |
| `NC_PALETTE` | Multi-series / pie colors |
| `NC_CHART` | Ink / fill / font tokens for option builders |

All ECharts-backed viz components build an `EChartsOption` and render via `NcChart`.
