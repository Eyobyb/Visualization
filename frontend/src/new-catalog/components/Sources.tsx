import { rem } from './format'
import { LOGOS, MONOS } from './logos'

export type SourceTileProps = {
  name: string
  /** Tile size in design px (emitted as rem). Default 24. */
  size?: number
}

function Tile({ name, size = 24 }: SourceTileProps) {
  const logo = LOGOS[name]
  const mono = MONOS[name]
  const color = logo?.color ?? mono?.color ?? '#55575C'
  const label = mono?.mono ?? name.slice(0, 2).toUpperCase()
  const radius = size >= 24 ? 'rounded-[0.4375rem]' : 'rounded-[0.3125rem]'
  return (
    <span
      className={`sav grid place-items-center font-nc-ui font-semibold tracking-[0.02em] text-white ${radius} -ml-[0.3125rem] first:ml-0 shadow-[0_0_0_0.125rem_var(--color-nc-plain)]`}
      style={{
        width: rem(size),
        height: rem(size),
        background: color,
        fontSize: rem(size >= 24 ? 9 : 8),
      }}
      title={name}
    >
      {logo ? (
        <svg viewBox={logo.vb} aria-hidden className={size >= 24 ? 'size-[0.8125rem]' : 'size-[0.625rem]'}>
          <path d={logo.d} fill="currentColor" />
        </svg>
      ) : (
        label
      )}
    </span>
  )
}

export type SourcesProps = {
  names: string[]
  /** Tile size in design px (emitted as rem). */
  size?: number
}

/**
 * Source logo tiles for a card byline (and ranked-list rows). Shows up to three tiles.
 *
 * See [Sources.md](./Sources.md).
 *
 * @example <Sources names={['Stripe', 'Snowflake']} />
 */
export function Sources({ names, size }: SourcesProps) {
  const shown = names.slice(0, 3)
  if (!shown.length) return null
  return (
    <span className="inline-flex">
      {shown.map((n) => (
        <Tile key={n} name={n} size={size} />
      ))}
    </span>
  )
}

export type SourceMarkProps = {
  name: string
  /** `avatar` is the 68px profile mark. `chip` is the 26px collaborator mark. */
  size?: 'avatar' | 'chip'
}

/**
 * One source logo, not a stacked byline.
 * Avatar: profile header. Chip: collaborator pill, no overlap shadow.
 *
 * See [Sources.md](./Sources.md).
 *
 * @example <SourceMark name="Zendesk" size="avatar" />
 */
export function SourceMark({ name, size = 'chip' }: SourceMarkProps) {
  const logo = LOGOS[name]
  const mono = MONOS[name]
  const color = logo?.color ?? mono?.color ?? '#55575C'
  const label = mono?.mono ?? name.slice(0, 2).toUpperCase()
  const avatar = size === 'avatar'
  return (
    <span
      className={`grid shrink-0 place-items-center font-nc-display font-[400] text-white ${avatar ? 'rounded-[1.25rem]' : 'rounded-lg'}`}
      style={{
        width: rem(avatar ? 68 : 26),
        height: rem(avatar ? 68 : 26),
        background: color,
        fontSize: rem(avatar ? 22 : 9.5),
      }}
      title={name}
    >
      {logo ? (
        <svg viewBox={logo.vb} aria-hidden className={avatar ? 'size-[2.125rem]' : 'size-3.5'}>
          <path d={logo.d} fill="currentColor" />
        </svg>
      ) : (
        label
      )}
    </span>
  )
}
