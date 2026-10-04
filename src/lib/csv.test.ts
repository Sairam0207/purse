import { describe, expect, it } from 'vitest'
import { parseCSV, toCSV } from './csv'
import type { Transaction } from '../types'

const sample: Transaction[] = [
  { id: '1', type: 'expense', amount: 12550, categoryId: 'food', date: '2026-03-02', note: 'Lunch, with "Priya"', createdAt: 1 },
  { id: '2', type: 'income', amount: 5000000, categoryId: 'salary', date: '2026-03-01', note: '', createdAt: 2 },
]

describe('csv', () => {
  it('round-trips, including commas and quotes in notes', () => {
    const { transactions, errors } = parseCSV(toCSV(sample))
    expect(errors).toEqual([])
    expect(transactions).toEqual([
      { type: 'income', amount: 5000000, categoryId: 'salary', date: '2026-03-01', note: '' },
      { type: 'expense', amount: 12550, categoryId: 'food', date: '2026-03-02', note: 'Lunch, with "Priya"' },
    ])
  })

  it('reports bad rows with line numbers and keeps the good ones', () => {
    const csv = [
      'date,type,category,amount,note',
      '2026-03-01,expense,food,100,ok',
      '03/01/2026,expense,food,100,bad date',
      '2026-03-01,expense,salary,100,wrong category for type',
      '2026-03-01,expense,food,-4,negative',
    ].join('\r\n')
    const { transactions, errors } = parseCSV(csv)
    expect(transactions).toHaveLength(1)
    expect(errors).toHaveLength(3)
    expect(errors[0]).toMatch(/^Row 3:/)
  })

  it('rejects files missing required columns', () => {
    expect(parseCSV('date,amount\n2026-01-01,5').errors[0]).toMatch(/Missing column/)
  })
})
