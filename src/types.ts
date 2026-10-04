export type TxType = 'expense' | 'income'

export interface Transaction {
  id: string
  type: TxType
  /** Amount in minor units (paise, cents). Stored as an integer to avoid float rounding errors. */
  amount: number
  categoryId: string
  /** ISO calendar date, yyyy-MM-dd */
  date: string
  note: string
  createdAt: number
}

export interface Category {
  id: string
  name: string
  type: TxType
  color: string
}

/** Monthly budget per expense category, in minor units. */
export type Budgets = Record<string, number>

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP'
export type ThemePreference = 'system' | 'light' | 'dark'
