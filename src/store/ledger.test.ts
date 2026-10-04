import { beforeEach, describe, expect, it } from 'vitest'
import { useLedger } from './ledger'

describe('ledger store', () => {
  beforeEach(() => useLedger.getState().clearAll())

  it('adds, updates, removes and restores', () => {
    const { add } = useLedger.getState()
    const tx = add({ type: 'expense', amount: 500, categoryId: 'food', date: '2026-03-01', note: 'Tea' })
    expect(useLedger.getState().transactions).toHaveLength(1)

    useLedger.getState().update(tx.id, { amount: 700 })
    expect(useLedger.getState().transactions[0].amount).toBe(700)

    const removed = useLedger.getState().remove(tx.id)
    expect(useLedger.getState().transactions).toHaveLength(0)

    useLedger.getState().restore(removed!)
    expect(useLedger.getState().transactions[0]).toMatchObject({ id: tx.id, amount: 700 })
  })

  it('sets and clears budgets', () => {
    useLedger.getState().setBudget('food', 900000)
    expect(useLedger.getState().budgets.food).toBe(900000)
    useLedger.getState().setBudget('food', null)
    expect(useLedger.getState().budgets).not.toHaveProperty('food')
  })

  it('persists to localStorage', () => {
    useLedger.getState().setBudget('rent', 100)
    expect(localStorage.getItem('purse:ledger')).toContain('"rent":100')
  })
})

describe('ledger rehydration', () => {
  it('drops malformed transactions from storage instead of crashing', async () => {
    localStorage.setItem(
      'purse:ledger',
      JSON.stringify({
        version: 1,
        state: {
          transactions: [
            { id: 'ok', type: 'expense', amount: 100, categoryId: 'food', date: '2026-01-01', note: '', createdAt: 1 },
            { id: 'bad', type: 'expense', amount: 'lots', categoryId: 'food', date: 'yesterday' },
          ],
          budgets: { food: 500, rent: -3 },
        },
      }),
    )
    await useLedger.persist.rehydrate()
    expect(useLedger.getState().transactions.map((t) => t.id)).toEqual(['ok'])
    expect(useLedger.getState().budgets).toEqual({ food: 500 })
  })
})
