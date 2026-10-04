import { RemoteError, type BudgetRow, type Cursor, type RemoteApi, type TransactionRow } from './types'

/**
 * In-memory server with the same semantics as the real one: server-assigned updated_at,
 * idempotent upserts, soft deletes, keyset pagination, and realtime fan-out.
 * Used by unit tests; can also simulate failures.
 */
export class FakeApi implements RemoteApi {
  tx = new Map<string, TransactionRow>()
  budgets = new Map<string, BudgetRow>()
  calls: string[] = []
  /** Queue errors to throw from the next calls. */
  failures: Error[] = []
  /** Reject specific transaction ids as a constraint violation would. */
  rejectIds = new Set<string>()
  private clock = 0
  private handlers: Parameters<RemoteApi['subscribe']>[1] | null = null

  private now() {
    this.clock += 1
    return new Date(Date.UTC(2026, 0, 1) + this.clock * 1000).toISOString()
  }

  private maybeFail(name: string) {
    this.calls.push(name)
    const f = this.failures.shift()
    if (f) throw f
  }

  async upsertTransactions(rows: TransactionRow[]) {
    this.maybeFail(`upsertTransactions:${rows.length}`)
    if (rows.some((r) => this.rejectIds.has(r.id))) throw new RemoteError('violates check constraint', '23514', 400)
    for (const r of rows) this.tx.set(r.id, { ...r, updated_at: this.now() })
  }

  async softDeleteTransactions(ids: string[]) {
    this.maybeFail(`softDelete:${ids.length}`)
    for (const id of ids) {
      const r = this.tx.get(id)
      if (r) this.tx.set(id, { ...r, deleted_at: this.now(), updated_at: this.now() })
    }
  }

  async softDeleteAllTransactions() {
    this.maybeFail('softDeleteAll')
    for (const [id, r] of this.tx) if (!r.deleted_at) this.tx.set(id, { ...r, deleted_at: this.now(), updated_at: this.now() })
  }

  async upsertBudgets(rows: BudgetRow[]) {
    this.maybeFail(`upsertBudgets:${rows.length}`)
    for (const r of rows) this.budgets.set(r.category_id, { ...r, updated_at: this.now() })
  }

  async pullTransactions(cursor: Cursor | null, limit: number) {
    this.maybeFail('pullTransactions')
    return page([...this.tx.values()].filter((r) => cursor || !r.deleted_at), cursor, limit, (r) => r.id)
  }

  async pullBudgets(cursor: Cursor | null, limit: number) {
    this.maybeFail('pullBudgets')
    return page([...this.budgets.values()], cursor, limit, (r) => r.category_id)
  }

  subscribe(_userId: string, handlers: Parameters<RemoteApi['subscribe']>[1]) {
    this.handlers = handlers
    return () => (this.handlers = null)
  }

  /** Simulate another device writing a row, including the realtime event. */
  remoteWrite(row: Omit<TransactionRow, 'updated_at'>) {
    const stored = { ...row, updated_at: this.now() }
    this.tx.set(row.id, stored)
    this.handlers?.onTransaction(stored)
  }
}

function page<T extends { updated_at?: string }>(rows: T[], cursor: Cursor | null, limit: number, key: (r: T) => string) {
  return rows
    .sort((a, b) => a.updated_at!.localeCompare(b.updated_at!) || key(a).localeCompare(key(b)))
    .filter((r) => !cursor || r.updated_at! > cursor.updatedAt || (r.updated_at === cursor.updatedAt && key(r) > cursor.key))
    .slice(0, limit)
}
