import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_PACKS } from '../../lib/customStyles'
import { Studio } from '../Studio'

describe('Studio', () => {
  it('shows the style picker and the chat, and keeps the context editor closed', () => {
    const html = renderToStaticMarkup(<Studio />)
    for (const pack of Object.values(BUILT_IN_PACKS)) expect(html).toContain(pack.label)
    expect(html).toContain('Ask anything')
    expect(html).toContain('Ask something below')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('Paste notes')
  })
})
