import { channels, customersByRegion, kpis, salesByRegion, topProducts, weekly } from '../../catalog/sampleData'

/** The bindings Catalog Lab's examples read as `data.*`, standing in for what the server injects. */
export const labData: Record<string, unknown> = {
  kpis,
  sales_by_region: salesByRegion,
  weekly,
  top_products: topProducts,
  customers_by_region: customersByRegion,
  channels,
}
