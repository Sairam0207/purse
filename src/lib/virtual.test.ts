import { describe, expect, it } from 'vitest'
import { prefixOffsets, rowAt, visibleRange } from './virtual'

describe('virtual list math', () => {
  const offsets = prefixOffsets([40, 64, 64, 40, 64])

  it('builds prefix sums', () => {
    expect(offsets).toEqual([0, 40, 104, 168, 208, 272])
  })

  it('finds the row at a pixel offset with binary search', () => {
    expect(rowAt(offsets, 0)).toBe(0)
    expect(rowAt(offsets, 39)).toBe(0)
    expect(rowAt(offsets, 40)).toBe(1)
    expect(rowAt(offsets, 200)).toBe(3)
    expect(rowAt(offsets, 10_000)).toBe(4)
  })

  it('returns a padded visible range clamped to the list', () => {
    expect(visibleRange(offsets, 50, 100, 0)).toEqual([1, 3])
    expect(visibleRange(offsets, 50, 100, 2)).toEqual([0, 5])
    expect(visibleRange(prefixOffsets([]), 0, 500)).toEqual([0, 0])
  })

  it('stays fast and correct at 100k rows', () => {
    const big = prefixOffsets(Array.from({ length: 100_000 }, (_, i) => (i % 10 === 0 ? 44 : 64)))
    const y = big[73_210] + 5
    expect(rowAt(big, y)).toBe(73_210)
  })
})
