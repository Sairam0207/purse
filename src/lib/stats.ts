import { addMonths, format, getDaysInMonth, parseISO } from 'date-fns'
import type { Transaction } from '../types'

/** yyyy-MM key for a transaction date or Date */
export function monthKey(date: string | Date): string {
  return typeof date === 'string' ? date.slice(0, 7) : format(date, 'yyyy-MM')
}

export function inMonth(txs: Transaction[], month: string): Transaction[] {
  return txs.filter((t) => t.date.startsWith(month))
}

export interface Summary {
  income: number
  expense: number
  net: number
}

export function summarize(txs: Transaction[]): Summary {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, net: income - expense }
}

export interface CategoryTotal {
  categoryId: string
  total: number
  count: number
}

/** Expense totals per category, largest first. */
export function expensesByCategory(txs: Transaction[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>()
  for (const t of txs) {
    if (t.type !== 'expense') continue
    const entry = map.get(t.categoryId) ?? { categoryId: t.categoryId, total: 0, count: 0 }
    entry.total += t.amount
    entry.count += 1
    map.set(t.categoryId, entry)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

/** Expense total for each day of the month. Index 0 is the 1st. */
export function dailyExpenses(txs: Transaction[], month: string): number[] {
  const days = getDaysInMonth(parseISO(`${month}-01`))
  const totals = new Array<number>(days).fill(0)
  for (const t of txs) {
    if (t.type !== 'expense' || !t.date.startsWith(month)) continue
    const day = Number(t.date.slice(8, 10))
    totals[day - 1] += t.amount
  }
  return totals
}

export interface MonthPoint extends Summary {
  month: string
}

/** Income/expense for the `count` months ending at `endMonth`, oldest first. */
export function monthlyTrend(txs: Transaction[], endMonth: string, count = 6): MonthPoint[] {
  const end = parseISO(`${endMonth}-01`)
  const points: MonthPoint[] = []
  for (let i = count - 1; i >= 0; i--) {
    const month = format(addMonths(end, -i), 'yyyy-MM')
    points.push({ month, ...summarize(inMonth(txs, month)) })
  }
  return points
}

/** Transactions sorted newest first (by date, then entry time). */
export function sortByNewest(txs: Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
}
