import { describe, expect, it } from 'vitest'
import { STYLE_PACKS } from '../../components/visualization'
import { BUILT_IN_PACKS, builtInBase, readCustomStyles } from '../customStyles'

describe('saved themes', () => {
  it('lists the built-in packs and reads nothing without storage', () => {
    expect(Object.keys(BUILT_IN_PACKS)).toEqual(Object.keys(STYLE_PACKS))
    expect(readCustomStyles()).toEqual({})
  })

  it('follows a chain of saved themes back to a built-in pack', () => {
    const style = (name: string) => ({ ...STYLE_PACKS.default, name })
    const custom = { a: { base: 'soft', style: style('a') }, b: { base: 'a', style: style('b') }, loop: { base: 'loop', style: style('loop') } }
    expect(builtInBase('b', custom)).toBe('soft')
    expect(builtInBase('sharp', custom)).toBe('sharp')
    expect(builtInBase('loop', custom)).toBe('default')
  })
})
