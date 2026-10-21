import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AsyncImage, Chart, Table, Verdict, VizRoot, WeatherCard } from '../..'
import { selectStyle } from '../../../../../scripts/vizStyle'
import { fontFaceCss, resolveStyle, styleJsonSchema, styleVars, validateStyle, type StyleFile } from '../config'
import { SELECTED_STYLE, STYLE_PACKS } from '../context'

const root = path.resolve(__dirname, '../../../../..')
const packsDir = path.resolve(__dirname, '../packs')
const raw = Object.fromEntries(fs.readdirSync(packsDir).map((f) => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(packsDir, f), 'utf8'))]))

describe('style packs', () => {
  it('ships default plus five packs, each complete once resolved', () => {
    expect(Object.keys(STYLE_PACKS)).toEqual(['default', 'chatgpt', 'contrast', 'editorial', 'sharp', 'soft'])
    for (const s of Object.values(STYLE_PACKS)) expect(validateStyle(s)).toEqual([])
  })

  it('keeps the default pack identical to the pre-config CSS tokens', () => {
    const light = styleVars(STYLE_PACKS.default, 'light')
    expect(light).toMatchObject({
      '--bg': '#F3F4F1', '--accent': '#1D6A56', '--ink-3': '#78827C', '--c6': '#7860AE',
      '--r-md': '10px', '--r-lg': '14px', '--r-scale': '1', '--r-pill': '999px', '--text-scale': '1', '--leading': '1.55', '--space-scale': '1',
      '--fw-medium': '500', '--fw-strong': '600', '--empty-border': 'dashed',
    })
    expect(light['--font-heading']).toBe(light['--font-ui'])
    expect(fontFaceCss(STYLE_PACKS.default)).toBe('')
    expect(styleVars(STYLE_PACKS.default, 'dark')).toMatchObject({ '--bg': '#101513', '--accent': '#5DBD9C', '--shadow': '0 1px 2px rgb(0 0 0 / .4), 0 8px 22px rgb(0 0 0 / .45)' })
  })

  it('selects default when VIZ_STYLE is unset', () => {
    expect(SELECTED_STYLE.name).toBe('default')
  })

  it('fills fields a pack leaves out from default', () => {
    expect(STYLE_PACKS.sharp.placeholders.imageMissing).toBe('No matching photo')
    expect(STYLE_PACKS.sharp.radius).toEqual({ scale: 0, md: 0, lg: 0, pill: 0 })
    expect(STYLE_PACKS.editorial.fonts.ui).toBe(STYLE_PACKS.default.fonts.ui)
    expect(STYLE_PACKS.sharp.labels).toEqual(STYLE_PACKS.default.labels)
    expect(STYLE_PACKS.sharp.spacing.scale).toBeLessThan(1)
  })
})

describe('validation', () => {
  const brand: StyleFile = { name: 'acme', colors: { light: { accent: '#E4002B' } }, placeholders: { imageMissing: 'No photo yet' } }

  it('resolves a partial brand file on top of default', () => {
    const s = resolveStyle(brand, raw, 'acme.json')
    expect(s.colors.light.accent).toBe('#E4002B')
    expect(s.colors.light.bg).toBe('#F3F4F1')
    expect(s.label).toBe('acme')
  })

  it('extends another pack', () => {
    const s = resolveStyle({ extends: 'soft', colors: { dark: { accent: '#FF00AA' } } }, raw, 'x.json', 'x')
    expect(s.radius.md).toBe(18)
    expect(s.colors.dark.accent).toBe('#FF00AA')
    expect(s.name).toBe('x')
  })

  it('reports every problem with a path', () => {
    const bad = {
      colors: { light: { accnt: '#000', series: ['#000'] } },
      fonts: { scale: 9, weightStrong: 650.5, faces: [{ family: 'Brand', src: '' }, { family: 'Brand', src: '/b.woff2', weight: '400; } body { x', size: 1 }] },
      spacing: { scale: 3 },
      radius: { md: '10px' },
      placeholders: { skeleton: 'spin' },
      labels: { copyCode: 5, copy: 'Copy' },
    }
    expect(() => resolveStyle(bad, raw, 'bad.json')).toThrowError(/bad\.json/)
    expect(validateStyle(bad, true)).toEqual([
      'colors.light.accnt: unknown field',
      'colors.light.series: expected 6 CSS color strings',
      'fonts.scale: 9 is outside 0.75 to 1.5',
      'fonts.weightStrong: expected a whole number',
      'fonts.faces[0].src: expected a non-empty string',
      'fonts.faces[1].size: unknown field',
      'fonts.faces[1].weight: expected a string such as "400" or "400 700"',
      'spacing.scale: 3 is outside 0.5 to 2',
      'radius.md: expected a number',
      'placeholders.skeleton: expected one of shimmer, pulse, static',
      'labels.copy: unknown field',
      'labels.copyCode: expected a non-empty string',
    ])
  })

  it('rejects unknown parents, cycles and incomplete standalone files', () => {
    expect(() => resolveStyle({ extends: 'neon' }, raw, 'a.json')).toThrowError(/no pack named "neon"/)
    expect(() => resolveStyle({ name: 'a', extends: 'b' }, { ...raw, b: { name: 'b', extends: 'a' }, a: { name: 'a', extends: 'b' } }, 'a')).toThrowError(/cycle/)
    expect(() => resolveStyle({ extends: null, name: 'solo' }, raw, 'solo.json')).toThrowError(/colors: missing/)
  })

  it('keeps viz-style.schema.json in sync with the shape', () => {
    const file = path.resolve(__dirname, '../viz-style.schema.json')
    const content = JSON.stringify(styleJsonSchema(), null, 2) + '\n'
    if (process.env.VIZ_STYLE_WRITE) fs.writeFileSync(file, content)
    expect(fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content, file + ' is stale; run npm run export-viz-style').toBe(true)
  })
})

describe('startup selection', () => {
  it('takes a pack name, a JSON path, or nothing', () => {
    expect(selectStyle(undefined, root).style.name).toBe('default')
    expect(selectStyle('editorial', root).style.fonts.heading).toContain('Source Serif 4')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vizstyle-'))
    const file = path.join(dir, 'acme.json')
    fs.writeFileSync(file, JSON.stringify({ extends: 'sharp', colors: { light: { accent: '#E4002B' } } }))
    const picked = selectStyle(file, root)
    expect(picked.style).toMatchObject({ name: 'acme', radius: { md: 0 }, colors: { light: { accent: '#E4002B' } } })
    expect(picked.file).toBe(file)
  })

  it('fails with the pack list for an unknown name', () => {
    expect(() => selectStyle('neon', root)).toThrowError(/default, .*soft/)
  })
})

describe('VizRoot', () => {
  it('sets the tokens of the chosen pack and mode', () => {
    const html = renderToString(<VizRoot stylePack="sharp" theme="dark"><span /></VizRoot>)
    expect(html).toContain('data-style="sharp"')
    expect(html).toContain('data-skeleton="static"')
    expect(html).toContain('--accent:#6E93FF')
    expect(html).toContain('--r-md:0px')
  })

  it('passes its style to nested roots and placeholder text to components', () => {
    const acme = resolveStyle({ name: 'acme', placeholders: { imageMissing: 'Photo unavailable', imageSearching: 'Finding {query}…', noData: 'Nothing for this {kind}' } }, raw, 'acme')
    const html = renderToString(
      <VizRoot stylePack={acme}>
        <VizRoot theme="dark">
          <AsyncImage query="a" src={null} />
          <AsyncImage query="jebena pot" />
          <Chart type="bar" data={undefined} x="a" y="b" />
        </VizRoot>
      </VizRoot>,
    )
    expect(html.match(/data-style="acme"/g)).toHaveLength(2)
    expect(html).toContain('Photo unavailable')
    expect(html).toContain('Finding jebena pot…')
    expect(html).toContain('Nothing for this chart')
  })

  it('shows the style labels instead of the built-in English', () => {
    const fr = resolveStyle({
      name: 'fr',
      labels: { showAllRows: 'Afficher les {count} lignes', recommendation: 'Recommandation', chooseInstead: 'Prenez {name} plutôt {when}', confidenceHigh: 'Confiance élevée', weatherRain: 'Pluie', humidity: 'Humidité {value}' },
    }, raw, 'fr')
    const html = renderToString(
      <VizRoot stylePack={fr}>
        <Table data={Array.from({ length: 12 }, (_, i) => ({ n: i }))} limit={5} />
        <Verdict pick="A" alternative={{ name: 'B', when: 'si besoin' }} confidence="high" />
        <WeatherCard location="Paris" now={{ temp: 12, condition: 'rain', humidity: 80 }} />
      </VizRoot>,
    )
    for (const t of ['Afficher les 12 lignes', 'Recommandation', 'Prenez <b>B</b> plutôt <!-- -->si besoin', 'Confiance élevée', 'Pluie', 'Humidité 80%']) expect(html).toContain(t)
    expect(html).not.toContain('Show all')
  })

  it('loads the web fonts a style declares, and spaces by its scale', () => {
    const brand = resolveStyle({ name: 'brand', fonts: { ui: 'Brand, sans-serif', faces: [{ family: 'Brand', src: '/fonts/brand.woff2', weight: '400 700' }] }, spacing: { scale: 0.8 } }, raw, 'brand')
    expect(fontFaceCss(brand)).toBe('@font-face { font-family: "Brand"; src: url("/fonts/brand.woff2"); font-weight: 400 700; font-style: normal; font-display: swap; }')
    const html = renderToString(<VizRoot stylePack={brand}><span /></VizRoot>)
    expect(html).toContain('src: url("/fonts/brand.woff2")')
    const evil = resolveStyle({ name: 'evil', fonts: { faces: [{ family: 'X', src: '</style><script>alert(1)</script>' }] } }, raw, 'evil')
    expect(renderToString(<VizRoot stylePack={evil}><span /></VizRoot>)).not.toContain('<script')
    expect(html).toContain('--space-scale:0.8')
    expect(renderToString(<VizRoot><span /></VizRoot>)).not.toContain('<style')
  })

  it('falls back to the inherited style for an unknown pack name', () => {
    expect(renderToString(<VizRoot stylePack="neon"><span /></VizRoot>)).toContain('data-style="default"')
  })
})
