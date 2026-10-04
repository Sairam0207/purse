import { describe, expect, it } from 'vitest'
import { intensityLevels } from './heatmap'

describe('intensityLevels', () => {
  it('returns all zeros for a month with no spending', () => {
    expect(intensityLevels([0, 0, 0])).toEqual([0, 0, 0])
  })
  it('scales evenly spread values across levels', () => {
    expect(intensityLevels([100, 200, 300, 400])).toEqual([1, 2, 3, 4])
  })
})
