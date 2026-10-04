import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToasts, toast } from './toast'
import { useUI } from './ui'
import { useSettings } from './settings'
import { useLedger } from './ledger'

describe('toast store', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows, caps at three, and auto-dismisses', () => {
    for (const m of ['a', 'b', 'c', 'd']) toast(m)
    expect(useToasts.getState().toasts.map((t) => t.message)).toEqual(['b', 'c', 'd'])
    vi.advanceTimersByTime(6000)
    expect(useToasts.getState().toasts).toEqual([])
  })
})

describe('ui store', () => {
  it('tracks dialog and palette state', () => {
    useUI.getState().openNew('2026-01-05')
    expect(useUI.getState()).toMatchObject({ editing: 'new', defaultDate: '2026-01-05' })
    const tx = { id: 'x', type: 'expense', amount: 1, categoryId: 'food', date: '2026-01-01', note: '', createdAt: 0 } as const
    useUI.getState().openEdit(tx)
    expect(useUI.getState().editing).toBe(tx)
    useUI.getState().close()
    expect(useUI.getState().editing).toBeNull()
    useUI.getState().setPalette(true)
    expect(useUI.getState().paletteOpen).toBe(true)
  })
})

describe('settings store', () => {
  it('updates currency and theme', () => {
    useSettings.getState().setCurrency('USD')
    useSettings.getState().setTheme('dark')
    expect(useSettings.getState()).toMatchObject({ currency: 'USD', theme: 'dark' })
  })
})

describe('ledger bulk actions', () => {
  it('imports, loads demo and large datasets', () => {
    useLedger.getState().clearAll()
    const n = useLedger.getState().importMany([
      { type: 'expense', amount: 100, categoryId: 'food', date: '2026-01-01', note: '' },
      { type: 'income', amount: 900, categoryId: 'salary', date: '2026-01-01', note: '' },
    ])
    expect(n).toBe(2)
    expect(new Set(useLedger.getState().transactions.map((t) => t.id)).size).toBe(2)

    useLedger.getState().loadDemo()
    expect(useLedger.getState().transactions.length).toBeGreaterThan(100)
    expect(Object.keys(useLedger.getState().budgets).length).toBeGreaterThan(0)

    useLedger.getState().loadLarge(2500)
    expect(useLedger.getState().transactions).toHaveLength(2500)
  })
})
