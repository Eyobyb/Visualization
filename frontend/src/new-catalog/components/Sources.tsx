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
