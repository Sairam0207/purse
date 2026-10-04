/** Row shapes as stored in Postgres (snake_case), see supabase/migrations. */
export interface TransactionRow {
  id: string
  user_id?: string
  type: 'expense' | 'income'
  amount: number
  category_id: string
  date: string
  note: string
  created_at: string
  updated_at?: string
  deleted_at: string | null
}

export interface BudgetRow {
  category_id: string
  amount: number | null
  updated_at?: string
}

/** Keyset cursor. A (timestamp, id) pair so rows sharing a timestamp are never skipped between pages. */
export interface Cursor {
  updatedAt: string
  key: string
}

/**
 * Everything the sync engine needs from a backend. SupabaseApi implements it for real;
 * tests use an in-memory fake, so the engine's logic is tested without a network.
 */
export interface RemoteApi {
  upsertTransactions(rows: TransactionRow[]): Promise<void>
  softDeleteTransactions(ids: string[]): Promise<void>
  softDeleteAllTransactions(): Promise<void>
  upsertBudgets(rows: BudgetRow[]): Promise<void>
  /** Rows changed after `cursor`, oldest first, at most `limit`. Includes soft-deleted rows. */
  pullTransactions(cursor: Cursor | null, limit: number): Promise<TransactionRow[]>
  pullBudgets(cursor: Cursor | null, limit: number): Promise<BudgetRow[]>
  /** Live changes from other devices. Returns an unsubscribe function. */
  subscribe(
    userId: string,
    handlers: {
      onTransaction: (row: TransactionRow) => void
      onBudget: (row: BudgetRow) => void
      onReconnect: () => void
    },
  ): () => void
}

/** A Postgres/PostgREST error code or HTTP status, normalized. */
export class RemoteError extends Error {
  code?: string
  status?: number
  constructor(message: string, code?: string, status?: number) {
    super(message)
    this.name = 'RemoteError'
    this.code = code
    this.status = status
  }
}
