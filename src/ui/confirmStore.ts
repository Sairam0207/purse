import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel: string
  tone?: 'default' | 'danger'
}

interface ConfirmState {
  request: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  ask: (o: ConfirmOptions) => Promise<boolean>
  settle: (ok: boolean) => void
}

export const useConfirmStore = create<ConfirmState>()((set, get) => ({
  request: null,
  ask: (options) =>
    new Promise<boolean>((resolve) => {
      get().request?.resolve(false)
      set({ request: { ...options, resolve } })
    }),
  settle: (ok) => {
    get().request?.resolve(ok)
    set({ request: null })
  },
}))

/**
 * Promise-based replacement for window.confirm that matches the app's design and is accessible.
 *   if (await confirm({ title, message, confirmLabel: 'Delete' })) { ... }
 */
export const confirm = (options: ConfirmOptions) => useConfirmStore.getState().ask(options)
