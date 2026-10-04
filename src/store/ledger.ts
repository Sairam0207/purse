import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Budgets, Transaction } from '../types'
import { generateDemoData, generateLargeDataset } from '../lib/seed'
import { isValidTransaction } from '../lib/validate'
import { isSyncing } from '../sync/status'
import { useSyncQueue, type SyncOp } from '../sync/queue'
import { isUuid } from '../sync/mapping'

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>

interface LedgerState {
  transactions: Transaction[]
  budgets: Budgets
  /** The account this local copy belongs to, or null for local-only data. */
  ownerId: string | null
  add: (tx: NewTransaction) => Transaction
  update: (id: string, patch: Partial<NewTransaction>) => void
  remove: (id: string) => Transaction | undefined
  restore: (tx: Transaction) => void
  importMany: (txs: NewTransaction[]) => number
  setBudget: (categoryId: string, amount: number | null) => void
  loadDemo: () => void
  loadLarge: (count: number) => void
  clearAll: () => void
  /** Apply changes that came from the server. Never queued back. */
  applyRemote: (c: { upserts?: Transaction[]; deletes?: string[]; budgets?: Record<string, number | null> }) => void
  /** Replace the local copy wholesale (sign-in, sign-out, account switch). Never queued. */
  replaceAll: (transactions: Transaction[], budgets: Budgets, ownerId: string | null) => void
}

/** Queue a change for the server while a signed-in sync session is running. */
function track(op: SyncOp) {
  if (!isSyncing()) return
  if ((op.kind === 'upsertTx' && !isUuid(op.tx.id)) || (op.kind === 'deleteTx' && !isUuid(op.id))) return
  useSyncQueue.getState().enqueue(op)
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const demo = generateDemoData()

export const useLedger = create<LedgerState>()(
  persist(
    (set, get) => ({
      // First-time visitors see a populated app instead of an empty one.
      transactions: demo.transactions,
      budgets: demo.budgets,
      ownerId: null,

      add: (input) => {
        const tx: Transaction = { ...input, id: newId(), createdAt: Date.now() }
        set((s) => ({ transactions: [tx, ...s.transactions] }))
        track({ kind: 'upsertTx', tx })
        return tx
      },

      update: (id, patch) => {
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }))
        const tx = get().transactions.find((t) => t.id === id)
        if (tx) track({ kind: 'upsertTx', tx })
      },

      remove: (id) => {
        const tx = get().transactions.find((t) => t.id === id)
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }))
        if (tx) track({ kind: 'deleteTx', id })
        return tx
      },

      restore: (tx) => {
        set((s) => ({ transactions: [tx, ...s.transactions] }))
        track({ kind: 'upsertTx', tx })
      },

      importMany: (inputs) => {
        const now = Date.now()
        const txs = inputs.map((t, i) => ({ ...t, id: newId(), createdAt: now + i }))
        set((s) => ({ transactions: [...txs, ...s.transactions] }))
        for (const tx of txs) track({ kind: 'upsertTx', tx })
        return txs.length
      },

      setBudget: (categoryId, amount) => {
        track({ kind: 'setBudget', categoryId, amount })
        set((s) => {
          const budgets = { ...s.budgets }
          if (amount === null) delete budgets[categoryId]
          else budgets[categoryId] = amount
          return { budgets }
        })
      },

      loadDemo: () => {
        const fresh = generateDemoData()
        set({ transactions: fresh.transactions, budgets: fresh.budgets })
      },

      loadLarge: (count) => set({ transactions: generateLargeDataset(count) }),

      clearAll: () => {
        for (const categoryId of Object.keys(get().budgets)) track({ kind: 'setBudget', categoryId, amount: null })
        track({ kind: 'deleteAll' })
        set({ transactions: [], budgets: {} })
      },

      applyRemote: ({ upserts = [], deletes = [], budgets }) =>
        set((s) => {
          const gone = new Set([...deletes, ...upserts.map((t) => t.id)])
          const transactions = upserts.length || deletes.length
            ? [...upserts, ...s.transactions.filter((t) => !gone.has(t.id))]
            : s.transactions
          let nextBudgets = s.budgets
          if (budgets) {
            nextBudgets = { ...s.budgets }
            for (const [k, v] of Object.entries(budgets)) {
              if (v === null) delete nextBudgets[k]
              else nextBudgets[k] = v
            }
          }
          return { transactions, budgets: nextBudgets }
        }),

      replaceAll: (transactions, budgets, ownerId) => set({ transactions, budgets, ownerId }),
    }),
    {
      name: 'purse:ledger',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ transactions: s.transactions, budgets: s.budgets, ownerId: s.ownerId }),
      // Drop anything malformed instead of crashing the app on bad or tampered storage.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LedgerState>
        const transactions = Array.isArray(p.transactions) ? p.transactions.filter(isValidTransaction) : current.transactions
        const budgets =
          p.budgets && typeof p.budgets === 'object'
            ? Object.fromEntries(
                Object.entries(p.budgets).filter(([, v]) => Number.isInteger(v) && (v as number) > 0),
              )
            : current.budgets
        const ownerId = typeof p.ownerId === 'string' ? p.ownerId : null
        return { ...current, transactions, budgets, ownerId }
      },
    },
  ),
)

export { sortByNewest } from '../lib/stats'
