import { useCallback } from 'react'
import { formatMoney } from '../lib/format'
import { useSettings } from '../store/settings'

/** Returns a formatter bound to the user's chosen currency. */
export function useMoney() {
  const currency = useSettings((s) => s.currency)
  return useCallback(
    (minor: number, compact = false) => formatMoney(minor, currency, compact),
    [currency],
  )
}
