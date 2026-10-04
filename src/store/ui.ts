import { create } from 'zustand'
import type { Transaction } from '../types'

interface UIState {
  /** null = closed, 'new' = adding, Transaction = editing */
  editing: Transaction | 'new' | null
  defaultDate?: string
  openNew: (defaultDate?: string) => void
  openEdit: (tx: Transaction) => void
  close: () => void
  paletteOpen: boolean
  setPalette: (open: boolean) => void
}

export const useUI = create<UIState>()((set) => ({
  editing: null,
  openNew: (defaultDate) => set({ editing: 'new', defaultDate }),
  openEdit: (tx) => set({ editing: tx, defaultDate: undefined }),
  close: () => set({ editing: null }),
  paletteOpen: false,
  setPalette: (paletteOpen) => set({ paletteOpen }),
}))
