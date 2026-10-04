import { describe, expect, it } from 'vitest'
import { fuzzyFilter, fuzzyScore } from './fuzzy'

describe('fuzzyScore', () => {
  it('requires characters in order', () => {
    expect(fuzzyScore('bdg', 'Go to budgets')).not.toBeNull()
    expect(fuzzyScore('gdb', 'Go to budgets')).toBeNull()
  })

  it('ranks consecutive and word-start matches higher', () => {
    const items = ['Go to settings', 'Go to budgets', 'Biryani night']
    expect(fuzzyFilter(items, 'bud', (s) => s)[0]).toBe('Go to budgets')
    expect(fuzzyFilter(items, 'set', (s) => s)[0]).toBe('Go to settings')
  })

  it('ignores case and spaces', () => {
    expect(fuzzyScore('TO BUD', 'go to budgets')).not.toBeNull()
  })

  it('returns everything (limited) for an empty query', () => {
    expect(fuzzyFilter([1, 2, 3], '', String, 2)).toEqual([1, 2])
  })
})

describe('fuzzyScore edge cases', () => {
  it('treats an empty query as a neutral match', () => {
    expect(fuzzyScore('', 'anything')).toBe(0)
  })
})
