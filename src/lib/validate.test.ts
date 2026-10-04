import { describe, expect, it } from 'vitest'
import { isValidTransaction, validateTransaction } from './validate'

describe('validateTransaction', () => {
  it('passes valid input', () => {
    expect(validateTransaction({ amount: '10', date: '2026-01-01', categoryId: 'food', type: 'expense' })).toEqual({})
  })
  it('flags each invalid field', () => {
    const e = validateTransaction({ amount: '0', date: '', categoryId: 'salary', type: 'expense' })
    expect(Object.keys(e).sort()).toEqual(['amount', 'categoryId', 'date'])
  })
})

describe('isValidTransaction', () => {
  const good = { id: 'a', type: 'expense', amount: 100, categoryId: 'food', date: '2026-01-01', note: '', createdAt: 1 }
  it('accepts a well-formed transaction', () => expect(isValidTransaction(good)).toBe(true))
  it.each([
    ['float amount', { ...good, amount: 1.5 }],
    ['unknown category', { ...good, categoryId: 'crypto' }],
    ['bad date', { ...good, date: '1/1/2026' }],
    ['missing id', { ...good, id: undefined }],
    ['null', null],
  ])('rejects %s', (_, value) => expect(isValidTransaction(value)).toBe(false))
})
