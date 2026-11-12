import { useMemo, useState } from 'react'
import { APPEARANCE_PRESETS, NcRoot, type NcTheme } from '../index'
import { LAB_GROUPS, LAB_ITEMS } from './catalog'
import { CatalogRow } from './CatalogRow'
import { ProfileRow } from './ProfileRow'
import { PROFILE_ENTRIES } from './profileSample'
import type { LabItem } from './types'

/**
 * Catalog + testing side by side for every component / composition.
 * Open at /lab.html
 */
export function Lab() {
  const [theme, setTheme] = useState<NcTheme>('light')
  const [filter, setFilter] = useState<LabItem['group'] | 'all' | 'profile'>('all')
  const showProfile = filter === 'all' || filter === 'profile'

  const groups = useMemo(() => {
    return LAB_GROUPS.map((g) => ({
      ...g,
      items: LAB_ITEMS.filter((i) => i.group === g.id && (filter === 'all' || filter === g.id)),
    })).filter((g) => g.items.length > 0)
  }, [filter])

  return (
    <NcRoot theme={theme} appearance={APPEARANCE_PRESETS.default} className="min-h-full">
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 font-nc-mono text-[0.6875rem] tracking-wide text-nc-ink-3 uppercase">New catalog</p>
            <h1 className="m-0 font-nc-display text-3xl font-[300] tracking-[-0.03em] text-nc-ink">
              Catalog + testing
            </h1>
            <p className="mt-2 mb-0 max-w-[52ch] text-[0.875rem] text-nc-ink-2">
              Each row is one component or composition: live card on the left, editable recipe on the right.
              Use Full / Foldable on any row — hover expands a folded card.
            </p>
            <p className="mt-2 mb-0">
              <a href="/new-catalog.html" className="text-[0.75rem] text-nc-ink-2 underline-offset-2 hover:text-nc-ink hover:underline">
                Gallery
              </a>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="inline-flex rounded-full bg-nc-tile p-0.5" role="group" aria-label="Theme">
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={theme === t}
                  className={`h-8 rounded-full px-3 text-xs capitalize ${
                    theme === t ? 'bg-nc-surface text-nc-ink shadow-sm' : 'bg-transparent text-nc-ink-2'
                  }`}
                  onClick={() => setTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-1" role="group" aria-label="Filter">
              {([{ id: 'all' as const, title: 'All' }, { id: 'profile' as const, title: 'Profile' }, ...LAB_GROUPS]).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={filter === g.id}
                  className={`h-7 rounded-full px-2.5 text-[0.6875rem] ${
                    filter === g.id ? 'bg-nc-ink text-nc-stage' : 'bg-nc-tile text-nc-ink-2 hover:text-nc-ink'
                  }`}
                  onClick={() => setFilter(g.id)}
                >
                  {g.title}
                </button>
              ))}
            </div>
          </div>
        </header>

        <nav className="mb-6 flex flex-wrap gap-x-3 gap-y-1 border-b border-nc-line-2 pb-3">
          {showProfile
            ? PROFILE_ENTRIES.map((entry) => (
                <a
                  key={entry.id}
                  href={`#${entry.id}`}
                  className="font-nc-mono text-[0.6875rem] text-nc-ink-3 no-underline hover:text-nc-ink"
                >
                  {entry.label}
                </a>
              ))
            : null}
          {groups.flatMap((g) =>
            g.items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="font-nc-mono text-[0.6875rem] text-nc-ink-3 no-underline hover:text-nc-ink"
              >
                {item.label}
              </a>
            )),
          )}
        </nav>

        {showProfile ? (
          <div className="mb-8">
            <h2 className="m-0 mb-3 font-nc-display text-lg font-normal tracking-[-0.02em] text-nc-ink">Profile</h2>
            <div className="overflow-hidden rounded-[var(--nc-card-radius)] ring-1 ring-nc-line-2">
              {PROFILE_ENTRIES.map((entry) => (
                <ProfileRow key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        ) : null}

        {groups.map((g) => (
          <div key={g.id} className="mb-8">
            <h2 className="m-0 mb-3 font-nc-display text-lg font-normal tracking-[-0.02em] text-nc-ink">{g.title}</h2>
            <div className="overflow-hidden rounded-[var(--nc-card-radius)] ring-1 ring-nc-line-2">
              {g.items.map((item) => (
                <CatalogRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </NcRoot>
  )
}
