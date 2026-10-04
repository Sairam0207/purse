import { describe, expect, it } from 'vitest'
import { filterTransactions } from './filter'
import type { Transaction } from '../types'

const base = { note: '', createdAt: 0 }
const txs: Transaction[] = [
  { ...base, id: 'a', type: 'expense', amount: 500, categoryId: 'food', date: '2026-03-02', note: 'Dosa' },
  { ...base, id: 'b', type: 'expense', amount: 9000, categoryId: 'shopping', date: '2026-03-05' },
  { ...base, id: 'c', type: 'income', amount: 100000, categoryId: 'salary', date: '2026-02-01' },
]
const none = { q: '', type: '', cat: '', month: '', sort: 'newest' as const }

describe('filterTransactions', () => {
  it('searches notes and category names case-insensitively', () => {
    expect(filterTransactions(txs, { ...none, q: 'dosa' }).map((t) => t.id)).toEqual(['a'])
    expect(filterTransactions(txs, { ...none, q: 'SHOP' }).map((t) => t.id)).toEqual(['b'])
  })

  it('combines type, category and month filters', () => {
    expect(filterTransactions(txs, { ...none, type: 'expense', month: '2026-03' })).toHaveLength(2)
    expect(filterTransactions(txs, { ...none, cat: 'salary', month: '2026-03' })).toHaveLength(0)
  })

  it('sorts', () => {
    expect(filterTransactions(txs, { ...none, sort: 'largest' }).map((t) => t.id)).toEqual(['c', 'b', 'a'])
    expect(filterTransactions(txs, { ...none, sort: 'oldest' }).map((t) => t.id)).toEqual(['c', 'a', 'b'])
  })
})
