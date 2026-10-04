import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { RemoteError, type BudgetRow, type Cursor, type RemoteApi, type TransactionRow } from './types'

const TX_COLUMNS = 'id,type,amount,category_id,date,note,created_at,updated_at,deleted_at'

function check(error: PostgrestError | null, status?: number) {
  if (error) throw new RemoteError(error.message, error.code, status)
}

/** Keyset pagination filter: rows strictly after (updated_at, key). */
function after(cursor: Cursor, keyColumn: string) {
  const t = cursor.updatedAt
  return `updated_at.gt.${t},and(updated_at.eq.${t},${keyColumn}.gt.${cursor.key})`
}

/** RemoteApi backed by Supabase (PostgREST + Realtime). Row Level Security scopes every query to the signed-in user. */
export class SupabaseApi implements RemoteApi {
  private db: SupabaseClient

  constructor(db: SupabaseClient) {
    this.db = db
  }

  async upsertTransactions(rows: TransactionRow[]) {
    const { error, status } = await this.db.from('transactions').upsert(rows, { onConflict: 'id' })
    check(error, status)
  }

  async softDeleteTransactions(ids: string[]) {
    const { error, status } = await this.db
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids)
    check(error, status)
  }

  async softDeleteAllTransactions() {
    const { error, status } = await this.db
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .is('deleted_at', null)
    check(error, status)
  }

  async upsertBudgets(rows: BudgetRow[]) {
    const { error, status } = await this.db.from('budgets').upsert(rows, { onConflict: 'user_id,category_id' })
    check(error, status)
  }

  async pullTransactions(cursor: Cursor | null, limit: number) {
    let q = this.db.from('transactions').select(TX_COLUMNS).order('updated_at').order('id').limit(limit)
    if (cursor) q = q.or(after(cursor, 'id'))
    // First sync doesn't need rows that were already deleted.
    else q = q.is('deleted_at', null)
    const { data, error, status } = await q
    check(error, status)
    return (data ?? []) as TransactionRow[]
  }

  async pullBudgets(cursor: Cursor | null, limit: number) {
    let q = this.db.from('budgets').select('category_id,amount,updated_at').order('updated_at').order('category_id').limit(limit)
    if (cursor) q = q.or(after(cursor, 'category_id'))
    const { data, error, status } = await q
    check(error, status)
    return (data ?? []) as BudgetRow[]
  }

  subscribe(
    userId: string,
    handlers: { onTransaction: (r: TransactionRow) => void; onBudget: (r: BudgetRow) => void; onReconnect: () => void },
  ) {
    let connectedOnce = false
    const channel = this.db
      .channel(`purse:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` }, (p) =>
        handlers.onTransaction(p.new as TransactionRow),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${userId}` }, (p) =>
        handlers.onBudget(p.new as BudgetRow),
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return
        if (connectedOnce) handlers.onReconnect()
        connectedOnce = true
      })
    return () => void this.db.removeChannel(channel)
  }
}
