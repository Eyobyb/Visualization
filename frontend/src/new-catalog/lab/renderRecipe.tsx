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

/** Tiny spark bars — Signal Drawer glyph hint while folded. */
function SparkGlyph({ values = [28, 31, 36, 42, 48, 55, 61] }: { values?: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <span className="flex h-[2.125rem] items-end justify-end gap-0.5">
      {values.map((v, i) => (
        <i
          key={i}
          className={`block w-1.5 rounded-sm ${i >= values.length - 2 ? 'bg-nc-ink' : 'bg-nc-ink/20'} ${
            i === values.length - 1 ? 'shadow-[0_0_0_2px_var(--color-nc-lime-glow,rgba(190,242,100,0.45))]' : ''
          }`}
          style={{ height: `${Math.max(20, (v / max) * 100)}%` }}
        />
      ))}
    </span>
  )
}

export type RenderRecipeOptions = {
  /** Override recipe.foldable — used by the Full / Foldable lab switch. */
  foldable?: boolean
}

/** Turn an editable recipe into the real component tree (placement canvas). */
export function renderRecipe(recipe: LabRecipe, options?: RenderRecipeOptions): ReactNode {
  const shell = recipe.shell ?? {}
  const finding = recipe.finding
  const mains = recipe.mains ?? []
  const foldable = options?.foldable ?? recipe.foldable ?? false

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

  const brief =
    recipe.brief ??
    (finding
      ? { headline: finding.headline, takeaway: finding.takeaway }
      : undefined)

  return (
    <IntelligenceCard
      sources={shell.sources}
      updated={shell.updated}
      severity={shell.severity ?? 'neutral'}
      attention={shell.attention}
      foldable={foldable}
      brief={foldable ? brief : undefined}
      glyph={foldable ? <SparkGlyph /> : undefined}
    >
      <Col gap={3} className="mt-3.5">
        {body}
      </Col>
    </IntelligenceCard>
  )
}
