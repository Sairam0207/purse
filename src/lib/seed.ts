import { addMonths, format, getDaysInMonth, startOfMonth } from 'date-fns'
import type { Budgets, Transaction } from '../types'

/** Small deterministic PRNG so demo data is stable between reloads and tests. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const NOTES: Record<string, string[]> = {
  food: ['Lunch with team', 'Filter coffee', 'Biryani night', 'Dosa breakfast', 'Weekend brunch'],
  groceries: ['Weekly vegetables', 'Supermarket run', 'Milk and fruit', 'Rice and dal'],
  transport: ['Metro card top-up', 'Auto to office', 'Cab to airport', 'Fuel'],
  shopping: ['New headphones', 'Shirts', 'Books', 'Kitchen things'],
  health: ['Pharmacy', 'Gym membership', 'Doctor visit'],
  fun: ['Movie tickets', 'Streaming subscription', 'Concert'],
  other: ['Gift for a friend', 'Haircut', 'Donation'],
}

export function generateDemoData(today = new Date()): {
  transactions: Transaction[]
  budgets: Record<string, number>
} {
  const rand = mulberry32(42)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
  // Random whole amount between min and max (major units), rounded to 10, returned in minor units
  const between = (min: number, max: number) => Math.round((min + rand() * (max - min)) / 10) * 10 * 100
  const transactions: Transaction[] = []
  let n = 0

  const push = (date: Date, type: Transaction['type'], categoryId: string, amount: number, note: string) => {
    transactions.push({
      id: `demo-${n++}`,
      type,
      categoryId,
      amount,
      note,
      date: format(date, 'yyyy-MM-dd'),
      createdAt: date.getTime() + n,
    })
  }

  for (let m = -5; m <= 0; m++) {
    const start = startOfMonth(addMonths(today, m))
    const lastDay = m === 0 ? today.getDate() : getDaysInMonth(start)
    const day = (d: number) => new Date(start.getFullYear(), start.getMonth(), Math.min(d, lastDay))

    push(day(1), 'income', 'salary', 8500000, 'Monthly salary')
    if (rand() > 0.4)
      push(day(10 + Math.floor(rand() * 15)), 'income', 'freelance', between(8000, 25000), 'Website project')
    push(day(3), 'expense', 'rent', 2200000, 'Rent')
    push(day(5), 'expense', 'bills', between(1500, 3200), 'Electricity')
    push(day(7), 'expense', 'bills', 79900, 'Broadband')

    for (let d = 1; d <= lastDay; d++) {
      if (rand() > 0.55) push(day(d), 'expense', 'food', between(150, 900), pick(NOTES.food))
      if (rand() > 0.75) push(day(d), 'expense', 'transport', between(60, 450), pick(NOTES.transport))
      if (d % 7 === 0) push(day(d), 'expense', 'groceries', between(1200, 3500), pick(NOTES.groceries))
      if (rand() > 0.93) push(day(d), 'expense', 'shopping', between(800, 6000), pick(NOTES.shopping))
      if (rand() > 0.94) push(day(d), 'expense', 'fun', between(300, 1500), pick(NOTES.fun))
      if (rand() > 0.96) push(day(d), 'expense', 'health', between(300, 2500), pick(NOTES.health))
      if (rand() > 0.97) push(day(d), 'expense', 'other', between(200, 2000), pick(NOTES.other))
    }
  }

  const budgets: Budgets = {
    food: 900000,
    groceries: 1200000,
    transport: 400000,
    rent: 2200000,
    bills: 500000,
    shopping: 800000,
    fun: 300000,
  }

  return { transactions, budgets }
}

/** Many months of dense data for performance testing the virtualized list. */
export function generateLargeDataset(count: number, today = new Date()): Transaction[] {
  const rand = mulberry32(7)
  const cats = Object.keys(NOTES)
  const out: Transaction[] = []
  const dayMs = 86_400_000
  for (let i = 0; i < count; i++) {
    // Roughly 15 transactions a day going backwards from today.
    const date = new Date(today.getTime() - Math.floor(i / 15) * dayMs)
    const isIncome = i % 40 === 0
    const categoryId = isIncome ? 'freelance' : cats[Math.floor(rand() * cats.length)]
    out.push({
      id: `perf-${i}`,
      type: isIncome ? 'income' : 'expense',
      categoryId,
      amount: Math.round((50 + rand() * (isIncome ? 20000 : 2000)) * 100),
      note: isIncome ? 'Client payment' : NOTES[categoryId][Math.floor(rand() * NOTES[categoryId].length)],
      date: format(date, 'yyyy-MM-dd'),
      createdAt: date.getTime() - i,
    })
  }
  return out
}
