import type { Category, TxType } from '../types'

export const CATEGORIES: Category[] = [
  { id: 'food', name: 'Eating out', type: 'expense', color: '#E0A21A' },
  { id: 'groceries', name: 'Groceries', type: 'expense', color: '#5E8C61' },
  { id: 'transport', name: 'Transport', type: 'expense', color: '#3D7EA6' },
  { id: 'rent', name: 'Rent', type: 'expense', color: '#2C5E5B' },
  { id: 'bills', name: 'Bills', type: 'expense', color: '#7A6C9E' },
  { id: 'shopping', name: 'Shopping', type: 'expense', color: '#B4233C' },
  { id: 'health', name: 'Health', type: 'expense', color: '#2A9D8F' },
  { id: 'fun', name: 'Entertainment', type: 'expense', color: '#D46A92' },
  { id: 'other', name: 'Other', type: 'expense', color: '#8A9690' },
  { id: 'salary', name: 'Salary', type: 'income', color: '#2F7D4F' },
  { id: 'freelance', name: 'Freelance', type: 'income', color: '#4FA06E' },
  { id: 'other-income', name: 'Other income', type: 'income', color: '#86B89A' },
]

const byId = new Map(CATEGORIES.map((c) => [c.id, c]))

export function getCategory(id: string): Category {
  return byId.get(id) ?? { id, name: 'Unknown', type: 'expense', color: '#8A9690' }
}

export function categoriesFor(type: TxType): Category[] {
  return CATEGORIES.filter((c) => c.type === type)
}

export function isCategoryId(id: string): boolean {
  return byId.has(id)
}
