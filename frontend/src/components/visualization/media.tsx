import { Glyph, type IconName } from './Icon'
import { cx } from './utils'
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
 *
 * @example
 * <AsyncImage query="hand-woven Ethiopian netela scarf on a wooden table" src={resolved} aspectRatio="5:4" caption="Netela scarf" />
 */
export function AsyncImage({ query, src, aspectRatio = '4:3', caption }: {
  /** Descriptive search query, 5 to 15 words. Also the alt text when there is no caption. */
  query: string
  /** Resolved image URL; leave undefined while the search is still running. */
  src?: string
  aspectRatio?: AspectRatio
  /** Caption under the image. */
  caption?: string
}) {
  return (
    <figure className="ui-img">
      <div className="ui-img-box" style={{ aspectRatio: ratio(aspectRatio) }}>
        {src ? <img src={src} alt={caption ?? query} loading="lazy" /> : <div className="ui-skel fill" />}
      </div>
      <figcaption>
        {caption && <span className="cap">{caption}</span>}
        {!src && <span className="ui-img-note">Searching for “{query}”</span>}
      </figcaption>
    </figure>
  )
}

/** One image in a group: the query, plus its URL once resolved. */
export interface ImageQuery {
  query: string
  src?: string
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
      {images.map((img, i) => <AsyncImage key={img.query + i} query={img.query} src={img.src} aspectRatio={aspectRatio} />)}
    </div>
  )
}
