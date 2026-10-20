/* Example figures for a fictional online shop, standing in for data the server would inject. */

const REGIONS = ['Addis Ababa', 'Oromia', 'Amhara', 'Sidama', 'Dire Dawa', 'Tigray']
const MONTHS = ['Jul', 'Aug', 'Sep']
const REVENUE: Record<string, number[]> = {
  'Addis Ababa': [680000, 712000, 745000], Oromia: [310000, 322000, 341000], Amhara: [205000, 214000, 226000],
  Sidama: [118000, 139000, 163000], 'Dire Dawa': [96000, 101000, 108000], Tigray: [98000, 112000, 130000],
}
const AVG_ORDER: Record<string, number> = { 'Addis Ababa': 392, Oromia: 368, Amhara: 361, Sidama: 349, 'Dire Dawa': 372, Tigray: 355 }

export const salesByRegion = REGIONS.flatMap((region) => MONTHS.map((month, i) => ({
  region, month, revenue: REVENUE[region][i], orders: Math.round(REVENUE[region][i] / AVG_ORDER[region]),
})))

const totalRevenue = salesByRegion.reduce((s, r) => s + r.revenue, 0)
const totalOrders = salesByRegion.reduce((s, r) => s + r.orders, 0)
const WEEKLY_SHAPE = [0.92, 0.95, 0.94, 0.99, 1.01, 0.98, 1.03, 1.05, 1.02, 1.07, 1.09, 1.06, 1.12]
const shapeSum = WEEKLY_SHAPE.reduce((a, b) => a + b, 0)

export const weekly = WEEKLY_SHAPE.map((s, i) => {
  const revenue = Math.round((totalRevenue * s) / shapeSum / 1000) * 1000
  return { week: 'W' + (27 + i), revenue, orders: Math.round(revenue / 375) }
})

const ordersPrev = Math.round(totalOrders / 1.064)
export const kpis = {
  revenue: totalRevenue, revenue_prev: 4310000, orders: totalOrders, orders_prev: ordersPrev,
  aov: Math.round(totalRevenue / totalOrders), aov_prev: Math.round(4310000 / ordersPrev), refunds: 0.021, refunds_prev: 0.026,
}

export const revenueByRegion = REGIONS.map((region) => ({ region, revenue: REVENUE[region].reduce((a, b) => a + b, 0) }))

export const topProducts = [
  { name: 'Habesha kemis, cotton', category: 'Apparel', units: 128, revenue: 412000, trend: [52, 58, 61, 66, 70, 79] },
  { name: 'Yirgacheffe coffee, 1 kg', category: 'Coffee', units: 974, revenue: 365000, trend: [48, 51, 50, 57, 60, 63] },
  { name: 'Leather crossbody bag', category: 'Accessories', units: 214, revenue: 298000, trend: [40, 44, 47, 45, 50, 54] },
  { name: 'Netela scarf', category: 'Apparel', units: 402, revenue: 241000, trend: [30, 33, 39, 41, 40, 44] },
  { name: 'Berbere spice, 500 g', category: 'Pantry', units: 1240, revenue: 188000, trend: [35, 34, 36, 33, 37, 38] },
  { name: 'Jebena clay pot', category: 'Home', units: 330, revenue: 132000, trend: [22, 24, 21, 25, 27, 26] },
]

export const customersByRegion = [
  { region: 'Addis Ababa', customers: 5210 }, { region: 'Oromia', customers: 2480 }, { region: 'Amhara', customers: 1640 },
  { region: 'Sidama', customers: 1120 }, { region: 'Dire Dawa', customers: 760 }, { region: 'Tigray', customers: 880 },
  { region: 'Central Ethiopia', customers: 540 }, { region: 'South Ethiopia', customers: 410 }, { region: 'Harari', customers: 290 },
  { region: 'Somali', customers: 230 }, { region: 'Afar', customers: 120 }, { region: 'South West Ethiopia', customers: 180 },
  { region: 'Benishangul-Gumuz', customers: 95 }, { region: 'Gambela', customers: 60 },
]

export const channels = [
  { channel: 'Telegram', share: 0.4 }, { channel: 'Instagram', share: 0.21 }, { channel: 'TikTok', share: 0.15 },
  { channel: 'Website', share: 0.14 }, { channel: 'Walk-in', share: 0.1 },
]

/** A generated landscape so the resolved-image demo works offline. */
export const samplePhotoUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450"><defs><linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">'
  + '<stop offset="0" stop-color="#EED3AE"/><stop offset="1" stop-color="#B9783F"/></linearGradient></defs>'
  + '<rect width="600" height="450" fill="url(#g)"/><ellipse cx="300" cy="190" rx="130" ry="90" fill="#EED3AE" opacity="0.55"/>'
  + '<rect y="300" width="600" height="150" fill="#5A3420" opacity="0.85"/><circle cx="220" cy="270" r="58" fill="#5A3420"/>'
  + '<rect x="372" y="170" width="36" height="135" rx="12" fill="#5A3420" opacity="0.8"/></svg>',
)
