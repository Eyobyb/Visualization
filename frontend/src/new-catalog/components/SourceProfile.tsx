import type { ReactNode } from 'react'
import type { GraphKind } from '../config'
import { FindingGlyph } from './FindingGlyph'
import { SourceMark } from './Sources'

/** How the row leads. A number, a sentence, or a chart hint. */
export type SourceFindingKind = 'kpi' | 'text' | 'graph'

/** One recent finding inside a source profile. Display strings, not a viz payload. */
export type SourceFinding = {
  id: string
  title: string
  tag: string
  when: string
  /** Other sources that contributed. */
  with?: string[]
  /** Currently in the intelligence stream. */
  live?: boolean
  /** Row surface. `plain` is the grey row; `surface` is the light row. */
  tone?: 'plain' | 'surface'
  /**
   * `kpi` leads with `value`. `text` is the finding sentence. `graph` is that
   * sentence plus a line-art hint. Omitted: `kpi` when `value` is set, otherwise `text`.
   */
  kind?: SourceFindingKind
  /** Already formatted, e.g. "+38%" or "2.4h". Required for `kpi`. */
  value?: string
  /** One line under the title for `text` and `graph`. */
  takeaway?: string
  /** Which hint to draw when `kind` is `graph`. Defaults to `trend`. */
  graph?: GraphKind
}

export type SourceFindingRowProps = {
  finding: SourceFinding
  /** Optional extra hint, drawn after the built-in graph glyph. */
  glyph?: ReactNode
  onSelect?: (id: string) => void
}

export type SourceProfileData = {
  name: string
  /** e.g. "Data source agent". */
  kind: string
  /** e.g. "Connected · Production". */
  status: string
  description: string
  contributions: number
  /** Percent rated useful, 0–100. */
  useful: number
  collaborators: string[]
  interested: boolean
  findings: SourceFinding[]
}

export type SourceProfileProps = SourceProfileData & {
  onInterestedChange?: (interested: boolean) => void
  onClose?: () => void
  onCollaborator?: (name: string) => void
  onFinding?: (id: string) => void
  className?: string
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function resolveKind(finding: SourceFinding): SourceFindingKind {
  if (finding.kind) return finding.kind
  if (finding.graph) return 'graph'
  if (finding.value) return 'kpi'
  return 'text'
}

function rowSurface(tone: SourceFinding['tone']) {
  return tone === 'surface'
    ? 'bg-nc-surface'
    : 'bg-nc-plain shadow-[inset_0_0_0_1px_var(--color-nc-plain-line)]'
}

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

/**
 * Compact recent-intelligence row for a source profile.
 * Shares a card’s finding fields (value, title, tag, when, collaborators)
 * without rendering any of the nine visualization types.
 *
 * See [SourceFindingRow.md](./SourceFindingRow.md).
 */
function LiveMark() {
  return (
    <em className="mt-0.5 inline-flex items-center gap-1.5 text-[0.6875rem] font-normal text-nc-ink-2 not-italic">
      <i className="size-1.5 rounded-full bg-nc-lime shadow-[0_0_0_3px_var(--color-nc-lime-glow)]" />
      In your stream
    </em>
  )
}

export function SourceFindingRow({ finding, glyph, onSelect }: SourceFindingRowProps) {
  const others = finding.with?.filter(Boolean) ?? []
  const meta = `${finding.tag} · ${finding.when}${others.length ? ` · with ${joinNames(others)}` : ''}`
  const kind = resolveKind(finding)
  const surface = `flex w-full items-center gap-3.5 rounded-[1.125rem] border-0 px-4 py-3.5 text-left text-nc-ink hover:shadow-[0_14px_30px_-20px_rgba(var(--shadow-nc-rgb),0.5)] ${rowSurface(finding.tone)}`

  if (kind === 'kpi') {
    return (
      <button type="button" data-kind="kpi" className={surface} onClick={() => onSelect?.(finding.id)}>
        <span className="min-w-16 font-nc-display text-[1.625rem] leading-none font-[300] tracking-[-0.03em] tabular-nums">
          {finding.value}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="text-[0.84375rem] leading-snug font-medium">{finding.title}</b>
          <span className="text-[0.71875rem] text-nc-ink-2">{meta}</span>
          {finding.live ? <LiveMark /> : null}
        </span>
        {glyph ? <span className="shrink-0">{glyph}</span> : null}
      </button>
    )
  }

  return (
    <button type="button" data-kind={kind} className={surface} onClick={() => onSelect?.(finding.id)}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <b className="font-nc-display text-[1.25rem] leading-[1.22] font-[300] tracking-[-0.02em] text-balance">{finding.title}</b>
        {finding.takeaway ? <span className="text-[0.84375rem] text-nc-ink-2">{finding.takeaway}</span> : null}
        <span className="text-[0.71875rem] text-nc-ink-2">{meta}</span>
        {finding.live ? <LiveMark /> : null}
      </span>
      {kind === 'graph' ? <FindingGlyph kind={finding.graph ?? 'trend'} /> : null}
      {glyph ? <span className="shrink-0">{glyph}</span> : null}
    </button>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <b className="font-nc-display text-[1.875rem] leading-none font-[300] tracking-[-0.03em]">{value}</b>
      <span className="text-[0.71875rem] text-nc-ink-3">{label}</span>
    </div>
  )
}

/**
 * Source-agent profile drawer: identity, stats, interest, collaborators, recent findings.
 * Not an IntelligenceCard — it identifies an agent, it does not show one answer.
 *
 * See [SourceProfile.md](./SourceProfile.md).
 *
 * @example
 * <SourceProfile name="Zendesk" kind="Data source agent" status="Connected · Production" ... />
 */
export function SourceProfile({
  name,
  kind,
  status,
  description,
  contributions,
  useful,
  collaborators,
  interested,
  findings,
  onInterestedChange,
  onClose,
  onCollaborator,
  onFinding,
  className = '',
}: SourceProfileProps) {
  return (
    <aside
      aria-label="Source profile"
      className={`flex w-full flex-col overflow-hidden rounded-3xl border border-nc-line-2 bg-nc-stage text-nc-ink ${className}`}
    >
      <div className="flex items-center justify-between pr-4 pl-6 pt-3.5 text-[0.75rem] text-nc-ink-3">
        <span>Intelligence source</span>
        <button
          type="button"
          aria-label="Close profile"
          className="grid size-8 place-items-center rounded-full border-0 bg-transparent text-nc-ink-2 hover:bg-nc-tile hover:text-nc-ink"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-4" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-3.5 pb-7">
        <div className="flex items-center gap-4">
          <SourceMark name={name} size="avatar" />
          <div className="min-w-0">
            <h3 className="m-0 mb-2 font-nc-display text-[2rem] leading-none font-[300] tracking-[-0.03em]">{name}</h3>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center rounded-full bg-nc-tile px-2.5 py-1 text-[0.71875rem] text-nc-ink-2">{kind}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-nc-tile px-2.5 py-1 text-[0.71875rem] text-nc-ink-2">
                <i className="size-1.5 rounded-full bg-nc-lime shadow-[0_0_0_3px_var(--color-nc-lime-glow)]" />
                {status}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-4 mb-0 max-w-[44ch] text-[0.84375rem] text-nc-ink-2">{description}</p>
        <div className="my-5 flex gap-6">
          <Stat value={String(contributions)} label="contributions this month" />
          <Stat value={`${useful}%`} label="rated useful" />
          <Stat value={String(collaborators.length)} label="collaborators" />
        </div>
        <button
          type="button"
          className={`inline-flex h-[2.625rem] items-center gap-2 rounded-full border-0 px-5 text-[0.84375rem] font-medium ${
            interested ? 'bg-nc-tile text-nc-ink' : 'bg-nc-ink text-nc-stage'
          }`}
          aria-pressed={interested}
          onClick={() => onInterestedChange?.(!interested)}
        >
          {interested ? (
            <>
              <Check />
              Interested
            </>
          ) : (
            'Interested?'
          )}
        </button>
        <p className="mt-2.5 mb-0 max-w-[44ch] text-[0.75rem] text-nc-ink-3">
          Marking yourself interested ranks {name} higher in your stream and lets it notify you about important changes.
        </p>
        {collaborators.length ? (
          <section>
            <h5 className="mt-6 mb-2.5 text-[0.78125rem] font-normal text-nc-ink-3">Often collaborates with</h5>
            <div className="flex flex-wrap gap-1.5">
              {collaborators.map((collaborator) => (
                <button
                  key={collaborator}
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-full border-0 bg-nc-surface pr-3 pl-1 text-[0.8125rem] text-nc-ink"
                  onClick={() => onCollaborator?.(collaborator)}
                >
                  <SourceMark name={collaborator} size="chip" />
                  <span>{collaborator}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
        <section>
          <h5 className="mt-6 mb-2.5 text-[0.78125rem] font-normal text-nc-ink-3">Recent intelligence</h5>
          <div className="flex flex-col gap-2">
            {findings.map((finding) => (
              <SourceFindingRow key={finding.id} finding={finding} onSelect={onFinding} />
            ))}
          </div>
        </section>
      </div>
    </aside>
  )
}
