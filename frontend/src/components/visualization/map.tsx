import { useEffect, useMemo, useRef, useState } from 'react'
import type * as Leaflet from 'leaflet'
import { Glyph } from './Icon'
import { Rating } from './inputs'
import { CardHead, Empty } from './shared'
import { useLabels, usePlaceholders } from './theme/context'
import { cx, safeUrl } from './utils'

/** One place on a PlaceMap. Coordinates come from the data or from the server's geocoder, never from the model. */
export interface Place {
  name: string
  lat?: number
  lng?: number
  /** Whether the place is located: still geocoding, on the map, or not found. */
  status?: 'pending' | 'found' | 'missing'
  /** Search query for the pin photo; the server resolves it. */
  image?: string
  /** Resolved photo URL: undefined while searching, null when nothing matched. */
  src?: string | null
  fallbackSrc?: string
  text?: string
  /** Out of 5. */
  rating?: number
  url?: string
  /** Short tag, such as "Café" or "Museum". */
  category?: string
}

const HEIGHT = { sm: 220, md: 320, lg: 440 } as const

/** OpenStreetMap's standard tiles: free without a key, for light use (see the tile usage policy). Dark mode is a CSS filter. */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const located = (p: Place): p is Place & { lat: number; lng: number } =>
  Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat!) <= 90 && Math.abs(p.lng!) <= 180

const statusOf = (p: Place) => (located(p) ? 'found' : p.status === 'missing' ? 'missing' : p.status ?? 'pending')

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const osmLink = (p: { lat: number; lng: number }) =>
  `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`

function PlaceCard({ place }: { place: Place }) {
  const L = useLabels()
  const site = safeUrl(place.url)
  return (
    <div className="ui-place-card">
      {place.src && <img src={place.src} alt="" loading="lazy" referrerPolicy="no-referrer" />}
      <div className="ui-place-card-body">
        <b>{place.name}</b>
        {place.category && <span className="ui-place-sub">{place.category}</span>}
        {typeof place.rating === 'number' && <Rating value={place.rating} size="sm" />}
        {place.text && <p>{place.text}</p>}
        <div className="ui-place-links">
          {located(place) && (
            <a className="ui-link" href={osmLink(place)} target="_blank" rel="noopener noreferrer">
              {L.mapOpen} <Glyph name="external" size={13} />
            </a>
          )}
          {site && (
            <a className="ui-link" href={site} target="_blank" rel="noopener noreferrer">
              {L.mapWebsite} <Glyph name="external" size={13} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

interface MapHandle {
  L: typeof Leaflet
  map: Leaflet.Map
  pins: Leaflet.LayerGroup
}

/**
 * Places on a map with photo pins and a numbered list. Pins appear as the server locates each place;
 * select a pin or a list item to see its photo, details and links. Places that could not be located
 * stay in the list, marked as not on the map.
 *
 * @example
 * <PlaceMap title="Coffee in Bole" places={[{ name: 'Tomoca Coffee', lat: 9.0108, lng: 38.7613, text: 'Roastery since 1953' }]} />
 */
export function PlaceMap({ places, title, height = 'md', list = true }: {
  places: Place[]
  title?: string
  height?: 'sm' | 'md' | 'lg'
  /** Show the numbered list beside or under the map. */
  list?: boolean
}) {
  const L = useLabels()
  const ph = usePlaceholders()
  const box = useRef<HTMLDivElement>(null)
  const handle = useRef<MapHandle | null>(null)
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const latest = useRef(places)
  useEffect(() => {
    latest.current = places
  })
  const pinsKey = places.map((p) => (located(p) ? `${p.lat},${p.lng}` : '-') + '|' + (p.src ?? '')).join(';')
  const boundsKey = places.map((p) => (located(p) ? `${p.lat},${p.lng}` : '-')).join(';')

  useEffect(() => {
    let cancelled = false
    void Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(([mod]) => {
      const el = box.current
      if (cancelled || !el) return
      const Lf = ((mod as { default?: typeof Leaflet }).default ?? mod) as typeof Leaflet
      const map = Lf.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView([9.03, 38.74], 12)
      Lf.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map)
      handle.current = { L: Lf, map, pins: Lf.layerGroup().addTo(map) }
      setReady(true)
    })
    return () => {
      cancelled = true
      handle.current?.map.remove()
      handle.current = null
    }
  }, [])

  useEffect(() => {
    const h = handle.current
    if (!ready || !h) return
    h.pins.clearLayers()
    latest.current.forEach((p, i) => {
      if (!located(p)) return
      const photo = p.src ? `<img src="${esc(p.src)}" alt="" referrerpolicy="no-referrer">` : `<b>${i + 1}</b>`
      const icon = h.L.divIcon({
        className: 'ui-pin-icon',
        html: `<span class="ui-pin${selected === i ? ' on' : ''}${p.src ? ' photo' : ''}">${photo}</span>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      })
      const m = h.L.marker([p.lat, p.lng], { icon, title: p.name, alt: p.name, riseOnHover: true, zIndexOffset: selected === i ? 1000 : 0 })
      m.on('click', () => setSelected(i))
      m.on('keypress', () => setSelected(i))
      m.addTo(h.pins)
      const img = m.getElement()?.querySelector('img')
      if (img && p.fallbackSrc) img.addEventListener('error', () => { img.src = p.fallbackSrc! }, { once: true })
    })
  }, [ready, pinsKey, selected])

  useEffect(() => {
    const h = handle.current
    if (!ready || !h) return
    const pts = latest.current.filter(located).map((p) => [p.lat, p.lng] as [number, number])
    if (pts.length === 1) h.map.setView(pts[0], 15)
    else if (pts.length > 1) h.map.fitBounds(pts, { padding: [48, 48], maxZoom: 15 })
  }, [ready, boundsKey])

  const pick = (i: number) => {
    setSelected(i)
    const p = places[i]
    if (p && located(p)) handle.current?.map.panTo([p.lat, p.lng])
  }

  const status = useMemo(() => places.map(statusOf), [places])
  if (!places.length) return <Empty text={ph.mapNoPlaces} />
  const current = selected != null ? places[selected] : undefined

  return (
    <section className="ui-card pad ui-placemap">
      {title && <CardHead title={title} icon="map-pin" />}
      <div className={cx('ui-placemap-body', list && 'with-list')}>
        <div className="ui-placemap-main">
          <div
            ref={box}
            className={cx('ui-map-box', !ready && 'loading')}
            style={{ height: HEIGHT[height] ?? HEIGHT.md }}
            role="region"
            aria-label={title ?? L.mapRegion}
          />
          {current && <PlaceCard place={current} />}
        </div>
        {list && (
          <ol className="ui-place-list">
            {places.map((p, i) => (
              <li key={i}>
                <button type="button" className={cx('ui-place-item', selected === i && 'on')} onClick={() => pick(i)} aria-pressed={selected === i}>
                  <span className={cx('ui-place-num', status[i])}>{i + 1}</span>
                  <span className="ui-place-text">
                    <b>{p.name}</b>
                    {(p.category || status[i] !== 'found') && (
                      <span className="ui-place-sub">
                        {[p.category, status[i] === 'pending' ? L.mapLocating : status[i] === 'missing' ? L.mapNotFound : ''].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
