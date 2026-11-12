import { useCallback, useMemo, useState } from 'react'
import type { GraphKind } from '../config'
import { SourceFindingRow, SourceProfile, type SourceFinding, type SourceFindingKind, type SourceProfileData } from '../components/SourceProfile'
import { FINDING_LAYOUTS, PROFILE_ENTRIES, PROFILE_SAMPLES, ZENDESK_PROFILE } from './profileSample'

type ProfileEntry = (typeof PROFILE_ENTRIES)[number]

const KINDS = new Set<SourceFindingKind>(['kpi', 'text', 'graph'])
const GRAPHS = new Set<GraphKind>([
  'trend',
  'columns',
  'columns_baseline',
  'stacked_bars',
  'funnel',
  'pie',
  'scatter',
  'radar',
  'gauge',
  'heatmap',
  'sankey',
  'treemap',
])

function isFinding(value: unknown): value is SourceFinding {
  if (!value || typeof value !== 'object') return false
  const row = value as SourceFinding
  if (typeof row.id !== 'string' || typeof row.title !== 'string' || typeof row.tag !== 'string' || typeof row.when !== 'string') {
    return false
  }
  if (row.value != null && typeof row.value !== 'string') return false
  if (row.kind != null && !KINDS.has(row.kind)) return false
  if (row.graph != null && !GRAPHS.has(row.graph)) return false
  if ((row.kind === 'kpi' || (row.kind == null && row.value)) && !row.value) return false
  return true
}

function parseProfile(text: string): SourceProfileData {
  const next = JSON.parse(text) as SourceProfileData
  if (!next || typeof next !== 'object' || Array.isArray(next)) throw new Error('Profile must be an object')
  if (typeof next.name !== 'string' || !next.name.trim()) throw new Error('name is required')
  if (typeof next.kind !== 'string') throw new Error('kind is required')
  if (typeof next.status !== 'string') throw new Error('status is required')
  if (typeof next.description !== 'string') throw new Error('description is required')
  if (typeof next.contributions !== 'number') throw new Error('contributions must be a number')
  if (typeof next.useful !== 'number') throw new Error('useful must be a number')
  if (!Array.isArray(next.collaborators)) throw new Error('collaborators must be an array')
  if (!Array.isArray(next.findings) || !next.findings.every(isFinding)) {
    throw new Error('each finding needs id, title, tag, and when')
  }
  return { ...next, interested: Boolean(next.interested) }
}

function parseFindings(text: string): SourceFinding[] {
  const next = JSON.parse(text) as unknown
  if (!Array.isArray(next) || !next.every(isFinding)) {
    throw new Error('Findings must be an array of { id, title, tag, when }')
  }
  return next
}

function profileToJsx(profile: SourceProfileData): string {
  return `<SourceProfile
  name=${JSON.stringify(profile.name)}
  kind=${JSON.stringify(profile.kind)}
  status=${JSON.stringify(profile.status)}
  description=${JSON.stringify(profile.description)}
  contributions={${profile.contributions}}
  useful={${profile.useful}}
  interested={${profile.interested}}
  collaborators={${JSON.stringify(profile.collaborators)}}
  findings={${JSON.stringify(profile.findings, null, 2)}}
/>`
}

function findingsToJsx(findings: SourceFinding[]): string {
  return findings
    .map(
      (finding) => `<SourceFindingRow
  finding={${JSON.stringify(finding)}}
/>`,
    )
    .join('\n\n')
}

export type ProfileRowProps = {
  entry: ProfileEntry
}

/**
 * Catalog row for the source profile. Editable JSON, not a card recipe.
 */
export function ProfileRow({ entry }: ProfileRowProps) {
  const initialProfile = ZENDESK_PROFILE
  const initialFindings = entry.mode === 'rows' ? FINDING_LAYOUTS : ZENDESK_PROFILE.findings
  const [profile, setProfile] = useState<SourceProfileData>(initialProfile)
  const [findings, setFindings] = useState<SourceFinding[]>(initialFindings)
  const [draft, setDraft] = useState(() =>
    JSON.stringify(entry.mode === 'profile' ? initialProfile : initialFindings, null, 2),
  )
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'json' | 'jsx'>('json')

  const apply = useCallback(() => {
    try {
      if (entry.mode === 'profile') setProfile(parseProfile(draft))
      else setFindings(parseFindings(draft))
      setError(null)
    } catch (e) {
      setError((e as Error).message || 'Invalid JSON')
    }
  }, [draft, entry.mode])

  const reset = useCallback(() => {
    const next = entry.mode === 'profile' ? initialProfile : initialFindings
    setDraft(JSON.stringify(next, null, 2))
    setProfile(initialProfile)
    setFindings(initialFindings)
    setError(null)
  }, [entry.mode, initialFindings, initialProfile])

  const show = useCallback(
    (next: SourceProfileData) => {
      setProfile(next)
      setDraft(JSON.stringify(next, null, 2))
      setError(null)
    },
    [],
  )

  const jsx = useMemo(
    () => (entry.mode === 'profile' ? profileToJsx(profile) : findingsToJsx(findings)),
    [entry.mode, findings, profile],
  )
  const tree = entry.mode === 'profile' ? 'SourceProfile → SourceMark → SourceFindingRow' : 'SourceFindingRow'

  return (
    <section id={entry.id} className="scroll-mt-4 border-b border-nc-line-2 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-nc-line-2/80 bg-nc-tile/40 px-4 py-2.5">
        <div>
          <h3 className="m-0 font-nc-display text-[1.0625rem] font-normal tracking-[-0.02em] text-nc-ink">{entry.label}</h3>
          <p className="m-0 mt-0.5 text-[0.75rem] text-nc-ink-3">{entry.blurb}</p>
        </div>
        <p className="m-0 max-w-[42ch] truncate font-nc-mono text-[0.625rem] text-nc-ink-3" title={tree}>
          {tree}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="min-w-0 border-b border-nc-line-2 bg-nc-stage/70 p-4 sm:p-5 lg:border-r lg:border-b-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="m-0 font-nc-mono text-[0.625rem] tracking-wide text-nc-ink-3 uppercase">Catalog</p>
          </div>
          <div className="mx-auto w-full max-w-[27.5rem]">
            {entry.mode === 'profile' ? (
              <SourceProfile
                {...profile}
                className="max-h-[40rem]"
                onInterestedChange={(interested) => show({ ...profile, interested })}
                onCollaborator={(name) => {
                  const next = PROFILE_SAMPLES[name]
                  if (next) show(next)
                }}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {findings.map((finding) => (
                  <SourceFindingRow key={finding.id} finding={finding} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-[16rem] min-w-0 flex-col bg-nc-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-nc-line-2 px-3 py-2">
            <div className="flex items-center gap-2">
              <p className="m-0 font-nc-mono text-[0.625rem] tracking-wide text-nc-ink-3 uppercase">Testing</p>
              <div className="inline-flex rounded-full bg-nc-tile p-0.5">
                <button
                  type="button"
                  className={`h-7 rounded-full px-2.5 text-[0.6875rem] ${
                    tab === 'json' ? 'bg-nc-plain text-nc-ink shadow-sm' : 'text-nc-ink-2'
                  }`}
                  onClick={() => setTab('json')}
                >
                  JSON
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
            {tab === 'json' ? (
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

          {tab === 'json' ? (
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
                aria-label={`Editable JSON for ${entry.label}`}
              />
              {error ? (
                <p className="m-0 border-t border-nc-line-2 px-3 py-2 text-[0.75rem] text-nc-crit">{error}</p>
              ) : (
                <p className="m-0 border-t border-nc-line-2 px-3 py-2 text-[0.6875rem] text-nc-ink-3">
                  Edit → Apply (⌘/Ctrl+Enter). Catalog preview updates from this JSON.
                </p>
              )}
            </>
          ) : (
            <pre className="m-0 min-h-[14rem] flex-1 overflow-auto p-3 font-nc-mono text-[0.6875rem] leading-relaxed whitespace-pre-wrap text-nc-ink-2">
              {jsx}
            </pre>
          )}
        </div>
      </div>
    </section>
  )
}
