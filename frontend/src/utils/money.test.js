import { describe, expect, it } from 'vitest'

import { fromCents, multiplyCents, sumCents, toCents } from './money.js'

describe('money utils', () => {
  it('converts server money strings to exact cents', () => {
    expect(toCents('12.50')).toBe(1250)
    expect(toCents('0.05')).toBe(5)
    expect(toCents('3')).toBe(300)
    expect(toCents('1.5')).toBe(150)
    expect(toCents('')).toBe(0)
  })

  it('rejects more than two decimals', () => {
    expect(() => toCents('1.234')).toThrow()
  })

  it('formats cents back to a fixed two-decimal string', () => {
    expect(fromCents(1250)).toBe('12.50')
    expect(fromCents(5)).toBe('0.05')
    expect(fromCents(0)).toBe('0.00')
  })

  it('multiplies and sums without floating point drift', () => {
    expect(multiplyCents(1999, 3)).toBe(5997)
    expect(sumCents([1999, 5, 100])).toBe(2104)
  })
})
