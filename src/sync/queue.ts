import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction } from '../types'
import type { Cursor } from './types'

export type SyncOp =
  | { kind: 'upsertTx'; tx: Transaction }
  | { kind: 'deleteTx'; id: string }
  | { kind: 'setBudget'; categoryId: string; amount: number | null }
  | { kind: 'deleteAll' }

export type QueuedOp = SyncOp & { seq: number }

/**
 * Add an op to the outbox, collapsing anything it supersedes. Editing a transaction five
 * times offline sends one write, not five. Pure, so it's easy to test.
 */
export function coalesce(queue: QueuedOp[], op: QueuedOp): QueuedOp[] {
  let next = queue
  if (op.kind === 'upsertTx' || op.kind === 'deleteTx') {
    const id = op.kind === 'upsertTx' ? op.tx.id : op.id
    next = queue.filter((q) => !((q.kind === 'upsertTx' && q.tx.id === id) || (q.kind === 'deleteTx' && q.id === id)))
  } else if (op.kind === 'setBudget') {
    next = queue.filter((q) => !(q.kind === 'setBudget' && q.categoryId === op.categoryId))
  } else if (op.kind === 'deleteAll') {
    // Everything queued before a wipe is moot. Budgets are cleared by explicit setBudget(null) ops.
    next = queue.filter((q) => q.kind === 'setBudget')
  }
  return [...next, op]
}

/** Transaction ids with an unsent local change. Remote updates to these are ignored until it's sent. */
export function pendingIds(queue: QueuedOp[]): Set<string> {
  const ids = new Set<string>()
  for (const q of queue) {
    if (q.kind === 'upsertTx') ids.add(q.tx.id)
    if (q.kind === 'deleteTx') ids.add(q.id)
  }
  return ids
}

interface QueueState {
  ops: QueuedOp[]
  seq: number
  txCursor: Cursor | null
  budgetCursor: Cursor | null
  enqueue: (op: SyncOp) => void
  /** Remove ops that were sent. Ops replaced or added while a request was in flight are kept. */
  ack: (seqs: number[]) => void
  setCursors: (c: { txCursor?: Cursor | null; budgetCursor?: Cursor | null }) => void
  reset: () => void
}

export const useSyncQueue = create<QueueState>()(
  persist(
    (set) => ({
      ops: [],
      seq: 0,
      txCursor: null,
      budgetCursor: null,
      enqueue: (op) =>
        set((s) => {
          const seq = s.seq + 1
          return { seq, ops: coalesce(s.ops, { ...op, seq } as QueuedOp) }
        }),
      ack: (seqs) => {
        const done = new Set(seqs)
        set((s) => ({ ops: s.ops.filter((o) => !done.has(o.seq)) }))
      },
      setCursors: (c) => set(c),
      reset: () => set({ ops: [], txCursor: null, budgetCursor: null }),
    }),
    { name: 'purse:sync-queue', version: 1 },
  ),
)
