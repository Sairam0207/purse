import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  action?: { label: string; onClick: () => void }
}

interface ToastState {
  toasts: Toast[]
  show: (message: string, action?: Toast['action']) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (message, action) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, action }] }))
    setTimeout(() => get().dismiss(id), 6000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (message: string, action?: Toast['action']) =>
  useToasts.getState().show(message, action)
