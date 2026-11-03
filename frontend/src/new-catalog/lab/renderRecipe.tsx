import type { ReactNode } from 'react'
import {
  Bullets,
  Col,
  Divider,
  Grid,
  Headline,
  IntelligenceCard,
  Takeaway,
  renderViz,
} from '../index'
import type { LabRecipe } from './types'

/** Turn an editable recipe into the real component tree (placement canvas). */
export function renderRecipe(recipe: LabRecipe): ReactNode {
  const shell = recipe.shell ?? {}
  const finding = recipe.finding
  const mains = recipe.mains ?? []

  const findingNodes = finding ? (
    <>
      <Headline>{finding.headline}</Headline>
      {finding.takeaway ? <Takeaway>{finding.takeaway}</Takeaway> : null}
      {finding.bullets?.length ? <Bullets items={finding.bullets} /> : null}
    </>
  ) : null

  const vizNodes = mains.map((m, i) => (
    <div key={`${m.part}-${m.viz.component}-${i}`} className="nc-viz relative min-w-0">
      {renderViz(m.viz)}
    </div>
  ))

  let body: ReactNode
  if (recipe.layout === 'split' && vizNodes.length === 2) {
    body = (
      <>
        {findingNodes}
        <Grid columns={2} gap={3}>
          {vizNodes[0]}
          {vizNodes[1]}
        </Grid>
      </>
    )
  } else if (vizNodes.length === 0) {
    body = findingNodes
  } else if (vizNodes.length === 1) {
    body = (
      <>
        {findingNodes}
        {vizNodes[0]}
      </>
    )
  } else {
    body = (
      <>
        {findingNodes}
        {vizNodes[0]}
        {recipe.divider ? <Divider label={recipe.divider} /> : null}
        {vizNodes[1]}
      </>
    )
  }

  return (
    <IntelligenceCard
      sources={shell.sources}
      updated={shell.updated}
      severity={shell.severity ?? 'neutral'}
      attention={shell.attention}
    >
      <Col gap={3} className="mt-3.5">
        {body}
      </Col>
    </IntelligenceCard>
  )
}
