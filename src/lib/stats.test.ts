import { describe, expect, it } from 'vitest'
import { dailyExpenses, expensesByCategory, monthlyTrend, sortByNewest, summarize } from './stats'
import type { Transaction } from '../types'

let n = 0
const tx = (p: Partial<Transaction>): Transaction => ({
  id: String(n++),
  type: 'expense',
  amount: 1000,
  categoryId: 'food',
  date: '2026-03-10',
  note: '',
  createdAt: n,
  ...p,
})

const data = [
  tx({ type: 'income', categoryId: 'salary', amount: 50000, date: '2026-03-01' }),
  tx({ amount: 2000, date: '2026-03-01' }),
  tx({ amount: 3000, categoryId: 'transport', date: '2026-03-15' }),
  tx({ amount: 500, date: '2026-03-15' }),
  tx({ amount: 9999, date: '2026-02-20' }),
]

describe('stats', () => {
  it('summarizes income, expense and net', () => {
    expect(summarize(data.filter((t) => t.date.startsWith('2026-03')))).toEqual({
      income: 50000,
      expense: 5500,
      net: 44500,
    })
  })

  it('groups expenses by category, largest first', () => {
    const march = data.filter((t) => t.date.startsWith('2026-03'))
    expect(expensesByCategory(march)).toEqual([
      { categoryId: 'transport', total: 3000, count: 1 },
      { categoryId: 'food', total: 2500, count: 2 },
    ])
  })

  it('totals spending per day for the whole month', () => {
    const days = dailyExpenses(data, '2026-03')
    expect(days).toHaveLength(31)
    expect(days[0]).toBe(2000)
    expect(days[14]).toBe(3500)
    expect(days[1]).toBe(0)
  })

  it('builds a trend across month and year boundaries', () => {
    const trend = monthlyTrend(data, '2026-03', 4)
    expect(trend.map((p) => p.month)).toEqual(['2025-12', '2026-01', '2026-02', '2026-03'])
    expect(trend[2].expense).toBe(9999)
  })

  it('sorts by date then entry time', () => {
    const a = tx({ date: '2026-03-15', createdAt: 1 })
    const b = tx({ date: '2026-03-15', createdAt: 2 })
    const c = tx({ date: '2026-03-01', createdAt: 3 })
    expect(sortByNewest([c, a, b]).map((t) => t.id)).toEqual([b.id, a.id, c.id])
  })
})

describe('helpers', () => {
  it('derives month keys from strings and dates', async () => {
    const { monthKey } = await import('./stats')
    expect(monthKey('2026-03-09')).toBe('2026-03')
    expect(monthKey(new Date(2026, 0, 31))).toBe('2026-01')
  })
})
