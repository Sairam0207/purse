import { describe, expect, it } from 'vitest'
import { formatMoney, minorToInput, parseAmount } from './format'

describe('parseAmount', () => {
  it.each([
    ['250', 25000],
    ['99.5', 9950],
    ['99.50', 9950],
    ['1,250.75', 125075],
    [' 12 ', 1200],
    ['0.01', 1],
  ])('parses %s', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  it.each(['', '0', '-5', 'abc', '1.234', '1.2.3', '12a'])('rejects %j', (input) => {
    expect(parseAmount(input)).toBeNull()
  })

  it('avoids floating point drift', () => {
    expect(parseAmount('0.29')).toBe(29) // 0.29 * 100 === 28.999999999999996 in JS
  })
})

describe('minorToInput', () => {
  it('round-trips with parseAmount', () => {
    for (const minor of [1, 50, 100, 9950, 125075]) {
      expect(parseAmount(minorToInput(minor))).toBe(minor)
    }
  })
})

describe('formatMoney', () => {
  it('uses Indian digit grouping for INR', () => {
    expect(formatMoney(12345600, 'INR')).toBe('₹1,23,456')
  })
  it('shows cents when present', () => {
    expect(formatMoney(1050, 'USD')).toBe('$10.5')
  })
})
