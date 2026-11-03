import { useCallback, useMemo, useState } from 'react'
import { renderRecipe } from './renderRecipe'
import { recipeToJson, recipeToJsx } from './toSource'
import type { LabItem, LabRecipe } from './types'

function parseRecipe(text: string): LabRecipe {
  const next = JSON.parse(text) as LabRecipe
  if (!next || typeof next !== 'object') throw new Error('Recipe must be an object')
  if (!Array.isArray(next.mains)) throw new Error('recipe.mains must be an array')
  if (!['stack', 'split', 'none'].includes(next.layout)) {
    throw new Error('recipe.layout must be stack | split | none')
  }
  return next
}

function treeParts(recipe: LabRecipe): string[] {
  const parts = ['IntelligenceCard', 'Col']
  if (recipe.finding?.headline) parts.push('Headline')
  if (recipe.finding?.takeaway) parts.push('Takeaway')
  if (recipe.finding?.bullets?.length) parts.push('Bullets')
  if (recipe.layout === 'split') parts.push('Grid')
  if (recipe.layout === 'stack' && recipe.divider && recipe.mains.length > 1) parts.push('Divider')
  for (const m of recipe.mains) parts.push(m.viz.component)
  return parts
}

export type CatalogRowProps = {
  item: LabItem
}

/**
 * One catalog entry: live component (left) + editable how-it's-made test panel (right).
 */
export function CatalogRow({ item }: CatalogRowProps) {
  const [draft, setDraft] = useState(() => recipeToJson(item.recipe))
  const [recipe, setRecipe] = useState<LabRecipe>(item.recipe)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'recipe' | 'jsx'>('recipe')

  const apply = useCallback(() => {
    try {
      setRecipe(parseRecipe(draft))
      setError(null)
    } catch (e) {
      setError((e as Error).message || 'Invalid JSON')
    }
  }, [draft])

  const reset = useCallback(() => {
    setDraft(recipeToJson(item.recipe))
    setRecipe(item.recipe)
    setError(null)
  }, [item.recipe])

  const jsx = useMemo(() => recipeToJsx(recipe), [recipe])
  const tree = useMemo(() => treeParts(recipe).join(' → '), [recipe])

  return (
    <section id={item.id} className="scroll-mt-4 border-b border-nc-line-2 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-nc-line-2/80 bg-nc-tile/40 px-4 py-2.5">
        <div>
          <h3 className="m-0 font-nc-display text-[1.0625rem] font-normal tracking-[-0.02em] text-nc-ink">{item.label}</h3>
          <p className="m-0 mt-0.5 text-[0.75rem] text-nc-ink-3">{item.blurb}</p>
        </div>
        <p className="m-0 max-w-[42ch] truncate font-nc-mono text-[0.625rem] text-nc-ink-3" title={tree}>
          {tree}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Catalog — component placement */}
        <div className="min-w-0 border-b border-nc-line-2 bg-nc-stage/70 p-4 sm:p-5 lg:border-r lg:border-b-0">
          <p className="m-0 mb-3 font-nc-mono text-[0.625rem] tracking-wide text-nc-ink-3 uppercase">Catalog</p>
          <div className="mx-auto w-full max-w-[28rem]">{renderRecipe(recipe)}</div>
        </div>

        {/* Testing — editable how it’s made */}
        <div className="flex min-h-[16rem] min-w-0 flex-col bg-nc-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-nc-line-2 px-3 py-2">
            <div className="flex items-center gap-2">
              <p className="m-0 font-nc-mono text-[0.625rem] tracking-wide text-nc-ink-3 uppercase">Testing</p>
              <div className="inline-flex rounded-full bg-nc-tile p-0.5">
                <button
                  type="button"
                  className={`h-7 rounded-full px-2.5 text-[0.6875rem] ${
                    tab === 'recipe' ? 'bg-nc-plain text-nc-ink shadow-sm' : 'text-nc-ink-2'
                  }`}
                  onClick={() => setTab('recipe')}
                >
                  Recipe
                </button>
                <button
                  type="button"
                  className={`h-7 rounded-full px-2.5 text-[0.6875rem] ${
                    tab === 'jsx' ? 'bg-nc-plain text-nc-ink shadow-sm' : 'text-nc-ink-2'
                  }`}
                  onClick={() => setTab('jsx')}
                >
                  JSX
                </button>
              </div>
            </div>
            {tab === 'recipe' ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  className="h-7 rounded-full border-0 bg-nc-tile px-2.5 text-[0.6875rem] text-nc-ink-2 hover:text-nc-ink"
                  onClick={reset}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="h-7 rounded-full border-0 bg-nc-ink px-2.5 text-[0.6875rem] font-medium text-nc-stage"
                  onClick={apply}
                >
                  Apply
                </button>
              </div>
            ) : null}
          </div>

          {tab === 'recipe' ? (
            <>
              <textarea
                className="min-h-[14rem] flex-1 resize-y border-0 bg-transparent p-3 font-nc-mono text-[0.6875rem] leading-relaxed text-nc-ink outline-none"
                spellCheck={false}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault()
                    apply()
                  }
                }}
                aria-label={`Editable recipe for ${item.label}`}
              />
              {error ? (
                <p className="m-0 border-t border-nc-line-2 px-3 py-2 text-[0.75rem] text-nc-crit">{error}</p>
              ) : (
                <p className="m-0 border-t border-nc-line-2 px-3 py-2 text-[0.6875rem] text-nc-ink-3">
                  Edit → Apply (⌘/Ctrl+Enter). Catalog preview updates from this recipe.
                </p>
              )}
            </>
          ) : (
            <pre className="m-0 min-h-[14rem] flex-1 overflow-auto p-3 font-nc-mono text-[0.6875rem] leading-relaxed text-nc-ink-2 whitespace-pre-wrap">
              {jsx}
            </pre>
          )}
        </div>
      </div>
    </section>
  )
}
