# Viz components

Chart and list blocks used inside Intelligence cards. Each file has a matching `.md` in this folder.

## Main parts vs graph kinds

Non-graph mains: `kpi`, `kpi_strip`, `ranked_list`, `table`.  
All chart types are one main part — **`graph`** — with kind = `component` id below.

| Component | `component` id |
|-----------|----------------|
| [Kpi](./Kpi.md) | `kpi` |
| [KpiStrip](./KpiStrip.md) | `kpi_strip` |
| [RankedList](./RankedList.md) | `ranked_list` |
| [Table](./Table.md) | `table` |
| [Trend](./Trend.md) | `trend` |
| [Columns](./Columns.md) | `columns` / `columns_baseline` |
| [Funnel](./Funnel.md) | `funnel` |
| [StackedBars](./StackedBars.md) | `stacked_bars` |
| [Pie](./Pie.md) | `pie` |
| [Scatter](./Scatter.md) | `scatter` |
| [Radar](./Radar.md) | `radar` |
| [Gauge](./Gauge.md) | `gauge` |
| [Heatmap](./Heatmap.md) | `heatmap` |
| [Sankey](./Sankey.md) | `sankey` |
| [Treemap](./Treemap.md) | `treemap` |

See also [renderViz](./renderViz.md) and [echarts](./echarts.md).  
Pairing rules: [`../../config/composition.ts`](../../config/composition.ts).
