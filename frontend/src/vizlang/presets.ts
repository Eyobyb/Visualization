/* Whole-response programs from Catalog Lab, used by the Playground and the tests. */
export interface Preset {
  id: string
  label: string
  src: string
}

export const PRESETS: Preset[] = [
  { id: 'dashboard', label: 'Sales dashboard', src: String.raw`// Sales review. Every number comes from data.* bindings the server injected.
root = Col([title, intro, kpis, trend, explorer, products, actions])
title = Title("Q3 sales review", size: "lg")
intro = Text("Revenue reached **ETB 4.82M**, up 11.8% on Q2. Addis Ababa still leads, while Sidama grew fastest from July to September.")
kpis = MultiKpiCard(title: "Q3 at a glance", items: [
  {label: "Revenue", value: data.kpis.revenue, prev: data.kpis.revenue_prev, format: "currency"},
  {label: "Orders", value: data.kpis.orders, prev: data.kpis.orders_prev},
  {label: "Avg order", value: data.kpis.aov, prev: data.kpis.aov_prev, format: "currency"},
  {label: "Refund rate", value: data.kpis.refunds, prev: data.kpis.refunds_prev, format: "percent", goodWhen: "down"}
])
trend = KpiGraphCard(label: "Revenue, last week", value: @Last(data.weekly).revenue, prev: data.weekly[11].revenue, format: "currency", deltaLabel: "vs week 38", data: data.weekly, x: "week", y: "revenue", caption: "Weekly paid revenue, weeks 27 to 39")
$metric = "revenue"
$month = "All"
explorer = ActionableGraphCard(title: "Regions by " + $metric, controls: [metricPick, monthPick], chart: regionChart, actions: [explain])
metricPick = SegmentedControl($metric, options: ["revenue", "orders"])
monthPick = Select($month, options: ["All", "Jul", "Aug", "Sep"])
regionChart = Chart(type: $month == "All" ? "stackedBar" : "bar", data: @Filter(data.sales_by_region, "month", $month), x: "region", y: $metric, series: $month == "All" ? "month" : null, format: $metric == "revenue" ? "currency" : "number")
explain = Button("Explain the Sidama jump", variant: "outline", icon: "arrow-right", onClick: @NewTurn("Why did Sidama " + $metric + " grow so fast in Q3?"))
products = ListCard(title: "Top products", items: data.top_products, primary: "name", secondary: "category", value: "revenue", valueFormat: "currency", icon: "shopping-bag")
actions = Row([Button("Draft the investor update", onClick: @NewTurn("Draft a short investor update from this Q3 review")), Button("Copy headline", variant: "ghost", icon: "copy", onClick: @Copy("Q3 revenue ETB 4.82M, up 11.8% on Q2"))])
` },
  { id: 'explainer', label: 'Text explainer', src: String.raw`// Text-heavy answer: structured prose instead of a wall of paragraphs.
root = Col([title, summary, facts, compare, tradeoffs, plan, voice, sources])
title = Title("Should you open a website or stay on Telegram?", size: "lg")
summary = Summary("Keep selling on Telegram and build a simple website alongside it, then launch once repeat orders pass about 300 a month.", points: ["Telegram already brings in the largest share of orders", "A website helps new buyers browse the full catalogue", "Run both from one product list so prices never drift"])
facts = FactList([{label: "Orders from Telegram", value: data.channels[0].share, format: "percent"}, {label: "Q3 orders", value: data.kpis.orders}, {label: "Average order", value: data.kpis.aov, format: "currency"}], layout: "grid")
compare = BulletColumns([{title: "Telegram today", icon: "send", items: ["Orders arrive in chat", "Repeat buyers know you", "Catalogue is a pinned post"]}, {title: "With a website", icon: "layers", items: ["Buyers browse and search", "Orders land in one list", "Links work from TikTok and Instagram"]}])
tradeoffs = ProsCons(pros: ["New buyers can find products on their own", {title: "Fewer questions.", text: "Sizes, colours and prices are on the page."}, "Orders are easier to track and report"], cons: ["Hosting and upkeep cost money every month", "Photos and descriptions take time to prepare", "Some buyers will still prefer to chat first"], prosLabel: "Adding a website", consLabel: "What it costs you")
plan = Card([Steps([{title: "Week 1: catalogue", text: "Photograph and price every product in one spreadsheet."}, {title: "Week 2: build", text: "Set up a simple store page with mobile money checkout."}, {title: "Week 3: soft launch", text: "Share the link with your 50 most loyal Telegram buyers."}, {title: "Week 4: go public", text: "Pin the link on Telegram and add it to Instagram and TikTok bios."}], checkable: true)], title: "A four-week plan", icon: "calendar")
voice = Quote("I found the scarf on TikTok, but I ordered on Telegram because I could ask about the colours first.", source: "Customer in Adama", role: "Post-purchase survey, September")
sources = Sources([{title: "Q3 order export", url: "https://example.com/orders-q3", publisher: "Order system"}, {title: "Channel survey, September", url: "https://example.com/survey", publisher: "Internal survey"}])
` },
  { id: 'twoway', label: 'Two-way agent', src: String.raw`// Two-way UI: the model asks, compares, and waits for approval before acting.
root = Col([intro, ask, reach, plans, approve, pickup])
intro = Text("Here's where your customers are and what each plan would give you. Pick a period for the deeper analysis, and approve the restock post when it looks right.")
ask = ChoiceChips(question: "Which period should the deeper analysis cover?", options: ["This month", "Last quarter", "Year to date"], template: "Analyse sales for {choice}")
reach = Card([RegionMap(data: data.customers_by_region, region: "region", value: "customers", caption: "Active customers, Q3.")], title: "Where your customers are", icon: "map-pin")
plans = ComparisonTable(columns: [{name: "Starter", subtitle: "ETB 950 / month"}, {name: "Growth", subtitle: "ETB 2,400 / month"}, {name: "Scale", subtitle: "ETB 6,500 / month"}], rows: [{label: "Sales channels", values: ["Telegram", "Up to 3", "Unlimited"]}, {label: "Weekly report", values: [false, true, true]}, {label: "Region breakdown", values: [false, true, true]}, {label: "Team seats", values: [1, 3, 10]}], highlight: "Growth")
approve = ApprovalCard(title: "Post the restock announcement", action: "Publish to your Telegram channel", icon: "send", details: [{label: "Audience", value: "2,340 subscribers"}, {label: "Scheduled", value: "Now"}], preview: "New stock just landed: hand-woven netela scarves in six colours and fresh Yirgacheffe coffee. Same-day delivery in Addis Ababa. Reply to order!", warning: "Posts go to every subscriber immediately.", approveLabel: "Post now")
pickup = Form(title: "Schedule a courier pickup", icon: "truck", fields: [{name: "location", label: "Pickup location", type: "select", options: ["Bole warehouse", "Merkato shop"], required: true}, {name: "date", label: "Date", type: "date", required: true}, {name: "parcels", label: "Parcels", type: "number", required: true}], submitLabel: "Request pickup", template: "Schedule a pickup from {location} on {date} for {parcels} parcels")
` },
  { id: 'calculator', label: 'Plan calculator', src: String.raw`// Team plan calculator: state plus derived values. Dragging never calls the model.
root = Card([seats, billing, Divider(), price, note], title: "Team plan estimate", icon: "users")
$seats = 8
$billing = "monthly"
seats = Slider($seats, min: 1, max: 50, label: "Seats")
billing = SegmentedControl($billing, options: ["monthly", "yearly"], label: "Billing")
perSeat = $billing == "yearly" ? 9500 : 950
price = Grid([Stat(label: $billing == "yearly" ? "Per year" : "Per month", value: $seats * perSeat, format: "currency", size: "lg"), Stat(label: "Per seat", value: perSeat, format: "currency")], columns: 2)
note = $billing == "yearly" ? Callout("Yearly billing saves " + @Format($seats * (950 * 12 - 9500), "currency") + " compared with paying monthly.", tone: "success") : Caption("Switch to yearly billing to get two months free.")
` },
  { id: 'split', label: 'Bill splitter', src: String.raw`// Bill splitter: every number recalculates locally as you drag.
root = Card([totalIn, peopleIn, tipIn, Divider(), result, copyBtn], title: "Split the bill", icon: "wallet")
$total = 2400
$people = 4
$tip = 10
totalIn = Input($total, type: "number", label: "Bill total", suffix: "ETB")
peopleIn = Slider($people, min: 1, max: 12, label: "People")
tipIn = Slider($tip, min: 0, max: 25, step: 5, label: "Tip", suffix: "%")
withTip = $total * (1 + $tip / 100)
each = withTip / $people
result = Grid([Stat(label: "Each pays", value: each, format: "currency", size: "lg"), Stat(label: "Total with tip", value: withTip, format: "currency")], columns: 2)
copyBtn = Button("Copy the split", variant: "outline", icon: "copy", onClick: @Copy("Each of " + $people + " people pays " + @Format(each, "currency")))
` },
  { id: 'moodboard', label: 'Moodboard', src: String.raw`// Moodboard: images are server-resolved from search queries, never URLs typed by the model.
root = Col([title, intro, photos, palette, next])
title = Title("Cafe interior moodboard")
intro = Text("Warm wood, clay and woven textures, built around a traditional coffee ceremony corner.")
photos = AsyncImageGroup(["traditional jebena coffee pot on charcoal", "woven mesob basket in warm light", "small cafe counter in Addis Ababa with wooden stools", "clay cups on a carved wooden tray"])
palette = Row([Badge("Clay", tone: "warning"), Badge("Forest", tone: "success"), Badge("Charcoal", variant: "outline"), Badge("Linen", tone: "muted")])
$style = "cozy"
next = Card([SegmentedControl($style, options: ["cozy", "modern", "rustic"]), Button("Develop the " + $style + " direction", icon: "arrow-right", onClick: @NewTurn("Develop a " + $style + " cafe interior concept with a coffee ceremony corner"))], title: "Pick a direction")
` },
  { id: 'product', label: 'Product picks', src: String.raw`// Shopping: product photos are server-resolved from each item's image query. Prices and ratings come from the sources.
root = Col([title, intro, picks, verdict, refs])
title = Title("Laptops for programming under ETB 220,000")
intro = Text("Three machines that compile fast, stay cool and last a full workday.")
picks = ProductGrid([{name: "MacBook Air M4 13-inch", image: "MacBook Air M4 laptop open on a wooden desk", price: 189000, rating: 4.7, specs: ["16 GB RAM", "512 GB SSD", "18 h battery"], badge: "Best battery"}, {name: "Lenovo ThinkPad X1 Carbon Gen 13", image: "Lenovo ThinkPad X1 Carbon laptop on an office table", price: 214000, rating: 4.5, specs: ["32 GB RAM", "1 TB SSD", "Linux friendly"], badge: "Best keyboard"}, {name: "Dell XPS 14", image: "Dell XPS 14 silver laptop with an OLED screen", price: 198500, rating: 4.3, specs: ["32 GB RAM", "RTX 4050", "OLED display"]}])
verdict = Verdict("MacBook Air M4", reason: "The longest battery life and the fastest builds for the price.", alternative: {name: "ThinkPad X1 Carbon", when: "if you work in Linux or type all day"}, confidence: "medium")
refs = Sources([{title: "Best programming laptops 2026", url: "https://www.example.com/laptops"}])
` },
  { id: 'weather', label: 'Weather', src: String.raw`// Weather: current conditions and a forecast. Only use figures from the sources and say when they are from.
root = Col([now, hours, note])
now = WeatherCard("Addis Ababa", now: {temp: 19, condition: "partly", feelsLike: 18, wind: 11, humidity: 62, summary: "Partly cloudy, showers after 3 pm"}, forecast: [{label: "Today", condition: "rain", high: 21, low: 11, rain: 70}, {label: "Thu", condition: "storm", high: 20, low: 12, rain: 80}, {label: "Fri", condition: "partly", high: 22, low: 11, rain: 30}, {label: "Sat", condition: "sun", high: 24, low: 10, rain: 10}, {label: "Sun", condition: "cloud", high: 22, low: 11, rain: 40}], updated: "Forecast as of 09:00 EAT")
hourly = [{hour: "09:00", temp: 17}, {hour: "12:00", temp: 20}, {hour: "15:00", temp: 21}, {hour: "18:00", temp: 18}, {hour: "21:00", temp: 15}]
hours = Chart(type: "line", data: hourly, x: "hour", y: "temp", height: "sm", caption: "Today, °C")
note = Callout("Afternoon showers are likely through Thursday; carry an umbrella after 3 pm.", tone: "info")
` },
  { id: 'places', label: 'Places', src: String.raw`// Places: a map with photo pins. The server geocodes each address and finds each photo; never invent coordinates.
root = Col([title, intro, map, tip, refs])
title = Title("Coffee shops in Bole")
intro = Text("Four places for a good macchiato within a short ride of Bole Medhanialem.")
map = PlaceMap(near: "Addis Ababa, Ethiopia", places: [{name: "Tomoca Coffee Bole", address: "Bole Road", image: "Tomoca coffee shop Addis Ababa interior", category: "Roastery", rating: 4.7, text: "Historic roaster; strong macchiato."}, {name: "Kaldi's Coffee Bole", address: "Bole Medhanialem", image: "Kaldi's Coffee Addis Ababa storefront", category: "Café", rating: 4.3, text: "Busy, reliable, good for meetings."}, {name: "Galani Coffee", address: "Gotera, Kirkos", image: "Galani coffee shop Addis Ababa", category: "Café and gallery", text: "Specialty single origins and art."}, {name: "Alem Bunna", address: "Bole Atlas", image: "Alem Bunna coffee Addis Ababa", category: "Café", text: "Quiet, with outdoor seating."}])
tip = Callout("Most cafés close around 9 pm; Tomoca Bole opens earliest, at 6:30 am.", tone: "info")
refs = Sources([{title: "Best coffee in Addis Ababa", url: "https://www.example.com/addis-coffee"}])
` },
  { id: 'comparison', label: 'Comparison', src: String.raw`// Comparison: features side by side, code for each, key terms, then a clear recommendation.
root = Col([title, table, code, terms, verdict])
title = Title("FastAPI vs Django")
table = ComparisonTable(columns: ["FastAPI", "Django"], rows: [{label: "Async by default", values: [true, false]}, {label: "Admin panel", values: [false, true]}, {label: "Built-in ORM", values: [false, true]}, {label: "Automatic API docs", values: [true, false]}, {label: "Best for", values: ["JSON APIs", "Full web apps"]}], highlight: "FastAPI")
code = CodeTabs([{label: "FastAPI", language: "python", code: "@app.get(\"/items/{id}\")\nasync def item(id: int):\n    return {\"id\": id}"}, {label: "Django", language: "python", code: "def item(request, id):\n    return JsonResponse({\"id\": id})"}])
terms = Row([Caption("Key terms:"), Term("ASGI", definition: "The async server interface FastAPI runs on."), Term("ORM", definition: "Maps database tables to Python classes.")])
verdict = Verdict("FastAPI", reason: "For a typed JSON API it is faster to write and faster to run.", alternative: {name: "Django", when: "if you need the admin panel, auth and templates built in"}, confidence: "high")
` },
  { id: 'errors', label: 'Diagnostics', src: String.raw`// Deliberate mistakes. The compiler drops what it cannot validate and keeps the rest.
root = Col([heading, chart, sparkle, stock, tiles, ghost])
heading = Title("Diagnostics demo", size: "md")
chart = Chart(type: "bar", data: data.channels, x: "channel", y: "share", format: "percent", glow: true)
sparkle = Sparkle(text: "Unknown component")
stock = Table(data.inventory)
tiles = Grid([Stat(label: "Orders", value: 412), Stat(label: "Returns", value: "nine")], columns: 7)
` }
]
