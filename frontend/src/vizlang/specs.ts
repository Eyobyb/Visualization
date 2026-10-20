/* Component schemas and example programs, ported from Catalog Lab. Every name here needs a renderer in render.tsx. */
import { TONES } from '../components/visualization/utils'
import { P, REQ, type ComponentSpec, type Example, type PropSpec } from './schema'

const FORMATS = ['number', 'currency', 'percent', 'compact']

export const SPECS: Record<string, ComponentSpec> = {}

function def(name: string, family: string, desc: string, pos: string[], props: Record<string, PropSpec>, ex: Array<string | Example>) {
  SPECS[name] = { name, family, desc, pos, props, examples: ex.map((e) => (typeof e === 'string' ? { src: e } : e)) }
}

const toneP = (d: string) => P.en(TONES, 'Semantic colour.', { def: d })
const cardTone = P.en(['default', 'accent', 'info', 'success', 'warning', 'danger'], 'Tints the card to draw attention.', { def: 'default' })
const fmtP = (d = 'number') => P.en(FORMATS, 'How numbers display. Percent values are fractions (0.12 = 12%).', { def: d })

/* Layout */
def('Col', 'Layout', 'Stacks blocks vertically. The usual root of a response.', ['children'],
  { children: P.nodes('Blocks to stack.', REQ), gap: P.space('Space between blocks.', { def: 3 }), align: P.en(['start', 'center', 'end', 'stretch'], 'Horizontal alignment.', { def: 'stretch' }) },
  [String.raw`root = Col([Title("Delivery status", size: "md"), Text("Three orders left the Bole hub this morning."), Badge("On time", tone: "success", icon: "truck")], gap: 2)`])
def('Row', 'Layout', 'Places items side by side and wraps on narrow screens.', ['children'],
  { children: P.nodes('Items in the row.', REQ), gap: P.space('Space between items.', { def: 2 }), align: P.en(['start', 'center', 'end', 'stretch'], 'Vertical alignment.', { def: 'center' }), justify: P.en(['start', 'center', 'end', 'between'], 'Horizontal distribution.', { def: 'start' }), wrap: P.bool('Wrap to new lines when full.', { def: true }) },
  [String.raw`root = Row([Badge("Telegram", icon: "send"), Badge("Instagram"), Badge("TikTok"), Badge("Walk-in", variant: "outline")])`])
def('Box', 'Layout', 'Groups a few elements with a light boundary when a Card is too heavy.', ['children'],
  { children: P.nodes('Contents.', REQ), padding: P.space('Inner padding.', { def: 3 }), gap: P.space('Space between children.', { def: 2 }), border: P.bool('Show a border.', { def: true }), background: P.en(['none', 'surface', 'sunk', 'accent', 'info', 'success', 'warning', 'danger'], 'Fill colour.', { def: 'none' }), radius: P.en(['none', 'sm', 'md', 'lg'], 'Corner rounding.', { def: 'md' }) },
  [String.raw`root = Box([Caption("Pickup point"), Text("**Bole Medhanialem**, next to Edna Mall")], background: "sunk", border: false, gap: 1)`])
def('Grid', 'Layout', 'Equal tiles that reflow to fewer columns on narrow screens.', ['children'],
  { children: P.nodes('Tiles.', REQ), columns: P.en([2, 3, 4], 'Columns at full width.', { def: 2 }), gap: P.space('Space between tiles.', { def: 3 }) },
  [String.raw`root = Grid([Stat(label: "Orders", value: 412), Stat(label: "Returns", value: 9), Stat(label: "Avg basket", value: 375, format: "currency")], columns: 3)`])
def('Card', 'Layout', 'A self-contained unit with an optional header. Base of every dashboard card.', ['children'],
  { children: P.nodes('Card body.'), title: P.str('Header title.'), subtitle: P.str('Line under the title.'), icon: P.icon('Header icon.'), tone: cardTone, padding: P.space('Inner padding.', { def: 4 }) },
  [String.raw`root = Card([Text("Your shop crossed ETB 4.8M in Q3, up 11.8% on Q2."), Row([Button("See the breakdown", variant: "soft", onClick: @NewTurn("Break down Q3 revenue by region"))])], title: "Quarter closed", subtitle: "Jul to Sep 2026", icon: "chart")`])
def('Tabs', 'Layout', 'Switches between alternative views of one subject. Tab choice is local UI state.', ['items'],
  { items: P.list('List of {label, content}.', REQ) },
  [String.raw`root = Tabs([{label: "Revenue", content: Chart(type: "area", data: data.weekly, x: "week", y: "revenue", format: "currency", height: "sm")}, {label: "Orders", content: Chart(type: "bar", data: data.weekly, x: "week", y: "orders", height: "sm")}])`])
def('Accordion', 'Layout', 'Secondary detail the reader may skip: methods, assumptions, FAQ.', ['items'],
  { items: P.list('List of {title, content}.', REQ) },
  [String.raw`root = Accordion([{title: "How is revenue counted?", content: "Paid orders only, net of refunds, in ETB."}, {title: "Which regions are included?", content: "All six regions with at least one delivery in the quarter."}])`])
def('Divider', 'Layout', 'Separates sections, optionally with a label.', ['label'],
  { label: P.str('Text shown in the middle of the line.') },
  [String.raw`root = Col([Text("Paid orders: 12,995"), Divider("Refunds"), Text("2.1% of orders, down from 2.6%")])`])

/* Text */
def('Title', 'Text', 'A heading. Markdown ## compiles to size "lg".', ['text'],
  { text: P.str('Heading text.', REQ), size: P.en(['xl', 'lg', 'md', 'sm'], 'xl only for the single headline answer.', { def: 'lg' }), tone: toneP('ink'), icon: P.icon('Leading icon.') },
  [String.raw`root = Col([Title("Q3 sales review", size: "xl"), Title("By region", size: "md"), Title("Notes", size: "sm", tone: "muted")], gap: 1)`])
def('Text', 'Text', 'A paragraph. Supports **bold** and `code` inline.', ['text'],
  { text: P.str('Paragraph text.', REQ), size: P.en(['lg', 'md', 'sm'], 'Text size.', { def: 'md' }), tone: toneP('ink') },
  [String.raw`root = Text("Sidama grew **38%** from July to September, the fastest of any region.", size: "lg")`])
def('Caption', 'Text', 'Small supporting text: sources, units, as-of dates.', ['text'],
  { text: P.str('Caption text.', REQ), tone: toneP('muted') },
  [String.raw`root = Col([Chart(type: "bar", data: data.channels, x: "channel", y: "share", format: "percent", height: "sm"), Caption("Share of Q3 orders by channel. Source: order system, as of 30 Sep 2026.")], gap: 1)`])
def('Badge', 'Text', 'A short status or category tag, three words at most.', ['text'],
  { text: P.str('Badge text.', REQ), tone: toneP('muted'), icon: P.icon('Leading icon.'), variant: P.en(['soft', 'solid', 'outline'], 'Visual weight.', { def: 'soft' }) },
  [String.raw`root = Row([Badge("Paid", tone: "success", icon: "check"), Badge("Awaiting pickup", tone: "warning", icon: "clock"), Badge("Refunded", tone: "danger"), Badge("New", variant: "solid", tone: "accent")])`])
def('List', 'Text', 'Parallel items. Timeline items take {time, text}.', ['items'],
  { items: P.list('Strings, components, or {time, text} for timelines.', REQ), kind: P.en(['bullet', 'numbered', 'check', 'timeline'], 'List style.', { def: 'bullet' }) },
  [String.raw`root = Col([List(["Confirm stock with the Merkato supplier", "Post the restock on Telegram", "Update prices on the website"], kind: "numbered"), List([{time: "09:00", text: "Order placed"}, {time: "11:30", text: "Picked up in Bole"}, {time: "14:10", text: "Delivered"}], kind: "timeline")])`])
def('Callout', 'Text', 'The one message the reader must not miss. At most one per response.', ['text'],
  { text: P.str('Message.'), title: P.str('Bold first line.'), tone: P.en(['info', 'success', 'warning', 'danger'], 'Severity.', { def: 'info' }), icon: P.icon('Overrides the tone icon.') },
  [String.raw`root = Callout("September figures exclude 41 orders still awaiting payment confirmation.", title: "Partial month", tone: "warning")`])
def('Markdown', 'Text', 'Rich prose with headings and bullets. Also the fallback when a program cannot compile.', ['content'],
  { content: P.str('Markdown text.', REQ) },
  [String.raw`root = Markdown("### What changed\nRevenue rose on the back of **Telegram** orders.\n\n- Telegram: 40% of orders\n- Instagram: 21%\n- TikTok: 15%")`])
def('Link', 'Text', 'A link to an outside page; opens in a new tab.', ['text'],
  { text: P.str('Link text.', REQ), href: P.str('Absolute http(s) URL.', REQ) },
  [String.raw`root = Col([Text("Check delivery zones before promising same-day shipping."), Link("Delivery zone map", href: "https://example.com/delivery-zones")], gap: 1)`])
def('Code', 'Text', 'A code or query block with a copy button.', ['code'],
  { code: P.str('Code text.', REQ), language: P.str('Language label.') },
  [String.raw`root = Code("SELECT region, SUM(revenue)\nFROM orders\nWHERE quarter = 'Q3'\nGROUP BY region;", language: "sql")`])

/* Inputs */
def('Button', 'Inputs', 'Runs an action. @NewTurn is the only action that reaches the model.', ['label'],
  { label: P.str('Button text.', REQ), onClick: P.action('What happens on click.'), variant: P.en(['solid', 'outline', 'soft', 'ghost', 'danger'], 'One solid button per group.', { def: 'solid' }), icon: P.icon('Leading icon.'), size: P.en(['sm', 'md', 'lg'], 'Size.', { def: 'md' }), block: P.bool('Full width.', { def: false }), disabled: P.bool('Disable the button.', { def: false }) },
  [String.raw`root = Row([Button("Ask about Sidama", onClick: @NewTurn("Why did Sidama grow so fast?")), Button("Copy total", variant: "outline", icon: "copy", onClick: @Copy("ETB 4,820,000")), Button("Dismiss", variant: "ghost")])`])
def('Input', 'Inputs', 'Free entry of one value. Prefer Slider for bounded numbers.', ['value'],
  { value: P.state('Bound $variable.', REQ), type: P.en(['text', 'number'], 'Input type.', { def: 'text' }), label: P.str('Field label.'), placeholder: P.str('Hint text.'), prefix: P.str('Text before the value.'), suffix: P.str('Text after the value.'), min: P.num('Minimum for numbers.'), max: P.num('Maximum for numbers.') },
  [String.raw`$budget = 15000
root = Col([Input($budget, type: "number", label: "Ad budget", suffix: "ETB"), Text("Planned spend: " + @Format($budget, "currency"))])`])
def('Select', 'Inputs', 'Picks one value from more than five options.', ['value'],
  { value: P.state('Bound $variable.', REQ), options: P.list('Strings or {value, label}.', REQ), label: P.str('Field label.') },
  [String.raw`$region = "Oromia"
root = Col([Select($region, options: @Unique(data.sales_by_region, "region"), label: "Region"), Stat(label: $region + " revenue, Q3", value: @Sum(@Filter(data.sales_by_region, "region", $region), "revenue"), format: "currency")])`])
def('SegmentedControl', 'Inputs', 'Switches a view among two to five options.', ['value'],
  { value: P.state('Bound $variable.', REQ), options: P.list('Two to five strings or {value, label, icon}.', REQ), label: P.str('Field label.') },
  [String.raw`$period = "Sep"
root = Col([SegmentedControl($period, options: ["Jul", "Aug", "Sep"]), Chart(type: "hbar", data: @Filter(data.sales_by_region, "month", $period), x: "region", y: "revenue", format: "currency")])`])
def('Slider', 'Inputs', 'Explores a bounded number. The best "what if" control.', ['value'],
  { value: P.state('Bound $variable.', REQ), min: P.num('Lowest value.', { def: 0 }), max: P.num('Highest value.', { def: 100 }), step: P.num('Increment.', { def: 1 }), label: P.str('Field label.'), format: P.en(FORMATS, 'Display format of the value.'), suffix: P.str('Unit after the value.'), showValue: P.bool('Show the current value.', { def: true }) },
  [String.raw`$guests = 6
root = Col([Slider($guests, min: 2, max: 20, label: "Guests"), Text("Buy " + @Round($guests * 0.35, 1) + " kg of lamb and " + $guests * 2 + " injera.")])`])
def('Checkbox', 'Inputs', 'Toggles one item on or off.', ['value'],
  { value: P.state('Bound $variable (true/false).', REQ), label: P.str('Checkbox label.', REQ) },
  [String.raw`$forecast = true
root = Col([Checkbox($forecast, label: "Show the October forecast"), $forecast ? Callout("October is projected at ETB 1.71M if September's growth holds.", tone: "info") : Caption("Forecast hidden")])`])
def('Switch', 'Inputs', 'A single on/off setting.', ['value'],
  { value: P.state('Bound $variable (true/false).', REQ), label: P.str('Switch label.', REQ) },
  [String.raw`$vat = false
root = Col([Switch($vat, label: "Include 15% VAT"), Stat(label: "Q3 revenue", value: $vat ? data.kpis.revenue * 1.15 : data.kpis.revenue, format: "currency")])`])
def('RadioGroup', 'Inputs', 'One choice where options need a description.', ['value'],
  { value: P.state('Bound $variable.', REQ), options: P.list('{value, label, description}.', REQ), variant: P.en(['list', 'cards'], 'Cards for plan or style picking.', { def: 'list' }), label: P.str('Group label.') },
  [String.raw`$plan = "growth"
root = RadioGroup($plan, options: [{value: "starter", label: "Starter", description: "One shop, Telegram orders only"}, {value: "growth", label: "Growth", description: "Three channels and weekly reports"}, {value: "scale", label: "Scale", description: "All channels, daily reports, API access"}], variant: "cards")`])

/* Data */
def('Table', 'Data', 'Exact values across items. Click a header to sort; arrays render as sparklines.', ['data'],
  { data: P.data('Rows from a data binding.', REQ), columns: P.list('Strings or {field, label, format, align}. Defaults to every field.'), limit: P.num('Rows shown before "Show all".', { def: 8 }), striped: P.bool('Alternate row shading.', { def: false }) },
  [String.raw`root = Table(data.top_products, columns: [{field: "name", label: "Product"}, "category", {field: "units", format: "number"}, {field: "revenue", format: "currency"}, {field: "trend", label: "6-week trend"}])`])
def('Chart', 'Data', 'The shape of data: trend, ranking, composition. Data comes from a binding, never typed values.', [],
  { type: P.en(['line', 'area', 'bar', 'hbar', 'groupedBar', 'stackedBar', 'donut'], 'Chart type.', REQ), data: P.data('Rows from a data binding.', REQ), x: P.field('Category or time field.', REQ), y: P.fields('Value field, or several for multiple series.', REQ), series: P.field('Splits rows into series by this field.'), format: fmtP(), height: P.en(['sm', 'md', 'lg'], 'Plot height.', { def: 'md' }), legend: P.bool('Show a legend for multiple series.', { def: true }), caption: P.str('Note under the chart.') },
  [{ label: 'groupedBar', src: String.raw`root = Chart(type: "groupedBar", data: data.sales_by_region, x: "region", y: "revenue", series: "month", format: "currency")` },
   { label: 'area', src: String.raw`root = Chart(type: "area", data: data.weekly, x: "week", y: "revenue", format: "currency", caption: "Weekly paid revenue, Q3")` },
   { label: 'line, two series', src: String.raw`root = Chart(type: "line", data: data.weekly, x: "week", y: ["revenue", "orders"], format: "compact", height: "sm")` },
   { label: 'stackedBar', src: String.raw`root = Chart(type: "stackedBar", data: data.sales_by_region, x: "month", y: "orders", series: "region")` },
   { label: 'donut', src: String.raw`root = Chart(type: "donut", data: data.channels, x: "channel", y: "share", format: "percent")` }])
def('Stat', 'Data', 'One headline number with an optional change. Building block of KPI cards.', [],
  { label: P.str('What the number is.', REQ), value: P.num('The number, from a binding or expression.', REQ), format: fmtP(), prev: P.num('Previous value; the change is computed.'), delta: P.num('Change as a fraction, if already known.'), goodWhen: P.en(['up', 'down'], 'Which direction is good.', { def: 'up' }), icon: P.icon('Label icon.'), caption: P.str('Note under the number.'), size: P.en(['md', 'lg'], 'Number size.', { def: 'md' }) },
  [String.raw`root = Grid([Stat(label: "Revenue", value: data.kpis.revenue, prev: data.kpis.revenue_prev, format: "currency", icon: "wallet"), Stat(label: "Refund rate", value: data.kpis.refunds, prev: data.kpis.refunds_prev, format: "percent", goodWhen: "down")], columns: 2)`])
def('Progress', 'Data', 'Progress toward a target: quota, budget, completion.', ['value'],
  { value: P.num('Current value.', REQ), max: P.num('Target.', { def: 100 }), label: P.str('What is measured.'), tone: toneP('accent'), format: P.en(FORMATS, 'Show "value of max" in this format instead of a percentage.') },
  [String.raw`root = Col([Progress(data.kpis.revenue, max: 5000000, label: "Q3 revenue target", format: "currency"), Progress(72, label: "Orders delivered same day", tone: "success")])`])
def('Sparkline', 'Data', 'A tiny trend with no axes, for table cells and KPI rows.', ['data'],
  { data: P.list('Numbers, or rows with y.', REQ), y: P.field('Field when data is rows.'), tone: toneP('accent') },
  [String.raw`root = Row([Text("Coffee sales, last 6 weeks"), Sparkline([41, 48, 45, 52, 58, 63], tone: "success")], gap: 3)`])

/* Cards */
def('KpiCard', 'Cards', 'One number that answers the question, with change and optional target.', [],
  { label: P.str('What the number is.', REQ), value: P.num('The number.', REQ), format: fmtP(), prev: P.num('Previous value.'), delta: P.num('Change as a fraction.'), deltaLabel: P.str('Comparison label.', { def: 'vs last period' }), goodWhen: P.en(['up', 'down'], 'Which direction is good.', { def: 'up' }), icon: P.icon('Corner icon.'), target: P.num('Adds a progress bar toward this target.'), caption: P.str('Note at the bottom.'), tone: cardTone },
  [String.raw`root = KpiCard(label: "Q3 revenue", value: data.kpis.revenue, prev: data.kpis.revenue_prev, deltaLabel: "vs Q2", format: "currency", icon: "wallet", target: 5000000, caption: "Paid orders, net of refunds")`])
def('MultiKpiCard', 'Cards', 'Two to four related headline numbers read together.', [],
  { title: P.str('Card title.'), items: P.list('{label, value, prev, delta, format, goodWhen}, two to four.', REQ), columns: P.en([2, 3, 4], 'Columns; defaults to the item count.') },
  [String.raw`root = MultiKpiCard(title: "Q3 at a glance", items: [{label: "Revenue", value: data.kpis.revenue, prev: data.kpis.revenue_prev, format: "currency"}, {label: "Orders", value: data.kpis.orders, prev: data.kpis.orders_prev}, {label: "Refund rate", value: data.kpis.refunds, prev: data.kpis.refunds_prev, format: "percent", goodWhen: "down"}])`])
def('KpiGraphCard', 'Cards', 'A headline number plus the trend that produced it.', [],
  { label: P.str('What the number is.', REQ), value: P.num('The number.', REQ), format: fmtP(), prev: P.num('Previous value.'), delta: P.num('Change as a fraction.'), deltaLabel: P.str('Comparison label.'), goodWhen: P.en(['up', 'down'], 'Which direction is good.', { def: 'up' }), data: P.data('Trend rows.', REQ), x: P.field('Time field.', REQ), y: P.field('Value field.', REQ), chartType: P.en(['line', 'area', 'bar'], 'Trend style.', { def: 'area' }), icon: P.icon('Corner icon.'), caption: P.str('Note at the bottom.') },
  [String.raw`root = KpiGraphCard(label: "Revenue, last week", value: @Last(data.weekly).revenue, prev: data.weekly[11].revenue, deltaLabel: "vs week 38", format: "currency", data: data.weekly, x: "week", y: "revenue", caption: "Weeks 27 to 39")`])
def('ListCard', 'Cards', 'A short ranked list, sorted by value, with proportional bars.', [],
  { title: P.str('Card title.', REQ), items: P.data('Rows from a binding.', REQ), primary: P.field('Main label field.', REQ), secondary: P.field('Second-line field.'), value: P.field('Value field; rows are ranked by it.'), valueFormat: fmtP(), limit: P.num('Rows shown.', { def: 5 }), rank: P.bool('Show rank numbers.', { def: true }), icon: P.icon('Header icon.') },
  [String.raw`root = ListCard(title: "Top products", items: data.top_products, primary: "name", secondary: "category", value: "revenue", valueFormat: "currency", icon: "shopping-bag")`])
def('GraphCard', 'Cards', 'A chart in a titled card, when no headline number is needed.', [],
  { title: P.str('Card title.', REQ), subtitle: P.str('Line under the title.'), chart: P.node('A Chart component.', REQ), caption: P.str('Takeaway under the chart.'), icon: P.icon('Header icon.') },
  [String.raw`root = GraphCard(title: "Orders by channel", subtitle: "Share of Q3 orders", chart: Chart(type: "donut", data: data.channels, x: "channel", y: "share", format: "percent"), caption: "Telegram alone brings in more orders than Instagram and TikTok combined.")`])
def('ActionableGraphCard', 'Cards', 'A chart the user explores: controls bound to state, plus follow-up actions.', [],
  { title: P.str('Card title.', REQ), subtitle: P.str('Line under the title.'), controls: P.nodes('Inputs bound to the state the chart reads.'), chart: P.node('A Chart whose data reads that state.', REQ), actions: P.nodes('Buttons, usually @NewTurn follow-ups.'), caption: P.str('Note under the chart.'), icon: P.icon('Header icon.') },
  [String.raw`$metric = "revenue"
$month = "All"
root = ActionableGraphCard(title: "Regions by " + $metric, controls: [SegmentedControl($metric, options: ["revenue", "orders"]), Select($month, options: ["All", "Jul", "Aug", "Sep"])], chart: Chart(type: "bar", data: @GroupBy(@Filter(data.sales_by_region, "month", $month), "region", $metric), x: "region", y: $metric, format: $metric == "revenue" ? "currency" : "number"), actions: [Button("Explain this chart", variant: "outline", onClick: @NewTurn("Explain " + $metric + " by region for " + $month))])`])

/* Media */
def('Icon', 'Media', 'An outline icon for labels and lists.', ['name'],
  { name: P.icon('Icon name.', REQ), size: P.en(['sm', 'md', 'lg'], 'Icon size.', { def: 'md' }), tone: toneP('ink') },
  [String.raw`root = Row([Icon("truck"), Icon("map-pin", tone: "accent"), Icon("package"), Icon("coffee", size: "lg", tone: "warning")], gap: 4)`])
def('AsyncImage', 'Media', 'The model writes a search query; the server resolves a real image and patches it in.', ['query'],
  { query: P.str('Descriptive search query, 5 to 15 words.', REQ), aspectRatio: P.en(['1:1', '4:3', '5:4', '16:9'], 'Frame shape.', { def: '4:3' }), caption: P.str('Caption under the image.') },
  [String.raw`root = AsyncImage("hand-woven Ethiopian netela scarf with a colourful tibeb border on a wooden table", aspectRatio: "5:4", caption: "Netela scarf")`])
def('AsyncImageGroup', 'Media', 'Several server-resolved photos as a grid or a scrolling strip.', ['queries'],
  { queries: P.list('Two to six search queries.', REQ), layout: P.en(['grid', 'strip'], 'Arrangement.', { def: 'grid' }), aspectRatio: P.en(['1:1', '4:3', '5:4', '16:9'], 'Frame shape.', { def: '4:3' }) },
  [String.raw`root = AsyncImageGroup(["traditional jebena coffee pot on charcoal", "roasted coffee beans in a clay dish", "small cafe counter in Addis Ababa with wooden stools", "woven mesob basket in warm light"])`])

/* Prose */
const itemsP = (d: string, o?: { def?: unknown }) => P.list(d, { req: true, ...o })
def('Summary', 'Prose', 'A short answer up front: one lead sentence and up to four points. Put it first in long answers.', ['text'],
  { text: P.str('Lead sentence: the answer itself.'), points: P.list('Up to four short supporting points.'), title: P.str('Label above the lead.', { def: 'In short' }), icon: P.icon('Label icon.') },
  [String.raw`root = Summary("Start on Telegram, then add a website once you pass about 300 orders a month.", points: ["Telegram brings 40% of orders today at no platform cost", "A website pays off when repeat buyers want to browse and reorder", "Keep one product catalogue so both channels stay in sync"])`])
def('KeyPoints', 'Prose', 'The main takeaways, each with an optional bold title. Numbered only when order matters.', ['items'],
  { items: itemsP('Strings or {title, text, icon}.'), numbered: P.bool('Number the points when they are ranked or sequential.', { def: false }), columns: P.en([1, 2], 'Two columns for short points.', { def: 1 }) },
  [{ label: 'with titles', src: String.raw`root = KeyPoints([{title: "Revenue is up.", text: "ETB 4.82M in Q3, 11.8% more than Q2."}, {title: "Growth is spreading.", text: "Sidama and Tigray grew faster than Addis Ababa."}, {title: "Refunds fell.", text: "2.1% of orders, down from 2.6%."}])` },
   { label: 'numbered, two columns', src: String.raw`root = KeyPoints(["Answer messages within an hour", "Post new stock on Tuesdays", "Confirm delivery by phone", "Ask for a review after delivery"], numbered: true, columns: 2)` }])
def('IconList', 'Prose', 'Points that each belong to a distinct category, marked by an icon and tone.', ['items'],
  { items: itemsP('{icon, title, text, tone}.') },
  [String.raw`root = IconList([{icon: "truck", title: "Delivery", text: "Same day inside Addis Ababa, 2 to 4 days to regional cities."}, {icon: "wallet", title: "Payment", text: "Mobile money or cash on delivery."}, {icon: "refresh", title: "Returns", text: "Within 7 days if the item is unused.", tone: "warning"}])`])
def('NestedList', 'Prose', 'An outline with sub-points, up to four levels. Items take {text, children}.', ['items'],
  { items: itemsP('Strings or {title, text, children}.'), kind: P.en(['bullet', 'numbered'], 'List style.', { def: 'bullet' }) },
  [String.raw`root = NestedList([{title: "Before launch", children: ["Photograph every product on a plain background", {text: "Write prices in ETB", children: ["Include delivery in the price for Addis Ababa", "Show regional delivery separately"]}]}, {title: "Launch week", children: ["Post three times a day on Telegram", "Pin the price list"]}])`])
def('Steps', 'Prose', 'An ordered procedure. With checkable on, the reader ticks steps off locally.', ['items'],
  { items: itemsP('Strings or {title, text, done}.'), checkable: P.bool('Let the reader mark steps done.', { def: false }) },
  [String.raw`root = Steps([{title: "Pack the order", text: "Wrap fragile items like the jebena in two layers."}, {title: "Book the courier", text: "Request pickup before 11:00 for same-day delivery."}, {title: "Send tracking", text: "Message the buyer the rider's name and phone number."}, {title: "Confirm delivery", text: "Call after the drop-off and mark the order complete."}], checkable: true)`])
def('Checklist', 'Prose', 'Items to tick off, with a running count. Ticks are local UI state.', ['items'],
  { items: itemsP('Strings or {title, text, done}.'), title: P.str('Checklist name.', { def: 'Checklist' }) },
  [String.raw`root = Checklist(["Restock Yirgacheffe coffee", {text: "Reply to the Hawassa wholesale enquiry", done: true}, "Update the Telegram price list", "Book photos for the new netela range"], title: "This week")`])
def('ProsCons', 'Prose', 'Advantages and drawbacks side by side. Stacks on narrow screens.', [],
  { pros: itemsP('Strings or {title, text}.'), cons: itemsP('Strings or {title, text}.'), prosLabel: P.str('Left heading.', { def: 'Pros' }), consLabel: P.str('Right heading.', { def: 'Cons' }) },
  [String.raw`root = ProsCons(pros: ["No setup cost", "Buyers already use it daily", "Easy to answer questions in chat"], cons: ["Hard to browse a large catalogue", "Orders live in chat history", "No built-in checkout"], prosLabel: "Selling on Telegram", consLabel: "Its limits")`])
def('BulletColumns', 'Prose', 'Two or three titled bullet lists compared side by side.', ['columns'],
  { columns: itemsP('Two or three {title, icon, items}.') },
  [String.raw`root = BulletColumns([{title: "Telegram", icon: "send", items: ["Fast to start", "Chat-based orders", "Best for repeat buyers"]}, {title: "Website", icon: "layers", items: ["Full catalogue", "Search and filters", "Best for new buyers"]}, {title: "Instagram", icon: "star", items: ["Visual discovery", "Reels drive reach", "Best for apparel"]}])`])
def('FactList', 'Prose', 'Label and value pairs: specs, key facts, terms. Numbers format like Stat.', ['items'],
  { items: itemsP('{label, value, format, note}.'), layout: P.en(['rows', 'grid'], 'Rows for specs, grid for a few headline facts.', { def: 'rows' }) },
  [{ label: 'rows', src: String.raw`root = FactList([{label: "Product", value: "Yirgacheffe coffee, 1 kg"}, {label: "Roast", value: "Medium"}, {label: "Price", value: 375, format: "currency"}, {label: "Q3 units", value: data.top_products[1].units, note: "Second best seller"}])` },
   { label: 'grid', src: String.raw`root = FactList([{label: "Regions served", value: 6}, {label: "Top channel", value: "Telegram"}, {label: "Refund rate", value: data.kpis.refunds, format: "percent"}], layout: "grid")` }])
def('Quote', 'Prose', 'A short attributed quotation, under 25 words.', ['text'],
  { text: P.str('The quotation.', REQ), source: P.str('Who said it.'), role: P.str('Their role or where it was said.') },
  [String.raw`root = Quote("I found the scarf on TikTok, but I ordered on Telegram because I could ask about the colours first.", source: "Customer in Adama", role: "Post-purchase survey, September")`])
def('Sources', 'Prose', 'A numbered list of sources at the end of a researched answer.', ['items'],
  { items: itemsP('{title, url, publisher}.') },
  [String.raw`root = Sources([{title: "Q3 order export", url: "https://example.com/orders-q3", publisher: "Order system"}, {title: "Channel survey, September", url: "https://example.com/survey", publisher: "Internal survey"}])`])

/* Two-way */
def('ChoiceChips', 'Inputs', 'Tappable options for a clarifying question. Unbound, a tap sends the choice to the model; bound to a $variable, it filters locally.', [],
  { question: P.str('The question being asked.'), options: P.list('Strings or {label, value, icon, description}.', REQ), template: P.str('Message sent; {choice} is replaced by the pick.', { def: '{choice}' }), multi: P.bool('Allow several picks, sent with one button.', { def: false }), submitLabel: P.str('Button for multi-select.', { def: 'Send' }), variant: P.en(['chips', 'cards'], 'Cards show option descriptions.', { def: 'chips' }), value: P.state('Optional $variable; makes the chips a local filter instead of sending.') },
  [{ label: 'sends to the model', src: String.raw`root = ChoiceChips(question: "Which period should I analyse?", options: ["This month", "Last quarter", "Year to date"], template: "Analyse sales for {choice}")` },
   { label: 'cards, multi-select', src: String.raw`root = ChoiceChips(question: "What should the investor update cover?", options: [{label: "Revenue", description: "Totals and growth"}, {label: "Regions", description: "Where growth came from"}, {label: "Products", description: "Best and worst sellers"}], multi: true, variant: "cards", template: "Write the investor update covering: {choice}")` },
   { label: 'bound, local filter', src: String.raw`$cat = "Apparel"
root = Col([ChoiceChips(options: @Unique(data.top_products, "category"), value: $cat), ListCard(title: $cat + " products", items: @Filter(data.top_products, "category", $cat), primary: "name", value: "revenue", valueFormat: "currency")])` }])
def('Form', 'Inputs', 'Several fields submitted together as one message to the model. Validates required fields first.', [],
  { fields: P.list('{name, label, type: text|number|email|tel|date|select|textarea, options, required, placeholder, suffix, default, wide}.', REQ), title: P.str('Form title.'), subtitle: P.str('Line under the title.'), icon: P.icon('Header icon.'), submitLabel: P.str('Submit button text.', { def: 'Submit' }), template: P.str('Message sent; {fieldName} is replaced by its value. Defaults to "Label: value" lines.') },
  [String.raw`root = Form(title: "Schedule a courier pickup", icon: "truck", fields: [{name: "location", label: "Pickup location", type: "select", options: ["Bole warehouse", "Merkato shop", "Piassa shop"], required: true}, {name: "date", label: "Date", type: "date", required: true}, {name: "parcels", label: "Parcels", type: "number", suffix: "items", required: true}, {name: "phone", label: "Contact phone", type: "tel", placeholder: "09…"}, {name: "notes", label: "Notes for the rider", type: "textarea"}], submitLabel: "Request pickup", template: "Schedule a pickup from {location} on {date} for {parcels} parcels. Contact: {phone}. Notes: {notes}")`])
def('ApprovalCard', 'Cards', 'Human in the loop: the agent shows what it is about to do and waits for Approve, Edit or Cancel.', [],
  { title: P.str('The action, as a short verb phrase.', REQ), action: P.str('Where and how it happens.'), details: P.list('{label, value, format} facts about the action.'), preview: P.str('The content that will be sent or posted.'), editable: P.bool('Let the user edit the preview before approving.', { def: true }), warning: P.str('Consequence to flag, such as "This cannot be undone".'), approveLabel: P.str('Approve button text.', { def: 'Approve' }), approveMessage: P.str('Message sent on approve; {title} is replaced.', { def: 'Approved: {title}' }), cancelMessage: P.str('Message sent on cancel.', { def: 'Cancelled: {title}' }), icon: P.icon('Header icon.') },
  [String.raw`root = ApprovalCard(title: "Post the restock announcement", action: "Publish to your Telegram channel", icon: "send", details: [{label: "Audience", value: "2,340 subscribers"}, {label: "Scheduled", value: "Now"}, {label: "Products", value: "Netela scarves, Yirgacheffe coffee"}], preview: "New stock just landed: hand-woven netela scarves in six colours and fresh Yirgacheffe coffee. Same-day delivery in Addis Ababa. Reply to order!", warning: "Posts go to every subscriber immediately.", approveLabel: "Post now")`])
def('ComparisonTable', 'Data', 'Options compared across features. Booleans render as checks and crosses; one column can be recommended.', [],
  { columns: P.list('Options: strings or {name, subtitle}.', REQ), rows: P.list('{label, values: one per column, format}.', REQ), highlight: { type: 'any', desc: 'Index or name of the recommended column.' }, highlightLabel: P.str('Badge on the highlighted column.', { def: 'Recommended' }) },
  [String.raw`root = ComparisonTable(columns: [{name: "Starter", subtitle: "ETB 950 / month"}, {name: "Growth", subtitle: "ETB 2,400 / month"}, {name: "Scale", subtitle: "ETB 6,500 / month"}], rows: [{label: "Sales channels", values: ["Telegram", "Up to 3", "Unlimited"]}, {label: "Weekly report", values: [false, true, true]}, {label: "Daily report", values: [false, false, true]}, {label: "Team seats", values: [1, 3, 10]}, {label: "API access", values: [false, false, true]}], highlight: "Growth")`])
def('RegionMap', 'Data', 'Values by Ethiopian region on a tile map, one tile per region. Region names are matched loosely.', [],
  { data: P.data('Rows from a binding.', REQ), region: P.field('Field holding the region name.', REQ), value: P.field('Field holding the value.', REQ), format: fmtP(), legend: P.bool('Show the ranked list beside the map.', { def: true }), caption: P.str('Note under the map.') },
  [{ label: 'all regions', src: String.raw`root = RegionMap(data: data.customers_by_region, region: "region", value: "customers", caption: "Active customers, Q3.")` },
   { label: 'partial data', src: String.raw`root = RegionMap(data: @GroupBy(data.sales_by_region, "region", "revenue"), region: "region", value: "revenue", format: "currency")` }])
