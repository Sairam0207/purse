import { useLedger } from '../store/ledger'
import { reportError } from '../lib/monitoring'
import { fromRow, isUuid, toRow } from './mapping'
import { pendingIds, useSyncQueue, type QueuedOp } from './queue'
import { useSync } from './status'
import { RemoteError, type BudgetRow, type Cursor, type RemoteApi, type TransactionRow } from './types'

const BATCH = 500
const PAGE = 1000
const MAX_BACKOFF_MS = 60_000

/** Errors that will fail the same way on every retry: bad data, not a bad network. */
export function isPermanent(err: unknown): boolean {
  if (!(err instanceof RemoteError)) return false
  if (err.code && /^(22|23|42501|PGRST1)/.test(err.code)) return true // data, constraint, RLS, bad request
  return err.status === 400 || err.status === 403 || err.status === 409 || err.status === 422
}

export interface StartOptions {
  /** Ask whether transactions created on this device before signing in should be added to the account. */
  confirmUpload: (count: number) => Promise<boolean>
}

/**
 * Offline-first sync between the local ledger and the server.
 *
 *  - Local writes are applied immediately (the UI never waits) and queued in a persisted outbox.
 *  - The outbox is flushed in batches with exponential backoff. Upserts are idempotent
 *    (client-generated UUIDs), so retrying after a timeout can't create duplicates.
 *  - Changes are pulled incrementally with a keyset cursor and pushed live over realtime.
 *  - Conflicts: an unsent local change wins over the server until it's sent; after that the
 *    server copy (last write) is authoritative.
 *  - A row the server rejects permanently is dropped and reported instead of blocking the queue.
 */
export class SyncEngine {
  private api: RemoteApi
  private userId: string | null = null
  private unsubscribe: (() => void) | null = null
  private unsubscribeQueue: (() => void) | null = null
  private flushing: Promise<void> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private backoff = 1000
  private onOnline = () => void this.syncNow()
  private onOffline = () => useSync.getState().set({ status: 'offline' })

  constructor(api: RemoteApi) {
    this.api = api
  }

  async start(userId: string, email: string | null, opts: StartOptions) {
    this.stop()
    this.userId = userId
    useSync.getState().set({ userId: null, email, status: 'syncing', error: null })

    await this.adoptLocalData(userId, opts)
    // Only now start queueing ledger writes for this user.
    useSync.getState().set({ userId })

    this.unsubscribeQueue = useSyncQueue.subscribe((s, prev) => {
      if (s.ops.length > prev.ops.length || s.seq !== prev.seq) this.scheduleFlush()
    })
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onOnline)
      window.addEventListener('offline', this.onOffline)
    }
    this.unsubscribe = this.api.subscribe(userId, {
      onTransaction: (row) => this.applyTransactions([row]),
      onBudget: (row) => this.applyBudgets([row]),
      // Realtime can miss events while disconnected; a pull closes the gap.
      onReconnect: () => void this.pull().catch((e) => this.fail(e)),
    })

    await this.syncNow()
  }

  stop() {
    this.unsubscribe?.()
    this.unsubscribeQueue?.()
    this.unsubscribe = this.unsubscribeQueue = null
    if (this.retryTimer) clearTimeout(this.retryTimer)
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.retryTimer = this.debounceTimer = null
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnline)
      window.removeEventListener('offline', this.onOffline)
    }
    this.userId = null
    useSync.getState().set({ userId: null })
  }

  /** Push pending changes, then pull remote ones. Safe to call any time. */
  async syncNow() {
    if (!this.userId) return
    useSync.getState().set({ status: 'syncing' })
    try {
      await this.flush()
      await this.pull()
      this.backoff = 1000
      useSync.getState().set({ status: 'synced', lastSyncedAt: Date.now(), error: null })
    } catch (e) {
      this.fail(e)
    }
  }

  /** Decide what happens to data that was on this device before signing in. */
  private async adoptLocalData(userId: string, opts: StartOptions) {
    const ledger = useLedger.getState()
    const queue = useSyncQueue.getState()

    if (ledger.ownerId === userId) return // Same account as last time: resume where we left off.

    queue.reset()
    if (ledger.ownerId !== null) {
      // A different account used this device. Never mix their data into this one.
      ledger.replaceAll([], {}, userId)
      return
    }

    // Local-only data. Sample/test rows are never uploaded; things the user created can be.
    const mine = ledger.transactions.filter((t) => isUuid(t.id))
    const upload = mine.length > 0 && (await opts.confirmUpload(mine.length))
    ledger.replaceAll(upload ? mine : [], upload ? ledger.budgets : {}, userId)
    if (upload) {
      for (const tx of mine) queue.enqueue({ kind: 'upsertTx', tx })
      for (const [categoryId, amount] of Object.entries(ledger.budgets))
        queue.enqueue({ kind: 'setBudget', categoryId, amount })
    }
  }

  private scheduleFlush() {
    if (!this.userId || this.debounceTimer) return
    // Batch rapid edits (typing, bulk import) into one request.
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      void this.syncNow()
    }, 300)
  }

  private fail(e: unknown) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    reportError(e, { source: 'sync' })
    useSync.getState().set({
      status: offline ? 'offline' : 'error',
      error: offline ? null : e instanceof Error ? e.message : String(e),
    })
    if (this.userId && !this.retryTimer) {
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null
        void this.syncNow()
      }, this.backoff)
      this.backoff = Math.min(MAX_BACKOFF_MS, this.backoff * 2)
    }
  }

  // ---- Push ------------------------------------------------------------------

  flush(): Promise<void> {
    // One flush at a time; concurrent callers share it.
    this.flushing ??= this.doFlush().finally(() => (this.flushing = null))
    return this.flushing
  }

  private async doFlush() {
    for (;;) {
      const ops = useSyncQueue.getState().ops
      if (!ops.length) return
      const batch = takeBatch(ops)
      try {
        await this.send(batch)
      } catch (e) {
        if (!isPermanent(e)) throw e
        // Isolate the bad op(s): retry individually, drop the ones the server will never accept.
        for (const op of batch) {
          try {
            await this.send([op])
          } catch (single) {
            if (!isPermanent(single)) throw single
            reportError(single, { source: 'sync', droppedOp: op.kind })
          }
        }
      }
      useSyncQueue.getState().ack(batch.map((o) => o.seq))
    }
  }

  private async send(batch: QueuedOp[]) {
    const first = batch[0]
    switch (first.kind) {
      case 'upsertTx':
        return this.api.upsertTransactions(batch.map((o) => toRow((o as Extract<QueuedOp, { kind: 'upsertTx' }>).tx)))
      case 'deleteTx':
        return this.api.softDeleteTransactions(batch.map((o) => (o as Extract<QueuedOp, { kind: 'deleteTx' }>).id))
      case 'setBudget':
        return this.api.upsertBudgets(
          batch.map((o) => {
            const b = o as Extract<QueuedOp, { kind: 'setBudget' }>
            return { category_id: b.categoryId, amount: b.amount }
          }),
        )
      case 'deleteAll':
        return this.api.softDeleteAllTransactions()
    }
  }

  // ---- Pull ------------------------------------------------------------------

  async pull() {
    const q = useSyncQueue.getState()
    let txCursor = q.txCursor
    for (;;) {
      const rows = await this.api.pullTransactions(txCursor, PAGE)
      if (!rows.length) break
      this.applyTransactions(rows)
      const last = rows[rows.length - 1]
      txCursor = { updatedAt: last.updated_at!, key: last.id }
      useSyncQueue.getState().setCursors({ txCursor })
      if (rows.length < PAGE) break
    }
    let budgetCursor = q.budgetCursor
    for (;;) {
      const rows = await this.api.pullBudgets(budgetCursor, PAGE)
      if (!rows.length) break
      this.applyBudgets(rows)
      const last = rows[rows.length - 1]
      budgetCursor = { updatedAt: last.updated_at!, key: last.category_id }
      useSyncQueue.getState().setCursors({ budgetCursor })
      if (rows.length < PAGE) break
    }
  }

  private applyTransactions(rows: TransactionRow[]) {
    const ops = useSyncQueue.getState().ops
    if (ops.some((o) => o.kind === 'deleteAll')) return // A local wipe is pending; it wins.
    const pending = pendingIds(ops)
    const upserts = []
    const deletes = []
    for (const row of rows) {
      if (pending.has(row.id)) continue // Unsent local change wins.
      if (row.deleted_at) deletes.push(row.id)
      else {
        const tx = fromRow(row)
        if (tx) upserts.push(tx)
      }
    }
    if (upserts.length || deletes.length) useLedger.getState().applyRemote({ upserts, deletes })
  }

  private applyBudgets(rows: BudgetRow[]) {
    const pendingCats = new Set(
      useSyncQueue.getState().ops.flatMap((o) => (o.kind === 'setBudget' ? [o.categoryId] : [])),
    )
    const budgets: Record<string, number | null> = {}
    for (const row of rows) {
      if (pendingCats.has(row.category_id)) continue
      budgets[row.category_id] = row.amount === null ? null : Number(row.amount)
    }
    if (Object.keys(budgets).length) useLedger.getState().applyRemote({ budgets })
  }
}

/** Consecutive ops of the same kind go in one request (deleteAll always alone). */
export function takeBatch(ops: QueuedOp[]): QueuedOp[] {
  const kind = ops[0].kind
  if (kind === 'deleteAll') return [ops[0]]
  const batch: QueuedOp[] = []
  for (const op of ops) {
    if (op.kind !== kind || batch.length === BATCH) break
    batch.push(op)
  }
  return batch
}

export type { Cursor }
