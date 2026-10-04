import type { Currency } from '../types'

const LOCALES: Record<Currency, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
}

const cache = new Map<string, Intl.NumberFormat>()

function formatter(currency: Currency, compact: boolean): Intl.NumberFormat {
  const key = `${currency}:${compact}`
  let f = cache.get(key)
  if (!f) {
    // Compact uses en-US so thousands read as K everywhere (en-IN renders "T", easy to misread).
    f = new Intl.NumberFormat(compact ? 'en-US' : LOCALES[currency], {
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      maximumFractionDigits: compact ? 1 : 2,
      minimumFractionDigits: 0,
    })
    cache.set(key, f)
  }
  return f
}

/** Format an integer amount in minor units as a currency string. */
export function formatMoney(minor: number, currency: Currency, compact = false): string {
  return formatter(currency, compact).format(minor / 100)
}

/**
 * Parse user input like "1,250.5" into minor units (125050).
 * Returns null for anything that isn't a positive amount with at most two decimals.
 * Works on strings rather than floats so 0.1 + 0.2 style errors can't creep in.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const [whole, frac = ''] = cleaned.split('.')
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, '0'))
  return minor > 0 ? minor : null
}

/** Inverse of parseAmount, for pre-filling inputs: 125050 -> "1250.50" */
export function minorToInput(minor: number): string {
  const whole = Math.floor(minor / 100)
  const frac = minor % 100
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, '0')}`
}
