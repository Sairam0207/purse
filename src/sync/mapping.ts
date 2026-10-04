import type { Transaction } from '../types'
import { isValidTransaction } from '../lib/validate'
import type { TransactionRow } from './types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Only real, client-generated UUIDs sync. Sample and perf-test rows ("demo-12") never leave the device. */
export function isUuid(id: string): boolean {
  return UUID.test(id)
}

export function toRow(tx: Transaction): TransactionRow {
  return {
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    category_id: tx.categoryId,
    date: tx.date,
    note: tx.note,
    created_at: new Date(tx.createdAt).toISOString(),
    deleted_at: null,
  }
}

/** Map a database row to the app model. Returns null for anything that fails validation. */
export function fromRow(row: TransactionRow): Transaction | null {
  const tx = {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    categoryId: row.category_id,
    date: row.date,
    note: row.note ?? '',
    createdAt: Date.parse(row.created_at),
  }
  return isValidTransaction(tx) ? tx : null
}
