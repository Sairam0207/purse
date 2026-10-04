import { getCategory } from './categories'
import { sortByNewest } from './stats'
import type { Transaction } from '../types'

export type Sort = 'newest' | 'oldest' | 'largest'

export function filterTransactions(
  txs: Transaction[],
  f: { q: string; type: string; cat: string; month: string; sort: Sort },
): Transaction[] {
  const q = f.q.trim().toLowerCase()
  const result = txs.filter((t) => {
    if (f.type && t.type !== f.type) return false
    if (f.cat && t.categoryId !== f.cat) return false
    if (f.month && !t.date.startsWith(f.month)) return false
    if (q && !`${t.note} ${getCategory(t.categoryId).name}`.toLowerCase().includes(q)) return false
    return true
  })
  if (f.sort === 'largest') return result.sort((a, b) => b.amount - a.amount)
  const newest = sortByNewest(result)
  return f.sort === 'oldest' ? newest.reverse() : newest
}

