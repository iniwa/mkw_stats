import { describe, expect, it } from 'vitest'
import { fmtTime, fmtValue } from './format'

describe('format helpers', () => {
  it('formats nullable values with the existing empty marker', () => {
    expect(fmtValue(null)).toBe('\u2014')
    expect(fmtValue(1234567)).toBe('1,234,567')
  })

  it('formats null times with the existing empty marker', () => {
    expect(fmtTime(null)).toBe('\u2014')
  })

  it('keeps record time style two-digit month and day', () => {
    expect(fmtTime('2026-07-07T01:02:03+09:00', 'record')).toContain('07/07')
  })
})