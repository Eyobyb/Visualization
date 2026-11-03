import { describe, expect, it } from 'vitest'
import { arrow, compact, deltaTone, fmt, fmtDelta, fmtX } from '../format'

describe('format', () => {
  it('compacts large numbers', () => {
    expect(compact(366000)).toBe('366K')
    expect(compact(1_240_000)).toBe('1.2M')
    expect(compact(12_000_000)).toBe('12M')
  })

  it('formats units the card payload uses', () => {
    expect(fmt(366000, 'USD')).toBe('$366K')
    expect(fmt(0.21, '%')).toBe('0.2%')
    expect(fmt(2.6, 'x')).toBe('2.6×')
    expect(fmt(2.4, 'h')).toBe('2.4h')
    expect(fmt(-0.06, 'pt')).toBe('−0.1 pt')
  })

  it('formats deltas and tones', () => {
    expect(fmtDelta(18, '%')).toBe('+18%')
    expect(fmtDelta(-0.06, 'pt')).toBe('−0.1 pt')
    expect(deltaTone(18, 'up')).toBe('good')
    expect(deltaTone(18, 'down')).toBe('bad')
    expect(deltaTone(-4, 'up')).toBe('bad')
    expect(arrow(1)).toBe('↑')
  })

  it('formats dates for axes', () => {
    expect(fmtX('2026-10-12')).toMatch(/Oct/)
  })
})
