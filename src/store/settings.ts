import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Currency, ThemePreference } from '../types'

interface SettingsState {
  currency: Currency
  theme: ThemePreference
  setCurrency: (c: Currency) => void
  setTheme: (t: ThemePreference) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      currency: 'INR',
      theme: 'system',
      setCurrency: (currency) => set({ currency }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'purse:settings' },
  ),
)
