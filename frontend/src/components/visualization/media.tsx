import { useState } from 'react'
import { Glyph, type IconName } from './Icon'
import { usePlaceholders } from './theme/context'
import { cx, fillTemplate } from './utils'
import type { Tone } from './types'

/**
 * A standalone outline icon for labels and lists.
 *
 * @example <Icon name="coffee" size="lg" tone="warning" />
 */
export function Icon({ name, size = 'md', tone = 'ink' }: {
  name: IconName
  size?: 'sm' | 'md' | 'lg'
  tone?: Tone
}) {
  return (
    <span className={'ui-iconwrap t-' + tone}>
      <Glyph name={name} size={{ sm: 16, md: 20, lg: 28 }[size]} />
    </span>
  )
}

export type AspectRatio = '1:1' | '4:3' | '5:4' | '16:9'

const ratio = (r: AspectRatio) => r.replace(':', ' / ')

/**
 * A photo found from a descriptive search query. The model writes the query and the server resolves
 * a real image URL; until `src` arrives the frame shows a loading skeleton, so the layout never jumps.
 * `src={null}` means the search found no matching photo.
 *
 * @example
 * <AsyncImage query="hand-woven Ethiopian netela scarf on a wooden table" src={resolved} aspectRatio="5:4" caption="Netela scarf" />
 */
export function AsyncImage({ query, src, fallbackSrc, aspectRatio = '4:3', caption }: {
  /** Descriptive search query, 5 to 15 words. Also the alt text when there is no caption. */
  query: string
  /** Resolved image URL; undefined while the search is still running, null when nothing matched. */
  src?: string | null
  /** Shown instead when `src` fails to load, such as a search thumbnail of the same photo. */
  fallbackSrc?: string
  aspectRatio?: AspectRatio
  /** Caption under the image. */
  caption?: string
}) {
  const [broken, setBroken] = useState<string[]>([])
  const ph = usePlaceholders()
  const shown = src ? [src, fallbackSrc].find((u) => u && !broken.includes(u)) : undefined
  const missing = src === null || (src !== undefined && !shown)
  return (
    <figure className="ui-img">
      <div className="ui-img-box" style={{ aspectRatio: ratio(aspectRatio) }}>
        {shown ? (
          <img
            key={shown}
            src={shown}
            alt={caption ?? query}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setBroken((b) => [...b, shown])}
          />
        ) : missing ? (
          <div className="ui-img-missing">{ph.imageMissing}</div>
        ) : (
          <div className="ui-skel fill" />
        )}
      </div>
      <figcaption>
        {caption && <span className="cap">{caption}</span>}
        {src === undefined && <span className="ui-img-note">{fillTemplate(ph.imageSearching, { query })}</span>}
        {missing && !caption && <span className="ui-img-note">{query}</span>}
      </figcaption>
    </figure>
  )
}

/** One image in a group: the query, plus its URL once resolved (null when nothing matched). */
export interface ImageQuery {
  query: string
  src?: string | null
  fallbackSrc?: string
}

/**
 * Several server-resolved photos laid out as a grid or a horizontally scrolling strip.
 *
 * @example
 * <AsyncImageGroup layout="strip" images={[{ query: 'jebena coffee pot on charcoal' }, { query: 'woven mesob basket' }]} />
 */
export function AsyncImageGroup({ images, layout = 'grid', aspectRatio = '4:3' }: {
  /** Two to six images. */
  images: ImageQuery[]
  layout?: 'grid' | 'strip'
  aspectRatio?: AspectRatio
}) {
  return (
    <div className={cx('ui-imggrid', layout === 'strip' && 'strip')}>
      {images.map((img, i) => (
        <AsyncImage key={img.query + i} query={img.query} src={img.src} fallbackSrc={img.fallbackSrc} aspectRatio={aspectRatio} />
      ))}
    </div>
  )
}
