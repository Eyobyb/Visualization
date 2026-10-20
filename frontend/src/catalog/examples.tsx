/*
 * Live examples for the catalog page. Each exported function is named `<Component>` or `<Component>_<label words>`;
 * the catalog renders it and shows its body as the usage snippet, so keep the bodies short and self-explanatory.
 */
import { useState } from 'react'
import {
  Accordion, ActionableGraphCard, ApprovalCard, AsyncImage, AsyncImageGroup, Badge, Box, BulletColumns, Button, Callout,
  Caption, Card, CardHead, Chart, Checkbox, Checklist, ChoiceChips, Code, Col, ComparisonTable, Delta, Divider, Empty, FactList,
  Form, GraphCard, Grid, Icon, IconList, Input, KeyPoints, KpiCard, KpiGraphCard, Link, List, ListCard, Markdown, MultiKpiCard,
  NestedList, Progress, ProsCons, Quote, RadioGroup, RegionMap, Row, SegmentedControl, Select, Skeleton, Slider, Sources,
  Sparkline, Stat, Steps, Summary, Switch, Table, Tabs, Text, Title, VizBoundary, VizRoot,
} from '../components/visualization'
import {
  channels, customersByRegion, kpis, revenueByRegion, salesByRegion, samplePhotoUrl, topProducts, weekly,
} from './sampleData'
import { notify } from './toast'

const send = (text: string) => notify('Sent to the model: ' + text)

/* Foundations */

export function VizRoot_() {
  return (
    <VizRoot theme="dark">
      <Box background="surface">
        <Text text="Everything inside VizRoot uses the **dark** palette." />
      </Box>
    </VizRoot>
  )
}

function BrokenWidget(): never {
  throw new Error('Cannot read field "revenue"')
}

export function VizBoundary_() {
  return (
    <VizBoundary name="BrokenWidget">
      <BrokenWidget />
    </VizBoundary>
  )
}

export function Skeleton_() {
  return <Skeleton height={90} />
}

export function Empty_() {
  return <Empty text="No rows matched this filter" />
}

export function CardHead_() {
  return <CardHead title="Top products" subtitle="Ranked by Q3 revenue" icon="shopping-bag" />
}

export function Delta_() {
  return (
    <Col gap={1}>
      <Delta value={kpis.revenue} prev={kpis.revenue_prev} label="vs Q2" />
      <Delta value={kpis.refunds} prev={kpis.refunds_prev} goodWhen="down" label="refund rate" />
    </Col>
  )
}

/* Layout */

export function Col_() {
  return (
    <Col gap={2}>
      <Title text="Delivery status" size="md" />
      <Text text="Three orders left the Bole hub this morning." />
      <Badge text="On time" tone="success" icon="truck" />
    </Col>
  )
}

export function Row_() {
  return (
    <Row>
      <Badge text="Telegram" icon="send" />
      <Badge text="Instagram" />
      <Badge text="TikTok" />
      <Badge text="Walk-in" variant="outline" />
    </Row>
  )
}

export function Box_() {
  return (
    <Box background="sunk" border={false} gap={1}>
      <Caption text="Pickup point" />
      <Text text="**Bole Medhanialem**, next to Edna Mall" />
    </Box>
  )
}

export function Grid_() {
  return (
    <Grid columns={3}>
      <Stat label="Orders" value={412} />
      <Stat label="Returns" value={9} />
      <Stat label="Avg basket" value={375} format="currency" />
    </Grid>
  )
}

export function Card_() {
  return (
    <Card title="Quarter closed" subtitle="Jul to Sep 2026" icon="chart">
      <Text text="Your shop crossed ETB 4.8M in Q3, up 11.8% on Q2." />
      <Row>
        <Button label="See the breakdown" variant="soft" onClick={() => send('Break down Q3 revenue by region')} />
      </Row>
    </Card>
  )
}

export function Tabs_() {
  return (
    <Tabs items={[
      { label: 'Revenue', content: <Chart type="area" data={weekly} x="week" y="revenue" format="currency" height="sm" /> },
      { label: 'Orders', content: <Chart type="bar" data={weekly} x="week" y="orders" height="sm" /> },
    ]} />
  )
}

export function Accordion_() {
  return (
    <Accordion items={[
      { title: 'How is revenue counted?', content: 'Paid orders only, net of refunds, in ETB.' },
      { title: 'Which regions are included?', content: 'All six regions with at least one delivery in the quarter.' },
    ]} />
  )
}

export function Divider_() {
  return (
    <Col>
      <Text text="Paid orders: 12,995" />
      <Divider label="Refunds" />
      <Text text="2.1% of orders, down from 2.6%" />
    </Col>
  )
}

/* Text */

export function Title_() {
  return (
    <Col gap={1}>
      <Title text="Q3 sales review" size="xl" />
      <Title text="By region" size="md" />
      <Title text="Notes" size="sm" tone="muted" />
    </Col>
  )
}

export function Text_() {
  return <Text text="Sidama grew **38%** from July to September, the fastest of any region." size="lg" />
}

export function Caption_() {
  return (
    <Col gap={1}>
      <Chart type="bar" data={channels} x="channel" y="share" format="percent" height="sm" />
      <Caption text="Share of Q3 orders by channel. Source: order system, as of 30 Sep 2026." />
    </Col>
  )
}

export function Badge_() {
  return (
    <Row>
      <Badge text="Paid" tone="success" icon="check" />
      <Badge text="Awaiting pickup" tone="warning" icon="clock" />
      <Badge text="Refunded" tone="danger" />
      <Badge text="New" variant="solid" tone="accent" />
    </Row>
  )
}

export function List_numbered() {
  return (
    <List kind="numbered" items={[
      'Confirm stock with the Merkato supplier',
      'Post the restock on Telegram',
      'Update prices on the website',
    ]} />
  )
}

export function List_timeline() {
  return (
    <List kind="timeline" items={[
      { time: '09:00', text: 'Order placed' },
      { time: '11:30', text: 'Picked up in Bole' },
      { time: '14:10', text: 'Delivered' },
    ]} />
  )
}

export function Callout_() {
  return <Callout title="Partial month" text="September figures exclude 41 orders still awaiting payment confirmation." tone="warning" />
}

export function Markdown_() {
  return <Markdown content={'### What changed\nRevenue rose on the back of **Telegram** orders.\n\n- Telegram: 40% of orders\n- Instagram: 21%\n- TikTok: 15%'} />
}

export function Link_() {
  return (
    <Col gap={1}>
      <Text text="Check delivery zones before promising same-day shipping." />
      <Link text="Delivery zone map" href="https://example.com/delivery-zones" />
    </Col>
  )
}

export function Code_() {
  return <Code language="sql" code={"SELECT region, SUM(revenue)\nFROM orders\nWHERE quarter = 'Q3'\nGROUP BY region;"} />
}

/* Prose */

export function Summary_() {
  return (
    <Summary
      text="Start on Telegram, then add a website once you pass about 300 orders a month."
      points={[
        'Telegram brings 40% of orders today at no platform cost',
        'A website pays off when repeat buyers want to browse and reorder',
        'Keep one product catalogue so both channels stay in sync',
      ]}
    />
  )
}

export function KeyPoints_with_titles() {
  return (
    <KeyPoints items={[
      { title: 'Revenue is up.', text: 'ETB 4.82M in Q3, 11.8% more than Q2.' },
      { title: 'Growth is spreading.', text: 'Sidama and Tigray grew faster than Addis Ababa.' },
      { title: 'Refunds fell.', text: '2.1% of orders, down from 2.6%.' },
    ]} />
  )
}

export function KeyPoints_numbered_two_columns() {
  return (
    <KeyPoints numbered columns={2} items={[
      'Answer messages within an hour',
      'Post new stock on Tuesdays',
      'Confirm delivery by phone',
      'Ask for a review after delivery',
    ]} />
  )
}

export function IconList_() {
  return (
    <IconList items={[
      { icon: 'truck', title: 'Delivery', text: 'Same day inside Addis Ababa, 2 to 4 days to regional cities.' },
      { icon: 'wallet', title: 'Payment', text: 'Mobile money or cash on delivery.' },
      { icon: 'refresh', title: 'Returns', text: 'Within 7 days if the item is unused.', tone: 'warning' },
    ]} />
  )
}

export function NestedList_() {
  return (
    <NestedList items={[
      {
        title: 'Before launch',
        children: [
          'Photograph every product on a plain background',
          { text: 'Write prices in ETB', children: ['Include delivery in the price for Addis Ababa', 'Show regional delivery separately'] },
        ],
      },
      { title: 'Launch week', children: ['Post three times a day on Telegram', 'Pin the price list'] },
    ]} />
  )
}

export function Steps_() {
  return (
    <Steps checkable items={[
      { title: 'Pack the order', text: 'Wrap fragile items like the jebena in two layers.' },
      { title: 'Book the courier', text: 'Request pickup before 11:00 for same-day delivery.' },
      { title: 'Send tracking', text: "Message the buyer the rider's name and phone number." },
    ]} />
  )
}

export function Checklist_() {
  return (
    <Checklist title="This week" items={[
      'Restock Yirgacheffe coffee',
      { text: 'Reply to the Hawassa wholesale enquiry', done: true },
      'Update the Telegram price list',
    ]} />
  )
}

export function ProsCons_() {
  return (
    <ProsCons
      prosLabel="Selling on Telegram"
      consLabel="Its limits"
      pros={['No setup cost', 'Buyers already use it daily', 'Easy to answer questions in chat']}
      cons={['Hard to browse a large catalogue', 'Orders live in chat history', 'No built-in checkout']}
    />
  )
}

export function BulletColumns_() {
  return (
    <BulletColumns columns={[
      { title: 'Telegram', icon: 'send', items: ['Fast to start', 'Chat-based orders', 'Best for repeat buyers'] },
      { title: 'Website', icon: 'layers', items: ['Full catalogue', 'Search and filters', 'Best for new buyers'] },
      { title: 'Instagram', icon: 'star', items: ['Visual discovery', 'Reels drive reach', 'Best for apparel'] },
    ]} />
  )
}

export function FactList_rows() {
  return (
    <FactList items={[
      { label: 'Product', value: 'Yirgacheffe coffee, 1 kg' },
      { label: 'Roast', value: 'Medium' },
      { label: 'Price', value: 375, format: 'currency' },
      { label: 'Q3 units', value: topProducts[1].units, note: 'Second best seller' },
    ]} />
  )
}

export function FactList_grid() {
  return (
    <FactList layout="grid" items={[
      { label: 'Regions served', value: 6 },
      { label: 'Top channel', value: 'Telegram' },
      { label: 'Refund rate', value: kpis.refunds, format: 'percent' },
    ]} />
  )
}

export function Quote_() {
  return (
    <Quote
      text="I found the scarf on TikTok, but I ordered on Telegram because I could ask about the colours first."
      source="Customer in Adama"
      role="Post-purchase survey, September"
    />
  )
}

export function Sources_() {
  return (
    <Sources items={[
      { title: 'Q3 order export', url: 'https://example.com/orders-q3', publisher: 'Order system' },
      { title: 'Channel survey, September', url: 'https://example.com/survey', publisher: 'Internal survey' },
    ]} />
  )
}

/* Inputs */

export function Button_() {
  return (
    <Row>
      <Button label="Ask about Sidama" onClick={() => send('Why did Sidama grow so fast?')} />
      <Button label="Copy total" variant="outline" icon="copy" onClick={() => notify('Copied ETB 4,820,000')} />
      <Button label="Dismiss" variant="ghost" />
    </Row>
  )
}

export function Input_() {
  const [budget, setBudget] = useState(15000)
  return (
    <Col>
      <Input type="number" value={budget} onChange={setBudget} label="Ad budget" suffix="ETB" />
      <Text text={'Planned spend: ' + budget.toLocaleString() + ' ETB'} />
    </Col>
  )
}

export function Select_() {
  const [region, setRegion] = useState('Oromia')
  const revenue = salesByRegion.filter((r) => r.region === region).reduce((s, r) => s + r.revenue, 0)
  return (
    <Col>
      <Select value={region} onChange={setRegion} options={[...new Set(salesByRegion.map((r) => r.region))]} label="Region" />
      <Stat label={region + ' revenue, Q3'} value={revenue} format="currency" />
    </Col>
  )
}

export function SegmentedControl_() {
  const [month, setMonth] = useState('Sep')
  return (
    <Col>
      <SegmentedControl value={month} onChange={setMonth} options={['Jul', 'Aug', 'Sep']} />
      <Chart type="hbar" data={salesByRegion.filter((r) => r.month === month)} x="region" y="revenue" format="currency" />
    </Col>
  )
}

export function Slider_() {
  const [guests, setGuests] = useState(6)
  return (
    <Col>
      <Slider value={guests} onChange={setGuests} min={2} max={20} label="Guests" />
      <Text text={`Buy ${(guests * 0.35).toFixed(1)} kg of lamb and ${guests * 2} injera.`} />
    </Col>
  )
}

export function Checkbox_() {
  const [showForecast, setShowForecast] = useState(true)
  return (
    <Col>
      <Checkbox checked={showForecast} onChange={setShowForecast} label="Show the October forecast" />
      {showForecast
        ? <Callout text="October is projected at ETB 1.71M if September's growth holds." />
        : <Caption text="Forecast hidden" />}
    </Col>
  )
}

export function Switch_() {
  const [vat, setVat] = useState(false)
  return (
    <Col>
      <Switch checked={vat} onChange={setVat} label="Include 15% VAT" />
      <Stat label="Q3 revenue" value={vat ? kpis.revenue * 1.15 : kpis.revenue} format="currency" />
    </Col>
  )
}

export function RadioGroup_() {
  const [plan, setPlan] = useState('growth')
  return (
    <RadioGroup value={plan} onChange={setPlan} variant="cards" options={[
      { value: 'starter', label: 'Starter', description: 'One shop, Telegram orders only' },
      { value: 'growth', label: 'Growth', description: 'Three channels and weekly reports' },
      { value: 'scale', label: 'Scale', description: 'All channels, daily reports, API access' },
    ]} />
  )
}

/* Two-way */

export function ChoiceChips_sends_to_the_model() {
  return (
    <ChoiceChips
      question="Which period should I analyse?"
      options={['This month', 'Last quarter', 'Year to date']}
      template="Analyse sales for {choice}"
      onSend={send}
    />
  )
}

export function ChoiceChips_cards_multi_select() {
  return (
    <ChoiceChips
      question="What should the investor update cover?"
      variant="cards"
      multi
      options={[
        { value: 'revenue', label: 'Revenue', description: 'Totals and growth' },
        { value: 'regions', label: 'Regions', description: 'Where growth came from' },
        { value: 'products', label: 'Products', description: 'Best and worst sellers' },
      ]}
      template="Write the investor update covering: {choice}"
      onSend={send}
    />
  )
}

export function ChoiceChips_bound_local_filter() {
  const [category, setCategory] = useState('Apparel')
  return (
    <Col>
      <ChoiceChips options={[...new Set(topProducts.map((p) => p.category))]} value={category} onChange={setCategory} />
      <ListCard title={category + ' products'} items={topProducts.filter((p) => p.category === category)} primary="name" value="revenue" valueFormat="currency" />
    </Col>
  )
}

export function Form_() {
  return (
    <Form
      title="Schedule a courier pickup"
      icon="truck"
      fields={[
        { name: 'location', label: 'Pickup location', type: 'select', options: ['Bole warehouse', 'Merkato shop'], required: true },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'parcels', label: 'Parcels', type: 'number', suffix: 'items', required: true },
        { name: 'notes', label: 'Notes for the rider', type: 'textarea' },
      ]}
      submitLabel="Request pickup"
      template="Schedule a pickup from {location} on {date} for {parcels} parcels. Notes: {notes}"
      onSend={send}
    />
  )
}

export function ApprovalCard_() {
  return (
    <ApprovalCard
      title="Post the restock announcement"
      action="Publish to your Telegram channel"
      icon="send"
      details={[{ label: 'Audience', value: '2,340 subscribers' }, { label: 'Scheduled', value: 'Now' }]}
      preview="New stock just landed: hand-woven netela scarves in six colours and fresh Yirgacheffe coffee. Reply to order!"
      warning="Posts go to every subscriber immediately."
      approveLabel="Post now"
      onSend={send}
    />
  )
}

/* Data */

export function Table_() {
  return (
    <Table data={topProducts} columns={[
      { field: 'name', label: 'Product' },
      'category',
      { field: 'units', format: 'number' },
      { field: 'revenue', format: 'currency' },
      { field: 'trend', label: '6-week trend' },
    ]} />
  )
}

export function Stat_() {
  return (
    <Grid columns={2}>
      <Stat label="Revenue" value={kpis.revenue} prev={kpis.revenue_prev} format="currency" icon="wallet" />
      <Stat label="Refund rate" value={kpis.refunds} prev={kpis.refunds_prev} format="percent" goodWhen="down" />
    </Grid>
  )
}

export function Progress_() {
  return (
    <Col>
      <Progress value={kpis.revenue} max={5000000} label="Q3 revenue target" format="currency" />
      <Progress value={72} label="Orders delivered same day" tone="success" />
    </Col>
  )
}

export function Sparkline_() {
  return (
    <Row gap={3}>
      <Text text="Coffee sales, last 6 weeks" />
      <Sparkline data={[41, 48, 45, 52, 58, 63]} tone="success" />
    </Row>
  )
}

export function ComparisonTable_() {
  return (
    <ComparisonTable
      columns={[{ name: 'Starter', subtitle: 'ETB 950 / month' }, { name: 'Growth', subtitle: 'ETB 2,400 / month' }, { name: 'Scale', subtitle: 'ETB 6,500 / month' }]}
      rows={[
        { label: 'Sales channels', values: ['Telegram', 'Up to 3', 'Unlimited'] },
        { label: 'Weekly report', values: [false, true, true] },
        { label: 'Team seats', values: [1, 3, 10] },
        { label: 'API access', values: [false, false, true] },
      ]}
      highlight="Growth"
    />
  )
}

export function RegionMap_all_regions() {
  return <RegionMap data={customersByRegion} region="region" value="customers" caption="Active customers, Q3." />
}

export function RegionMap_partial_data() {
  return <RegionMap data={revenueByRegion} region="region" value="revenue" format="currency" />
}

export function Chart_groupedBar() {
  return <Chart type="groupedBar" data={salesByRegion} x="region" y="revenue" series="month" format="currency" />
}

export function Chart_area() {
  return <Chart type="area" data={weekly} x="week" y="revenue" format="currency" caption="Weekly paid revenue, Q3" />
}

export function Chart_line_two_series() {
  return <Chart type="line" data={weekly} x="week" y={['revenue', 'orders']} format="compact" height="sm" />
}

export function Chart_stackedBar() {
  return <Chart type="stackedBar" data={salesByRegion} x="month" y="orders" series="region" />
}

export function Chart_hbar() {
  return <Chart type="hbar" data={revenueByRegion} x="region" y="revenue" format="currency" />
}

export function Chart_donut() {
  return <Chart type="donut" data={channels} x="channel" y="share" format="percent" />
}

/* Cards */

export function KpiCard_() {
  return (
    <KpiCard
      label="Q3 revenue"
      value={kpis.revenue}
      prev={kpis.revenue_prev}
      deltaLabel="vs Q2"
      format="currency"
      icon="wallet"
      target={5000000}
      caption="Paid orders, net of refunds"
    />
  )
}

export function MultiKpiCard_() {
  return (
    <MultiKpiCard title="Q3 at a glance" items={[
      { label: 'Revenue', value: kpis.revenue, prev: kpis.revenue_prev, format: 'currency' },
      { label: 'Orders', value: kpis.orders, prev: kpis.orders_prev },
      { label: 'Refund rate', value: kpis.refunds, prev: kpis.refunds_prev, format: 'percent', goodWhen: 'down' },
    ]} />
  )
}

export function KpiGraphCard_() {
  return (
    <KpiGraphCard
      label="Revenue, last week"
      value={weekly[12].revenue}
      prev={weekly[11].revenue}
      deltaLabel="vs week 38"
      format="currency"
      data={weekly}
      x="week"
      y="revenue"
      caption="Weeks 27 to 39"
    />
  )
}

export function ListCard_() {
  return (
    <ListCard title="Top products" items={topProducts} primary="name" secondary="category" value="revenue" valueFormat="currency" icon="shopping-bag" />
  )
}

export function GraphCard_() {
  return (
    <GraphCard
      title="Orders by channel"
      subtitle="Share of Q3 orders"
      chart={<Chart type="donut" data={channels} x="channel" y="share" format="percent" />}
      caption="Telegram alone brings in more orders than Instagram and TikTok combined."
    />
  )
}

export function ActionableGraphCard_() {
  const [metric, setMetric] = useState('revenue')
  const [month, setMonth] = useState('All')
  const rows = month === 'All' ? salesByRegion : salesByRegion.filter((r) => r.month === month)
  return (
    <ActionableGraphCard
      title={'Regions by ' + metric}
      controls={<>
        <SegmentedControl value={metric} onChange={setMetric} options={['revenue', 'orders']} />
        <Select value={month} onChange={setMonth} options={['All', 'Jul', 'Aug', 'Sep']} />
      </>}
      chart={<Chart type="bar" data={rows} x="region" y={metric} format={metric === 'revenue' ? 'currency' : 'number'} />}
      actions={<Button label="Explain this chart" variant="outline" onClick={() => send(`Explain ${metric} by region for ${month}`)} />}
    />
  )
}

/* Media */

export function Icon_() {
  return (
    <Row gap={4}>
      <Icon name="truck" />
      <Icon name="map-pin" tone="accent" />
      <Icon name="package" />
      <Icon name="coffee" size="lg" tone="warning" />
    </Row>
  )
}

export function AsyncImage_resolved() {
  return <AsyncImage query="traditional jebena coffee pot on charcoal" src={samplePhotoUrl} aspectRatio="4:3" caption="Jebena coffee pot" />
}

export function AsyncImage_still_searching() {
  return <AsyncImage query="hand-woven Ethiopian netela scarf with a colourful tibeb border" aspectRatio="5:4" />
}

export function AsyncImageGroup_() {
  return (
    <AsyncImageGroup layout="strip" images={[
      { query: 'traditional jebena coffee pot on charcoal', src: samplePhotoUrl },
      { query: 'woven mesob basket in warm light' },
      { query: 'small cafe counter in Addis Ababa with wooden stools' },
    ]} />
  )
}
