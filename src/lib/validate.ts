import { categoriesFor, isCategoryId } from './categories'
import { parseAmount } from './format'
import type { Transaction, TxType } from '../types'

export type Errors = Partial<Record<'amount' | 'date' | 'categoryId', string>>

export function validateTransaction(input: { amount: string; date: string; categoryId: string; type: TxType }): Errors {
  const errors: Errors = {}
  if (parseAmount(input.amount) === null) errors.amount = 'Enter an amount greater than zero, like 250 or 99.50.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) errors.date = 'Pick a date.'
  if (!categoriesFor(input.type).some((c) => c.id === input.categoryId)) errors.categoryId = 'Pick a category.'
  return errors
}

/**
 * Runtime guard for data read back from localStorage or another tab. Storage is user-editable
 * and can be corrupted or written by an older version, so it's never trusted blindly.
 */
export function isValidTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== 'object') return false
  const t = value as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    (t.type === 'expense' || t.type === 'income') &&
    Number.isInteger(t.amount) &&
    (t.amount as number) > 0 &&
    typeof t.categoryId === 'string' &&
    isCategoryId(t.categoryId) &&
    typeof t.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
    typeof t.note === 'string' &&
    typeof t.createdAt === 'number'
  )
}
