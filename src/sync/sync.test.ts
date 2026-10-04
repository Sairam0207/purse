import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLedger } from '../store/ledger'
import { coalesce, pendingIds, useSyncQueue, type QueuedOp } from './queue'
import { fromRow, isUuid, toRow } from './mapping'
import { SyncEngine, isPermanent, takeBatch } from './engine'
import { FakeApi } from './fakeApi'
import { useSync } from './status'
import { RemoteError } from './types'
import type { Transaction } from '../types'

const USER = 'u-1'
let n = 0
const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
const tx = (p: Partial<Transaction> = {}): Transaction => ({
  id: uuid(),
  type: 'expense',
  amount: 1000,
  categoryId: 'food',
  date: '2026-03-01',
  note: '',
  createdAt: Date.UTC(2026, 2, 1),
  ...p,
})
const yes = { confirmUpload: async () => true }
const no = { confirmUpload: async () => false }

beforeEach(() => {
  // Expected failures are reported to the console in dev; keep test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  useSyncQueue.getState().reset()
  useLedger.getState().replaceAll([], {}, null)
  useSync.getState().set({ userId: null, status: 'signed-out' })
})

describe('mapping', () => {
  it('round-trips a transaction through a database row', () => {
    const t = tx({ note: 'Dosa', amount: 12550 })
    expect(fromRow({ ...toRow(t), updated_at: 'x' })).toEqual(t)
  })
  it('rejects invalid rows from the server', () => {
    expect(fromRow({ ...toRow(tx()), category_id: 'crypto' })).toBeNull()
  })
  it('only treats real UUIDs as syncable', () => {
    expect(isUuid(uuid())).toBe(true)
    expect(isUuid('demo-12')).toBe(false)
  })
})

describe('outbox', () => {
  const q = (op: object, seq: number) => ({ ...op, seq }) as QueuedOp

  it('collapses repeated edits to one write per transaction', () => {
    const a = tx()
    let queue: QueuedOp[] = []
    queue = coalesce(queue, q({ kind: 'upsertTx', tx: a }, 1))
    queue = coalesce(queue, q({ kind: 'upsertTx', tx: { ...a, amount: 5 } }, 2))
    queue = coalesce(queue, q({ kind: 'deleteTx', id: a.id }, 3))
    expect(queue).toEqual([{ kind: 'deleteTx', id: a.id, seq: 3 }])
    expect(pendingIds(queue)).toEqual(new Set([a.id]))
  })

  it('a wipe supersedes earlier transaction writes but keeps budget changes', () => {
    let queue: QueuedOp[] = [q({ kind: 'upsertTx', tx: tx() }, 1), q({ kind: 'setBudget', categoryId: 'food', amount: null }, 2)]
    queue = coalesce(queue, q({ kind: 'deleteAll' }, 3))
    expect(queue.map((o) => o.kind)).toEqual(['setBudget', 'deleteAll'])
  })

  it('batches consecutive ops of the same kind', () => {
    const ops = [
      q({ kind: 'upsertTx', tx: tx() }, 1),
      q({ kind: 'upsertTx', tx: tx() }, 2),
      q({ kind: 'deleteTx', id: 'x' }, 3),
    ]
    expect(takeBatch(ops).map((o) => o.seq)).toEqual([1, 2])
    expect(takeBatch([q({ kind: 'deleteAll' }, 1), ...ops]).length).toBe(1)
  })

  it('classifies permanent vs transient errors', () => {
    expect(isPermanent(new RemoteError('check', '23514'))).toBe(true)
    expect(isPermanent(new RemoteError('rls', '42501'))).toBe(true)
    expect(isPermanent(new RemoteError('timeout', undefined, 503))).toBe(false)
    expect(isPermanent(new TypeError('Failed to fetch'))).toBe(false)
  })
})

describe('SyncEngine', () => {
  let api: FakeApi
  let engine: SyncEngine
  beforeEach(() => {
    api = new FakeApi()
    engine = new SyncEngine(api)
  })
  afterEach(() => engine.stop())

  it('on first sign-in, uploads only user-created rows when the user agrees', async () => {
    const mine = tx({ note: 'mine' })
    useLedger.getState().replaceAll([mine, { ...tx(), id: 'demo-1' }], { food: 5000 }, null)

    await engine.start(USER, 'a@b.c', yes)

    expect([...api.tx.keys()]).toEqual([mine.id])
    expect(api.budgets.get('food')?.amount).toBe(5000)
    expect(useLedger.getState().transactions.map((t) => t.id)).toEqual([mine.id])
    expect(useLedger.getState().ownerId).toBe(USER)
    expect(useSync.getState()).toMatchObject({ status: 'synced', userId: USER })
  })

  it('starts from the server copy when the user declines the upload', async () => {
    api.tx.set('s', { ...toRow(tx({ id: '00000000-0000-4000-8000-aaaaaaaaaaaa', note: 'from server' })), updated_at: '2026-01-01T00:00:00Z' })
    useLedger.getState().replaceAll([tx({ note: 'local' })], {}, null)

    await engine.start(USER, null, no)

    expect(api.tx.size).toBe(1)
    expect(useLedger.getState().transactions.map((t) => t.note)).toEqual(['from server'])
  })

  it('never mixes a previous account’s data into a new one', async () => {
    useLedger.getState().replaceAll([tx({ note: 'other person' })], {}, 'someone-else')
    const ask = vi.fn(async () => true)
    await engine.start(USER, null, { confirmUpload: ask })
    expect(ask).not.toHaveBeenCalled()
    expect(useLedger.getState().transactions).toEqual([])
    expect(api.tx.size).toBe(0)
  })

  it('queues local writes while signed in and pushes them', async () => {
    await engine.start(USER, null, no)
    const added = useLedger.getState().add({ type: 'expense', amount: 4200, categoryId: 'transport', date: '2026-03-02', note: 'Auto' })
    useLedger.getState().update(added.id, { amount: 4500 })
    useLedger.getState().setBudget('transport', 300000)
    expect(useSyncQueue.getState().ops).toHaveLength(2) // add+update collapsed

    await engine.syncNow()
    expect(api.tx.get(added.id)?.amount).toBe(4500)
    expect(api.budgets.get('transport')?.amount).toBe(300000)
    expect(useSyncQueue.getState().ops).toHaveLength(0)
  })

  it('keeps changes queued through a network failure and retries without duplicates', async () => {
    await engine.start(USER, null, no)
    const added = useLedger.getState().add({ type: 'expense', amount: 100, categoryId: 'food', date: '2026-03-02', note: '' })

    api.failures.push(new TypeError('Failed to fetch'))
    await engine.syncNow()
    expect(useSync.getState().status).toBe('error')
    expect(useSyncQueue.getState().ops).toHaveLength(1)

    await engine.syncNow()
    expect(useSync.getState().status).toBe('synced')
    expect([...api.tx.keys()]).toEqual([added.id])
    expect(useSyncQueue.getState().ops).toHaveLength(0)
  })

  it('drops a row the server permanently rejects instead of blocking the rest', async () => {
    await engine.start(USER, null, no)
    const bad = useLedger.getState().add({ type: 'expense', amount: 1, categoryId: 'food', date: '2026-03-02', note: 'bad' })
    const good = useLedger.getState().add({ type: 'expense', amount: 2, categoryId: 'food', date: '2026-03-02', note: 'good' })
    api.rejectIds.add(bad.id)

    await engine.syncNow()
    expect(api.tx.has(good.id)).toBe(true)
    expect(api.tx.has(bad.id)).toBe(false)
    expect(useSyncQueue.getState().ops).toHaveLength(0)
    expect(useSync.getState().status).toBe('synced')
  })

  it('applies changes from other devices live, and deletes them too', async () => {
    await engine.start(USER, null, no)
    const remote = tx({ note: 'from phone' })
    api.remoteWrite(toRow(remote))
    expect(useLedger.getState().transactions.map((t) => t.note)).toEqual(['from phone'])

    api.remoteWrite({ ...toRow(remote), deleted_at: '2026-03-03T00:00:00Z' })
    expect(useLedger.getState().transactions).toEqual([])
  })

  it('an unsent local edit wins over a remote change to the same row', async () => {
    await engine.start(USER, null, no)
    const t = useLedger.getState().add({ type: 'expense', amount: 100, categoryId: 'food', date: '2026-03-02', note: 'local' })
    api.remoteWrite({ ...toRow(t), note: 'remote' })
    expect(useLedger.getState().transactions[0].note).toBe('local')
    await engine.syncNow()
    expect(api.tx.get(t.id)?.note).toBe('local')
  })

  it('pulls incrementally across pages without skipping rows', async () => {
    for (let i = 0; i < 2500; i++) api.tx.set(String(i), { ...toRow(tx()), updated_at: '2026-01-01T00:00:00.000Z' })
    await engine.start(USER, null, no)
    expect(useLedger.getState().transactions).toHaveLength(2500)
    expect(api.calls.filter((c) => c === 'pullTransactions')).toHaveLength(3)

    const calls = api.calls.length
    await engine.syncNow() // nothing new: one empty page each
    expect(api.calls.slice(calls)).toEqual(['pullTransactions', 'pullBudgets'])
  })

  it('delete all removes data on the server for every device', async () => {
    await engine.start(USER, null, no)
    useLedger.getState().add({ type: 'expense', amount: 100, categoryId: 'food', date: '2026-03-02', note: '' })
    useLedger.getState().setBudget('food', 500)
    await engine.syncNow()

    useLedger.getState().clearAll()
    await engine.syncNow()
    expect([...api.tx.values()].every((r) => r.deleted_at)).toBe(true)
    expect(api.budgets.get('food')?.amount).toBeNull()
  })

  it('stops queueing after sign-out', async () => {
    await engine.start(USER, null, no)
    engine.stop()
    useLedger.getState().add({ type: 'expense', amount: 100, categoryId: 'food', date: '2026-03-02', note: '' })
    expect(useSyncQueue.getState().ops).toHaveLength(0)
  })
})
